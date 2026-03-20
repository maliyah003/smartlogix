const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    licenseNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true
    },
    contactNumber: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        default: null
    },
    experienceLevel: {
        type: String,
        enum: ['Junior', 'Mid-Level', 'Senior', 'Expert'],
        default: 'Junior'
    },
    safetyScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 100
    },
    status: {
        type: String,
        enum: ['available', 'on-trip', 'off-duty'],
        default: 'available'
    },
    currentVehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        default: null
    },
    currentTrip: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trip',
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Driver', driverSchema);
