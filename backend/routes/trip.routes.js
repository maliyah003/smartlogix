const express = require('express');
const router = express.Router();
const Trip = require('../models/trip.model');
const Notification = require('../models/notification.model');
const firebaseService = require('../services/firebase.service');

/**
 * GET /api/trips
 * Get a list of all trips
 */
router.get('/', async (req, res) => {
    try {
        const trips = await Trip.find()
            .populate('vehicle')
            .populate('driver')
            .populate('primaryJob')
            .populate('backhaulJob')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: trips.length,
            trips: trips
        });
    } catch (error) {
        console.error('Get all trips error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve trips',
            details: error.message
        });
    }
});

/**
 * GET /api/trips/:tripId
 * Get trip details by ID
 */
router.get('/:tripId', async (req, res) => {
    try {
        const trip = await Trip.findOne({ tripId: req.params.tripId })
            .populate('vehicle')
            .populate('driver')
            .populate('primaryJob')
            .populate('backhaulJob');

        if (!trip) {
            return res.status(404).json({
                success: false,
                error: 'Trip not found'
            });
        }

        return res.status(200).json({
            success: true,
            trip: trip
        });

    } catch (error) {
        console.error('Get trip error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve trip',
            details: error.message
        });
    }
});

/**
 * GET /api/trips/driver/:driverId
 * Get active or scheduled trips for a specific driver (Mobile App)
 */
router.get('/driver/:driverId', async (req, res) => {
    try {
        const trips = await Trip.find({
            driver: req.params.driverId
        })
            .populate('vehicle')
            .populate('primaryJob')
            .populate('backhaulJob')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: trips.length,
            trips: trips
        });

    } catch (error) {
        console.error('Get driver trips error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve driver trips',
            details: error.message
        });
    }
});

/**
 * PATCH /api/trips/:tripId/status
 * Update trip status
 */
