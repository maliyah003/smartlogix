import { useState, useEffect } from 'react';
import { vehicleAPI } from '../../services/api';
import '../../pages/Vehicles.css'; // Adjust path or move CSS too
import AddVehicleModal from './AddVehicleModal';
import EditVehicleModal from './EditVehicleModal';
import { BlinkBlur } from 'react-loading-indicators';

function Vehicles() {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState(null);

    useEffect(() => {
        loadVehicles();
    }, []);

    const loadVehicles = async () => {
        try {
            setLoading(true);
            const response = await vehicleAPI.getAll();
            setVehicles(response.data.vehicles || []);
            setError(null);
        } catch (err) {
            setError('Failed to load vehicles');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleVehicleAdded = () => {
        loadVehicles();
        setShowAddModal(false);
    };

    const handleVehicleUpdated = () => {
        loadVehicles();
        setShowEditModal(false);
        setEditingVehicle(null);
    };

    const handleEditClick = (vehicle) => {
        setEditingVehicle(vehicle);
        setShowEditModal(true);
    };

    const handleDeleteClick = async (vehicleId) => {
        if (window.confirm('Are you sure you want to delete this vehicle?')) {
            try {
                await vehicleAPI.delete(vehicleId);
                loadVehicles();
            } catch (err) {
                alert(err.response?.data?.error || 'Failed to delete vehicle');
            }
        }
    };

    const filteredVehicles = vehicles.filter(vehicle => {
        const matchesStatus = filterStatus === 'all' || vehicle.status === filterStatus;
        const matchesSearch = !searchTerm ||
            vehicle.registrationNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vehicle.driver?.name?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const getStatusColor = (status) => {
        const colors = {
            'available': '#34D399',
            'in-transit': '#60A5FA',
            'maintenance': '#FBBF24',
            'offline': '#D1D5DB'
        };
        return colors[status] || colors.offline;
    };

    const getExpiryColor = (dateString) => {
        if (!dateString) return '#64748b';
        
        const expiry = new Date(dateString);
        const today = new Date();
        const diffTime = expiry - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 30) return '#DC2626'; // Red (1 month or less)
        if (diffDays <= 60) return '#ea580c'; // Orange (2 months or less)
        return '#64748b'; // Default
    };

    if (loading) {
        return (
            <div className="loading-container">
                <BlinkBlur color="#f59e0b" size="medium" text="" textColor="" />
            </div>
        );
    }

    return (
        <div className="vehicles-page">
            <AddVehicleModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onVehicleAdded={handleVehicleAdded}
            />
            {editingVehicle && (
                <EditVehicleModal
                    isOpen={showEditModal}
                    onClose={() => {
                        setShowEditModal(false);
                        setEditingVehicle(null);
                    }}
                    onVehicleUpdated={handleVehicleUpdated}
                    vehicle={editingVehicle}
                />
            )}

            <div className="page-header-section">
                <div>
                    <p className="page-subtitle-new">Manage and monitor your fleet</p>
                    <h1 className="page-title-new">Vehicles</h1>
                </div>
                <button className="btn-primary" onClick={() => setShowAddModal(true)}>
                    <span className="material-icons-outlined" style={{ fontSize: '18px' }}>add</span>
                    <span>Add Vehicle</span>
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="vehicles-toolbar">
                <div className="search-box">
                    <span className="material-icons-outlined search-icon">search</span>
                    <input
                        type="text"
                        placeholder="Search vehicles..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>

                <div className="filter-chips">
                    <button
                        className={`filter-chip ${filterStatus === 'all' ? 'active' : ''}`}
                        onClick={() => setFilterStatus('all')}
                    >
                        All ({vehicles.length})
                    </button>
                    <button
                        className={`filter-chip ${filterStatus === 'available' ? 'active' : ''}`}
                        onClick={() => setFilterStatus('available')}
                    >
                        Available ({vehicles.filter(v => v.status === 'available').length})
                    </button>
                    <button
                        className={`filter-chip ${filterStatus === 'in-transit' ? 'active' : ''}`}
                        onClick={() => setFilterStatus('in-transit')}
                    >
                        In Transit ({vehicles.filter(v => v.status === 'in-transit').length})
                    </button>
                    <button
                        className={`filter-chip ${filterStatus === 'maintenance' ? 'active' : ''}`}
                        onClick={() => setFilterStatus('maintenance')}
                    >
                        Maintenance ({vehicles.filter(v => v.status === 'maintenance').length})
                    </button>
                </div>
            </div>

            <div className="vehicles-grid">
                {filteredVehicles.length > 0 ? (
                    filteredVehicles.map((vehicle) => (
                        <div key={vehicle._id} className="vehicle-card">
                            <div className="vehicle-card-header">
                                <div className="vehicle-icon">
                                    <span className="material-icons-outlined">local_shipping</span>
                                </div>
                                <div
                                    className="status-indicator"
                                    style={{ background: getStatusColor(vehicle.status) }}
                                    title={vehicle.status}
                                />
                            </div>

                            <div className="vehicle-card-body">
                                <h3 className="vehicle-number">{vehicle.registrationNumber}</h3>
                                <p className="vehicle-type">{vehicle.model} ({vehicle.vehicleType})</p>

                                <div className="vehicle-specs">
                                    <div className="spec-item">
                                        <span className="spec-label">Capacity</span>
                                        <span className="spec-value">
                                            {vehicle.capacity?.weight || 0}kg / {vehicle.capacity?.volume || 0}m³
                                        </span>
                                    </div>
                                    <div className="spec-item">
                                        <span className="spec-label">Fuel</span>
                                        <span className="spec-value">{vehicle.fuelConsumption || 0} km/l</span>
                                    </div>
                                    <div className="spec-item" style={{ marginTop: '4px' }}>
                                        <span className="spec-label">Usage Hours</span>
                                        <span className="spec-value">{Math.round(vehicle.usageHours || 0)} hrs</span>
                                    </div>
                                    <div className="spec-item" style={{ marginTop: '4px' }}>
                                        <span className="spec-label">Last Service</span>
                                        <span className="spec-value">
                                            {vehicle.serviceRecords && vehicle.serviceRecords.length > 0
                                                ? new Date(Math.max(...vehicle.serviceRecords.map(r => new Date(r.date)))).toLocaleDateString()
                                                : 'N/A'}
                                        </span>
                                    </div>
                                </div>

                                <div className="vehicle-dates" style={{ marginTop: '0.75rem', fontSize: '0.75rem', paddingBottom: '0.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: getExpiryColor(vehicle.licenseEndDate) }}>
                                        <span>License Exp:</span>
                                        <span style={{ fontWeight: 500 }}>{vehicle.licenseEndDate ? new Date(vehicle.licenseEndDate).toLocaleDateString() : 'N/A'}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: getExpiryColor(vehicle.insuranceEndDate), marginTop: '4px' }}>
                                        <span>Insurance Exp:</span>
                                        <span style={{ fontWeight: 500 }}>{vehicle.insuranceEndDate ? new Date(vehicle.insuranceEndDate).toLocaleDateString() : 'N/A'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="vehicle-card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
                                <button className="btn-text" onClick={() => handleEditClick(vehicle)}>
                                    <span className="material-icons-outlined" style={{ fontSize: '18px', marginRight: '4px' }}>edit</span> Edit
                                </button>
                                <button className="btn-text" style={{ color: 'var(--status-error)' }} onClick={() => handleDeleteClick(vehicle._id)}>
                                    <span className="material-icons-outlined" style={{ fontSize: '18px', marginRight: '4px' }}>delete</span> Delete
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="empty-state-full">
                        <div className="empty-icon">
                            <span className="material-icons-outlined" style={{ fontSize: '48px', color: 'var(--text-tertiary)' }}>
                                local_shipping
                            </span>
                        </div>
                        <h3>No vehicles found</h3>
                        <p>Try adjusting your filters or add a new vehicle</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Vehicles;
