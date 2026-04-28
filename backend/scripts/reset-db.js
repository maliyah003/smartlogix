const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import Models
const Driver = require('../models/driver.model');
const Vehicle = require('../models/vehicle.model');
const Job = require('../models/job.model');
const Trip = require('../models/trip.model');

const resetDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartlogix', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('MongoDB Connected');

        console.log('Clearing Drivers...');
        await Driver.deleteMany({});

        console.log('Clearing Vehicles...');
        await Vehicle.deleteMany({});

        console.log('Clearing Jobs...');
        await Job.deleteMany({});

        console.log('Clearing Trips...');
        await Trip.deleteMany({});

        console.log('All data cleared successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error clearing database:', error);
        process.exit(1);
    }
};

resetDatabase();
