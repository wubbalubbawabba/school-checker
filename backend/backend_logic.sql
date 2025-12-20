-- ============================================================================
-- FUNCTION: check_school_status
-- Purpose: Determines if a school is open or closed on a specific date
-- Returns: JSON with status and reason
-- ============================================================================

CREATE OR REPLACE FUNCTION check_school_status(
    check_date DATE,
    target_school_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    school_state VARCHAR(10);
    school_term_rule_id UUID;
    school_name VARCHAR(255);
    event_record RECORD;
    holiday_record RECORD;
    term_data JSONB;
    term_record JSONB;
    day_of_week INTEGER;
    result JSON;
BEGIN
    -- ========================================================================
    -- STEP 1: Get school context (state, term_rule_id, name)
    -- ========================================================================
    SELECT 
        s.state, 
        s.term_rule_id,
        s.name
    INTO 
        school_state, 
        school_term_rule_id,
        school_name
    FROM schools s
    WHERE s.id = target_school_id;
    
    -- Handle case where school doesn't exist
    IF NOT FOUND THEN
        RETURN json_build_object(
            'status', 'Error',
            'reason', 'School not found'
        );
    END IF;
    
    -- Handle case where school has no term rule assigned
    IF school_term_rule_id IS NULL THEN
        RETURN json_build_object(
            'status', 'Error',
            'reason', 'No term rules configured for this school'
        );
    END IF;
    
    -- ========================================================================
    -- STEP 2: Check School Events (HIGHEST PRIORITY)
    -- ========================================================================
    SELECT 
        se.name,
        se.event_type,
        se.is_closure
    INTO event_record
    FROM school_events se
    WHERE 
        se.school_id = target_school_id 
        AND se.event_date = check_date
        AND se.is_closure = TRUE
    LIMIT 1;
    
    IF FOUND THEN
        RETURN json_build_object(
            'status', 'Closed',
            'reason', event_record.name
        );
    END IF;
    
    -- ========================================================================
    -- STEP 3: Check Public Holidays
    -- ========================================================================
    SELECT 
        ph.name
    INTO holiday_record
    FROM public_holidays ph
    WHERE 
        ph.holiday_date = check_date 
        AND ph.state = school_state
    LIMIT 1;
    
    IF FOUND THEN
        RETURN json_build_object(
            'status', 'Closed',
            'reason', holiday_record.name
        );
    END IF;
    
    -- ========================================================================
    -- STEP 4: Check Weekends
    -- ========================================================================
    -- EXTRACT(DOW ...) returns 0=Sunday, 6=Saturday
    day_of_week := EXTRACT(DOW FROM check_date);
    
    IF day_of_week IN (0, 6) THEN
        RETURN json_build_object(
            'status', 'Closed',
            'reason', 'Weekend'
        );
    END IF;
    
    -- ========================================================================
    -- STEP 5: Check Term Dates
    -- ========================================================================
    SELECT 
        tr.term_dates
    INTO term_data
    FROM term_rules tr
    WHERE tr.id = school_term_rule_id;
    
    IF NOT FOUND OR term_data IS NULL THEN
        RETURN json_build_object(
            'status', 'Error',
            'reason', 'Term dates not configured'
        );
    END IF;
    
    -- Loop through each term in the JSONB array
    FOR term_record IN 
        SELECT * FROM jsonb_array_elements(term_data->'terms')
    LOOP
        -- Check if check_date falls within this term's date range
        IF check_date >= (term_record->>'start_date')::DATE 
           AND check_date <= (term_record->>'end_date')::DATE THEN
            RETURN json_build_object(
                'status', 'Open',
                'reason', 'Term ' || (term_record->>'term')
            );
        END IF;
    END LOOP;
    
    -- ========================================================================
    -- STEP 6: Fallback - Outside all terms = School Holidays
    -- ========================================================================
    RETURN json_build_object(
        'status', 'Closed',
        'reason', 'School Holidays'
    );
    
END;
$$;

-- ============================================================================
-- Add function comment for documentation
-- ============================================================================
COMMENT ON FUNCTION check_school_status(DATE, UUID) IS 
'Checks if a school is open or closed on a specific date.
Priority order: School Events > Public Holidays > Weekends > Term Dates.
Returns JSON: {"status": "Open/Closed", "reason": "..."}';

-- ============================================================================
-- EXAMPLE USAGE QUERIES
-- ============================================================================

-- Example 1: Check a specific date for The Gap State School
-- First, get the school_id:
-- SELECT id, name FROM schools WHERE name = 'The Gap State School';

-- Then check the status (replace the UUID with your actual school_id):
-- SELECT check_school_status('2026-02-15'::DATE, 'your-school-uuid-here');

-- Example 2: Check multiple dates for a school
-- SELECT 
--     check_date::DATE,
--     check_school_status(check_date::DATE, 'your-school-uuid-here') as status
-- FROM generate_series(
--     '2026-01-20'::DATE, 
--     '2026-02-10'::DATE, 
--     '1 day'::INTERVAL
-- ) as check_date;

-- Example 3: Check status for all schools on a specific date
-- SELECT 
--     s.name as school_name,
--     check_school_status('2026-01-27'::DATE, s.id) as status
-- FROM schools s
-- WHERE s.suburb = 'The Gap'
-- ORDER BY s.name;

-- Example 4: Find all open days in Term 1 for a school
-- SELECT 
--     check_date::DATE,
--     check_school_status(check_date::DATE, 'your-school-uuid-here')->>'status' as status,
--     check_school_status(check_date::DATE, 'your-school-uuid-here')->>'reason' as reason
-- FROM generate_series(
--     '2026-01-27'::DATE, 
--     '2026-04-02'::DATE, 
--     '1 day'::INTERVAL
-- ) as check_date
-- WHERE check_school_status(check_date::DATE, 'your-school-uuid-here')->>'status' = 'Open';

-- ============================================================================
-- HELPER QUERY: Get School IDs for Testing
-- ============================================================================
-- SELECT 
--     id, 
--     name, 
--     school_type,
--     suburb
-- FROM schools 
-- WHERE postcode = '4061'
-- ORDER BY name;

-- ============================================================================
-- TEST CASES (Uncomment to run tests)
-- ============================================================================

-- Get a test school ID
DO $$
DECLARE
    test_school_id UUID;
    test_result JSON;
BEGIN
    -- Get The Gap State School ID
    SELECT id INTO test_school_id FROM schools WHERE name = 'The Gap State School' LIMIT 1;
    
    IF test_school_id IS NOT NULL THEN
        RAISE NOTICE '========================================';
        RAISE NOTICE 'Testing check_school_status Function';
        RAISE NOTICE '========================================';
        RAISE NOTICE 'School ID: %', test_school_id;
        RAISE NOTICE '';
        
        -- Test 1: Check a regular term day (Tuesday in Term 1)
        test_result := check_school_status('2026-02-03'::DATE, test_school_id);
        RAISE NOTICE 'Test 1 - Regular term day (2026-02-03): %', test_result;
        
        -- Test 2: Check Australia Day (Public Holiday)
        test_result := check_school_status('2026-01-26'::DATE, test_school_id);
        RAISE NOTICE 'Test 2 - Australia Day (2026-01-26): %', test_result;
        
        -- Test 3: Check a weekend (Saturday)
        test_result := check_school_status('2026-01-31'::DATE, test_school_id);
        RAISE NOTICE 'Test 3 - Weekend (2026-01-31): %', test_result;
        
        -- Test 4: Check school holidays (between Term 1 and Term 2)
        test_result := check_school_status('2026-04-10'::DATE, test_school_id);
        RAISE NOTICE 'Test 4 - School Holidays (2026-04-10): %', test_result;
        
        -- Test 5: Check Student Free Day (if exists)
        test_result := check_school_status('2026-01-27'::DATE, test_school_id);
        RAISE NOTICE 'Test 5 - First Day of Term (2026-01-27): %', test_result;
        
        RAISE NOTICE '';
        RAISE NOTICE '✅ All tests completed!';
    ELSE
        RAISE NOTICE '❌ No test school found';
    END IF;
END $$;
