import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PageLoading from '../common/PageLoading';
import './FuelConsistency.css';

const API_URL = 'https://smartlogix-production.up.railway.app/api/trip-costs';

function FuelConsistency() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/admin/daily-consistency`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setReports(response.data.report);
            } else {
                setError(response.data.error || 'Failed to fetch fuel consistency data');
            }
        } catch (err) {
            console.error('Error fetching consistency:', err);
            setError('Failed to load consistency data');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async (registrationNumber) => {
        if (!window.confirm(`Are you sure you want to reset the fuel consistency record for ${registrationNumber}?`)) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`${API_URL}/admin/reset-consistency/${registrationNumber}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                fetchData(); // Refresh table
            } else {
                alert(response.data.error || 'Failed to reset consistency');
            }
        } catch (err) {
            console.error('Error resetting consistency:', err);
            alert('Failed to reset consistency record');
        }
    };

    if (loading) {
        return (
            <div className="fade-in fuel-consistency-page">
                <PageLoading />
            </div>
        );
    }

    if (error) {
        return (
            <div className="fade-in fuel-consistency-page" style={{ maxWidth: '1400px' }}>
                <div className="page-header">
                    <div>
                        <p className="page-subtitle">Consumption variance across the fleet (Past 7 Days)</p>
                        <h1 className="page-title">Fuel Consistency</h1>
                    </div>
                </div>
                <div className="error">{error}</div>
            </div>
        );
    }

    return (
        <div className="fade-in fuel-consistency-page" style={{ maxWidth: '1400px' }}>
            <div className="page-header">
                <div>
                    <p className="page-subtitle">Consumption variance across the fleet (Past 7 Days)</p>
                    <h1 className="page-title">Fuel Consistency</h1>
                </div>
                <button type="button" className="btn-primary" onClick={fetchData}>
                    <span className="material-icons-outlined" style={{ fontSize: '18px' }}>refresh</span>
                    Refresh
                </button>
            </div>

            <div className="card-grid fc-metrics-grid">
                <div className="card fc-metric-card">
                    <div className="fc-metric-icon fc-metric-icon--info">
                        <span className="material-icons-outlined">directions_car</span>
                    </div>
                    <div className="fc-metric-copy">
                        <span className="fc-metric-label">Active vehicles (Past 7 Days)</span>
                        <p className="fc-metric-value">{reports.length}</p>
                    </div>
                </div>
                <div className="card fc-metric-card">
                    <div className="fc-metric-icon fc-metric-icon--warn">
                        <span className="material-icons-outlined">warning</span>
                    </div>
                    <div className="fc-metric-copy">
                        <span className="fc-metric-label">High variations</span>
                        <p className="fc-metric-value">
                            {reports.filter((r) => r.status === 'High Variation').length}
                        </p>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-header" style={{ marginBottom: '1rem' }}>
                    <h3>Fleet consumption (Past 7 Days)</h3>
                </div>
                <div className="fc-table-wrap">
                    <table className="fc-data-table">
                        <thead>
                            <tr>
                                <th>Vehicle registration</th>
                                <th>Trips completed</th>
                                <th>Average consumption (km/L)</th>
                                <th>Variance (km/L)</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reports.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="fc-empty-row">
                                        No trips completed in the past 7 days.
                                    </td>
                                </tr>
                            ) : (
                                reports.map((item, index) => (
                                    <tr key={index}>
                                        <td>
                                            <span className="fc-vehicle-pill">{item.vehicleRegistration}</span>
                                        </td>
                                        <td>{item.tripsCount}</td>
                                        <td>
                                            <strong>{item.averageConsumption.toFixed(2)}</strong> km/L
                                        </td>
                                        <td>
                                            {item.status === 'Insufficient Data'
                                                ? '—'
                                                : `${item.variance.toFixed(2)} km/L`}
                                        </td>
                                        <td>
                                            {item.status === 'High Variation' && (
                                                <span className="badge badge-danger">{item.status}</span>
                                            )}
                                            {item.status === 'Consistent' && (
                                                <span className="badge badge-success">{item.status}</span>
                                            )}
                                            {item.status === 'Insufficient Data' && (
                                                <span className="badge badge-info">{item.status}</span>
                                            )}
                                            {item.status !== 'High Variation' &&
                                                item.status !== 'Consistent' &&
                                                item.status !== 'Insufficient Data' && (
                                                    <span className="badge badge-warning">{item.status}</span>
                                                )}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button 
                                                className="btn-text" 
                                                onClick={() => handleReset(item.vehicleRegistration)}
                                                style={{ color: 'var(--status-error)' }}
                                                title="Reset Consistency"
                                            >
                                                <span className="material-icons-outlined" style={{ fontSize: '18px' }}>restart_alt</span>
                                                Reset
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default FuelConsistency;