router.patch('/:tripId/status', async (req, res) => {
    try {
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                error: 'Status is required'
            });
        }

        const trip = await Trip.findOne({ tripId: req.params.tripId });

        if (!trip) {
            return res.status(404).json({
                success: false,
                error: 'Trip not found'
            });
        }

        trip.status = status;

        if (status === 'active') {
             if (!trip.actualTimes) trip.actualTimes = {};
             trip.actualTimes.startTime = new Date();
        }

        if (status === 'completed') {
            trip.completedAt = new Date();
            if (!trip.actualTimes) trip.actualTimes = {};
            trip.actualTimes.endTime = new Date();
            
            // Run background task for predictive maintenance calculation
            (async () => {
                try {
                    const Vehicle = require('../models/vehicle.model');
                    const MaintenanceLog = require('../models/maintenanceLog.model');
                    const axios = require('axios');
                    
                    const vehicle = await Vehicle.findById(trip.vehicle);
                    await trip.populate('primaryJob');
                    
                    if (vehicle) {
                        // usage_hours increments by total trip duration (trip + return) in hours
                        let tripDurationHours = 2; // fallback
                        
                        // Use real tracked hours if the driver successfully flowed through Active -> Completed
                        if (trip.actualTimes && trip.actualTimes.startTime && trip.actualTimes.endTime) {
                            const realDurationMs = trip.actualTimes.endTime.getTime() - trip.actualTimes.startTime.getTime();
                            tripDurationHours = (realDurationMs / 3600000) * 2; // Exact logged hours * 2 (Return Journey)
                        } else if (trip.route && trip.route.duration) {
                            // Fallback to routing estimate testing/bypassed trips
                            tripDurationHours = (trip.route.duration / 3600) * 2;
                        }
                        
                        vehicle.usageHours = (vehicle.usageHours || 0) + tripDurationHours;
                        await vehicle.save();

                        // Compute route type dynamically based on average speed heuristic
                        // speed = distance (m) / duration (s) * 3.6 = km/h
                        let dynamicRouteType = 'Rural';
                        if (trip.route && trip.route.distance && trip.route.duration) {
                            const avgSpeedKmH = (trip.route.distance / trip.route.duration) * 3.6;
                            if (avgSpeedKmH > 65) {
                                dynamicRouteType = 'Highway';
                            } else if (avgSpeedKmH < 35) {
                                dynamicRouteType = 'Urban';
                            }
                        }
                        
                        // Map vehicleType to "Truck" / "Van" format for model
                        const vehicleTypeML = ['van', 'Van'].includes(vehicle.vehicleType) ? 'Van' : 'Truck';
                        
                        // Convert capacity weight (kg) to tons
                        const loadCapacity = vehicle.capacity && vehicle.capacity.weight ? (vehicle.capacity.weight / 1000) : 20.0;
                        
                        // Convert primary job weight (kg) to tons
                        let actualLoad = 0;
                        if (trip.primaryJob && trip.primaryJob.cargo && trip.primaryJob.cargo.weight) {
                            actualLoad = trip.primaryJob.cargo.weight / 1000;
                        } else {
                            actualLoad = 18.5; // fallback
                        }
                        
                        // Calculate days since service
                        let daysSinceService = 300;
                        if (vehicle.serviceRecords && vehicle.serviceRecords.length > 0) {
                            const sortedRecords = [...vehicle.serviceRecords].sort((a,b) => b.date - a.date);
                            const lastService = sortedRecords[0].date;
                            daysSinceService = Math.floor((Date.now() - new Date(lastService).getTime()) / (1000 * 3600 * 24));
                        } else if (vehicle.createdAt) {
                            daysSinceService = Math.floor((Date.now() - new Date(vehicle.createdAt).getTime()) / (1000 * 3600 * 24));
                        }
                        
                        const mlPayload = {
                           "vehicle_type": vehicleTypeML,
                           "usage_hours": Math.round(vehicle.usageHours * 10) / 10, // Round to 1 decimal place
                           "route_info": dynamicRouteType,
                           "actual_load": Math.round(actualLoad * 10) / 10, // Round to 1 decimal place
                           "load_capacity": Math.round(loadCapacity * 10) / 10, // Round to 1 decimal place
                           "days_since_service": Math.max(0, daysSinceService)
                        };
                        
                        // Make POST to local predictive ML model
                        try {
                            const mlResponse = await axios.post('http://127.0.0.1:5004/predict', mlPayload, {
                                headers: { 'Content-Type': 'application/json' }
                            });
                            
                            // Save prediction results
                            await MaintenanceLog.create({
                                vehicle: vehicle._id,
                                trip: trip._id,
                                metrics: mlPayload,
                                prediction: mlResponse.data
                            });
                        } catch (mlErr) {
                            console.error('Predictive ML endpoint unreachable:', mlErr.message);
                            // Save the log even if prediction service is down
                            await MaintenanceLog.create({
                                vehicle: vehicle._id,
                                trip: trip._id,
                                metrics: mlPayload,
                                prediction: { error: 'Failed to communicate with predictive model at port 5004' }
                            });
                        }
                    }
                } catch(e) {
                    console.error('Error in predictive maintenance background hook:', e);
                }
            })();
        }

        await trip.save();

        // Update Firebase
        await firebaseService.updateTripStatus(trip.tripId, status);

        // Notify Web App Admin
        if (status === 'active') {
            await Notification.create({
                title: 'Trip Started',
                message: `Driver has started ${trip.tripId}`,
                type: 'trip_started',
                link: '/trips'
            });
        } else if (status === 'completed') {
            await Notification.create({
                title: 'Trip Completed',
                message: `Driver has successfully completed ${trip.tripId}`,
                type: 'trip_completed',
                link: '/trips'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Trip status updated',
            trip: trip
        });

    } catch (error) {
        console.error('Update trip status error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to update trip status',
            details: error.message
        });
    }
});

/**
 * POST /api/trips/:tripId/position
 * Update driver's current position
 */
router.post('/:tripId/position', async (req, res) => {
    try {
        const { longitude, latitude } = req.body;

        if (!longitude || !latitude) {
            return res.status(400).json({
                success: false,
                error: 'Longitude and latitude are required'
            });
        }

        const trip = await Trip.findOne({ tripId: req.params.tripId });

        if (!trip) {
            return res.status(404).json({
                success: false,
                error: 'Trip not found'
            });
        }

        // Update in MongoDB
        await trip.updatePosition(longitude, latitude);

        // Update in Firebase for real-time tracking
        await firebaseService.updateDriverPosition(
            trip.tripId,
            longitude,
            latitude
        );

        return res.status(200).json({
            success: true,
            message: 'Position updated'
        });

    } catch (error) {
        console.error('Update position error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to update position',
            details: error.message
        });
    }
});

/**
 * DELETE /api/trips/:tripId
 * Delete a trip and release its assigned jobs and vehicle.
 */
router.delete('/:tripId', async (req, res) => {
    try {
        const trip = await Trip.findOne({ tripId: req.params.tripId });

        if (!trip) {
            return res.status(404).json({
                success: false,
                error: 'Trip not found'
            });
        }

        const Job = require('../models/job.model');
        const Vehicle = require('../models/vehicle.model');
        const Driver = require('../models/driver.model');

        // Free up the primary job
        if (trip.primaryJob) {
            await Job.findByIdAndUpdate(trip.primaryJob, {
                status: 'pending',
                $unset: { assignedVehicle: 1, assignedTrip: 1 }
            });
        }

        // Free up the backhaul job if it exists
        if (trip.backhaulJob) {
            await Job.findByIdAndUpdate(trip.backhaulJob, {
                status: 'pending',
                $unset: { assignedVehicle: 1, assignedTrip: 1 }
            });
        }

        // Free up the Vehicle
        if (trip.vehicle) {
            await Vehicle.findByIdAndUpdate(trip.vehicle, {
                status: 'available',
                $unset: { currentTrip: 1 }
            });
        }

        // Free up the Driver
        if (trip.driver) {
            await Driver.findByIdAndUpdate(trip.driver, {
                status: 'available',
                $unset: { currentTrip: 1, currentVehicle: 1 }
            });
        }

        // Remove the trip itself
        await Trip.findByIdAndDelete(trip._id);

        return res.status(200).json({
            success: true,
            message: 'Trip successfully deleted. Assocaited jobs and resources are now available.'
        });

    } catch (error) {
        console.error('Delete trip error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to delete trip',
            details: error.message
        });
    }
});

