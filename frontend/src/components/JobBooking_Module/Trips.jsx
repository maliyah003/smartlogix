import { useState, useEffect } from 'react';
import { jobAPI, tripAPI } from '../../services/api';
import TripModal from './TripModal';
import { BlinkBlur } from 'react-loading-indicators';

function Trips() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedTripId, setSelectedTripId] = useState(null);
    const [deleteTripId, setDeleteTripId] = useState(null);
    const [completeTripId, setCompleteTripId] = useState(null);
    const [processingId, setProcessingId] = useState(null);

    const [toastMessage, setToastMessage] = useState({ text: '', type: '' });
    const showToast = (text, type = 'success') => {
        setToastMessage({ text, type });
        setTimeout(() => setToastMessage({ text: '', type: '' }), 4000);
    };

    const loadTrips = async () => {
        try {
            setLoading(true);
            const response = await jobAPI.getAll({ limit: 50 });
            setJobs(response.data.jobs || []);
            setError(null);
        } catch (err) {
            setError('Failed to load trips');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTrips();
    }, []);

    const confirmDeleteTrip = async () => {
        if (!deleteTripId) return;
        setProcessingId(deleteTripId);
        try {
            await tripAPI.delete(deleteTripId);
            showToast('Trip deleted successfully', 'success');
            loadTrips(); // Reload table data
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to delete trip', 'error');
        } finally {
            setProcessingId(null);
            setDeleteTripId(null);
        }
    };

    const confirmCompleteTrip = async () => {
        if (!completeTripId) return;
        setProcessingId(completeTripId);
        try {
            await tripAPI.updateStatus(completeTripId, 'completed');
            showToast('Trip completed successfully. The ML Engine request has been dispatched!', 'success');
            loadTrips(); // Reload to see status change
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to complete trip', 'error');
        } finally {
            setProcessingId(null);
            setCompleteTripId(null);
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: 'badge-warning',
            matched: 'badge-teal',
            assigned: 'badge-purple', // hybrid job status
            scheduled: 'badge-indigo', // hybrid trip status
            active: 'badge-info',
            completed: 'badge-success',
            cancelled: 'badge-danger'
        };
        return badges[status] || 'badge-info';
    };

    const getJobTypeBadge = (jobType) => {
        return jobType === 'backhaul' ? 'badge-success' : 'badge-info';
    };

    if (loading) {
        return (
            <div className="loading-container">
                <BlinkBlur color="#f59e0b" size="medium" text="" textColor="" />
            </div>
        );
    }

    return (
        <div className="fade-in">
            <TripModal
                isOpen={!!selectedTripId}
                onClose={() => setSelectedTripId(null)}
                tripId={selectedTripId}
            />

            <div className="page-header">
                <div>
                    <p className="page-subtitle">Monitor all jobs and trips</p>
                    <h1 className="page-title">Trip Tracking</h1>
                </div>
            </div>

            {error && <div className="error">{error}</div>}

            <div className="card">
                <div className="card-header">
                    <h3>All Jobs ({jobs.length})</h3>
                </div>
                {jobs.length === 0 ? (
                    <div className="empty-state">
                        <span className="material-icons-outlined" style={{ fontSize: '40px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '0.5rem' }}>route</span>
                        No jobs found. Book your first job to get started.
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Job ID</th>
                                    <th>Type</th>
                                    <th>Cargo</th>
                                    <th>Route</th>
                                    <th>Pickup Time</th>
                                    <th>Assignee</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {jobs.map((job) => (
                                    <tr
                                        key={job._id}
                                        onClick={() => job.assignedTrip && setSelectedTripId(job.assignedTrip.tripId)}
                                        style={{ cursor: job.assignedTrip ? 'pointer' : 'default' }}
                                        title={job.assignedTrip ? "Click to view trip details and route on map" : "No trip assigned yet"}
                                    >
                                        <td><strong>{job.jobId}</strong></td>
                                        <td>
                                            <span className={`badge ${getJobTypeBadge(job.jobType)}`}>
                                                {job.jobType}
                                            </span>
                                        </td>
                                        <td>
                                            {job.cargo.description}<br />
                                            <small style={{ color: 'var(--text-tertiary)' }}>
                                                {job.cargo.weight}kg / {job.cargo.volume}m³
                                            </small>
                                        </td>
                                        <td>
                                            <small style={{ color: 'var(--text-secondary)' }}>
                                                {job.pickup.address}
                                                <span className="material-icons-outlined" style={{ fontSize: '14px', verticalAlign: 'middle', margin: '0 4px' }}>arrow_forward</span>
                                                {job.delivery.address}
                                            </small>
                                        </td>
                                        <td>
                                            {new Date(job.pickup.datetime).toLocaleString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </td>
                                        <td>
                                            {job.assignedVehicle ? (
                                                <>
                                                    <strong>{job.assignedVehicle.registrationNumber}</strong>
                                                    {job.assignedTrip?.driver && (
                                                        <><br /><small style={{ color: 'var(--text-secondary)' }}>{job.assignedTrip.driver.name}</small></>
                                                    )}
                                                </>
                                            ) : (
                                                <span style={{ color: 'var(--text-tertiary)' }}>Unassigned</span>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`badge ${getStatusBadge(job.assignedTrip ? job.assignedTrip.status : job.status)}`}>
                                                {job.assignedTrip ? job.assignedTrip.status : job.status}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            {job.assignedTrip && job.assignedTrip.status !== 'completed' && job.assignedTrip.status !== 'cancelled' && (
                                                <button
                                                    className="btn-text"
                                                    style={{ color: 'var(--status-success)', marginRight: '8px' }}
                                                    onClick={(e) => { e.stopPropagation(); setCompleteTripId(job.assignedTrip.tripId); }}
                                                    title="Complete Trip (Triggers ML Prediction)"
                                                >
                                                    <span className="material-icons-outlined" style={{ fontSize: '18px' }}>check_circle</span>
                                                </button>
                                            )}
                                            {job.assignedTrip && (
                                                <button
                                                    className="btn-text"
                                                    style={{ color: 'var(--status-error)' }}
                                                    onClick={(e) => { e.stopPropagation(); setDeleteTripId(job.assignedTrip.tripId); }}
                                                    title="Cancel & Delete Trip"
                                                >
                                                    <span className="material-icons-outlined" style={{ fontSize: '18px' }}>delete</span>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {deleteTripId && (
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
                                <span className="material-icons-outlined" style={{ color: '#DC2626', fontSize: '24px' }}>delete_outline</span>
                            </div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1A1D26', marginBottom: '8px' }}>
                                Delete Trip?
                            </h2>
                            <p style={{ color: '#6B7280', lineHeight: '1.5' }}>
                                Are you sure you want to delete <strong style={{ color: '#1A1D26' }}>{deleteTripId}</strong>? The associated vehicles and jobs will be released and set back to pending.
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setDeleteTripId(null)}
                                style={{ flex: 1, justifyContent: 'center' }}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn"
                                onClick={confirmDeleteTrip}
                                disabled={processingId === deleteTripId}
                                style={{
                                    flex: 1,
                                    justifyContent: 'center',
                                    backgroundColor: '#DC2626',
                                    color: 'white',
                                    border: 'none',
                                    opacity: processingId === deleteTripId ? 0.7 : 1
                                }}
                            >
                                {processingId === deleteTripId ? 'Deleting...' : 'Yes, Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Complete Confirmation Modal */}
            {completeTripId && (
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
                                backgroundColor: '#F0FDF4', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 16px auto'
                            }}>
                                <span className="material-icons-outlined" style={{ color: '#16A34A', fontSize: '24px' }}>check_circle_outline</span>
                            </div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1A1D26', marginBottom: '8px' }}>
                                Complete Trip?
                            </h2>
                            <p style={{ color: '#6B7280', lineHeight: '1.5' }}>
                                Mark <strong style={{ color: '#1A1D26' }}>{completeTripId}</strong> as completed? This will trigger the Predictive Maintenance ML Engine validation.
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setCompleteTripId(null)}
                                style={{ flex: 1, justifyContent: 'center' }}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn"
                                onClick={confirmCompleteTrip}
                                disabled={processingId === completeTripId}
                                style={{
                                    flex: 1,
                                    justifyContent: 'center',
                                    backgroundColor: '#16A34A',
                                    color: 'white',
                                    border: 'none',
                                    opacity: processingId === completeTripId ? 0.7 : 1
                                }}
                            >
                                {processingId === completeTripId ? 'Processing...' : 'Yes, Complete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notifications */}
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

export default Trips;
