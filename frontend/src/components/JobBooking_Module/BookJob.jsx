import { useState } from 'react';
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/light.css";
import { jobAPI } from '../../services/api';
import LocationPicker from './LocationPicker';
import BackhaulModal from './BackhaulModal';
import DriverSelectionModal from './DriverSelectionModal';
import VehicleSelectionModal from './VehicleSelectionModal';
import BackhaulSelectionModal from './BackhaulSelectionModal';
import { driverAPI } from '../../services/api';

function BookJob() {
    const [formData, setFormData] = useState({
        cargo: { weight: '', volume: '', description: '', type: 'general' },
        pickup: { coordinates: [79.8612, 6.9271], address: '', datetime: '' },
        delivery: { coordinates: [80.7718, 7.2906], address: '', datetime: '' },
        pricing: { quotedPrice: '' },
        customer: { name: '', phone: '', email: '' }
    });
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showVehicleSelection, setShowVehicleSelection] = useState(false);
    const [showDriverSelection, setShowDriverSelection] = useState(false); // New state
    const [suggestedVehicles, setSuggestedVehicles] = useState([]);
    const [availableDrivers, setAvailableDrivers] = useState([]); // New state
    const [selectedVehicleId, setSelectedVehicleId] = useState(null); // New state
    const [selectedDriverId, setSelectedDriverId] = useState(null);
    const [showBackhaulSelection, setShowBackhaulSelection] = useState(false);
    const [backhaulOpportunities, setBackhaulOpportunities] = useState([]);

    const handlePickupLocationChange = (coordinates) => {
        setFormData({
            ...formData,
            pickup: { ...formData.pickup, coordinates }
        });
    };

    const handleDeliveryLocationChange = (coordinates) => {
        setFormData({
            ...formData,
            delivery: { ...formData.delivery, coordinates }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            // Validate dates before conversion
            if (!formData.pickup.datetime || !formData.delivery.datetime) {
                setError('Please fill in both pickup and delivery date/time');
                setLoading(false);
                return;
            }

            const pickupDate = new Date(formData.pickup.datetime);
            const deliveryDate = new Date(formData.delivery.datetime);

            if (isNaN(pickupDate.getTime()) || isNaN(deliveryDate.getTime())) {
                setError('Invalid date/time format. Please re-select the dates.');
                setLoading(false);
                return;
            }

            // Validate locations are within Sri Lanka bounds
            const isWithinSriLanka = (coords) => {
                const [lng, lat] = coords;
                // Sri Lanka approximate bounding box
                return (lat >= 5.91 && lat <= 9.85 && lng >= 79.65 && lng <= 81.89);
            };

            if (!isWithinSriLanka(formData.pickup.coordinates)) {
                setError('Pickup location must be within Sri Lanka.');
                setLoading(false);
                return;
            }

            if (!isWithinSriLanka(formData.delivery.coordinates)) {
                setError('Delivery location must be within Sri Lanka.');
                setLoading(false);
                return;
            }

            // Validate Customer Details
            if (formData.customer.email) {
                const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
                if (!emailRegex.test(formData.customer.email)) {
                    setError('Please enter a valid email address.');
                    setLoading(false);
                    return;
                }
            }

            if (formData.customer.phone) {
                const cleanPhone = formData.customer.phone.replace(/[\s-]/g, '');
                const phoneRegex = /^(?:0|\+94)[1-9]\d{8}$/;
                if (!phoneRegex.test(cleanPhone)) {
                    setError('Please enter a valid Sri Lankan phone number (e.g., 0712345678 or +94712345678).');
                    setLoading(false);
                    return;
                }
            }

            // Step 1: Get matched vehicles
            const matchPayload = {
                cargo: {
                    weight: parseFloat(formData.cargo.weight),
                    volume: parseFloat(formData.cargo.volume),
                    description: formData.cargo.description,
                    type: formData.cargo.type
                },
                pickup: {
                    coordinates: formData.pickup.coordinates,
                    datetime: formData.pickup.datetime
                },
                delivery: {
                    datetime: formData.delivery.datetime
                }
            };

            const matchResponse = await jobAPI.matchVehicles(matchPayload);

            if (matchResponse.data.success && matchResponse.data.allMatches.length > 0) {
                setSuggestedVehicles(matchResponse.data.allMatches);
                setShowVehicleSelection(true);
                setLoading(false);
            } else {
                setError('No suitable vehicles found for this job.');
                setLoading(false);
            }

        } catch (err) {
            setError(err.response?.data?.details || err.response?.data?.error || err.message || 'Failed to find vehicles');
            setLoading(false);
        }
    };

    const handleVehicleSelect = async (vehicleId) => {
        setShowVehicleSelection(false);
        setSelectedVehicleId(vehicleId);
        setLoading(true);

        try {
            // Fetch available drivers filtered by required timeline
            const params = {
                pickupDatetime: formData.pickup.datetime,
                deliveryDatetime: formData.delivery.datetime
            };
            const response = await driverAPI.getAvailable(params);
            setAvailableDrivers(response.data.drivers || []);
            setShowDriverSelection(true); // Show driver modal
        } catch (err) {
            console.error('Failed to load drivers:', err);
            // Fallback: Book without driver? Or show error?
            // Let's try to book without driver if fetching fails, or better: show error
            setError('Failed to load available drivers. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDriverSelect = async (driverId) => {
        setShowDriverSelection(false);
        setSelectedDriverId(driverId);
        setLoading(true);

        try {
            // Find backhauls
            const deliveryCoordinates = formData.delivery.coordinates; // [lng, lat] expected by API

            // Calculate a rough estimated delivery time
            const params = {
                lat: deliveryCoordinates[1],
                lng: deliveryCoordinates[0],
                vehicleId: selectedVehicleId,
                radius: 20 // 20km radius as requested
            };

            const response = await jobAPI.getBackhauls(params);

            setBackhaulOpportunities(response.data.opportunities || []);
            setShowBackhaulSelection(true); // Show backhaul selection modal
        } catch (err) {
            console.error('Failed to search backhauls:', err);
            // If it fails, default back to skip
            handleBackhaulSelect('skip');
        } finally {
            setLoading(false);
        }
    };

    const handleBackhaulSelect = async (selectedBackhaulId) => {
        setShowBackhaulSelection(false);
        setLoading(true);

        try {
            const pickupDate = new Date(formData.pickup.datetime);
            const deliveryDate = new Date(formData.delivery.datetime);

            const payload = {
                cargo: {
                    weight: parseFloat(formData.cargo.weight),
                    volume: parseFloat(formData.cargo.volume),
                    description: formData.cargo.description,
                    type: formData.cargo.type
                },
                pickup: {
                    location: { type: 'Point', coordinates: formData.pickup.coordinates },
                    address: formData.pickup.address,
                    datetime: pickupDate.toISOString()
                },
                delivery: {
                    location: { type: 'Point', coordinates: formData.delivery.coordinates },
                    address: formData.delivery.address,
                    datetime: deliveryDate.toISOString()
                },
                pricing: {
                    quotedPrice: parseFloat(formData.pricing.quotedPrice)
                },
                customer: formData.customer,
                vehicleId: selectedVehicleId,
                driverId: selectedDriverId, // Include driver ID
                selectedBackhaulId: selectedBackhaulId // Include manual backhaul selection
            };

            const response = await jobAPI.bookJob(payload);
            setResult(response.data.data || response.data);
            setShowModal(true); // Open success modal
        } catch (err) {
            setError(err.response?.data?.details || err.response?.data?.error || err.message || 'Failed to book job');
            // Maybe go back to driver selection?
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fade-in" style={{ maxWidth: '1400px' }}>
            <div className="page-header">
                <div>
                    <p className="page-subtitle">Automatic vehicle matching & backhaul coordination</p>
                    <h1 className="page-title">Book New Job</h1>
                </div>
            </div>

            <VehicleSelectionModal
                isOpen={showVehicleSelection}
                onClose={() => setShowVehicleSelection(false)}
                vehicles={suggestedVehicles}
                onSelect={handleVehicleSelect}
                loading={loading}
            />

            <DriverSelectionModal
                isOpen={showDriverSelection}
                onClose={() => setShowDriverSelection(false)}
                drivers={availableDrivers}
                onSelect={handleDriverSelect}
                loading={loading}
            />

            <BackhaulSelectionModal
                isOpen={showBackhaulSelection}
                onClose={() => setShowBackhaulSelection(false)}
                backhauls={backhaulOpportunities}
                onSelect={handleBackhaulSelect}
                loading={loading}
            />

            <BackhaulModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                data={result}
            />

            <div className="card">
                <div className="card-header" style={{ marginBottom: '1.5rem' }}>
                    <h3>Job Details</h3>
                </div>
                <form onSubmit={handleSubmit}>
                    {/* Cargo Information */}
                    <h4 style={{ marginBottom: '0.875rem', color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="material-icons-outlined" style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>inventory_2</span>
                        Cargo Information
                    </h4>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Weight (kg) *</label>
                            <input
                                type="number"
                                className="form-input"
                                value={formData.cargo.weight}
                                onChange={(e) => setFormData({ ...formData, cargo: { ...formData.cargo, weight: e.target.value } })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Volume (m³) *</label>
                            <input
                                type="number"
                                step="0.1"
                                className="form-input"
                                value={formData.cargo.volume}
                                onChange={(e) => setFormData({ ...formData, cargo: { ...formData.cargo, volume: e.target.value } })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Cargo Type *</label>
                            <select
                                className="form-select"
                                value={formData.cargo.type}
                                onChange={(e) => setFormData({ ...formData, cargo: { ...formData.cargo, type: e.target.value } })}
                            >
                                <option value="general">General</option>
                                <option value="fragile">Fragile</option>
                                <option value="perishable">Perishable</option>
                                <option value="hazardous">Hazardous</option>
                                <option value="oversized">Oversized</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Description *</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.cargo.description}
                            onChange={(e) => setFormData({ ...formData, cargo: { ...formData.cargo, description: e.target.value } })}
                            placeholder="Electronics, furniture, etc."
                            required
                        />
                    </div>

                    {/* Pickup Information */}
                    <h4 style={{ marginTop: '1.5rem', marginBottom: '0.875rem', color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="material-icons-outlined" style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>location_on</span>
                        Pickup Location
                    </h4>

                    <div className="location-maps-container">
                        <LocationPicker
                            label="Pickup Location"
                            initialPosition={[formData.pickup.coordinates[1], formData.pickup.coordinates[0]]}
                            onLocationChange={handlePickupLocationChange}
                            showCoordinates={true}
                        />
                    </div>

                    <div className="form-row" style={{ marginTop: '0.75rem' }}>
                        <div className="form-group">
                            <label className="form-label">Address *</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.pickup.address}
                                onChange={(e) => setFormData({ ...formData, pickup: { ...formData.pickup, address: e.target.value } })}
                                placeholder="Colombo, Sri Lanka"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Pickup Date & Time *</label>
                            <Flatpickr
                                data-enable-time
                                className="form-input"
                                value={formData.pickup.datetime}
                                onChange={([date]) => setFormData({ ...formData, pickup: { ...formData.pickup, datetime: date } })}
                                options={{
                                    minDate: "today",
                                    dateFormat: "Y-m-d H:i",
                                }}
                                placeholder="Select Date & Time"
                            />
                        </div>
                    </div>

                    {/* Delivery Information */}
                    <h4 style={{ marginTop: '1.5rem', marginBottom: '0.875rem', color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="material-icons-outlined" style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>flag</span>
                        Delivery Location
                    </h4>

                    <div className="location-maps-container">
                        <LocationPicker
                            label="Delivery Location"
                            initialPosition={[formData.delivery.coordinates[1], formData.delivery.coordinates[0]]}
                            onLocationChange={handleDeliveryLocationChange}
                            showCoordinates={true}
                        />
                    </div>

                    <div className="form-row" style={{ marginTop: '0.75rem' }}>
                        <div className="form-group">
                            <label className="form-label">Address *</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.delivery.address}
                                onChange={(e) => setFormData({ ...formData, delivery: { ...formData.delivery, address: e.target.value } })}
                                placeholder="Kandy, Sri Lanka"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Delivery Date & Time *</label>
                            <Flatpickr
                                data-enable-time
                                className="form-input"
                                value={formData.delivery.datetime}
                                onChange={([date]) => setFormData({ ...formData, delivery: { ...formData.delivery, datetime: date } })}
                                options={{
                                    minDate: "today",
                                    dateFormat: "Y-m-d H:i",
                                }}
                                placeholder="Select Date & Time"
                            />
                        </div>
                    </div>

                    {/* Pricing & Customer */}
                    <h4 style={{ marginTop: '1.5rem', marginBottom: '0.875rem', color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="material-icons-outlined" style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>payments</span>
                        Pricing & Customer
                    </h4>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Quoted Price (Rs.) *</label>
                            <input
                                type="number"
                                className="form-input"
                                value={formData.pricing.quotedPrice}
                                onChange={(e) => setFormData({ ...formData, pricing: { ...formData.pricing, quotedPrice: e.target.value } })}
                                placeholder="12000"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Customer Name *</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.customer.name}
                                onChange={(e) => setFormData({ ...formData, customer: { ...formData.customer, name: e.target.value } })}
                                placeholder="John Doe"
                                required
                            />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Customer Phone</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.customer.phone}
                                onChange={(e) => setFormData({ ...formData, customer: { ...formData.customer, phone: e.target.value } })}
                                placeholder="+94 77 123 4567"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Customer Email</label>
                            <input
                                type="email"
                                className="form-input"
                                value={formData.customer.email}
                                onChange={(e) => setFormData({ ...formData, customer: { ...formData.customer, email: e.target.value } })}
                                placeholder="john@example.com"
                            />
                        </div>
                    </div>

                    {error && <div className="error" style={{ marginBottom: '1rem' }}>{error}</div>}

                    <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '0.5rem' }}>
                        <span className="material-icons-outlined" style={{ fontSize: '18px' }}>
                            {loading ? 'hourglass_empty' : 'send'}
                        </span>
                        {loading ? 'Booking...' : 'Book Job & Match Vehicle'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default BookJob;
