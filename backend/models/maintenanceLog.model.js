const mongoose = require('mongoose');

const maintenanceLogSchema = new mongoose.Schema({
    vehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        required: true
    },
    trip: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trip'
    },
    metrics: {
        vehicle_type: String,
        usage_hours: Number,
        route_info: String,
        actual_load: Number,
        load_capacity: Number,
        days_since_service: Number
    },
    prediction: {
        type: mongoose.Schema.Types.Mixed
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

maintenanceLogSchema.index({ vehicle: 1, createdAt: -1 });

module.exports = mongoose.model('MaintenanceLog', maintenanceLogSchema);
