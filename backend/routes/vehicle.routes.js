const express = require('express');
const router = express.Router();
const Vehicle = require('../models/vehicle.model');

/**
 * GET /api/vehicles
 * Get all vehicles with optional filtering
 */
router.get('/', async (req, res) => {
    try {
        const { status, type } = req.query;

        const filter = {};
        if (status) filter.status = status;
        if (type) filter.vehicleType = type;

        const vehicles = await Vehicle.find(filter).sort({ registrationNumber: 1 });

        return res.status(200).json({
            success: true,
            count: vehicles.length,
            vehicles: vehicles
        });

    } catch (error) {
        console.error('Get vehicles error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve vehicles',
            details: error.message
        });
    }
});

/**
 * GET /api/vehicles/maintenance/recent
 * Get the 4 most recent maintenance logs globally across the fleet
 */
router.get('/maintenance/recent', async (req, res) => {
    try {
        const MaintenanceLog = require('../models/maintenanceLog.model');
        const logs = await MaintenanceLog.find()
            .populate('vehicle', 'registrationNumber vehicleType model')
            .sort({ createdAt: -1 })
            .limit(4);

        return res.status(200).json({
            success: true,
            logs: logs
        });
    } catch (error) {
        console.error('Get recent global logs error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve recent global maintenance logs',
            details: error.message
        });
    }
});

/**
 * GET /api/vehicles/:id
 * Get vehicle by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.params.id);

        if (!vehicle) {
            return res.status(404).json({
                success: false,
                error: 'Vehicle not found'
            });
        }

        return res.status(200).json({
            success: true,
            vehicle: vehicle
        });

    } catch (error) {
        console.error('Get vehicle error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve vehicle',
            details: error.message
        });
    }
});

/**
 * GET /api/vehicles/:id/maintenance
 * Get maintenance prediction logs for a vehicle
 */
router.get('/:id/maintenance', async (req, res) => {
    try {
        const MaintenanceLog = require('../models/maintenanceLog.model');
        const logs = await MaintenanceLog.find({ vehicle: req.params.id })
            .populate('trip', 'tripId')
            .sort({ createdAt: -1 })
            .limit(10);

        return res.status(200).json({
            success: true,
            count: logs.length,
            logs: logs
        });
    } catch (error) {
        console.error('Get maintenance logs error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve maintenance logs',
            details: error.message
        });
    }
});

/**
 * POST /api/vehicles
 * Create a new vehicle
 */
router.post('/', async (req, res) => {
    try {
        const { registrationNumber, vehicleType, model, capacity, fuelConsumption, licenseEndDate, insuranceEndDate, currentLocation, driver, usageHours, serviceRecords } = req.body;

        if (!registrationNumber || !vehicleType || !model || !capacity || !currentLocation) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        const newVehicle = new Vehicle({
            registrationNumber,
            vehicleType,
            model,
            capacity,
            fuelConsumption,
            licenseEndDate,
            insuranceEndDate,
            currentLocation: {
                type: 'Point',
                coordinates: currentLocation.coordinates
            },
            usageHours: usageHours || 0,
            serviceRecords: serviceRecords || [],
            driver: driver || {},
            status: 'available'
        });

        await newVehicle.save();

        return res.status(201).json({
            success: true,
            message: 'Vehicle created successfully',
            vehicle: newVehicle
        });

    } catch (error) {
        console.error('Create vehicle error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to create vehicle',
            details: error.message
        });
    }
});

/**
 * PATCH /api/vehicles/:id/location
 * Update vehicle location
 */
router.patch('/:id/location', async (req, res) => {
    try {
        const { longitude, latitude } = req.body;

        if (!longitude || !latitude) {
            return res.status(400).json({
                success: false,
                error: 'Longitude and latitude are required'
            });
        }

        const vehicle = await Vehicle.findById(req.params.id);

        if (!vehicle) {
            return res.status(404).json({
                success: false,
                error: 'Vehicle not found'
            });
        }

        await vehicle.updateLocation(longitude, latitude);

        return res.status(200).json({
            success: true,
            message: 'Vehicle location updated',
            vehicle: vehicle
        });

    } catch (error) {
        console.error('Update location error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to update location',
            details: error.message
        });
    }
});

/**
 * PATCH /api/vehicles/:id/status
 * Update vehicle status
 */
router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                error: 'Status is required'
            });
        }

        const vehicle = await Vehicle.findById(req.params.id);

        if (!vehicle) {
            return res.status(404).json({
                success: false,
                error: 'Vehicle not found'
            });
        }

        vehicle.status = status;
        vehicle.lastUpdated = new Date();
        await vehicle.save();

        return res.status(200).json({
            success: true,
            message: 'Vehicle status updated',
            vehicle: vehicle
        });

    } catch (error) {
        console.error('Update status error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to update status',
            details: error.message
        });
    }
});

/**
 * PUT /api/vehicles/:id
 * Update full vehicle details
 */
router.put('/:id', async (req, res) => {
    try {
        const updatedVehicle = await Vehicle.findByIdAndUpdate(
            req.params.id,
            { ...req.body, lastUpdated: new Date() },
            { new: true, runValidators: true }
        );

        if (!updatedVehicle) {
            return res.status(404).json({ success: false, error: 'Vehicle not found' });
        }

        res.json({ success: true, vehicle: updatedVehicle });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/vehicles/:id
 * Delete a vehicle
 */
router.delete('/:id', async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle) {
            return res.status(404).json({ success: false, error: 'Vehicle not found' });
        }

        // Prevent deletion if vehicle is on an active trip (not available or off-duty)
        if (vehicle.status !== 'available' && vehicle.status !== 'maintenance') {
            return res.status(400).json({ success: false, error: `Cannot delete vehicle with status: ${vehicle.status}` });
        }

        await Vehicle.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Vehicle deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
