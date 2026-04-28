import { useState, useEffect } from 'react';
import { vehicleAPI } from '../../services/api';

function EditVehicleModal({ isOpen, onClose, onVehicleUpdated, vehicle }) {
    const [formData, setFormData] = useState({
        registrationNumber: '',
        vehicleType: 'truck',
        status: 'Active',
        model: '',
        capacity: { weight: '', volume: '' },
        fuelConsumption: '',
        usageHours: 0,
        licenseEndDate: '',
        insuranceEndDate: '',
        lastServiceDate: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (vehicle && isOpen) {
            setFormData({
                registrationNumber: vehicle.registrationNumber || '',
                vehicleType: vehicle.vehicleType || 'truck',
                status: vehicle.status || 'Active',
                model: vehicle.model || '',
                capacity: {
                    weight: vehicle.capacity?.weight || '',
                    volume: vehicle.capacity?.volume || ''
                },
                fuelConsumption: vehicle.fuelConsumption || '',
                usageHours: vehicle.usageHours || 0,
                licenseEndDate: vehicle.licenseEndDate ? new Date(vehicle.licenseEndDate).toISOString().split('T')[0] : '',
                insuranceEndDate: vehicle.insuranceEndDate ? new Date(vehicle.insuranceEndDate).toISOString().split('T')[0] : '',
                lastServiceDate: vehicle.serviceRecords && vehicle.serviceRecords.length > 0 
                    ? new Date(vehicle.serviceRecords.sort((a,b) => new Date(b.date) - new Date(a.date))[0].date).toISOString().split('T')[0] 
                    : ''
            });
        }
    }, [vehicle, isOpen]);

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
                usageHours: Number(formData.usageHours)
            };

            if (formData.lastServiceDate) {
                payload.serviceRecords = [{
                    date: new Date(formData.lastServiceDate),
                    description: 'Updated log or recent service'
                }];
            }

            await vehicleAPI.update(vehicle._id, payload);
            onVehicleUpdated();
            onClose();
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Failed to update vehicle');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '600px', width: '90%', padding: '2rem' }}>
                <div className="modal-header" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', margin: 0 }}>Edit Vehicle</h2>
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
                            <label className="form-label">Status *</label>
                            <select
                                name="status"
                                className="form-select"
                                value={formData.status}
                                onChange={handleChange}
                            >
                                <option value="Active">Active</option>
                                <option value="In Maintenance">In Maintenance</option>
                                <option value="Out of Service">Out of Service</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-row">
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

                    <div className="form-row">
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Total Usage Hours</label>
                            <input
                                type="number"
                                name="usageHours"
                                className="form-input"
                                value={formData.usageHours}
                                onChange={handleChange}
                                min="0" step="0.1"
                            />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
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
                        <div className="form-group" style={{ flex: 1 }}>
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

                    <div className="form-group">
                        <label className="form-label">Last Service Date</label>
                        <input
                            type="date"
                            name="lastServiceDate"
                            className="form-input"
                            value={formData.lastServiceDate}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="modal-footer" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
                        <button type="button" className="btn-text" onClick={onClose} style={{ fontSize: '1rem' }}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default EditVehicleModal;
