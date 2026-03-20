require('dotenv').config();
const mongoose = require('mongoose');
const Driver = require('./models/driver.model.js');
const connectDatabase = require('./config/database.js');

async function run() {
    await connectDatabase();
    const drivers = await Driver.find({}, 'name email password');
    console.log('Drivers:', drivers);
    process.exit(0);
}
run();
