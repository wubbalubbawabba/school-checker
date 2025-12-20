const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'school_status.db');

// Initialize database connection
let db = null;

/**
 * Initialize database connection
 */
function initDatabase() {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('Error opening database:', err);
                reject(err);
            } else {
                console.log('✅ Connected to SQLite database');
                resolve();
            }
        });
    });
}

/**
 * Create all tables (sequentially to avoid dependency issues)
 */
function createTables() {
    return new Promise((resolve, reject) => {
        const queries = [
            // Drop existing tables if they exist (in reverse dependency order)
            `DROP TABLE IF EXISTS school_events`,
            `DROP TABLE IF EXISTS schools`,
            `DROP TABLE IF EXISTS public_holidays`,
            `DROP TABLE IF EXISTS term_rules`,

            // Create term_rules table (no dependencies)
            `CREATE TABLE term_rules (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                year INTEGER NOT NULL,
                state TEXT NOT NULL,
                term_dates TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now')),
                UNIQUE(name, year, state)
            )`,

            // Create public_holidays table (no dependencies)
            `CREATE TABLE public_holidays (
                id TEXT PRIMARY KEY,
                holiday_date TEXT NOT NULL,
                name TEXT NOT NULL,
                state TEXT NOT NULL,
                year INTEGER NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                UNIQUE(holiday_date, state)
            )`,

            // Create schools table (depends on term_rules)
            `CREATE TABLE schools (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                school_type TEXT NOT NULL,
                suburb TEXT NOT NULL,
                postcode TEXT NOT NULL,
                state TEXT NOT NULL,
                term_rule_id TEXT,
                is_active INTEGER DEFAULT 1,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now')),
                UNIQUE(name, suburb, postcode),
                FOREIGN KEY (term_rule_id) REFERENCES term_rules(id)
            )`,

            // Create school_events table (depends on schools)
            `CREATE TABLE school_events (
                id TEXT PRIMARY KEY,
                school_id TEXT NOT NULL,
                event_date TEXT NOT NULL,
                event_type TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                is_closure INTEGER DEFAULT 1,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
            )`,

            // Create indexes (after tables are created)
            `CREATE INDEX idx_term_rules_year_state ON term_rules(year, state)`,
            `CREATE INDEX idx_public_holidays_state_year ON public_holidays(state, year)`,
            `CREATE INDEX idx_public_holidays_date ON public_holidays(holiday_date)`,
            `CREATE INDEX idx_schools_postcode ON schools(postcode)`,
            `CREATE INDEX idx_schools_suburb ON schools(suburb)`,
            `CREATE INDEX idx_schools_term_rule ON schools(term_rule_id)`,
            `CREATE INDEX idx_school_events_school_date ON school_events(school_id, event_date)`,
            `CREATE INDEX idx_school_events_date ON school_events(event_date)`
        ];

        // Execute queries sequentially
        let currentIndex = 0;
        const executeNext = () => {
            if (currentIndex >= queries.length) {
                console.log('✅ All tables created successfully');
                resolve();
                return;
            }

            db.run(queries[currentIndex], (err) => {
                if (err) {
                    console.error(`Error executing query ${currentIndex + 1}:`, err);
                    reject(err);
                } else {
                    currentIndex++;
                    executeNext();
                }
            });
        };

        executeNext();
    });
}

/**
 * Generate UUID-like string for SQLite
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Seed term rules data
 */
function seedTermRules() {
    return new Promise((resolve, reject) => {
        const termRuleId = generateUUID();
        const termDates = {
            terms: [
                {
                    term: 1,
                    start_date: "2026-01-27",
                    end_date: "2026-04-02"
                },
                {
                    term: 2,
                    start_date: "2026-04-20",
                    end_date: "2026-06-26"
                },
                {
                    term: 3,
                    start_date: "2026-07-13",
                    end_date: "2026-09-18"
                },
                {
                    term: 4,
                    start_date: "2026-10-06",
                    end_date: "2026-12-11"
                }
            ]
        };

        const query = `INSERT INTO term_rules (id, name, year, state, term_dates) VALUES (?, ?, ?, ?, ?)`;
        db.run(query, [termRuleId, 'QLD State Schools 2026', 2026, 'QLD', JSON.stringify(termDates)], (err) => {
            if (err) {
                reject(err);
            } else {
                console.log('✅ Term rules seeded');
                resolve(termRuleId);
            }
        });
    });
}

