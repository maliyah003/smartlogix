import { useState, useEffect } from 'react';
import { driverAPI } from '../../services/api';
import '../../pages/Vehicles.css'; // Reusing vehicle styles for consistency
import AddDriverModal from './AddDriverModal';
import EditDriverModal from './EditDriverModal';
import AddIncidentModal from './AddIncidentModal';
import PageLoading from '../common/PageLoading';

function Drivers() {
    const [drivers, setDrivers] = useState([]);
    const [driverScores, setDriverScores] = useState({});
    const [driverIncidents, setDriverIncidents] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingDriver, setEditingDriver] = useState(null);
    const [showIncidentModal, setShowIncidentModal] = useState(false);
    const [incidentDriver, setIncidentDriver] = useState(null);

    useEffect(() => {
        loadDrivers();
    }, []);

    const loadDrivers = async () => {
        try {
            setLoading(true);
            const response = await driverAPI.getAll();
            const list = response.data.drivers || [];
            setDrivers(list);

            // Fetch monthly driver score for each driver (balanced/ethical scoring engine)
            const scoreEntries = await Promise.all(
                list.map(async (d) => {
                    try {
                        const sRes = await driverAPI.getScore(d._id);
                        return [d._id, sRes.data?.score?.score];
                    } catch {
                        return [d._id, null];
                    }
                })
            );
            setDriverScores(Object.fromEntries(scoreEntries));

            // Fetch recent incidents for each driver
            const incidentEntries = await Promise.all(
                list.map(async (d) => {
                    try {
                        const iRes = await driverAPI.getIncidents(d._id, { limit: 5 });
                        return [d._id, iRes.data?.incidents || []];
                    } catch {
                        return [d._id, []];
                    }
                })
            );
            setDriverIncidents(Object.fromEntries(incidentEntries));
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

    const handleAddIncidentClick = (driver) => {
        setIncidentDriver(driver);
        setShowIncidentModal(true);
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

    const formatIncident = (inc) => {
        const categoryMap = {
            accident: 'Accident',
            complaint: 'Complaint',
            delay: 'Delay',
            missed_delivery: 'Missed delivery',
            vehicle_issue: 'Vehicle issue',
            traffic_violation: 'Traffic violation'
        };
        const severityMap = {
            minor: 'Minor',
            moderate: 'Moderate',
            major: 'Major',
            valid: 'Valid',
            serious: 'Serious'
        };

        const title = `${categoryMap[inc.category] || inc.category} • ${severityMap[inc.severity] || inc.severity}`;

        const meta = inc.meta || {};
        const extras = [];
        if (inc.category === 'delay' && typeof meta.delayMinutes !== 'undefined') {
            extras.push(`${meta.delayMinutes} mins`);
            if (meta.reason) extras.push(String(meta.reason));
        }
        if (inc.category === 'missed_delivery' && typeof meta.validReason !== 'undefined') {
            extras.push(meta.validReason ? 'Valid reason' : 'No valid reason');
        }
        if (inc.verified) extras.push('Verified');

        const when = inc.occurredAt ? new Date(inc.occurredAt).toLocaleDateString() : '';
        return { title, detail: extras.filter(Boolean).join(' • '), when };
    };

    if (loading) {
        return (
            <PageLoading />
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
            {incidentDriver && (
                <AddIncidentModal
                    isOpen={showIncidentModal}
                    onClose={() => {
                        setShowIncidentModal(false);
                        setIncidentDriver(null);
                    }}
                    onIncidentAdded={() => {
                        // Score can change after adding an incident; refresh list + scores
                        loadDrivers();
                    }}
                    driver={incidentDriver}
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
                            <div style={{ flex: 1, minWidth: 0, marginLeft: '0.75rem' }}>
                                <div className="vehicle-number" style={{ margin: 0, fontSize: '1.05rem' }}>
                                    {driver.name}
                                </div>
                                <div className="vehicle-type" style={{ margin: 0 }}>
                                    License: {driver.licenseNumber}
                                </div>
                            </div>
                            <div
                                className="status-indicator"
                                style={{ background: getStatusColor(driver.status) }}
                                title={driver.status}
                            />
                        </div>

                        <div className="vehicle-card-body">
                            <div className="vehicle-specs">
                                <div className="spec-item">
                                    <span className="spec-label">Experience</span>
                                    <span className="spec-value">{driver.experienceLevel}</span>
                                </div>
                                <div className="spec-item">
                                    <span className="spec-label">Driver Score (Monthly)</span>
                                    <span className="spec-value" style={{ color: (driverScores[driver._id] ?? 100) >= 80 ? '#10B981' : '#F59E0B' }}>
                                        {driverScores[driver._id] == null ? '—' : `${driverScores[driver._id]}/100`}
                                    </span>
                                </div>
                            </div>

                            <div className="vehicle-driver" style={{ marginTop: '1rem' }}>
                                <div className="driver-info">
                                    <div className="driver-name">{driver.email}</div>
                                    <div className="driver-phone">{driver.contactNumber}</div>
                                </div>
                            </div>

                            <div style={{ marginTop: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', padding: '0.75rem' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                    Recent incidents
                                </div>
                                {(driverIncidents[driver._id] || []).length === 0 ? (
                                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>No incidents recorded.</div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {(driverIncidents[driver._id] || []).map((inc) => {
                                            const f = formatIncident(inc);
                                            return (
                                                <div key={inc._id} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
                                                    <div style={{ minWidth: 0 }}>
                                                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {f.title}
                                                        </div>
                                                        {f.detail ? (
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                {f.detail}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                                                        {f.when}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="vehicle-card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
                            <button className="btn-text" onClick={() => handleAddIncidentClick(driver)}>
                                <span className="material-icons-outlined" style={{ fontSize: '18px', marginRight: '4px' }}>report</span> Add Incident
                            </button>
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
