import { useState } from 'react';
import { driverAPI } from '../../services/api';

function AddDriverModal({ isOpen, onClose, onDriverAdded }) {
    const [formData, setFormData] = useState({
        name: '',
        licenseNumber: '',
        contactNumber: '',
        email: '',
        experienceLevel: 'Junior',
        status: 'available'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await driverAPI.create(formData);
            onDriverAdded();
            onClose();
            // Reset form
            setFormData({
                name: '',
                licenseNumber: '',
                contactNumber: '',
                email: '',
                experienceLevel: 'Junior',
                status: 'available'
            });
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Failed to create driver');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '600px', width: '90%', padding: '2rem' }}>
                <div className="modal-header" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', margin: 0 }}>Add New Driver</h2>
                    <button className="close-btn" onClick={onClose} style={{ fontSize: '1.5rem' }}>&times;</button>
                </div>

                {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Full Name *</label>
                        <input
                            type="text"
                            name="name"
                            className="form-input"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            placeholder="John Doe"
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">License Number *</label>
                            <input
                                type="text"
                                name="licenseNumber"
                                className="form-input"
                                value={formData.licenseNumber}
                                onChange={handleChange}
                                required
                                placeholder="B12345678"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Experience Level</label>
                            <select
                                name="experienceLevel"
                                className="form-select"
                                value={formData.experienceLevel}
                                onChange={handleChange}
                            >
                                <option value="Junior">Junior (0-2 years)</option>
                                <option value="Mid-Level">Mid-Level (2-5 years)</option>
                                <option value="Senior">Senior (5+ years)</option>
                                <option value="Expert">Expert (10+ years)</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Contact Number *</label>
                            <input
                                type="text"
                                name="contactNumber"
                                className="form-input"
                                value={formData.contactNumber}
                                onChange={handleChange}
                                required
                                placeholder="+94 77 123 4567"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input
                                type="email"
                                name="email"
                                className="form-input"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="driver@example.com"
                            />
                        </div>
                    </div>

                    <div className="modal-footer" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
                        <button type="button" className="btn-text" onClick={onClose} style={{ fontSize: '1rem' }}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Driver'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddDriverModal;
