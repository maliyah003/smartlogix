const express = require('express');
const router = express.Router();
const Driver = require('../models/driver.model');
const Trip = require('../models/trip.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

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

        // Step 1: Get drivers who are not explicitly off-duty
        const potentialDrivers = await Driver.find({ status: { $nin: ['off-duty'] } }).sort({ safetyScore: -1 });

        if (!pickupDatetime) {
            // Fallback: If no datetimes provided, return all potential drivers
            return res.json({ success: true, count: potentialDrivers.length, drivers: potentialDrivers });
        }

        const newJobStart = new Date(pickupDatetime);
        // Default to 4 hours if delivery time is missing
        const newJobEnd = deliveryDatetime ? new Date(deliveryDatetime) : new Date(newJobStart.getTime() + (4 * 60 * 60 * 1000));

        // Buffer to ensure driver has time to travel between jobs (1 hour)
        const bufferMs = 60 * 60 * 1000;
        const searchStart = new Date(newJobStart.getTime() - bufferMs);
        const searchEnd = new Date(newJobEnd.getTime() + bufferMs);

        const driverIds = potentialDrivers.map(d => d._id);

        // Step 2: Identify which drivers are busy during this specific time window
        const overlappingTrips = await Trip.find({
            driver: { $in: driverIds },
            status: { $in: ['scheduled', 'active'] }
        }).populate('primaryJob backhaulJob');

        const busyDriverIds = new Set();

        overlappingTrips.forEach(trip => {
            let tripStart, tripEnd;

            if (trip.primaryJob && trip.primaryJob.pickup) {
                tripStart = new Date(trip.primaryJob.pickup.datetime);

                // End time is either backhaul delivery or primary delivery
                if (trip.backhaulJob && trip.backhaulJob.delivery) {
                    tripEnd = new Date(trip.backhaulJob.delivery.datetime);
                } else if (trip.primaryJob.delivery) {
                    tripEnd = new Date(trip.primaryJob.delivery.datetime);
                } else {
                    tripEnd = new Date(tripStart.getTime() + (4 * 60 * 60 * 1000)); // fallback
                }

                // Check if intervals overlap logic: (StartA < EndB) and (EndA > StartB)
                if (searchStart < tripEnd && searchEnd > tripStart) {
                    if (trip.driver) {
                        busyDriverIds.add(trip.driver.toString());
                    }
                }
            }
        });

        // Step 3: Filter down to truly available drivers
        const availableDrivers = potentialDrivers.filter(d => !busyDriverIds.has(d._id.toString()));

        res.json({ success: true, count: availableDrivers.length, drivers: availableDrivers });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
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
