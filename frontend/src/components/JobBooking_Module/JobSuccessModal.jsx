import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import './JobSuccessModal.css';

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

// Custom component to fit map bounds
function MapBounds({ markers }) {
    const map = useMap();
    useEffect(() => {
        if (markers && markers.length > 0) {
            const bounds = L.latLngBounds(markers);
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [map, markers]);
    return null;
}

function JobSuccessModal({ isOpen, onClose, data }) {
    if (!isOpen || !data) return null;

    const { job, backhaul, route, vehicle, driver } = data;

    // Prepare map markers
    const markers = [];
    const [routeCoordinates, setRouteCoordinates] = useState([]);

    useEffect(() => {
        if (isOpen && route?.coordinates?.length > 0) {
            // Convert [lng, lat] to [lat, lng] for Leaflet
            const leafletCoords = route.coordinates.map(coord => [coord[1], coord[0]]);
            setRouteCoordinates(leafletCoords);
        } else {
            setRouteCoordinates([]);
        }
    }, [isOpen, route]);

    // Primary Job Markers (Green)
    if (job?.pickup?.location?.coordinates) {
        markers.push({
            position: [job.pickup.location.coordinates[1], job.pickup.location.coordinates[0]],
            title: 'Pickup (Primary)',
            type: 'primary-pickup'
        });
    }
    if (job?.delivery?.location?.coordinates) {
        markers.push({
            position: [job.delivery.location.coordinates[1], job.delivery.location.coordinates[0]],
            title: 'Delivery (Primary)',
            type: 'primary-delivery'
        });
    }

    // Backhaul Markers (Blue)
    if (backhaul?.pickupCoordinates) {
        markers.push({
            position: [backhaul.pickupCoordinates[1], backhaul.pickupCoordinates[0]],
            title: 'Pickup (Backhaul)',
            type: 'backhaul-pickup'
        });
    }
    if (backhaul?.deliveryCoordinates) {
        markers.push({
            position: [backhaul.deliveryCoordinates[1], backhaul.deliveryCoordinates[0]],
            title: 'Delivery (Backhaul)',
            type: 'backhaul-delivery'
        });
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>
                        <span className="material-icons-outlined" style={{ verticalAlign: 'middle', marginRight: '8px', color: '#10B981' }}>
                            check_circle
                        </span>
                        Job Booked Successfully
                    </h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body">
                    {/* Success Message & Summary */}
                    <div className="summary-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
                        <div className="summary-item">
                            <label>Job ID</label>
                            <strong>{job?.jobId}</strong>
                        </div>
                        <div className="summary-item">
                            <label>Vehicle</label>
                            <strong>{vehicle?.registrationNumber || 'Pending'} {vehicle?.type ? `(${vehicle.type})` : ''}</strong>
                        </div>
                        <div className="summary-item">
                            <label>Driver</label>
                            <strong>{driver?.name || 'Pending'}</strong>
                            {driver?.contactNumber && <div style={{ fontSize: '0.75rem', marginTop: '2px', color: 'var(--text-secondary)' }}>{driver.contactNumber}</div>}
                        </div>
                        <div className="summary-item">
                            <label>Route</label>
                            <strong>{route?.distance || 'N/A'} ({route?.duration || 'N/A'})</strong>
                        </div>
                    </div>

                    {/* Logistics Details */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', margin: '1.25rem 0' }}>
                        <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Primary Pickup</div>
                            <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{job?.pickup?.address}</div>
                        </div>
                        <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Primary Delivery</div>
                            <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{job?.delivery?.address}</div>
                        </div>
                    </div>

                    {/* Backend Logic Visualization */}
                    {backhaul ? (
                        <div className="backhaul-alert success">
                            <div className="alert-header">
                                <span className="material-icons-outlined">autorenew</span>
                                <strong>Backhaul Match Found!</strong>
                            </div>
                            <p>Great news! We found a return trip to maximize efficiency.</p>
                            <div className="backhaul-details">
                                <div className="detail-row">
                                    <span>Backhaul ID:</span>
                                    <span>{backhaul.jobId}</span>
                                </div>
                                <div className="detail-row">
                                    <span>From:</span>
                                    <span>{backhaul.pickup}</span>
                                </div>
                                <div className="detail-row">
                                    <span>To:</span>
                                    <span>{backhaul.delivery}</span>
                                </div>
                                <div className="detail-row highlight">
                                    <span>Est. Savings:</span>
                                    <span>{backhaul.savings ? `LKR ${backhaul.savings}` : 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="backhaul-alert warning">
                            <span className="material-icons-outlined">info</span>
                            <span>No backhaul matches found for this route yet.</span>
                        </div>
                    )}

                    {/* Map Visualization */}
                    <div className="map-container">
                        <MapContainer center={[7.8731, 80.7718]} zoom={7} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                            {/* OSRM Route Polyline */}
                            {routeCoordinates.length > 0 && (
                                <Polyline positions={routeCoordinates} color="#2563eb" weight={5} opacity={0.7} />
                            )}

                            {markers.map((marker, idx) => (
                                <Marker key={idx} position={marker.position}>
                                    <Popup>{marker.title}</Popup>
                                </Marker>
                            ))}

                            <MapBounds markers={[...markers.map(m => m.position), ...routeCoordinates]} />
                        </MapContainer>
                    </div>
                </div>

                <div className="modal-footer">
                    <button style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', fontWeight: 500, cursor: 'pointer', padding: '0.5rem 1rem' }} onClick={onClose}>Close</button>
                    <button className="btn-primary" onClick={() => window.location.href = `/trips`}>View Trip Details</button>
                </div>
            </div>
        </div>
    );
}

export default JobSuccessModal;
