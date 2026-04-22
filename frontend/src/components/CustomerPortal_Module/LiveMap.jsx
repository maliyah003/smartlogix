import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { db } from '../../config/firebase';
import { ref, onValue } from 'firebase/database';

// Fix for default leaflet icons not loading in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// A custom green dot icon for origins
const originIcon = new L.DivIcon({
    className: 'custom-origin-icon',
    html: '<div style="background-color: #22c55e; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
});

// A custom red dot icon for destinations
const destinationIcon = new L.DivIcon({
    className: 'custom-destination-icon',
    html: '<div style="background-color: #ef4444; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
});

// A custom vehicle icon for driver location
const driverIcon = new L.DivIcon({
    className: 'custom-driver-icon',
    html: `<div style="background-color: #f49522; width: 36px; height: 36px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4); display: flex; justify-content: center; align-items: center;">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zM18 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
             </svg>
           </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
});

function LiveMap({
    jobId,
    tripId,
    tripStatus,
    jobStatus,
    routeCoords,
    pickupCoords,
    deliveryCoords,
    initialPosition,
    initialNote,
    onNoteSaved
}) {
    // Initialize position with initialPosition from backend if available
    const [position, setPosition] = useState(() => {
        if (initialPosition && initialPosition.coordinates && initialPosition.coordinates.length >= 2) {
            return [initialPosition.coordinates[1], initialPosition.coordinates[0]];
        }
        return null;
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [note, setNote] = useState(initialNote || '');
    const [isSavingNote, setIsSavingNote] = useState(false);
    const [toastMessage, setToastMessage] = useState({ text: '', type: '' });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const showToast = (text, type = 'success') => {
        setToastMessage({ text, type });
        setTimeout(() => setToastMessage({ text: '', type: '' }), 4000);
    };

    const isActive =
        tripStatus === 'active' || (!tripStatus && jobStatus === 'in-transit');

    useEffect(() => {
        setNote(initialNote || '');
    }, [initialNote]);

    useEffect(() => {
        if (!tripId || !isActive) {
            setPosition(null);
            return;
        }

        setLoading(true);
        // Create reference to the driver's current position in Firebase RTDB
        const positionRef = ref(db, `trips/${tripId}/currentPosition`);

        // Subscribe to real-time updates
        const unsubscribe = onValue(positionRef, (snapshot) => {
            const data = snapshot.val();
            if (data && data.coordinates && data.coordinates.length >= 2) {
                // Firebase stores [lng, lat], Leaflet needs [lat, lng]
                setPosition([data.coordinates[1], data.coordinates[0]]);
                setError(null);
            }
            setLoading(false);
        }, (err) => {
            console.error("Firebase subscription error:", err);
            setError("Real-time tracking unavailable");
            setLoading(false);
        });

        // Cleanup subscription on unmount or when trip/status changes
        return () => unsubscribe();
    }, [tripId, isActive]);

    // Use job delivery points as fallback map center if no route is found
    const defaultCenter = pickupCoords && pickupCoords.length >= 2 
        ? [pickupCoords[1], pickupCoords[0]] 
        : [6.9271, 79.8612]; // Default Colombo
        
    const mapCenter = position || defaultCenter;

    const handleSaveNote = async () => {
        if (!jobId) return;
        setIsSavingNote(true);
        try {
            await axios.patch(`https://smartlogix-production.up.railway.app/api/customer-portal/notes/${jobId}`, { note });
            onNoteSaved?.(note);
            showToast('Delivery note saved successfully.', 'success');
        } catch (err) {
            console.error(err);
            showToast('Failed to save delivery note. Please try again.', 'error');
        } finally {
            setIsSavingNote(false);
        }
    };

    const hasNoteContent = Boolean(String(note || '').trim()) || Boolean(String(initialNote || '').trim());

    const confirmDeleteNote = async () => {
        if (!jobId || !hasNoteContent) return;
        setIsSavingNote(true);
        try {
            await axios.patch(`https://smartlogix-production.up.railway.app/api/customer-portal/notes/${jobId}`, { note: '' });
            setNote('');
            onNoteSaved?.('');
            setShowDeleteConfirm(false);
            showToast('Delivery note removed.', 'success');
        } catch (err) {
            console.error(err);
            showToast('Failed to remove delivery note. Please try again.', 'error');
        } finally {
            setIsSavingNote(false);
        }
    };

    return (
        <>
        <div className="leaflet-map-wrapper">
            <MapContainer 
                center={mapCenter} 
                zoom={12} 
                style={{ height: '100%', width: '100%', borderRadius: '12px' }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                
                {/* Route Line */}
                {routeCoords && routeCoords.length > 0 && (
                    <Polyline 
                        positions={routeCoords.map(c => [c[1], c[0]])} // GeoJSON uses [lng, lat]
                        color="#3b82f6" 
                        weight={5} 
                        opacity={0.8} 
                    />
                )}

                {/* Pickup Marker */}
                {pickupCoords && pickupCoords.length >= 2 && (
                    <Marker position={[pickupCoords[1], pickupCoords[0]]} icon={originIcon}>
                        <Popup>Pickup: Order origin</Popup>
                    </Marker>
                )}

                {/* Delivery Marker */}
                {deliveryCoords && deliveryCoords.length >= 2 && (
                    <Marker position={[deliveryCoords[1], deliveryCoords[0]]} icon={destinationIcon}>
                        <Popup>Destination: Delivery point</Popup>
                    </Marker>
                )}

                {/* Current Driver Position */}
                {position && isActive && (
                    <Marker position={position} icon={driverIcon} zIndexOffset={1000}>
                        <Popup>Driver is currently here.</Popup>
                    </Marker>
                )}
            </MapContainer>
            
            {/* Delivery Note component block underneath based on image */}
            <div className="delivery-note-card">
                <h3>
                    <span className="material-icons-outlined">description</span>
                    Delivery Instructions
                </h3>
                <div className="note-input-row">
                    <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="e.g., Leave at the security gate or call on arrival..."
                        className="note-input"
                    />
                    <div className="note-actions">
                        <button
                            type="button"
                            onClick={handleSaveNote}
                            disabled={isSavingNote}
                            className="note-save-btn"
                        >
                            {isSavingNote ? 'Updating…' : 'Save note'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={isSavingNote || !hasNoteContent}
                            className="note-delete-btn"
                        >
                            <span className="material-icons-outlined" style={{ fontSize: '18px' }}>
                                delete_outline
                            </span>
                            Remove note
                        </button>
                    </div>
                </div>
                {initialNote && initialNote !== note && (
                    <small style={{display: 'block', marginTop: '12px', color: 'var(--sidebar-active)', fontWeight: '600', fontSize: '13px'}}>
                        <span className="material-icons-outlined" style={{fontSize: '14px', verticalAlign: 'middle', marginRight: '4px'}}>info</span>
                        Unsaved changes detected.
                    </small>
                )}
            </div>
        </div>

        {showDeleteConfirm && (
            <div
                className="modal-overlay"
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <div
                    className="modal-content"
                    style={{
                        backgroundColor: '#fff',
                        borderRadius: '12px',
                        padding: '24px',
                        width: '400px',
                        maxWidth: '90%',
                        textAlign: 'center'
                    }}
                >
                    <div style={{ marginBottom: '20px' }}>
                        <div
                            style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '24px',
                                backgroundColor: '#FEF2F2',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 16px auto'
                            }}
                        >
                            <span className="material-icons-outlined" style={{ color: '#DC2626', fontSize: '24px' }}>
                                delete_outline
                            </span>
                        </div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1A1D26', marginBottom: '8px' }}>
                            Remove delivery note?
                        </h2>
                        <p style={{ color: '#6B7280', lineHeight: '1.5' }}>
                            The driver will no longer see these delivery instructions for order{' '}
                            <strong style={{ color: '#1A1D26' }}>{jobId}</strong>.
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setShowDeleteConfirm(false)}
                            disabled={isSavingNote}
                            style={{ flex: 1, justifyContent: 'center' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn"
                            onClick={confirmDeleteNote}
                            disabled={isSavingNote}
                            style={{
                                flex: 1,
                                justifyContent: 'center',
                                backgroundColor: '#DC2626',
                                color: 'white',
                                border: 'none',
                                opacity: isSavingNote ? 0.7 : 1
                            }}
                        >
                            {isSavingNote ? 'Removing…' : 'Yes, remove'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {toastMessage.text && (
            <div
                style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    backgroundColor: toastMessage.type === 'error' ? '#DC2626' : '#10B981',
                    color: '#fff',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: '500'
                }}
            >
                <span className="material-icons-outlined" style={{ fontSize: '20px' }}>
                    {toastMessage.type === 'error' ? 'error_outline' : 'check_circle'}
                </span>
                {toastMessage.text}
            </div>
        )}
        </>
    );
}

export default LiveMap;
