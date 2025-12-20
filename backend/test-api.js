/**
 * Quick test script to verify the API works
 * Run: node test-api.js
 */

const { initializeDatabase, getDatabase } = require('./database');
const { checkSchoolStatus } = require('./logic');

async function test() {
    try {
        // Initialize database
        await initializeDatabase();
        const db = getDatabase();

        // Get a school ID
        db.get("SELECT id, name FROM schools WHERE name = 'The Gap State School' LIMIT 1", [], async (err, school) => {
            if (err || !school) {
                console.error('❌ Could not find test school');
                process.exit(1);
            }

            console.log(`\n🧪 Testing with school: ${school.name} (${school.id})\n`);

            // Test cases
            const testCases = [
                { date: '2026-01-27', expected: 'Closed', description: 'First day of Term 1 (Staff Preparation Day - school event)' },
                { date: '2026-01-26', expected: 'Closed', description: 'Australia Day (Public Holiday)' },
                { date: '2026-01-31', expected: 'Closed', description: 'Saturday (Weekend)' },
                { date: '2026-02-01', expected: 'Closed', description: 'Sunday (Weekend)' },
                { date: '2026-02-03', expected: 'Open', description: 'Regular term day' },
                { date: '2026-04-10', expected: 'Closed', description: 'School Holidays (between terms)' },
            ];

            for (const testCase of testCases) {
                try {
                    const result = await checkSchoolStatus(testCase.date, school.id);
                    const status = result.status;
                    const icon = status === testCase.expected ? '✅' : '❌';
                    console.log(`${icon} ${testCase.date} - ${status} (${result.reason}) - ${testCase.description || ''}`);
                } catch (error) {
                    console.error(`❌ ${testCase.date} - Error: ${error.message}`);
                }
            }

            console.log('\n✅ Tests completed!\n');
            process.exit(0);
        });
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

test();

