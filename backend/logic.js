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
                            // Get next change date
                            findNextChangeDate(checkDate, schoolId, schoolState, schoolTermRuleId, 'Closed')
                                .then(nextChange => {
                                    resolve({
                                        status: 'Closed',
                                        reason: event.name,
                                        schoolName: schoolName,
                                        date: checkDate,
                                        nextChangeDate: nextChange.date,
                                        countdownLabel: nextChange.label,
                                        nextChangeReason: nextChange.reason
                                    });
                                })
                                .catch(reject);
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
                                    // Get next change date
                                    findNextChangeDate(checkDate, schoolId, schoolState, schoolTermRuleId, 'Closed')
                                        .then(nextChange => {
                                            resolve({
                                                status: 'Closed',
                                                reason: holiday.name,
                                                schoolName: schoolName,
                                                date: checkDate,
                                                nextChangeDate: nextChange.date,
                                                countdownLabel: nextChange.label,
                                                nextChangeReason: nextChange.reason
                                            });
                                        })
                                        .catch(reject);
                                    return;
                                }

                                // ========================================================================
                                // STEP 4: Check Weekends
                                // ========================================================================
                                const dateObj = new Date(checkDate + 'T00:00:00');
                                const dayOfWeek = dateObj.getDay(); // 0=Sunday, 6=Saturday

                                if (dayOfWeek === 0 || dayOfWeek === 6) {
                                    // Get next change date
                                    findNextChangeDate(checkDate, schoolId, schoolState, schoolTermRuleId, 'Closed')
                                        .then(nextChange => {
                                            resolve({
                                                status: 'Closed',
                                                reason: dayOfWeek === 0 ? 'Sunday' : 'Saturday',
                                                schoolName: schoolName,
                                                date: checkDate,
                                                nextChangeDate: nextChange.date,
                                                countdownLabel: nextChange.label,
                                                nextChangeReason: nextChange.reason
                                            });
                                        })
                                        .catch(reject);
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
                                                    // Get next change date
                                                    findNextChangeDate(checkDate, schoolId, schoolState, schoolTermRuleId, 'Open')
                                                        .then(nextChange => {
                                                            resolve({
                                                                status: 'Open',
                                                                reason: `Term ${term.term}`,
                                                                schoolName: schoolName,
                                                                date: checkDate,
                                                                nextChangeDate: nextChange.date,
                                                                countdownLabel: nextChange.label,
                                                                nextChangeReason: nextChange.reason
                                                            });
                                                        })
                                                        .catch(reject);
                                                    return;
                                                }
                                            }
                                        }

                                        // ========================================================================
                                        // STEP 6: Fallback - Outside all terms = School Holidays
                                        // ========================================================================
                                        // Get next change date
                                        findNextChangeDate(checkDate, schoolId, schoolState, schoolTermRuleId, 'Closed')
                                            .then(nextChange => {
                                                resolve({
                                                    status: 'Closed',
                                                    reason: 'School Holidays',
                                                    schoolName: schoolName,
                                                    date: checkDate,
                                                    nextChangeDate: nextChange.date,
                                                    countdownLabel: nextChange.label,
                                                    nextChangeReason: nextChange.reason
                                                });
                                            })
                                            .catch(reject);
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

/**
 * Find the next date when the school status changes
 * @param {string} startDate - Starting date in YYYY-MM-DD format
 * @param {string} schoolId - School UUID
 * @param {string} schoolState - School state (e.g., 'QLD')
 * @param {string} schoolTermRuleId - Term rule ID
 * @param {string} currentStatus - Current status ('Open' or 'Closed')
 * @returns {Promise<{date: string, label: string}>}
 */
