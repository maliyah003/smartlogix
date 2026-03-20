const express = require('express');
const router = express.Router();
const Job = require('../models/job.model');
const Vehicle = require('../models/vehicle.model');
const Trip = require('../models/trip.model');
const loadMatcher = require('../services/loadMatcher.service');
const backhaulFinder = require('../services/backhaulFinder.service');
const routeOptimizer = require('../services/routeOptimizer.service');
const manifestGenerator = require('../services/manifestGenerator.service');
const firebaseService = require('../services/firebase.service');

/**
 * POST /api/jobs/book
 * Book a new job with automatic vehicle matching and backhaul coordination
 */
router.post('/book', async (req, res) => {
    try {
        const { cargo, pickup, delivery, customer, pricing, specialInstructions } = req.body;

        // Debug logging
        console.log('=== JOB BOOKING REQUEST ===');
        console.log('Pickup:', JSON.stringify(pickup, null, 2));
        console.log('Delivery:', JSON.stringify(delivery, null, 2));
        console.log('Cargo:', JSON.stringify(cargo, null, 2));

        // Validate required fields
        if (!cargo || !pickup || !delivery) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: cargo, pickup, delivery'
            });
        }

        // Step 1: Create the job
        const newJob = new Job({
            cargo: {
                weight: cargo.weight,
                volume: cargo.volume,
                description: cargo.description,
                type: cargo.type || 'general'
            },
            pickup: {
                location: {
                    type: 'Point',
                    coordinates: pickup.location.coordinates // Frontend sends pickup.location.coordinates
                },
                address: pickup.address,
                datetime: new Date(pickup.datetime),
                contactName: pickup.contactName,
                contactPhone: pickup.contactPhone
            },
            delivery: {
                location: {
                    type: 'Point',
                    coordinates: delivery.location.coordinates // Frontend sends delivery.location.coordinates
                },
                address: delivery.address,
                datetime: new Date(delivery.datetime),
                contactName: delivery.contactName,
                contactPhone: delivery.contactPhone
            },
            customer: customer || {},
            pricing: pricing || {},
            specialInstructions: specialInstructions || '',
            status: 'pending'
        });

        await newJob.save();

        // Step 2: Find vehicle (User Selected or Best Match)
        let bestVehicleMatch;
        const { vehicleId, driverId } = req.body;

        try {
            if (vehicleId) {
                // User selected a specific vehicle
                const selectedVehicle = await Vehicle.findById(vehicleId);
                if (!selectedVehicle) {
                    return res.status(404).json({
                        success: false,
                        error: 'Selected vehicle not found'
                    });
                }

                // Construct a match object for the response structure
                bestVehicleMatch = {
                    vehicle: selectedVehicle,
                    score: 100,
                    breakdown: ['User Selected']
                };
            } else {
                // Automatic matching
                bestVehicleMatch = await loadMatcher.findBestVehicle({
                    cargo: newJob.cargo,
                    pickup: newJob.pickup
                });
            }
        } catch (error) {
            // No available vehicles
            await Job.findByIdAndUpdate(newJob._id, { status: 'pending' });
            return res.status(200).json({
                success: true,
                message: 'Job created but no vehicles available. Job is pending.',
                job: newJob,
                vehicleAvailable: false
            });
        }

        const assignedVehicle = bestVehicleMatch.vehicle;

        // Step 2.5: Assign Driver
        let assignedDriver = null;
        if (driverId) {
            const Driver = require('../models/driver.model');
            assignedDriver = await Driver.findById(driverId);
            if (!assignedDriver) {
                return res.status(404).json({
                    success: false,
                    error: 'Selected driver not found'
                });
            }
        }

        // Step 3: Search for backhaul opportunities
        const tripDistance = newJob.calculateDistance();
        const estimatedDuration = (tripDistance / 1000) / 60; // Rough estimate: 60 km/h
        const estimatedDeliveryTime = new Date(
            newJob.pickup.datetime.getTime() + (estimatedDuration * 60 * 60 * 1000)
        );

        let backhaulJob = null;
        const { selectedBackhaulId } = req.body;

        if (selectedBackhaulId === 'skip') {
            // User explicitly chose to skip backhaul
            backhaulJob = null;
        } else if (selectedBackhaulId) {
            // User selected a specific backhaul
            backhaulJob = await Job.findById(selectedBackhaulId);
        } else {
            // Fallback to automatic matching (legacy behavior)
            const backhaulOpportunities = await backhaulFinder.findBackhaulOpportunities(
                newJob,
                assignedVehicle.capacity,
                estimatedDeliveryTime,
                { minRadius: 25000, radiusPercentage: 0.20 } // Ensure reliable 25km min search area
            );

            backhaulJob = backhaulOpportunities.length > 0
                ? await Job.findById(backhaulOpportunities[0]._id)
                : null;
        }

        // Step 4: Optimize route with Google Maps / ORS
        const optimizedRoute = await routeOptimizer.optimizeJobRoute(
            newJob,
            backhaulJob,
            assignedVehicle.fuelEfficiency,
            assignedVehicle.vehicleType
        );

        // Step 5: Create trip
        // Step 5: Create trip
        const newTrip = new Trip({
            vehicle: assignedVehicle._id,
            driver: assignedDriver ? assignedDriver._id : null,
            primaryJob: newJob._id,
            backhaulJob: backhaulJob ? backhaulJob._id : null,
            route: {
                coordinates: optimizedRoute.coordinates,
                distance: optimizedRoute.distance,
                duration: optimizedRoute.duration,
                polyline: optimizedRoute.polyline,
                estimatedFuelCost: optimizedRoute.estimatedFuelCost,
                waypointOrder: optimizedRoute.waypointOrder
            },
            status: 'scheduled'
        });

        await newTrip.save();

        // Step 6: Generate digital manifest
        const manifest = manifestGenerator.generateManifest(
            newTrip,
            assignedVehicle,
            newJob,
            backhaulJob,
            optimizedRoute
        );

        newTrip.manifest = manifest;
        await newTrip.save();

        // Step 7: Update job statuses
        newJob.status = 'assigned';
        newJob.assignedVehicle = assignedVehicle._id;
        newJob.assignedTrip = newTrip._id;
        await newJob.save();

        if (backhaulJob) {
            backhaulJob.status = 'assigned';
            backhaulJob.jobType = 'backhaul';
            backhaulJob.assignedVehicle = assignedVehicle._id;
            backhaulJob.assignedTrip = newTrip._id;
            await backhaulJob.save();
        }

        // Step 8: Update vehicle status
        assignedVehicle.status = 'in-transit';
        await assignedVehicle.save();

        // Step 8.5: Update driver status
        if (assignedDriver) {
            assignedDriver.status = 'on-trip';
            assignedDriver.currentVehicle = assignedVehicle._id;
            assignedDriver.currentTrip = newTrip._id;
            await assignedDriver.save();
        }

        // Step 9: Push to Firebase for real-time driver access
        try {
            await firebaseService.pushTripToFirebase(
                newTrip,
                assignedVehicle,
                newJob,
                backhaulJob,
                optimizedRoute
            );
        } catch (firebaseError) {
            console.error('Firebase push failed:', firebaseError.message);
            // Continue - Firebase failure shouldn't break the booking
        }

        // Step 10: Return success response
        return res.status(201).json({
            success: true,
            message: backhaulJob
                ? 'Job booked successfully with backhaul coordination'
                : 'Job booked successfully',
            data: {
                job: {
                    jobId: newJob.jobId,
                    _id: newJob._id,
                    status: newJob.status,
                    cargo: newJob.cargo,
                    pickup: newJob.pickup,
                    delivery: newJob.delivery
                },
                trip: {
                    tripId: newTrip.tripId,
                    _id: newTrip._id,
                    status: newTrip.status
                },
                vehicle: {
                    registrationNumber: assignedVehicle.registrationNumber,
                    type: assignedVehicle.vehicleType,
                    matchScore: bestVehicleMatch.score,
                    matchBreakdown: bestVehicleMatch.breakdown
                },
                driver: assignedDriver ? {
                    name: assignedDriver.name,
                    contactNumber: assignedDriver.contactNumber
                } : null,
                backhaul: backhaulJob ? {
                    jobId: backhaulJob.jobId,
                    cargo: backhaulJob.cargo,
                    pickup: backhaulJob.pickup.address,
                    delivery: backhaulJob.delivery.address,
                    pickupCoordinates: backhaulJob.pickup.location.coordinates,
                    deliveryCoordinates: backhaulJob.delivery.location.coordinates,
                    savings: manifest.economics.fuelCostSavings
                } : null,
                route: {
                    distance: `${(optimizedRoute.distance / 1000).toFixed(2)} km`,
                    duration: `${(optimizedRoute.duration / 3600).toFixed(2)} hours`,
                    estimatedFuelCost: `LKR ${optimizedRoute.estimatedFuelCost}`,
                    coordinates: optimizedRoute.coordinates
                },
                economics: manifest.economics,
                manifest: manifest
            }
        });

    } catch (error) {
        console.error('Job booking error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to book job',
            details: error.message
        });
    }
});

