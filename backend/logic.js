const { getDatabase } = require('./database');

/**
 * Check if a school is open or closed on a specific date
 * Implements the same priority logic as the PostgreSQL function
 * 
 * Priority order:
 * 1. School Events (is_closure = true)
 * 2. Public Holidays
 * 3. Weekends (Saturday/Sunday)
 * 4. Term Dates (within term = open, outside = holidays)
 * 
 * @param {string} checkDate - Date in YYYY-MM-DD format
 * @param {string} schoolId - School UUID
 * @returns {Promise<Object>} - { status: 'Open'|'Closed'|'Error', reason: string, schoolName?: string, date?: string }
 */
async function checkSchoolStatus(checkDate, schoolId) {
    const db = getDatabase();

    return new Promise((resolve, reject) => {
        // ========================================================================
        // STEP 1: Get school context (state, term_rule_id, name)
        // ========================================================================
        db.get(
            `SELECT state, term_rule_id, name FROM schools WHERE id = ?`,
            [schoolId],
            (err, school) => {
                if (err) {
                    reject(new Error(`Database error: ${err.message}`));
                    return;
                }

                if (!school) {
                    resolve({
                        status: 'Error',
                        reason: 'School not found'
                    });
                    return;
                }

                if (!school.term_rule_id) {
                    resolve({
                        status: 'Error',
                        reason: 'No term rules configured for this school'
                    });
                    return;
                }

                const schoolState = school.state;
                const schoolTermRuleId = school.term_rule_id;
                const schoolName = school.name;

                // ========================================================================
                // STEP 2: Check School Events (HIGHEST PRIORITY)
                // ========================================================================
                db.get(
                    `SELECT name, event_type, is_closure 
                     FROM school_events 
                     WHERE school_id = ? AND event_date = ? AND is_closure = 1 
                     LIMIT 1`,
                    [schoolId, checkDate],
                    (err, event) => {
                        if (err) {
                            reject(new Error(`Database error: ${err.message}`));
                            return;
                        }

                        if (event) {
                            resolve({
                                status: 'Closed',
                                reason: event.name,
                                schoolName: schoolName,
                                date: checkDate
                            });
                            return;
                        }

                        // ========================================================================
                        // STEP 3: Check Public Holidays
                        // ========================================================================
                        db.get(
                            `SELECT name 
                             FROM public_holidays 
                             WHERE holiday_date = ? AND state = ? 
                             LIMIT 1`,
                            [checkDate, schoolState],
                            (err, holiday) => {
                                if (err) {
                                    reject(new Error(`Database error: ${err.message}`));
                                    return;
                                }

                                if (holiday) {
                                    resolve({
                                        status: 'Closed',
                                        reason: holiday.name,
                                        schoolName: schoolName,
                                        date: checkDate
                                    });
                                    return;
                                }

                                // ========================================================================
                                // STEP 4: Check Weekends
                                // ========================================================================
                                const dateObj = new Date(checkDate + 'T00:00:00');
                                const dayOfWeek = dateObj.getDay(); // 0=Sunday, 6=Saturday

                                if (dayOfWeek === 0 || dayOfWeek === 6) {
                                    resolve({
                                        status: 'Closed',
                                        reason: dayOfWeek === 0 ? 'Sunday' : 'Saturday',
                                        schoolName: schoolName,
                                        date: checkDate
                                    });
                                    return;
                                }

                                // ========================================================================
                                // STEP 5: Check Term Dates
                                // ========================================================================
                                db.get(
                                    `SELECT term_dates FROM term_rules WHERE id = ?`,
                                    [schoolTermRuleId],
                                    (err, termRule) => {
                                        if (err) {
                                            reject(new Error(`Database error: ${err.message}`));
                                            return;
                                        }

                                        if (!termRule || !termRule.term_dates) {
                                            resolve({
                                                status: 'Error',
                                                reason: 'Term dates not configured',
                                                schoolName: schoolName,
                                                date: checkDate
                                            });
                                            return;
                                        }

                                        // Parse JSON term dates
                                        let termDates;
                                        try {
                                            termDates = JSON.parse(termRule.term_dates);
                                        } catch (parseErr) {
                                            reject(new Error(`Failed to parse term dates: ${parseErr.message}`));
                                            return;
                                        }

                                        // Check if checkDate falls within any term
                                        // Compare date strings directly (YYYY-MM-DD format) to avoid timezone issues
                                        if (termDates.terms && Array.isArray(termDates.terms)) {
                                            for (const term of termDates.terms) {
                                                // Direct string comparison works for YYYY-MM-DD format
                                                if (checkDate >= term.start_date && checkDate <= term.end_date) {
                                                    resolve({
                                                        status: 'Open',
                                                        reason: `Term ${term.term}`,
                                                        schoolName: schoolName,
                                                        date: checkDate
                                                    });
                                                    return;
                                                }
                                            }
                                        }

                                        // ========================================================================
                                        // STEP 6: Fallback - Outside all terms = School Holidays
                                        // ========================================================================
                                        resolve({
                                            status: 'Closed',
                                            reason: 'School Holidays',
                                            schoolName: schoolName,
                                            date: checkDate
                                        });
                                    }
                                );
                            }
                        );
                    }
                );
            }
        );
    });
}

module.exports = {
    checkSchoolStatus
};

