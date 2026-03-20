import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-geosearch/dist/geosearch.css';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom component to handle map clicks
function MapClickHandler({ onLocationSelect }) {
    useMapEvents({
        click(e) {
            onLocationSelect(e.latlng);
        },
    });
    return null;
}

// Search control component
function SearchControl() {
    const map = useMapEvents({});

    useEffect(() => {
        const provider = new OpenStreetMapProvider();
        const searchControl = new GeoSearchControl({
            provider: provider,
            style: 'bar',
            showMarker: false,
            autoComplete: true,
            autoCompleteDelay: 250,
            retainZoomLevel: false,
        });

        map.addControl(searchControl);

        return () => map.removeControl(searchControl);
    }, [map]);

    return null;
}

function LocationPicker({ label, initialPosition = [6.9271, 79.8612], onLocationChange, showCoordinates = true }) {
    const [markerPosition, setMarkerPosition] = useState(initialPosition);
    const mapRef = useRef();

    useEffect(() => {
        // Update marker if initial position changes from parent
        setMarkerPosition(initialPosition);
    }, [initialPosition]);

    const handleLocationSelect = (latlng) => {
        const newLat = parseFloat(latlng.lat.toFixed(6));
        const newLng = parseFloat(latlng.lng.toFixed(6));

        setMarkerPosition([newLat, newLng]);

        // Notify parent component with [lng, lat] format for GeoJSON
        if (onLocationChange) {
            onLocationChange([newLng, newLat]);
        }
    };

    const handleManualCoordinateChange = (index, value) => {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
            const newPosition = [...markerPosition];
            newPosition[index] = numValue;
            setMarkerPosition(newPosition);

            // Pan map to new position
            if (mapRef.current) {
                mapRef.current.flyTo(newPosition, 13);
            }

            // Notify parent with [lng, lat] format
            if (onLocationChange) {
                onLocationChange([newPosition[1], newPosition[0]]);
            }
        }
    };

    return (
        <div className="location-picker">
            <label className="form-label">{label}</label>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                Click on the map or use the search bar to set the location
            </p>

            {/* Interactive Map */}
            <div style={{
                height: '300px',
                borderRadius: '0.5rem',
                overflow: 'hidden',
                marginBottom: showCoordinates ? '1rem' : '0',
                border: '2px solid #e2e8f0'
            }}>
                <MapContainer
                    center={markerPosition}
                    zoom={10}
                    style={{ height: '100%', width: '100%' }}
                    ref={mapRef}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <MapClickHandler onLocationSelect={handleLocationSelect} />
                    <SearchControl />

                    <Marker position={markerPosition}>
                        <Popup>
                            {label}<br />
                            Lat: {markerPosition[0]}<br />
                            Lng: {markerPosition[1]}
                        </Popup>
                    </Marker>
                </MapContainer>
            </div>

            {/* Coordinate Inputs */}
            {showCoordinates && (
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Latitude *</label>
                        <input
                            type="number"
                            step="0.0001"
                            className="form-input"
                            value={markerPosition[0]}
                            onChange={(e) => handleManualCoordinateChange(0, e.target.value)}
                            placeholder="6.9271"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Longitude *</label>
                        <input
                            type="number"
                            step="0.0001"
                            className="form-input"
                            value={markerPosition[1]}
                            onChange={(e) => handleManualCoordinateChange(1, e.target.value)}
                            placeholder="79.8612"
                            required
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export default LocationPicker;
