import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { tripAPI } from '../../services/api';
import PageLoading from '../common/PageLoading';

// Fix Leaflet's default icon path issues in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
const createCustomIcon = (color) => {
    return new L.Icon({
        iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });
};

const pickupIcon = createCustomIcon('blue');
const deliveryIcon = createCustomIcon('green');
const vehicleIcon = createCustomIcon('red');

// Component to dynamically adjust map bounds to fit points
const ChangeView = ({ positions }) => {
    const map = useMap();
    useEffect(() => {
        if (positions && positions.length > 0) {
            const bounds = L.latLngBounds(positions);
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [map, positions]);
    return null;
};

function TripModal({ isOpen, onClose, tripId }) {
    const [tripData, setTripData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [livePosition, setLivePosition] = useState(null);

    useEffect(() => {
        if (isOpen && tripId) {
            loadTripDetails();
        } else {
            setTripData(null);
        }
    }, [isOpen, tripId]);

    const loadTripDetails = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await tripAPI.getById(tripId);
            setTripData(response.data.trip);
            if (response.data.trip?.currentPosition) {
                setLivePosition(response.data.trip.currentPosition);
            }
        } catch (err) {
            setError('Failed to load full trip details');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Firebase Real-Time Database SSE Listener
    useEffect(() => {
        if (!tripData || tripData.status !== 'active') return;

        const url = `https://smartlogix-bb740-default-rtdb.asia-southeast1.firebasedatabase.app/trips/${tripId}/currentPosition.json`;
        const eventSource = new EventSource(url, { headers: { 'Accept': 'text/event-stream' } });

        eventSource.addEventListener('put', (e) => {
            try {
                const payload = JSON.parse(e.data);
                if (payload && payload.data) {
                    // Firebase sometimes sends the root object, sometimes the incremental path
                    if (payload.path === '/' && payload.data.coordinates) {
                        setLivePosition(payload.data);
                    } else if (payload.path === '/coordinates') {
                        setLivePosition(prev => ({
                            ...prev,
                            coordinates: payload.data
                        }));
                    }
                }
            } catch (err) {
                console.error("SSE parse error", err);
            }
        });

        return () => {
            eventSource.close();
        };
    }, [tripData, tripId]);

    if (!isOpen) return null;

    // Helper functions for map rendering
    const extractCoordinates = () => {
        if (!tripData?.route?.coordinates || tripData.route.coordinates.length === 0) return null;
        // Format [lng, lat] to [lat, lng] for Leaflet
        return tripData.route.coordinates.map(coord => [coord[1], coord[0]]);
    };

    const getStatusBadge = (status) => {
        const badges = {
            scheduled: 'badge-warning',
            active: 'badge-info',
            completed: 'badge-success',
            cancelled: 'badge-danger'
        };
        return badges[status] || 'badge-info';
    };

    const polylineCoords = extractCoordinates() || [];

    const getWaypoints = () => {
        const points = [];
        if (!tripData) return points;

        if (tripData.primaryJob?.pickup?.location?.coordinates) {
            points.push({
                position: [tripData.primaryJob.pickup.location.coordinates[1], tripData.primaryJob.pickup.location.coordinates[0]],
                title: 'Primary Pickup',
                icon: pickupIcon,
                address: tripData.primaryJob.pickup.address
            });
        }
        if (tripData.primaryJob?.delivery?.location?.coordinates) {
            points.push({
                position: [tripData.primaryJob.delivery.location.coordinates[1], tripData.primaryJob.delivery.location.coordinates[0]],
                title: 'Primary Delivery',
                icon: deliveryIcon,
                address: tripData.primaryJob.delivery.address
            });
        }
        if (tripData.backhaulJob?.pickup?.location?.coordinates) {
            points.push({
                position: [tripData.backhaulJob.pickup.location.coordinates[1], tripData.backhaulJob.pickup.location.coordinates[0]],
                title: 'Backhaul Pickup',
                icon: pickupIcon,
                address: tripData.backhaulJob.pickup.address
            });
        }
        if (tripData.backhaulJob?.delivery?.location?.coordinates) {
            points.push({
                position: [tripData.backhaulJob.delivery.location.coordinates[1], tripData.backhaulJob.delivery.location.coordinates[0]],
                title: 'Backhaul Delivery',
                icon: deliveryIcon,
                address: tripData.backhaulJob.delivery.address
            });
        }
        return points;
    };

    const waypoints = getWaypoints();
    const startPoint = polylineCoords.length > 0 ? polylineCoords[0] : (waypoints.length > 0 ? waypoints[0].position : null);

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '1100px', width: '95%', height: '90vh', display: 'flex', flexDirection: 'column', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
                <div className="modal-header" style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Job: {tripData?.primaryJob?.jobId || (tripData ? tripData.tripId : tripId)}
                        {tripData && (
                            <span className={`badge ${getStatusBadge(tripData.status)}`} style={{ marginLeft: '1rem', fontSize: '0.85rem', padding: '0.25rem 0.75rem', borderRadius: '9999px', textTransform: 'capitalize' }}>
                                {tripData.status}
                            </span>
                        )}
                    </h2>
                    <button className="close-btn" style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={onClose}>&times;</button>
                </div>

                {loading && (
                    <PageLoading
                        style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: 240
                        }}
                    />
                )}

                {error && (
                    <div className="error-message" style={{ margin: '1rem' }}>{error}</div>
                )}

                {!loading && tripData && (
                    <div className="modal-body" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2rem', padding: '1.5rem' }}>

                        {/* Map Section */}
                        <div className="map-container" style={{ minHeight: '400px', flexShrink: 0, width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', position: 'relative', zIndex: 1 }}>
                            {polylineCoords ? (
                                <MapContainer center={startPoint || [6.9271, 79.8612]} zoom={8} style={{ height: '100%', width: '100%' }}>
                                    <TileLayer
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    />

                                    <ChangeView positions={polylineCoords.length > 0 ? polylineCoords : waypoints.map(w => w.position)} />

                                    {polylineCoords && polylineCoords.length > 0 && (
                                        <Polyline positions={polylineCoords} color="#3B82F6" weight={5} opacity={0.8} />
                                    )}

                                    {waypoints.map((wp, idx) => (
                                        <Marker key={idx} position={wp.position} icon={wp.icon}>
                                            <Popup>
                                                <div style={{ padding: '4px' }}>
                                                    <strong>{wp.title}</strong>
                                                    <div style={{ marginTop: '4px', fontSize: '13px' }}>{wp.address}</div>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    ))}

                                    {/* Real-time Vehicle position if active */}
                                    {livePosition && livePosition.coordinates && livePosition.coordinates.length === 2 && (
                                        <Marker position={[livePosition.coordinates[1], livePosition.coordinates[0]]} icon={vehicleIcon}>
                                            <Popup><strong>Current Location (Live)</strong><br />{tripData.vehicle?.registrationNumber}</Popup>
                                        </Marker>
                                    )}
                                </MapContainer>
                            ) : (
                                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
                                    <p>No map data available for this trip.</p>
                                </div>
                            )}
                        </div>

                        {/* Details Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>

                            {/* Vehicle & Driver Card */}
                            <div className="card" style={{ margin: 0, borderRadius: '12px', border: '1px solid var(--border-light)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                                <div className="card-header" style={{ padding: '1rem 1.25rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-light)' }}>
                                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                                        <span className="material-icons-outlined" style={{ fontSize: '20px', color: 'var(--primary-color)' }}>local_shipping</span>
                                        Vehicle & Driver
                                    </h3>
                                </div>
                                <div style={{ padding: '1.25rem' }}>
                                    <div style={{ marginBottom: '1.25rem' }}>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Vehicle</div>
                                        <div style={{ fontWeight: '600', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                                            {tripData.vehicle?.registrationNumber || 'Unassigned'}
                                            {tripData.vehicle?.vehicleType && <span style={{ color: 'var(--text-tertiary)', fontWeight: 'normal', fontSize: '0.9rem' }}> ({tripData.vehicle.vehicleType})</span>}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Driver</div>
                                        <div style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <span className="material-icons-outlined" style={{ fontSize: '18px' }}>person</span>
                                            </div>
                                            <div>
                                                <div>{tripData.driver?.name || 'Unassigned'}</div>
                                                {tripData.driver?.contactNumber && (
                                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '2px', fontWeight: 'normal' }}>
                                                        {tripData.driver.contactNumber}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Trip Summary Card */}
                            <div className="card" style={{ margin: 0, borderRadius: '12px', border: '1px solid var(--border-light)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                                <div className="card-header" style={{ padding: '1rem 1.25rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-light)' }}>
                                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                                        <span className="material-icons-outlined" style={{ fontSize: '20px', color: '#8B5CF6' }}>route</span>
                                        Route & Cargo
                                    </h3>
                                </div>
                                <div style={{ padding: '1.25rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px dashed var(--border-color)' }}>
                                        <div>
                                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Distance</div>
                                            <div style={{ fontWeight: '600', fontSize: '1.1rem', color: 'var(--text-primary)' }}>{tripData.route?.distance ? `${(tripData.route.distance / 1000).toFixed(1)} km` : 'N/A'}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Est. Time</div>
                                            <div style={{ fontWeight: '600', fontSize: '1.1rem', color: 'var(--text-primary)' }}>{tripData.route?.duration ? `${(tripData.route.duration / 60 / 60).toFixed(1)} h` : 'N/A'}</div>
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Primary Cargo</div>
                                        <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{tripData.primaryJob?.cargo?.description || 'N/A'}</div>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '2px' }}>
                                            {tripData.primaryJob?.cargo?.weight}kg / {tripData.primaryJob?.cargo?.volume}m³
                                        </div>
                                    </div>
                                    {tripData.backhaulJob && (
                                        <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                            <div style={{ color: '#047857', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span className="material-icons-outlined" style={{ fontSize: '14px' }}>autorenew</span>
                                                Includes Backhaul!
                                            </div>
                                            <div style={{ color: '#065F46', fontWeight: '500' }}>{tripData.backhaulJob.cargo?.description}</div>
                                            <div style={{ color: '#065F46', fontSize: '0.85rem', marginTop: '2px', opacity: 0.8 }}>
                                                {tripData.backhaulJob.cargo?.weight}kg / {tripData.backhaulJob.cargo?.volume}m³
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Economics Card */}
                            {tripData.manifest?.economics && (
                                <div className="card" style={{ margin: 0, borderRadius: '12px', border: '1px solid var(--border-light)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                                    <div className="card-header" style={{ padding: '1rem 1.25rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-light)' }}>
                                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                                            <span className="material-icons-outlined" style={{ fontSize: '20px', color: '#10B981' }}>account_balance_wallet</span>
                                            Economics & Finances
                                        </h3>
                                    </div>
                                    <div style={{ padding: '1.25rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Estimated Profit</div>
                                            <div style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--success-color)' }}>LKR {tripData.manifest.economics.estimatedProfit?.toLocaleString()}</div>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Total Revenue</div>
                                            <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>LKR {tripData.manifest.economics.totalRevenue?.toLocaleString()}</div>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Estimated Fuel Cost</div>
                                            <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>LKR {tripData.manifest.economics.fuelCost?.toLocaleString() || tripData.route?.estimatedFuelCost?.toLocaleString()}</div>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--border-color)', paddingTop: '1rem', marginTop: '1rem', background: 'var(--bg-tertiary)', padding: '0.75rem 1rem', borderRadius: '8px', marginLeft: '-0.25rem', marginRight: '-0.25rem' }}>
                                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>Backhaul Savings</div>
                                            <div style={{ fontWeight: '700', color: '#10B981' }}>{tripData.manifest.economics.fuelCostSavings ? `+ LKR ${tripData.manifest.economics.fuelCostSavings.toLocaleString()}` : 'N/A'}</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Logistics Details */}
                            <div className="card" style={{ margin: 0, borderRadius: '12px', border: '1px solid var(--border-light)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                                <div className="card-header" style={{ padding: '1rem 1.25rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-light)' }}>
                                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                                        <span className="material-icons-outlined" style={{ fontSize: '20px', color: '#F59E0B' }}>format_list_bulleted</span>
                                        Logistics Info
                                    </h3>
                                </div>
                                <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                                        <div>
                                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Created At</div>
                                            <div style={{ fontWeight: '500', fontSize: '0.9rem', color: 'var(--text-primary)' }}>{new Date(tripData.createdAt).toLocaleDateString()}<br /><span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{new Date(tripData.createdAt).toLocaleTimeString()}</span></div>
                                        </div>
                                        {tripData.completedAt && (
                                            <div>
                                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Completed At</div>
                                                <div style={{ fontWeight: '500', fontSize: '0.9rem', color: 'var(--text-primary)' }}>{new Date(tripData.completedAt).toLocaleDateString()}<br /><span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{new Date(tripData.completedAt).toLocaleTimeString()}</span></div>
                                            </div>
                                        )}
                                    </div>
                                    {tripData.route?.waypointOrder && tripData.route.waypointOrder.length > 0 && (
                                        <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '1.25rem' }}>
                                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Route Plan</div>
                                            <div style={{ fontWeight: '500', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-primary)' }}>
                                                {tripData.route.waypointOrder.map((wp, idx) => (
                                                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '2px' }}>
                                                            <div style={{
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                width: '18px', height: '18px', borderRadius: '50%', background: 'var(--primary-color)',
                                                                color: 'white', fontSize: '10px', fontWeight: 'bold'
                                                            }}>{idx + 1}</div>
                                                            {idx < tripData.route.waypointOrder.length - 1 && (
                                                                <div style={{ width: '2px', height: '12px', background: 'var(--border-color)', margin: '2px 0' }}></div>
                                                            )}
                                                        </div>
                                                        <span style={{ paddingTop: '1px' }}>{wp.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                )}

            </div>
        </div>
    );
}

export default TripModal;