/**
 * GET /api/jobs/backhaul
 * Find backhaul opportunities near a location
 * Query params: lat, lng, vehicleId, radius (optional)
 */
router.get('/backhaul', async (req, res) => {
    try {
        const { lat, lng, vehicleId, radius } = req.query;

        // Validate required params
        if (!lat || !lng || !vehicleId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters: lat, lng, vehicleId'
            });
        }

        // Get vehicle capacity
        const vehicle = await Vehicle.findById(vehicleId);
        if (!vehicle) {
            return res.status(404).json({
                success: false,
                error: 'Vehicle not found'
            });
        }

        // Search for backhaul opportunities
        const coordinates = [parseFloat(lng), parseFloat(lat)];
        const searchRadius = radius ? parseInt(radius) * 1000 : 50000; // Convert km to meters (default 50km)

        let availableFromDate = new Date(); // From now
        if (req.query.availableFrom) {
            const parsedDate = new Date(req.query.availableFrom);
            if (!isNaN(parsedDate.getTime())) {
                availableFromDate = parsedDate;
            }
        }

        const opportunities = await backhaulFinder.findBackhaulByLocation(
            coordinates,
            vehicle.capacity,
            availableFromDate,
            searchRadius
        );

        return res.status(200).json({
            success: true,
            count: opportunities.length,
            searchLocation: {
                latitude: parseFloat(lat),
                longitude: parseFloat(lng)
            },
            searchRadius: `${searchRadius / 1000} km`,
            vehicle: {
                registrationNumber: vehicle.registrationNumber,
                capacity: vehicle.capacity
            },
            opportunities: opportunities
        });

    } catch (error) {
        console.error('Backhaul search error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to search for backhaul opportunities',
            details: error.message
        });
    }
});

