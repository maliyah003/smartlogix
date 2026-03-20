import { useState, useEffect } from 'react';
import { driverAPI } from '../../services/api';
import '../../pages/Vehicles.css'; // Reusing vehicle styles for consistency
import AddDriverModal from './AddDriverModal';
import EditDriverModal from './EditDriverModal';
import { BlinkBlur } from 'react-loading-indicators';

function Drivers() {
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingDriver, setEditingDriver] = useState(null);

    useEffect(() => {
        loadDrivers();
    }, []);

    const loadDrivers = async () => {
        try {
            setLoading(true);
            const response = await driverAPI.getAll();
            setDrivers(response.data.drivers || []);
            setError(null);
        } catch (err) {
            setError('Failed to load drivers');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDriverAdded = () => {
        loadDrivers();
        setShowAddModal(false);
    };

    const handleDriverUpdated = () => {
        loadDrivers();
        setShowEditModal(false);
        setEditingDriver(null);
    };

    const handleEditClick = (driver) => {
        setEditingDriver(driver);
        setShowEditModal(true);
    };

    const handleDeleteClick = async (driverId) => {
        if (window.confirm('Are you sure you want to delete this driver?')) {
            try {
                await driverAPI.delete(driverId);
                loadDrivers();
            } catch (err) {
                alert(err.response?.data?.error || 'Failed to delete driver');
            }
        }
    };

    const filteredDrivers = drivers.filter(driver => {
        const matchesStatus = filterStatus === 'all' || driver.status === filterStatus;
        const matchesSearch = !searchTerm ||
            driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            driver.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const getStatusColor = (status) => {
        const colors = {
            'available': '#34D399',
            'on-trip': '#60A5FA',
            'off-duty': '#9CA3AF'
        };
        return colors[status] || '#9CA3AF';
    };

    if (loading) {
        return (
            <div className="loading-container">
                <BlinkBlur color="#f59e0b" size="medium" text="" textColor="" />
            </div>
        );
    }

    return (
        <div className="vehicles-page"> {/* Reusing class */}
            <AddDriverModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onDriverAdded={handleDriverAdded}
            />
            {editingDriver && (
                <EditDriverModal
                    isOpen={showEditModal}
                    onClose={() => {
                        setShowEditModal(false);
                        setEditingDriver(null);
                    }}
                    onDriverUpdated={handleDriverUpdated}
                    driver={editingDriver}
                />
            )}

            <div className="page-header-section">
                <div>
                    <p className="page-subtitle-new">Monitor driver performance and availability</p>
                    <h1 className="page-title-new">Drivers</h1>
                </div>
                <button className="btn-primary" onClick={() => setShowAddModal(true)}>
                    <span className="material-icons-outlined" style={{ fontSize: '18px' }}>person_add</span>
                    <span>Add Driver</span>
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="vehicles-toolbar">
                <div className="search-box">
                    <span className="material-icons-outlined search-icon">search</span>
                    <input
                        type="text"
                        placeholder="Search drivers..."
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
                        All ({drivers.length})
                    </button>
                    <button
                        className={`filter-chip ${filterStatus === 'available' ? 'active' : ''}`}
                        onClick={() => setFilterStatus('available')}
                    >
                        Available ({drivers.filter(d => d.status === 'available').length})
                    </button>
                    <button
                        className={`filter-chip ${filterStatus === 'on-trip' ? 'active' : ''}`}
                        onClick={() => setFilterStatus('on-trip')}
                    >
                        On Trip ({drivers.filter(d => d.status === 'on-trip').length})
                    </button>
                </div>
            </div>

            <div className="vehicles-grid">
                {filteredDrivers.map((driver) => (
                    <div key={driver._id} className="vehicle-card">
                        <div className="vehicle-card-header">
                            <div className="vehicle-icon">
                                <span className="material-icons-outlined">person</span>
                            </div>
                            <div
                                className="status-indicator"
                                style={{ background: getStatusColor(driver.status) }}
                                title={driver.status}
                            />
                        </div>

                        <div className="vehicle-card-body">
                            <h3 className="vehicle-number">{driver.name}</h3>
                            <p className="vehicle-type">License: {driver.licenseNumber}</p>

                            <div className="vehicle-specs">
                                <div className="spec-item">
                                    <span className="spec-label">Experience</span>
                                    <span className="spec-value">{driver.experienceLevel}</span>
                                </div>
                                <div className="spec-item">
                                    <span className="spec-label">Safety Score</span>
                                    <span className="spec-value" style={{ color: driver.safetyScore >= 90 ? '#10B981' : '#F59E0B' }}>
                                        {driver.safetyScore}%
                                    </span>
                                </div>
                            </div>

                            <div className="vehicle-driver" style={{ marginTop: '1rem' }}>
                                <div className="driver-info">
                                    <div className="driver-name">{driver.email}</div>
                                    <div className="driver-phone">{driver.contactNumber}</div>
                                </div>
                            </div>
                        </div>

                        <div className="vehicle-card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
                            <button className="btn-text" onClick={() => handleEditClick(driver)}>
                                <span className="material-icons-outlined" style={{ fontSize: '18px', marginRight: '4px' }}>edit</span> Edit
                            </button>
                            <button className="btn-text" style={{ color: 'var(--status-error)' }} onClick={() => handleDeleteClick(driver._id)}>
                                <span className="material-icons-outlined" style={{ fontSize: '18px', marginRight: '4px' }}>delete</span> Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Drivers;
