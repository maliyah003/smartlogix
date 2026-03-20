import { useState } from 'react';
import { vehicleAPI } from '../../services/api';

function AddVehicleModal({ isOpen, onClose, onVehicleAdded }) {
    const [formData, setFormData] = useState({
        registrationNumber: '',
        vehicleType: 'Truck',
        model: '',
        capacity: { weight: '', volume: '' },
        fuelConsumption: '',
        licenseEndDate: '',
        insuranceEndDate: '',
        usageHours: '0',
        lastServiceDate: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setFormData(prev => ({
                ...prev,
                [parent]: { ...prev[parent], [child]: value }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const payload = {
                ...formData,
                capacity: {
                    weight: Number(formData.capacity.weight),
                    volume: Number(formData.capacity.volume)
                },
                fuelConsumption: Number(formData.fuelConsumption),
                usageHours: Number(formData.usageHours || 0),
                serviceRecords: formData.lastServiceDate ? [{
                    date: new Date(formData.lastServiceDate),
                    description: 'Initial log or recent service'
                }] : [],
                currentLocation: {
                    coordinates: [79.8612, 6.9271] // Default coordinates
                },
                status: 'available'
            };

            await vehicleAPI.create(payload);
            onVehicleAdded();
            onClose();
            // Reset form
            setFormData({
                registrationNumber: '',
                vehicleType: 'Truck',
                model: '',
                capacity: { weight: '', volume: '' },
                fuelConsumption: '',
                licenseEndDate: '',
                insuranceEndDate: '',
                usageHours: '0',
                lastServiceDate: ''
            });
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Failed to create vehicle');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '600px', width: '90%', padding: '2rem' }}>
                <div className="modal-header" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', margin: 0 }}>Add New Vehicle</h2>
                    <button className="close-btn" onClick={onClose} style={{ fontSize: '1.5rem' }}>&times;</button>
                </div>

                {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Registration Number *</label>
                        <input
                            type="text"
                            name="registrationNumber"
                            className="form-input"
                            value={formData.registrationNumber}
                            onChange={handleChange}
                            required
                            placeholder="WP-1234"
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Type *</label>
                            <select
                                name="vehicleType"
                                className="form-select"
                                value={formData.vehicleType}
                                onChange={handleChange}
                            >
                                <option value="Truck">Truck</option>
                                <option value="Van">Van</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Model *</label>
                            <input
                                type="text"
                                name="model"
                                className="form-input"
                                value={formData.model}
                                onChange={handleChange}
                                required
                                placeholder="Isuzu ELF"
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Weight Capacity (kg) *</label>
                            <input
                                type="number"
                                name="capacity.weight"
                                className="form-input"
                                value={formData.capacity.weight}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Volume Capacity (m³) *</label>
                            <input
                                type="number"
                                name="capacity.volume"
                                className="form-input"
                                value={formData.capacity.volume}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Fuel Consumption (km/l)</label>
                        <input
                            type="number"
                            name="fuelConsumption"
                            className="form-input"
                            value={formData.fuelConsumption}
                            onChange={handleChange}
                            step="0.1"
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Initial Usage Hours</label>
                            <input
                                type="number"
                                name="usageHours"
                                className="form-input"
                                value={formData.usageHours}
                                onChange={handleChange}
                                min="0"
                            />
                        </div>
                    </div>
                    
                    <div className="form-group" style={{marginTop: '1rem'}}>
                        <label className="form-label">Last Service Date (Seeds initial Maintenance Log)</label>
                        <input
                            type="date"
                            name="lastServiceDate"
                            className="form-input"
                            value={formData.lastServiceDate}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">License Expiry</label>
                            <input
                                type="date"
                                name="licenseEndDate"
                                className="form-input"
                                value={formData.licenseEndDate}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Insurance Expiry</label>
                            <input
                                type="date"
                                name="insuranceEndDate"
                                className="form-input"
                                value={formData.insuranceEndDate}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="modal-footer" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
                        <button type="button" className="btn-text" onClick={onClose} style={{ fontSize: '1rem' }}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Vehicle'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddVehicleModal;
