-- ============================================================================
-- School Status App Database Schema
-- Target: The Gap, QLD (Postcode 4061) - Public Schools Only
-- Year: 2026
-- ============================================================================

-- Drop existing tables if they exist (for clean re-runs)
DROP TABLE IF EXISTS school_events CASCADE;
DROP TABLE IF EXISTS schools CASCADE;
DROP TABLE IF EXISTS public_holidays CASCADE;
DROP TABLE IF EXISTS term_rules CASCADE;

-- ============================================================================
-- TABLE: term_rules
-- Stores the official term date structures for a state/region
-- ============================================================================
CREATE TABLE term_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL, -- e.g., "QLD State Schools"
    year INTEGER NOT NULL,
    state VARCHAR(10) NOT NULL, -- e.g., "QLD"
    term_dates JSONB NOT NULL, -- Flexible structure for multiple terms
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(name, year, state)
);

-- Add index for efficient querying
CREATE INDEX idx_term_rules_year_state ON term_rules(year, state);

-- ============================================================================
-- TABLE: public_holidays
-- Stores state-wide public holidays
-- ============================================================================
CREATE TABLE public_holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    holiday_date DATE NOT NULL,
    name VARCHAR(200) NOT NULL,
    state VARCHAR(10) NOT NULL, -- e.g., "QLD"
    year INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(holiday_date, state)
);

-- Add index for efficient querying
CREATE INDEX idx_public_holidays_state_year ON public_holidays(state, year);
CREATE INDEX idx_public_holidays_date ON public_holidays(holiday_date);

-- ============================================================================
-- TABLE: schools
-- Stores school information
-- ============================================================================
CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    school_type VARCHAR(50) NOT NULL, -- e.g., "State School", "State High School"
    suburb VARCHAR(100) NOT NULL,
    postcode VARCHAR(10) NOT NULL,
    state VARCHAR(10) NOT NULL,
    term_rule_id UUID REFERENCES term_rules(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(name, suburb, postcode)
);

-- Add indexes for efficient querying
CREATE INDEX idx_schools_postcode ON schools(postcode);
CREATE INDEX idx_schools_suburb ON schools(suburb);
CREATE INDEX idx_schools_term_rule ON schools(term_rule_id);

-- ============================================================================
-- TABLE: school_events
-- Stores school-specific events (Student Free Days, closures, etc.)
-- ============================================================================
CREATE TABLE school_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    event_date DATE NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- e.g., "Student Free Day", "Show Holiday", "Emergency Closure"
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_closure BOOLEAN DEFAULT TRUE, -- TRUE = school closed, FALSE = special event but open
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for efficient querying
CREATE INDEX idx_school_events_school_date ON school_events(school_id, event_date);
CREATE INDEX idx_school_events_date ON school_events(event_date);

-- ============================================================================
-- SEED DATA: Term Rules (QLD 2026)
-- ============================================================================
INSERT INTO term_rules (name, year, state, term_dates) VALUES
(
    'QLD State Schools 2026',
    2026,
    'QLD',
    '{
        "terms": [
            {
                "term": 1,
                "start_date": "2026-01-27",
                "end_date": "2026-04-02"
            },
            {
                "term": 2,
                "start_date": "2026-04-20",
                "end_date": "2026-06-26"
            },
            {
                "term": 3,
                "start_date": "2026-07-13",
                "end_date": "2026-09-18"
            },
            {
                "term": 4,
                "start_date": "2026-10-06",
                "end_date": "2026-12-11"
            }
        ]
    }'::JSONB
);

-- ============================================================================
-- SEED DATA: Public Holidays (QLD 2026)
-- ============================================================================
INSERT INTO public_holidays (holiday_date, name, state, year) VALUES
-- January
('2026-01-01', 'New Year''s Day', 'QLD', 2026),
('2026-01-26', 'Australia Day', 'QLD', 2026),

