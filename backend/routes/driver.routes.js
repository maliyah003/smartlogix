const express = require('express');
const router = express.Router();
const Driver = require('../models/driver.model');
const Trip = require('../models/trip.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const driverAvailabilityService = require('../services/driverAvailability.service');
const DriverIncident = require('../models/driverIncident.model');
const driverScoringService = require('../services/driverScoring.service');

// If a driver's monthly score falls below this, mark them unavailable (off-duty).
const UNAVAILABLE_SCORE_THRESHOLD = 70;

// GET all drivers
router.get('/', async (req, res) => {
    try {
        const drivers = await Driver.find().sort({ createdAt: -1 });
        res.json({ success: true, count: drivers.length, drivers });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET available drivers (Time-Bound Availability)
router.get('/available', async (req, res) => {
    try {
        const { pickupDatetime, deliveryDatetime } = req.query;

        const availableDrivers = await driverAvailabilityService.getAvailableDrivers(pickupDatetime, deliveryDatetime);

        res.json({ success: true, count: availableDrivers.length, drivers: availableDrivers });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/drivers/:id/incidents
 * Returns recent incidents for the driver.
 * Query:
 *  - limit (default 5, max 20)
 */
router.get('/:id/incidents', async (req, res) => {
    try {
        const driver = await Driver.findById(req.params.id);
        if (!driver) return res.status(404).json({ success: false, error: 'Driver not found' });

        const limitRaw = Number(req.query.limit);
        const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 20) : 5;

        const incidents = await DriverIncident.find({ driver: driver._id })
            .sort({ occurredAt: -1 })
            .limit(limit);

        return res.json({ success: true, count: incidents.length, incidents });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/drivers/:id/incidents
 * Log an incident for a driver (verified incidents affect score depending on category rules).
 */
router.post('/:id/incidents', async (req, res) => {
    try {
        const driver = await Driver.findById(req.params.id);
        if (!driver) return res.status(404).json({ success: false, error: 'Driver not found' });

        const { category, severity, verified = false, meta = {}, occurredAt, vehicle, trip } = req.body || {};
        if (!category || !severity) {
            return res.status(400).json({ success: false, error: 'category and severity are required' });
        }

        const incident = await DriverIncident.create({
            driver: driver._id,
            vehicle: vehicle || null,
            trip: trip || null,
            category,
            severity,
            verified: Boolean(verified),
            meta,
            occurredAt: occurredAt ? new Date(occurredAt) : new Date()
        });

        // Recompute score immediately; if too low, make driver unavailable (unless currently on-trip).
        let statusChanged = false;
        try {
            const scoreSnapshot = await driverScoringService.computeMonthlyDriverScore({ driverId: driver._id });
            if (typeof scoreSnapshot?.score === 'number' && scoreSnapshot.score < UNAVAILABLE_SCORE_THRESHOLD) {
                if (driver.status !== 'on-trip' && driver.status !== 'off-duty') {
                    driver.status = 'off-duty';
                    await driver.save();
                    statusChanged = true;
                }
            }
        } catch (e) {
            // Scoring failure should not block incident logging
            console.error('Failed to recompute driver score after incident:', e?.message || e);
        }

        return res.status(201).json({ success: true, incident, statusChanged, driverStatus: driver.status });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/drivers/:id/score
 * Returns the computed score for the given month (defaults to current month).
 * Query: ?month=YYYY-MM-01 (any date in the target month also works)
 */
router.get('/:id/score', async (req, res) => {
    try {
        const driver = await Driver.findById(req.params.id);
        if (!driver) return res.status(404).json({ success: false, error: 'Driver not found' });

        const month = req.query.month ? new Date(req.query.month) : null;
        const score = await driverScoringService.computeMonthlyDriverScore({
            driverId: driver._id,
            month
        });

        return res.json({ success: true, score });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

// POST check driver status (new vs existing login)
router.post('/check-status', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, error: 'Email is required' });
        }

        const driver = await Driver.findOne({ email });
        if (!driver) {
            return res.status(404).json({ success: false, error: 'Driver not found. Please contact admin.' });
        }

        // isNew is true if there's no password set yet
        res.json({ success: true, exists: true, isNew: !driver.password, driver: { name: driver.name, email: driver.email } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST driver login (Mobile App Authentication)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password are required' });
        }

        // Find driver by email
        const driver = await Driver.findOne({ email });
        if (!driver) {
            return res.status(401).json({ success: false, error: 'Driver not found. Verify email address.' });
        }

        // Check if first-time login (password not set yet)
        if (!driver.password) {
            // Hash the provided password and save it
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            driver.password = hashedPassword;
            await driver.save();
        } else {
            // Password exists, verify it
            const isMatch = await bcrypt.compare(password, driver.password);
            if (!isMatch) {
                return res.status(401).json({ success: false, error: 'Invalid credentials. Incorrect password.' });
            }
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: driver._id, role: 'driver' },
            process.env.JWT_SECRET || 'smartlogix_secret_key_123',
            { expiresIn: '7d' }
        );

        // Don't send the password back to the client
        const driverWithoutPassword = driver.toObject();
        delete driverWithoutPassword.password;

        res.json({ success: true, token, driver: driverWithoutPassword });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST new driver
router.post('/', async (req, res) => {
    try {
        const newDriver = new Driver(req.body);
        await newDriver.save();
        res.status(201).json({ success: true, driver: newDriver });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// GET driver by ID
router.get('/:id', async (req, res) => {
    try {
        const driver = await Driver.findById(req.params.id);
        if (!driver) return res.status(404).json({ success: false, error: 'Driver not found' });
        res.json({ success: true, driver });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT full update driver
router.put('/:id', async (req, res) => {
    try {
        const updatedDriver = await Driver.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!updatedDriver) return res.status(404).json({ success: false, error: 'Driver not found' });
        res.json({ success: true, driver: updatedDriver });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// DELETE driver
router.delete('/:id', async (req, res) => {
    try {
        const driver = await Driver.findById(req.params.id);
        if (!driver) return res.status(404).json({ success: false, error: 'Driver not found' });

        // Ensure driver is not currently assigned to an active trip
        if (driver.status === 'on-trip') {
            return res.status(400).json({ success: false, error: 'Cannot delete a driver who is currently on a trip' });
        }

        await Driver.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Driver deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
