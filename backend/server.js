const express = require('express');
const cors = require('cors');
const cheerio = require('cheerio');
const { initializeDatabase, getDatabase } = require('./database');
const { checkSchoolStatus } = require('./logic');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database on startup
initializeDatabase()
    .then(() => {
        console.log('🚀 Server starting...');
    })
    .catch((err) => {
        console.error('Failed to initialize database:', err);
        process.exit(1);
    });

/**
 * GET /api/schools
 * Get all schools
 */
app.get('/api/schools', (req, res) => {
    const db = getDatabase();
    db.all('SELECT id, name, school_type, suburb, postcode, state FROM schools WHERE is_active = 1 ORDER BY name', [], (err, rows) => {
        if (err) {
            console.error('Error fetching schools:', err);
            res.status(500).json({ error: 'Failed to fetch schools' });
        } else {
            res.json(rows);
        }
    });
});

/**
 * GET /api/check
 * Check if a school is open on a specific date
 * Query params: schoolId, date (YYYY-MM-DD)
 */
app.get('/api/check', async (req, res) => {
    const { schoolId, date } = req.query;

    if (!schoolId || !date) {
        return res.status(400).json({ 
            error: 'Missing required parameters: schoolId and date (YYYY-MM-DD)' 
        });
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ 
            error: 'Invalid date format. Use YYYY-MM-DD' 
        });
    }

    try {
        const result = await checkSchoolStatus(date, schoolId);
        res.json(result);
    } catch (error) {
        console.error('Error checking school status:', error);
        res.status(500).json({ 
            error: 'Failed to check school status',
            message: error.message 
        });
    }
});

/**
 * POST /api/check
 * Alternative endpoint using POST body
 */
app.post('/api/check', async (req, res) => {
    const { schoolId, date } = req.body;

    if (!schoolId || !date) {
        return res.status(400).json({ 
            error: 'Missing required parameters: schoolId and date (YYYY-MM-DD)' 
        });
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ 
            error: 'Invalid date format. Use YYYY-MM-DD' 
        });
    }

    try {
        const result = await checkSchoolStatus(date, schoolId);
        res.json(result);
    } catch (error) {
        console.error('Error checking school status:', error);
        res.status(500).json({ 
            error: 'Failed to check school status',
            message: error.message 
        });
    }
});

/**
 * GET /api/emergency
 * Check for emergency school closures (silent background check)
 * Query params: schoolName, date (YYYY-MM-DD)
 */
app.get('/api/emergency', async (req, res) => {
    const { schoolName, date } = req.query;

    if (!schoolName || !date) {
        return res.status(400).json({ 
            error: 'Missing required parameters: schoolName and date (YYYY-MM-DD)' 
        });
    }

    try {
        // Scrape closures.qld.edu.au for emergency closures
        const response = await fetch('https://closures.qld.edu.au/');
        
        if (!response.ok) {
            throw new Error(`Failed to fetch closures: ${response.status}`);
        }
        
        const html = await response.text();
        const $ = cheerio.load(html);
        
        // Look for the school name in the closures list
        // Note: The actual HTML structure may vary - this is a basic implementation
        let isClosed = false;
        let reason = null;
        let details = null;
        
        // Search for school name in various possible locations
        // This is a simplified check - you may need to adjust based on actual HTML
        $('body').each((i, elem) => {
            const text = $(elem).text().toLowerCase();
            if (text.includes(schoolName.toLowerCase())) {
                isClosed = true;
                
                // Try to extract closure details
                const schoolElement = $(elem).closest('*:contains("' + schoolName + '")');
                if (schoolElement.length > 0) {
                    reason = 'Emergency Closure';
                    // Look for nearby text that might explain the reason
                    const nearbyText = schoolElement.next().text() || 
                                       schoolElement.parent().text();
                    if (nearbyText && nearbyText !== schoolName) {
                        details = nearbyText.trim().substring(0, 200);
                    }
                }
            }
        });
        
        // Also check for common closure reasons
        if ($(':contains("flood")').length > 0 || 
            $(':contains("cyclone")').length > 0 ||
            $(':contains("storm")').length > 0) {
            if (isClosed) {
                reason = reason || 'Weather-related Closure';
            }
        }
        
        res.json({
            isClosed,
            reason,
            details,
            checkedAt: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error checking emergency closures:', error);
        // Don't fail the entire request - just return no emergency
        res.json({
            isClosed: false,
            reason: null,
            details: null,
            checkedAt: new Date().toISOString(),
            error: 'Could not check emergency closures'
        });
    }
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// Start server
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`📚 API endpoints:`);
    console.log(`   GET  /api/schools - Get all schools`);
    console.log(`   GET  /api/check?schoolId=...&date=YYYY-MM-DD - Check school status`);
    console.log(`   POST /api/check - Check school status (body: {schoolId, date})`);
    console.log(`   GET  /api/health - Health check`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down server...');
    const { closeDatabase } = require('./database');
    await closeDatabase();
    process.exit(0);
});