/**
 * GET /api/jobs/:jobId
 * Get job details by ID
 */
router.get('/:jobId', async (req, res) => {
    try {
        const job = await Job.findOne({ jobId: req.params.jobId })
            .populate('assignedVehicle')
            .populate('assignedTrip');

        if (!job) {
            return res.status(404).json({
                success: false,
                error: 'Job not found'
            });
        }

        return res.status(200).json({
            success: true,
            job: job
        });

    } catch (error) {
        console.error('Get job error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve job',
            details: error.message
        });
    }
});

/**
 * GET /api/jobs
 * Get all jobs with optional filtering
 * Query params: status, limit, skip
 */
router.get('/', async (req, res) => {
    try {
        const { status, limit = 50, skip = 0 } = req.query;

        const filter = status ? { status } : {};

        const jobs = await Job.find(filter)
            .limit(parseInt(limit))
            .skip(parseInt(skip))
            .sort({ createdAt: -1 })
            .populate('assignedVehicle', 'registrationNumber vehicleType')
            .populate({
                path: 'assignedTrip',
                select: 'tripId status driver route',
                populate: {
                    path: 'driver',
                    select: 'name contactNumber'
                }
            });

        const total = await Job.countDocuments(filter);

        return res.status(200).json({
            success: true,
            count: jobs.length,
            total: total,
            jobs: jobs
        });

    } catch (error) {
        console.error('Get jobs error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve jobs',
            details: error.message
        });
    }
});

/**
 * POST /api/jobs/match
 * Get vehicle matches for a hypothetical job (without creating it)
 */
router.post('/match', async (req, res) => {
    try {
        const { cargo, pickup, delivery } = req.body;

        if (!cargo || !pickup || !delivery) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: cargo, pickup, delivery'
            });
        }

        const matches = await loadMatcher.getAllMatchedVehicles({
            cargo: cargo,
            pickup: pickup,
            delivery: delivery
        });

        return res.status(200).json({
            success: true,
            count: matches.length,
            bestMatch: matches[0] || null,
            allMatches: matches
        });

    } catch (error) {
        console.error('Vehicle matching error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to find vehicle matches',
            details: error.message
        });
    }
});

module.exports = router;
