import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './BackhaulModal.css';

// Fix for default marker icons
import L from 'leaflet';
import iconMarker2x from 'leaflet/dist/images/marker-icon-2x.png';
import iconMarker from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: iconMarker2x,
    iconUrl: iconMarker,
    shadowUrl: iconShadow,
});

function VehicleSelectionModal({ isOpen, onClose, vehicles, onSelect, loading }) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '900px', width: '90%' }}>
                <div className="modal-header">
                    <h2>
                        <span className="material-icons-outlined" style={{ verticalAlign: 'middle', marginRight: '8px' }}>
                            local_shipping
                        </span>
                        Select a Vehicle
                    </h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body">
                    <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
                        We found {vehicles.length} vehicles that match your cargo requirements. Select the best option for your job.
                    </p>

                    <div className="vehicle-list-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                        {vehicles.map((vehicle, index) => {
                            // Backend returns flat object with score mixed in
                            return (
                                <div key={vehicle._id} className="card" style={{ padding: '1rem', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                        <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{vehicle.registrationNumber}</h4>
                                        <span className={`status-badge status-${vehicle.status || 'available'}`}>
                                            {vehicle.status || 'Available'}
                                        </span>
                                    </div>

                                    <div style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                                        <span style={{ textTransform: 'capitalize' }}>{vehicle.vehicleType}</span>
                                    </div>

                                    <div className="vehicle-stats" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
                                        <div>
                                            <strong>Capacity:</strong><br />
                                            {vehicle.capacity.weight}kg / {vehicle.capacity.volume}m³
                                        </div>
                                        <div>
                                            <strong>Match Score:</strong><br />
                                            <span style={{ color: vehicle.score > 80 ? '#10B981' : '#F59E0B', fontWeight: 'bold' }}>
                                                {vehicle.score}%
                                            </span>
                                        </div>
                                    </div>

                                    {vehicle.utilization && (
                                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem', background: '#f8fafc', padding: '0.5rem', borderRadius: '4px' }}>
                                            <strong>Utilization:</strong>
                                            <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                                                <li>Weight: {vehicle.utilization.weight}</li>
                                                <li>Volume: {vehicle.utilization.volume}</li>
                                            </ul>
                                        </div>
                                    )}

                                    <button
                                        className="btn-primary"
                                        style={{ width: '100%' }}
                                        onClick={() => onSelect(vehicle._id)}
                                        disabled={loading}
                                    >
                                        {loading ? 'Processing...' : 'Select Vehicle'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {vehicles.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '3rem' }}>
                            <span className="material-icons-outlined" style={{ fontSize: '48px', color: '#cbd5e1' }}>
                                search_off
                            </span>
                            <p>No suitable vehicles found for your cargo requirements.</p>
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

export default VehicleSelectionModal;
