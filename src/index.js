/**
 * Freedom Protocol - Complete Backend
 * Simple, clean implementation with auth, glucose logging, and dashboard
 */

const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

// ============================================
// HEALTH CHECK
// ============================================

app.get('/api/health', (req, res) => {
    res.json({ 
        name: 'Freedom Protocol',
        version: '1.0.0',
        status: 'running'
    });
});

// ============================================
// AUTHENTICATION ROUTES
// ============================================

// Signup
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        // Check if user exists
        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user
        const result = await pool.query(
            `INSERT INTO users (name, email, encrypted_password, phone, created_at)
             VALUES ($1, $2, $3, $4, NOW())
             RETURNING id, name, email, phone, created_at`,
            [name, email, passwordHash, phone]
        );

        const user = result.rows[0];

        // Generate token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Account created successfully',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone
            }
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Failed to create account' });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const result = await pool.query(
            'SELECT id, name, email, encrypted_password as password, phone, created_at FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = result.rows[0];

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                created_at: user.created_at
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

// ============================================
// USER PROFILE ROUTES
// ============================================

app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, email, phone, created_at FROM users WHERE id = $1',
            [req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            user: result.rows[0]
        });

    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// ============================================
// GLUCOSE ROUTES
// ============================================

// Log glucose reading
app.post('/api/metrics/glucose', authenticateToken, async (req, res) => {
    try {
        const { glucose_level, measured_at, notes } = req.body;

        if (!glucose_level || !measured_at) {
            return res.status(400).json({ error: 'Glucose level and measurement time are required' });
        }

        const result = await pool.query(
            `INSERT INTO glucose_readings (user_id, glucose_level, measured_at, notes, created_at)
             VALUES ($1, $2, $3, $4, NOW())
             RETURNING *`,
            [req.user.userId, glucose_level, measured_at, notes]
        );

        res.json({
            success: true,
            message: 'Glucose reading logged successfully',
            reading: result.rows[0]
        });

    } catch (error) {
        console.error('Glucose logging error:', error);
        res.status(500).json({ error: 'Failed to log glucose reading', details: error.message });
    }
});

// Get glucose readings
app.get('/api/metrics/glucose', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM glucose_readings 
             WHERE user_id = $1 
             ORDER BY measured_at DESC`,
            [req.user.userId]
        );

        res.json({
            success: true,
            readings: result.rows
        });

    } catch (error) {
        console.error('Fetch glucose error:', error);
        res.status(500).json({ error: 'Failed to fetch glucose readings' });
    }
});

// ============================================
// ERROR HANDLING
// ============================================

app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// ============================================
// START SERVER
// ============================================

async function startServer() {
        await require('./setup-db').setupDatabase();
    try {
        // Test database connection
        await pool.query('SELECT 1');
        console.log('✅ Database connected');

        app.listen(PORT, () => {
            console.log(`
╔════════════════════════════════════════════╗
║  Freedom Protocol Server Running           ║
║  Port: ${PORT}                                  ║
║  Status: Ready                             ║
╚════════════════════════════════════════════╝
            `);
        });

    } catch (error) {
        console.error('❌ Failed to start:', error);
        process.exit(1);
    }
}

startServer();