/**
 * Seed public holidays data
 */
function seedPublicHolidays() {
    return new Promise((resolve, reject) => {
        const holidays = [
            ['2026-01-01', "New Year's Day", 'QLD', 2026],
            ['2026-01-26', 'Australia Day', 'QLD', 2026],
            ['2026-04-03', 'Good Friday', 'QLD', 2026],
            ['2026-04-04', 'Easter Saturday', 'QLD', 2026],
            ['2026-04-06', 'Easter Monday', 'QLD', 2026],
            ['2026-04-25', 'ANZAC Day', 'QLD', 2026],
            ['2026-05-04', 'Labour Day', 'QLD', 2026],
            ['2026-06-08', "King's Birthday", 'QLD', 2026],
            ['2026-08-12', 'Royal Queensland Show (Ekka)', 'QLD', 2026],
            ['2026-12-25', 'Christmas Day', 'QLD', 2026],
            ['2026-12-26', 'Boxing Day', 'QLD', 2026],
            ['2026-12-28', 'Christmas Day (Additional Day)', 'QLD', 2026]
        ];

        const query = `INSERT INTO public_holidays (id, holiday_date, name, state, year) VALUES (?, ?, ?, ?, ?)`;
        const stmt = db.prepare(query);

        holidays.forEach((holiday) => {
            stmt.run([generateUUID(), ...holiday]);
        });

        stmt.finalize((err) => {
            if (err) {
                reject(err);
            } else {
                console.log('✅ Public holidays seeded');
                resolve();
            }
        });
    });
}

/**
 * Seed schools data
 */
function seedSchools(termRuleId) {
    return new Promise((resolve, reject) => {
        const schools = [
            ['The Gap State School', 'State School', 'The Gap', '4061', 'QLD', termRuleId],
            ['The Gap State High School', 'State High School', 'The Gap', '4061', 'QLD', termRuleId],
            ['Payne Road State School', 'State School', 'The Gap', '4061', 'QLD', termRuleId],
            ['Hilder Road State School', 'State School', 'The Gap', '4061', 'QLD', termRuleId]
        ];

        const query = `INSERT INTO schools (id, name, school_type, suburb, postcode, state, term_rule_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`;
        const stmt = db.prepare(query);

        schools.forEach((school) => {
            stmt.run([generateUUID(), ...school]);
        });

        stmt.finalize((err) => {
            if (err) {
                reject(err);
            } else {
                console.log('✅ Schools seeded');
                resolve();
            }
        });
    });
}

/**
 * Seed school events data
 */
function seedSchoolEvents() {
    return new Promise((resolve, reject) => {
        // Get The Gap State School ID
        db.get(`SELECT id FROM schools WHERE name = 'The Gap State School' LIMIT 1`, [], (err, row) => {
            if (err) {
                reject(err);
                return;
            }

            if (row) {
                const query = `INSERT INTO school_events (id, school_id, event_date, event_type, name, description, is_closure) VALUES (?, ?, ?, ?, ?, ?, 1)`;
                db.run(query, [
                    generateUUID(),
                    row.id,
                    '2026-01-27',
                    'Student Free Day',
                    'Staff Preparation Day',
                    'First day of term - staff only'
                ], (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log('✅ School events seeded');
                        resolve();
                    }
                });
            } else {
                console.log('⚠️  No school found for events seeding');
                resolve();
            }
        });
    });
}

/**
 * Initialize and seed the database
 */
async function initializeDatabase() {
    try {
        await initDatabase();
        await createTables();
        const termRuleId = await seedTermRules();
        await seedPublicHolidays();
        await seedSchools(termRuleId);
        await seedSchoolEvents();
        console.log('✅ Database initialization complete!');
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        throw error;
    }
}

/**
 * Get database instance
 */
function getDatabase() {
    if (!db) {
        throw new Error('Database not initialized. Call initializeDatabase() first.');
    }
    return db;
}

/**
 * Close database connection
 */
function closeDatabase() {
    return new Promise((resolve, reject) => {
        if (db) {
            db.close((err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('✅ Database connection closed');
                    resolve();
                }
            });
        } else {
            resolve();
        }
    });
}

module.exports = {
    initializeDatabase,
    getDatabase,
    closeDatabase
};

