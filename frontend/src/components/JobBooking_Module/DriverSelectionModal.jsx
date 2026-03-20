import { useState } from 'react';
import './BackhaulModal.css'; // Reusing styles

function DriverSelectionModal({ isOpen, onClose, drivers, onSelect, loading }) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '900px', width: '90%' }}>
                <div className="modal-header">
                    <h2>
                        <span className="material-icons-outlined" style={{ verticalAlign: 'middle', marginRight: '8px' }}>
                            person_pin
                        </span>
                        Select a Driver
                    </h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body">
                    <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
                        Select an available driver for this job.
                    </p>

                    <div className="vehicle-list-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                        {drivers.map((driver) => (
                            <div key={driver._id} className="card" style={{ padding: '1rem', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                    <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{driver.name}</h4>
                                    <span className={`status-badge status-${driver.status}`}>
                                        {driver.status}
                                    </span>
                                </div>

                                <div style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                                    License: {driver.licenseNumber}
                                </div>

                                <div className="vehicle-stats" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
                                    <div>
                                        <strong>Experience:</strong><br />
                                        {driver.experienceLevel}
                                    </div>
                                    <div>
                                        <strong>Safety Score:</strong><br />
                                        <span style={{ color: driver.safetyScore >= 90 ? '#10B981' : '#F59E0B', fontWeight: 'bold' }}>
                                            {driver.safetyScore}%
                                        </span>
                                    </div>
                                </div>

                                <button
                                    className="btn-primary"
                                    style={{ width: '100%' }}
                                    onClick={() => onSelect(driver._id)}
                                    disabled={loading}
                                >
                                    {loading ? 'Processing...' : 'Assign Driver'}
                                </button>
                            </div>
                        ))}
                    </div>

                    {drivers.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '3rem' }}>
                            <span className="material-icons-outlined" style={{ fontSize: '48px', color: '#cbd5e1' }}>
                                person_off
                            </span>
                            <p>No available drivers found.</p>
                        </div>
                    )}

                </div>

                <div className="modal-footer">
                    <button className="btn-secondary" onClick={onClose}>Cancel</button>
                </div>
            </div>
        </div>
    );
}

export default DriverSelectionModal;
