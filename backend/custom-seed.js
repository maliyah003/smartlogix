// Custom Data Seeder for SmartLogix
// Run this with: node custom-seed.js

const mongoose = require('mongoose');
require('dotenv').config();

// Define schemas inline instead of requiring models, since we want to avoid relying on exact model definitions if they changed
const DriverSchema = new mongoose.Schema({
    name: String,
    phone: String,
    licenseNumber: String,
    status: { type: String, default: 'available' }
}, { timestamps: true });

const VehicleSchema = new mongoose.Schema({
    registrationNumber: String,
    vehicleType: String,
    capacity: { weight: Number, volume: Number },
    currentLocation: {
        type: { type: String, default: 'Point' },
        coordinates: [Number]
    },
    fuelEfficiency: Number,
    driver: { name: String, phone: String, licenseNumber: String },
    status: { type: String, default: 'available' }
}, { timestamps: true });

const TripSchema = new mongoose.Schema({
    tripId: String,
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    primaryJob: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' }, // Assuming these aren't strictly required to be real objectIds in dev
    route: {
        distance: Number,
        duration: Number,
        estimatedFuelCost: Number,
        coordinates: [[Number]]
    },
    status: { type: String, default: 'scheduled', enum: ['scheduled', 'active', 'completed', 'cancelled'] }
}, { timestamps: true });

const Driver = mongoose.models.Driver || mongoose.model('Driver', DriverSchema);
const Vehicle = mongoose.models.Vehicle || mongoose.model('Vehicle', VehicleSchema);
const Trip = mongoose.models.Trip || mongoose.model('Trip', TripSchema);

const sampleDrivers = [
    { name: 'Kamal Perera', contactNumber: '+94 77 111 2222', licenseNumber: 'B1112222', status: 'available' },
    { name: 'Namal Raj', contactNumber: '+94 71 333 4444', licenseNumber: 'B3334444', status: 'available' },
    { name: 'Saman Kumara', contactNumber: '+94 76 555 6666', licenseNumber: 'B5556666', status: 'available' },
    { name: 'Ruwan Silva', contactNumber: '+94 72 777 8888', licenseNumber: 'B7778888', status: 'available' },
    { name: 'Asanka Fernando', contactNumber: '+94 70 999 0000', licenseNumber: 'B9990000', status: 'available' }
];

const b_locations = [
    [79.8612, 6.9271], // Colombo
    [80.7718, 7.2906], // Kandy
    [80.0265, 6.0535], // Galle
    [79.9900, 6.8400], // Homagama
    [80.6350, 7.3000]  // Matale
];

let sampleVehicles = [
    { registrationNumber: 'WP-AAA-1001', vehicleType: 'truck', capacity: { weight: 5000, volume: 25 }, fuelEfficiency: 8 },
    { registrationNumber: 'WP-BBB-2002', vehicleType: 'van', capacity: { weight: 2000, volume: 15 }, fuelEfficiency: 10 },
    { registrationNumber: 'CP-CCC-3003', vehicleType: 'lorry', capacity: { weight: 8000, volume: 35 }, fuelEfficiency: 6 },
    { registrationNumber: 'SP-DDD-4004', vehicleType: 'truck', capacity: { weight: 6000, volume: 30 }, fuelEfficiency: 7 },
    { registrationNumber: 'WP-EEE-5005', vehicleType: 'van', capacity: { weight: 2500, volume: 18 }, fuelEfficiency: 9 }
];

async function seedData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Insert drivers
        await Driver.deleteMany({});
        const drivers = await Driver.insertMany(sampleDrivers);
        console.log(`✅ Added ${drivers.length} sample drivers`);

        // Connect drivers and locations to vehicles
        sampleVehicles = sampleVehicles.map((v, index) => ({
            ...v,
            driver: { name: drivers[index].name, phone: drivers[index].phone, licenseNumber: drivers[index].licenseNumber },
            currentLocation: { type: 'Point', coordinates: b_locations[index] }
        }));

        await Vehicle.deleteMany({});
        const vehicles = await Vehicle.insertMany(sampleVehicles);
        console.log(`✅ Added ${vehicles.length} sample vehicles`);

        // Create dummy trips
        const sampleTrips = [
            { tripId: 'TRIP-2026-001', vehicle: vehicles[0]._id, status: 'completed', route: { distance: 115000, duration: 10800, estimatedFuelCost: 4500, coordinates: [] } },
            { tripId: 'TRIP-2026-002', vehicle: vehicles[1]._id, status: 'active', route: { distance: 50000, duration: 5400, estimatedFuelCost: 1500, coordinates: [] } },
            { tripId: 'TRIP-2026-003', vehicle: vehicles[2]._id, status: 'scheduled', route: { distance: 200000, duration: 18000, estimatedFuelCost: 8000, coordinates: [] } },
            { tripId: 'TRIP-2026-004', vehicle: vehicles[3]._id, status: 'scheduled', route: { distance: 85000, duration: 7200, estimatedFuelCost: 3200, coordinates: [] } }
        ];

        // Ensure we don't break uniqueness if re-running
        await Trip.deleteMany({ tripId: { $in: ['TRIP-2026-001', 'TRIP-2026-002', 'TRIP-2026-003', 'TRIP-2026-004'] } });
        const trips = await Trip.insertMany(sampleTrips);
        console.log(`✅ Added ${trips.length} sample trips`);

        console.log('\n🎉 Custom data seeded successfully!');

    } catch (error) {
        console.error('❌ Error seeding data:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n👋 Database connection closed');
    }
}

seedData();