/**
 * POST /api/trips/:tripId/refuse
 * Driver requests to refuse a trip with a reason.
 */
router.post('/:tripId/refuse', async (req, res) => {
    try {
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({
                success: false,
                error: 'Reason is required for refusing a trip'
            });
        }

        const trip = await Trip.findOne({ tripId: req.params.tripId });

        if (!trip) {
            return res.status(404).json({ success: false, error: 'Trip not found' });
        }

        // Set the refusal request to pending
        trip.refusalRequest = {
            requested: true,
            reason: reason,
            status: 'pending'
        };

        await trip.save();

        // Spawn a Dashboard Notification for the Admin
        await Notification.create({
            title: 'Trip Refusal Request',
            message: `Driver for ${trip.tripId} requested to refuse the trip: "${reason}"`,
            type: 'trip_refused',
            link: '/refusals'
        });

        return res.status(200).json({
            success: true,
            message: 'Trip refusal request submitted successfully'
        });

    } catch (error) {
        console.error('Refuse trip error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to submit trip refusal',
            details: error.message
        });
    }
});

/**
 * POST /api/trips/:tripId/refuse/approve
 * Admin approves a refusal request and reassigns the trip to a new driver.
 */
router.post('/:tripId/refuse/approve', async (req, res) => {
    try {
        const { newDriverId } = req.body;
        if (!newDriverId) {
            return res.status(400).json({ success: false, error: 'newDriverId is required to reassign the trip' });
        }

        const trip = await Trip.findOne({ tripId: req.params.tripId });

        if (!trip) {
            return res.status(404).json({ success: false, error: 'Trip not found' });
        }

        const Driver = require('../models/driver.model');
        const Notification = require('../models/notification.model');

        const oldDriverId = trip.driver;

        // Free up the old Driver
        if (oldDriverId) {
            await Driver.findByIdAndUpdate(oldDriverId, {
                status: 'available',
                $unset: { currentTrip: 1, currentVehicle: 1 }
            });
        }

        // Assign the new driver
        await Driver.findByIdAndUpdate(newDriverId, {
            status: 'on-trip',
            currentTrip: trip._id,
            currentVehicle: trip.vehicle
        });

        // Update the Trip document with the new driver and reset refusal state
        trip.driver = newDriverId;
        trip.refusalRequest = {
            requested: false,
            reason: '',
            status: 'pending' // reset to default
        };
        await trip.save();

        if (oldDriverId) {
            // Notify the old driver that their refusal was approved
            await Notification.create({
                title: 'Trip Refusal Reassigned',
                message: `Your refusal for ${trip.tripId} was approved. The trip has been reassigned to another driver.`,
                type: 'trip_refused',
                driverId: oldDriverId
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Trip refusal approved. Trip reassigned successfully.'
        });

    } catch (error) {
        console.error('Approve trip refusal error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to approve trip refusal',
            details: error.message
        });
    }
});

/**
 * POST /api/trips/:tripId/refuse/reject
 * Admin rejects a refusal request. This resets the refusal status to 'rejected' and the driver is expected to complete the trip.
 */
router.post('/:tripId/refuse/reject', async (req, res) => {
    try {
        const trip = await Trip.findOne({ tripId: req.params.tripId });

        if (!trip) {
            return res.status(404).json({ success: false, error: 'Trip not found' });
        }

        const Notification = require('../models/notification.model');

        // Set the refusal request to rejected so the driver knows they must complete it
        trip.refusalRequest = {
            requested: false,
            reason: '',
            status: 'rejected'
        };

        await trip.save();

        if (trip.driver) {
            await Notification.create({
                title: 'Trip Refusal Denied',
                message: `Your refusal for ${trip.tripId} was denied by dispatch. You are required to complete this trip.`,
                type: 'system',
                driverId: trip.driver
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Trip refusal rejected. Trip will remain assigned to the driver.'
        });

    } catch (error) {
        console.error('Reject trip refusal error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to reject trip refusal',
            details: error.message
        });
    }
});

module.exports = router;