async function findNextChangeDate(startDate, schoolId, schoolState, schoolTermRuleId, currentStatus) {
    const db = getDatabase();
    const maxDays = 60; // Limit look-ahead to 60 days
    const targetStatus = currentStatus === 'Open' ? 'Closed' : 'Open';

    return new Promise((resolve, reject) => {
        // Helper function to check status of a specific date
        const checkDateStatus = (dateStr) => {
            return new Promise((resolveCheck, rejectCheck) => {
                const dateObj = new Date(dateStr + 'T00:00:00');
                const dayOfWeek = dateObj.getDay();

                // Check weekends first (fast check)
                if (dayOfWeek === 0 || dayOfWeek === 6) {
                    resolveCheck('Closed');
                    return;
                }

                // Check school events
                db.get(
                    `SELECT name, is_closure FROM school_events 
                     WHERE school_id = ? AND event_date = ? AND is_closure = 1 
                     LIMIT 1`,
                    [schoolId, dateStr],
                    (err, event) => {
                        if (err) {
                            rejectCheck(err);
                            return;
                        }
                        if (event) {
                            resolveCheck('Closed');
                            return;
                        }

                        // Check public holidays
                        db.get(
                            `SELECT name FROM public_holidays 
                             WHERE holiday_date = ? AND state = ? 
                             LIMIT 1`,
                            [dateStr, schoolState],
                            (err, holiday) => {
                                if (err) {
                                    rejectCheck(err);
                                    return;
                                }
                                if (holiday) {
                                    resolveCheck('Closed');
                                    return;
                                }

                                // Check term dates
                                db.get(
                                    `SELECT term_dates FROM term_rules WHERE id = ?`,
                                    [schoolTermRuleId],
                                    (err, termRule) => {
                                        if (err) {
                                            rejectCheck(err);
                                            return;
                                        }

                                        if (!termRule || !termRule.term_dates) {
                                            resolveCheck('Closed');
                                            return;
                                        }

                                        try {
                                            const termDates = JSON.parse(termRule.term_dates);
                                            if (termDates.terms && Array.isArray(termDates.terms)) {
                                                for (const term of termDates.terms) {
                                                    if (dateStr >= term.start_date && dateStr <= term.end_date) {
                                                        resolveCheck('Open');
                                                        return;
                                                    }
                                                }
                                            }
                                            resolveCheck('Closed');
                                        } catch (parseErr) {
                                            resolveCheck('Closed');
                                        }
                                    }
                                );
                            }
                        );
                    }
                );
            });
        };

        // Helper function to add days to a date string
        const addDays = (dateStr, days) => {
            const date = new Date(dateStr + 'T00:00:00');
            date.setDate(date.getDate() + days);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        // Iterate day by day to find next change
        let daysChecked = 0;

        const checkNext = () => {
            if (daysChecked >= maxDays) {
                // No change found within 60 days
                resolve({
                    date: null,
                    label: null,
                    reason: null
                });
                return;
            }

            daysChecked++;
            const currentCheckDate = addDays(startDate, daysChecked);

            checkDateStatus(currentCheckDate)
                .then(status => {
                    if (status === targetStatus) {
                        // Found the next change date
                        // Get reason for the label
                        getReasonForDate(currentCheckDate, schoolId, schoolState, schoolTermRuleId, targetStatus)
                            .then(reason => {
                                const label = currentStatus === 'Open' 
                                    ? `Holidays start in...` 
                                    : `School starts in...`;
                                
                                resolve({
                                    date: currentCheckDate,
                                    label: label,
                                    reason: reason
                                });
                            })
                            .catch(() => {
                                // If getting reason fails, still return the date
                                const label = currentStatus === 'Open' 
                                    ? `Holidays start in...` 
                                    : `School starts in...`;
                                resolve({
                                    date: currentCheckDate,
                                    label: label,
                                    reason: null
                                });
                            });
                    } else {
                        // Continue checking next day
                        checkNext();
                    }
                })
                .catch(() => {
                    // On error, continue checking
                    checkNext();
                });
        };

        checkNext();
    });
}

/**
 * Get the reason for a specific date's status
 */
function getReasonForDate(dateStr, schoolId, schoolState, schoolTermRuleId, status) {
    const db = getDatabase();
    
    return new Promise((resolve) => {
        if (status === 'Closed') {
            // Check for school events
            db.get(
                `SELECT name FROM school_events 
                 WHERE school_id = ? AND event_date = ? AND is_closure = 1 
                 LIMIT 1`,
                [schoolId, dateStr],
                (err, event) => {
                    if (event) {
                        resolve(event.name);
                        return;
                    }

                    // Check public holidays
                    db.get(
                        `SELECT name FROM public_holidays 
                         WHERE holiday_date = ? AND state = ? 
                         LIMIT 1`,
                        [dateStr, schoolState],
                        (err, holiday) => {
                            if (holiday) {
                                resolve(holiday.name);
                                return;
                            }

                            // Check weekend
                            const dateObj = new Date(dateStr + 'T00:00:00');
                            const dayOfWeek = dateObj.getDay();
                            if (dayOfWeek === 0 || dayOfWeek === 6) {
                                resolve(dayOfWeek === 0 ? 'Sunday' : 'Saturday');
                                return;
                            }

                            resolve('School Holidays');
                        }
                    );
                }
            );
        } else {
            // For Open status, get term info
            db.get(
                `SELECT term_dates FROM term_rules WHERE id = ?`,
                [schoolTermRuleId],
                (err, termRule) => {
                    if (termRule && termRule.term_dates) {
                        try {
                            const termDates = JSON.parse(termRule.term_dates);
                            if (termDates.terms && Array.isArray(termDates.terms)) {
                                for (const term of termDates.terms) {
                                    if (dateStr >= term.start_date && dateStr <= term.end_date) {
                                        resolve(`Term ${term.term}`);
                                        return;
                                    }
                                }
                            }
                        } catch (e) {
                            // Ignore parse errors
                        }
                    }
                    resolve('School Day');
                }
            );
        }
    });
}

module.exports = {
    checkSchoolStatus
};