-- April (Easter - dates vary yearly, 2026 Easter Sunday is April 5)
('2026-04-03', 'Good Friday', 'QLD', 2026),
('2026-04-04', 'The day after Good Friday', 'QLD', 2026),
('2026-04-05', 'Easter Sunday‘, 'QLD', 2026),
('2026-04-06', 'Easter Monday', 'QLD', 2026),
('2026-04-25', 'ANZAC Day', 'QLD', 2026),

-- May
('2026-05-04', 'Labour Day', 'QLD', 2026),

-- August (Royal Queensland Show - Brisbane area)
('2026-08-12', 'Ekka', 'QLD', 2026),

-- October
('2026-10-05', 'King''s Birthday', 'QLD', 2026),

-- December
('2026-12-25', 'Christmas Day', 'QLD', 2026),
('2026-12-26', 'Boxing Day', 'QLD', 2026),
('2026-12-28', 'Boxing Day', 'QLD', 2026);

-- ============================================================================
-- SEED DATA: Schools (The Gap, QLD 4061)
-- ============================================================================

-- First, get the term_rule_id for QLD 2026
DO $$
DECLARE
    qld_term_rule_id UUID;
BEGIN
    SELECT id INTO qld_term_rule_id 
    FROM term_rules 
    WHERE name = 'QLD State Schools 2026' AND year = 2026 AND state = 'QLD';
    
    -- Insert schools
    INSERT INTO schools (name, school_type, suburb, postcode, state, term_rule_id, is_active) VALUES
    ('The Gap State School', 'State School', 'The Gap', '4061', 'QLD', qld_term_rule_id, TRUE),
    ('The Gap State High School', 'State High School', 'The Gap', '4061', 'QLD', qld_term_rule_id, TRUE),
    ('Payne Road State School', 'State School', 'The Gap', '4061', 'QLD', qld_term_rule_id, TRUE),
    ('Hilder Road State School', 'State School', 'The Gap', '4061', 'QLD', qld_term_rule_id, TRUE);
END $$;


-- ============================================================================
-- SEED DATA: School Events
-- ============================================================================
INSERT INTO school_events (school_id, event_date, event_type, name, description, is_closure)
SELECT 
    id,
    '2026-09-04', 
    'Student Free Day', 
    'Staff PD Day', 
    'Staff only - State Wide', 
    TRUE
FROM schools 
WHERE postcode = '4061' 
  AND school_type IN ('State School', 'State High School'); 
  
-- ============================================================================
-- USEFUL QUERIES (Reference Only - Not Executed)
-- ============================================================================

-- Query 1: Get all schools with their term dates
-- SELECT 
--     s.name,
--     s.school_type,
--     tr.term_dates
-- FROM schools s
-- LEFT JOIN term_rules tr ON s.term_rule_id = tr.id
-- WHERE s.postcode = '4061';

-- Query 2: Check if a specific date is a school day
-- WITH date_to_check AS (
--     SELECT '2026-02-15'::DATE as check_date
-- )
-- SELECT 
--     s.name,
--     CASE 
--         WHEN EXTRACT(DOW FROM dtc.check_date) IN (0, 6) THEN 'Weekend - Closed'
--         WHEN EXISTS (SELECT 1 FROM public_holidays ph WHERE ph.holiday_date = dtc.check_date AND ph.state = 'QLD') THEN 'Public Holiday - Closed'
--         WHEN EXISTS (SELECT 1 FROM school_events se WHERE se.school_id = s.id AND se.event_date = dtc.check_date AND se.is_closure = TRUE) THEN 'School Event - Closed'
--         ELSE 'Open'
--     END as status
-- FROM schools s, date_to_check dtc
-- WHERE s.postcode = '4061';

-- Query 3: List all public holidays in 2026
-- SELECT holiday_date, name 
-- FROM public_holidays 
-- WHERE state = 'QLD' AND year = 2026 
-- ORDER BY holiday_date;

-- ============================================================================
-- COMMENTS & DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE term_rules IS 'Stores official term date structures for states/regions';
COMMENT ON TABLE public_holidays IS 'Stores state-wide public holidays that apply to all schools';
COMMENT ON TABLE schools IS 'Stores school information and links to term rules';
COMMENT ON TABLE school_events IS 'Stores school-specific events and closures (Level 3 overrides)';

COMMENT ON COLUMN term_rules.term_dates IS 'JSONB structure containing array of terms with start_date and end_date';
COMMENT ON COLUMN public_holidays.holiday_date IS 'Date of the public holiday';
COMMENT ON COLUMN school_events.is_closure IS 'TRUE if school is closed on this date, FALSE if it is a special event but school remains open';

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ School Status App database schema created successfully!';
    RAISE NOTICE '📊 Tables created: term_rules, public_holidays, schools, school_events';
    RAISE NOTICE '🏫 Seeded 4 schools in The Gap, QLD (4061)';
    RAISE NOTICE '📅 Loaded QLD 2026 term dates and public holidays';
END $$;