const express = require('express');
const cors = require('cors');
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

