import { useState, useEffect } from 'react';
import { tripAPI, driverAPI } from '../../services/api';
import './TripRefusals.css';
import PageLoading from '../common/PageLoading';

function TripRefusals() {
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [error, setError] = useState(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTrip, setSelectedTrip] = useState(null);
    const [availableDrivers, setAvailableDrivers] = useState([]);
    const [newDriverId, setNewDriverId] = useState('');

    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [rejectTripId, setRejectTripId] = useState(null);

    const [toastMessage, setToastMessage] = useState({ text: '', type: '' });
    const showToast = (text, type = 'success') => {
        setToastMessage({ text, type });
        setTimeout(() => setToastMessage({ text: '', type: '' }), 4000);
    };

    const loadRefusals = async () => {
        setLoading(true);
        try {
            // Reusing get trips and filtering pending refusals.
            const res = await tripAPI.getAllTrips();
            if (res.data.success) {
                // strict check for true refusal
                const pendingRefusals = res.data.trips.filter(t => t.refusalRequest && t.refusalRequest.requested === true && t.refusalRequest.status === 'pending');
                setTrips(pendingRefusals);
                setError(null);
            }
        } catch (err) {
            console.error(err);
            setError('Failed to load trip refusal requests.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRefusals();
    }, []);

    const handleOpenAssignModal = async (trip) => {
        setSelectedTrip(trip);
        setNewDriverId('');
        setIsModalOpen(true);

        try {
            // For a robust system we'd pass datetimes, but since it's an immediate reassignment we just grab available drivers right now
            const response = await driverAPI.getAvailable();
            if (response.data.success) {
                setAvailableDrivers(response.data.drivers || []);
            }
        } catch (err) {
            console.error('Failed to load available drivers', err);
        }
    };

    const handleApproveReassign = async () => {
        if (!newDriverId) {
            showToast('Please select a driver', 'error');
            return;
        }

        setProcessingId(selectedTrip.tripId);
        setIsModalOpen(false);
        try {
            const response = await tripAPI.approveRefusal(selectedTrip.tripId, { newDriverId });
            if (response.data.success) {
                showToast('Refusal approved and trip reassigned successfully', 'success');
                loadRefusals();
            } else {
                showToast('Failed to reassign trip', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('An error occurred while reassigning the trip', 'error');
        } finally {
            setProcessingId(null);
            setSelectedTrip(null);
        }
    };

    const handleOpenRejectModal = (tripId) => {
        setRejectTripId(tripId);
        setIsRejectModalOpen(true);
    };

    const handleConfirmReject = async () => {
        if (!rejectTripId) return;

        setProcessingId(rejectTripId);
        setIsRejectModalOpen(false);
        try {
            const response = await tripAPI.rejectRefusal(rejectTripId);
            if (response.data.success) {
                showToast('Refusal rejected successfully. Trip remains assigned.', 'success');
                loadRefusals();
            } else {
                showToast('Failed to reject refusal', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('An error occurred while rejecting the refusal.', 'error');
        } finally {
            setProcessingId(null);
            setRejectTripId(null);
        }
    };

    if (loading) {
        return (
            <PageLoading />
        );
    }

    return (
        <div className="refusals-container">
            <div className="header-bar">
                <div className="title-section">
                    <h1 className="page-title">Trip Refusal Requests</h1>
                    <span className="badge badge-warning">{trips.length} Pending</span>
                </div>
                <button className="btn btn-secondary" onClick={loadRefusals}>
                    <span className="material-icons-outlined">refresh</span>
                    Refresh
                </button>
            </div>

            {error && (
                <div className="error-banner">
                    <span className="material-icons-outlined">error_outline</span>
                    {error}
                </div>
            )}

            <div className="refusal-grid">
                {trips.length === 0 ? (
                    <div className="empty-state">
                        <span className="material-icons-outlined">fact_check</span>
                        <h3>No Pending Requests</h3>
                        <p>All drivers have accepted their assigned trips.</p>
                    </div>
                ) : (
                    trips.map(trip => (
                        <div key={trip._id} className="refusal-card">
                            <div className="refusal-header">
                                <h3>{trip.primaryJob?.jobId || trip.tripId}</h3>
                                <div className="vehicle-badge">
                                    <span className="material-icons-outlined">local_shipping</span>
                                    {trip.vehicle?.registrationNumber || 'Unknown'}
                                </div>
                            </div>

                            <div className="driver-info">
                                <div className="driver-avatar">
                                    <span className="material-icons-outlined">person</span>
                                </div>
                                <div>
                                    <p className="driver-name">{trip.driver?.name || 'Unknown Driver'}</p>
                                    <p className="driver-contact">{trip.driver?.contactNumber || 'N/A'}</p>
                                </div>
                            </div>

                            <div className="reason-box">
                                <span className="reason-label">Refusal Reason:</span>
                                <p className="reason-text">"{trip.refusalRequest?.reason || 'No reason provided'}"</p>
                            </div>

                            <div className="job-summary">
                                <div>
                                    <span className="label">Primary Job</span>
                                    <p>{trip.primaryJob?.jobId}</p>
                                </div>
                                {trip.backhaulJob && (
                                    <div>
                                        <span className="label">Return Job</span>
                                        <p>{trip.backhaulJob?.jobId}</p>
                                    </div>
                                )}
                            </div>

                            <div className="actions-bar">
                                <button
                                    className="btn reject-btn"
                                    onClick={() => handleOpenRejectModal(trip.tripId)}
                                    disabled={processingId === trip.tripId}
                                >
                                    {processingId === trip.tripId ? (
                                        <span className="material-icons-outlined spin" style={{ fontSize: '18px', marginRight: '6px' }}>refresh</span>
                                    ) : (
                                        <span className="material-icons-outlined" style={{ fontSize: '18px', marginRight: '6px' }}>cancel</span>
                                    )}
                                    Reject
                                </button>
                                <button
                                    className="btn accept-btn"
                                    onClick={() => handleOpenAssignModal(trip)}
                                    disabled={processingId === trip.tripId}
                                >
                                    {processingId === trip.tripId ? (
                                        <span className="material-icons-outlined spin" style={{ fontSize: '18px', marginRight: '6px' }}>refresh</span>
                                    ) : (
                                        <span className="material-icons-outlined" style={{ fontSize: '18px', marginRight: '6px' }}>check_circle</span>
                                    )}
                                    Accept Refusal
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Reassignment Modal */}
            {isModalOpen && selectedTrip && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div className="modal-content" style={{
                        backgroundColor: '#fff', borderRadius: '12px', padding: '24px',
                        width: '400px', maxWidth: '90%'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Reassign job {selectedTrip.primaryJob?.jobId || selectedTrip.tripId}</h2>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
                        </div>
                        <div style={{ marginBottom: '24px' }}>
                            <p style={{ color: '#6B7280', marginBottom: '16px' }}>Select an available driver to take over this trip.</p>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Available Drivers</label>
                            <select
                                className="form-input"
                                value={newDriverId}
                                onChange={(e) => setNewDriverId(e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #E5E7EB' }}
                            >
                                <option value="">-- Select Driver --</option>
                                {availableDrivers.map(d => (
                                    <option key={d._id} value={d._id}>{d.name} ({d.contactNumber})</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleApproveReassign} disabled={!newDriverId}>
                                Confirm Reassignment
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Confirmation Modal */}
            {isRejectModalOpen && rejectTripId && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div className="modal-content" style={{
                        backgroundColor: '#fff', borderRadius: '12px', padding: '24px',
                        width: '400px', maxWidth: '90%', textAlign: 'center'
                    }}>
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{
                                width: '48px', height: '48px', borderRadius: '24px',
                                backgroundColor: '#FEF2F2', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 16px auto'
                            }}>
                                <span className="material-icons-outlined" style={{ color: '#DC2626', fontSize: '24px' }}>warning_amber</span>
                            </div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1A1D26', marginBottom: '8px' }}>
                                Reject Refusal?
                            </h2>
                            <p style={{ color: '#6B7280', lineHeight: '1.5' }}>
                                Are you sure you want to reject the refusal for <strong style={{ color: '#1A1D26' }}>{rejectTripId}</strong>? The driver will be forced to complete the assigned trip.
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setIsRejectModalOpen(false)}
                                style={{ flex: 1, justifyContent: 'center' }}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn"
                                onClick={handleConfirmReject}
                                style={{
                                    flex: 1,
                                    justifyContent: 'center',
                                    backgroundColor: '#DC2626',
                                    color: 'white',
                                    border: 'none'
                                }}
                            >
                                Yes, Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Toast Notification */}
            {toastMessage.text && (
                <div style={{
                    position: 'fixed', bottom: '24px', right: '24px',
                    backgroundColor: toastMessage.type === 'error' ? '#DC2626' : '#10B981',
                    color: '#fff', padding: '12px 24px', borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', gap: '8px',
                    fontWeight: '500'
                }}>
                    <span className="material-icons-outlined" style={{ fontSize: '20px' }}>
                        {toastMessage.type === 'error' ? 'error_outline' : 'check_circle'}
                    </span>
                    {toastMessage.text}
                </div>
            )}
        </div>
    );
}

export default TripRefusals;
