const Vehicle = require('../models/vehicle.model');
const MaintenanceLog = require('../models/maintenanceLog.model');
const axios = require('axios');

/** Run the predictive model and create a maintenance log every N completed trips per vehicle. */
const TRIPS_PER_PREDICTION = 5;

/**
 * On each completed trip: always updates vehicle usage hours and a per-vehicle trip counter.
 * The ML model and maintenance log run only every {@link TRIPS_PER_PREDICTION} trips for that vehicle.
 *
 * @param {Object} trip - The completed Mongoose trip document
 */
exports.calculateAndLogPrediction = async (trip) => {
    try {
        if (!trip.vehicle) return;

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

        const vehicle = await Vehicle.findOneAndUpdate(
            { _id: trip.vehicle },
            {
                $inc: {
                    usageHours: tripDurationHours,
                    tripsSinceMaintenancePrediction: 1
                }
            },
            { new: true }
        );

        if (!vehicle) return;

        if (vehicle.tripsSinceMaintenancePrediction % TRIPS_PER_PREDICTION !== 0) {
            return;
        }

        await trip.populate('primaryJob');

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
    } catch (e) {
        console.error('Error in predictive maintenance calculation:', e);
    }
};
