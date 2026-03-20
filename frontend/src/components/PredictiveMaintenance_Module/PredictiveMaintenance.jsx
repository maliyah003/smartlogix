import React, { useState, useEffect } from 'react';
import { vehicleAPI } from '../../services/api';
import './PredictiveMaintenance.css';
import { BlinkBlur } from 'react-loading-indicators';

const PredictiveMaintenance = () => {
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [logs, setLogs] = useState([]);
  const [globalLogs, setGlobalLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [engineStatus, setEngineStatus] = useState('checking'); // checking, online, offline

  // Check ML Engine Health
  useEffect(() => {
    const checkEngine = async () => {
      try {
        await fetch('http://127.0.0.1:5004/', { mode: 'no-cors' });
        setEngineStatus('online');
      } catch (err) {
        setEngineStatus('offline');
      }
    };

    checkEngine();
    const interval = setInterval(checkEngine, 15000); // Check every 15s
    return () => clearInterval(interval);
  }, []);

  // Load vehicles
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const response = await vehicleAPI.getAll();
        const vList = response.data.vehicles || [];
        setVehicles(vList);
        if (vList.length > 0) {
          setSelectedVehicle(vList[0]._id);
        }
      } catch (err) {
        console.error('Failed to load vehicles:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchVehicles();
  }, []);

  // Load logs when vehicle changes
  useEffect(() => {
    if (selectedVehicle) {
      const fetchLogs = async () => {
        try {
          const res = await vehicleAPI.getMaintenanceLogs(selectedVehicle);
          setLogs(res.data.logs || []);
        } catch (err) {
          console.error('Failed to fetch logs:', err);
        }
      };
      fetchLogs();
    }
  }, [selectedVehicle]);

  // Load global recent logs
  useEffect(() => {
    const fetchGlobalLogs = async () => {
      try {
        const res = await vehicleAPI.getRecentMaintenanceLogs();
        setGlobalLogs(res.data.logs || []);
      } catch (err) {
        console.error('Failed to fetch global logs:', err);
      }
    };
    fetchGlobalLogs();
  }, []); // Run once on mount

  const currentVehicleData = vehicles.find(v => v._id === selectedVehicle);
  const latestLog = logs[0]; // Assuming logs are sorted descending by createdAt

  const renderPredictionBadge = (prediction) => {
    if (!prediction) return <span className="badge badge-warning">Status Unknown</span>;
    if (prediction.error) return <span className="badge badge-danger">Prediction Failed</span>;

    const predText = prediction.maintenance_prediction || prediction.engine_health_percentage || 'OK';
    const textLower = String(predText).toLowerCase();
    
    let badgeClass = 'status-info';
    let icon = 'info';
    let bgOpacity = 'rgba(59, 130, 246, 0.1)';
    
    if (textLower.includes('no immediate') || textLower === 'ok' || textLower === 'good' || textLower === 'success') {
      badgeClass = 'status-success';
      icon = 'check_circle';
      bgOpacity = 'rgba(16, 185, 129, 0.1)';
    } else if (textLower.includes('routine') || textLower.includes('inspection')) {
      badgeClass = 'status-warning';
      icon = 'build';
      bgOpacity = 'rgba(245, 158, 11, 0.1)';
    } else if (textLower.includes('overhaul') || textLower.includes('replacement') || textLower.includes('repair')) {
      badgeClass = 'status-error';
      icon = 'warning';
      bgOpacity = 'rgba(239, 68, 68, 0.1)';
    }

    return (
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: '16px', marginTop: '16px', marginBottom: '16px',
        padding: '16px 20px', backgroundColor: bgOpacity, borderRadius: 'var(--radius-md)',
        borderLeft: `4px solid var(--${badgeClass})`
      }}>
        <span className="material-icons-outlined" style={{ color: `var(--${badgeClass})`, fontSize: '28px', marginTop: '2px' }}>
          {icon}
        </span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Model Inference Result
          </span>
          <span style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
            {predText}
          </span>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="predictive-maintenance-container fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <BlinkBlur color="#f59e0b" size="medium" text="" textColor="" />
      </div>
    );
  }

  return (
    <div className="predictive-maintenance-container fade-in">
      <div className="pm-content">
        <div className="pm-header">
          <div className="header-title">
            <span className="material-icons-outlined ai-icon">memory</span>
            <h1>Predictive Maintenance Engine</h1>
          </div>
          <div className="status-badge">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Fleet Target:</span>
              <select 
                className="target-select"
                value={selectedVehicle || ''} 
                onChange={(e) => setSelectedVehicle(e.target.value)}
              >
                {vehicles.map(v => (
                  <option key={v._id} value={v._id}>{v.registrationNumber} ({v.vehicleType})</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px', paddingLeft: '12px', borderLeft: '1px solid var(--border-light)' }}>
              <span 
                className={`status-dot ${engineStatus === 'online' ? 'active' : engineStatus === 'checking' ? 'pulsing' : 'disconnected'}`}
                title={engineStatus === 'online' ? 'Engine is reachable' : 'Engine is offline'}
              ></span>
              <span style={{ color: 'var(--text-secondary)' }}>
                {engineStatus === 'online' ? 'Live Engine Linked' : engineStatus === 'checking' ? 'Checking Engine...' : 'Engine Disconnected'}
              </span>
            </div>
          </div>
        </div>

        {currentVehicleData ? (
          <div className="pm-dashboard">
            <div className="glass-card fleet-health">
              <h3>{currentVehicleData.registrationNumber} - Data Profile</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
                <div className="metric-box">
                  <span className="metric-label">Vehicle Type</span>
                  <div className="metric-value">{currentVehicleData.vehicleType || 'Truck'}</div>
                </div>
                <div className="metric-box">
                  <span className="metric-label">Total Usage Hours</span>
                  <div className="metric-value highlight">{(currentVehicleData.usageHours || 0).toFixed(1)} hr</div>
                </div>
                <div className="metric-box">
                  <span className="metric-label">Latest Route Env.</span>
                  <div className="metric-value">{latestLog?.metrics?.route_info || 'N/A'}</div>
                </div>
                <div className="metric-box">
                  <span className="metric-label">Load Capacity</span>
                  <div className="metric-value">{currentVehicleData.capacity?.weight ? (currentVehicleData.capacity.weight / 1000) : 20} Tons</div>
                </div>
              </div>

              <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-light)' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', fontWeight: 600, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Recent Fleet Alerts
                    </p>
                    <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>Global</span>
                 </div>
                 
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {globalLogs.length === 0 ? (
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>No recent maintenance alerts available.</p>
                    ) : (
                        globalLogs.map((gLog) => {
                            const predLower = String(gLog.prediction?.maintenance_prediction || gLog.prediction?.engine_health_percentage || 'OK').toLowerCase();
                            let bColor = 'var(--status-success)';
                            if (predLower.includes('routine') || predLower.includes('inspection')) bColor = 'var(--status-warning)';
                            else if (predLower.includes('overhaul') || predLower.includes('replacement')) bColor = 'var(--status-error)';
                            
                            return (
                                <div 
                                    key={gLog._id}
                                    onClick={() => setSelectedVehicle(gLog.vehicle._id)}
                                    style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '10px 12px', background: 'var(--bg-tertiary)',
                                        border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)',
                                        cursor: 'pointer', transition: 'all 0.2s'
                                    }}
                                    className="global-alert-item"
                                    onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--status-info)'; e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                                    onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
                                >
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{gLog.vehicle?.registrationNumber || 'Unknown'}</span>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{gLog.vehicle?.model}</span>
                                        </div>
                                        <span style={{ fontSize: '0.75rem', color: bColor, fontWeight: 500 }}>
                                            {gLog.prediction?.maintenance_prediction || gLog.prediction?.engine_health_percentage || 'OK'}
                                        </span>
                                    </div>
                                    <span className="material-icons-outlined" style={{ fontSize: '18px', color: 'var(--text-tertiary)' }}>chevron_right</span>
                                </div>
                            );
                        })
                    )}
                 </div>
              </div>
            </div>

            <div className="glass-card ai-insights">
              <h3>Inference Matrix & Maintenance Logs</h3>
              
              <div className="insights-list" style={{ overflowY: 'auto', maxHeight: '500px', paddingRight: '8px' }}>
                {logs.length === 0 ? (
                  <div className="empty-state" style={{ marginTop: '40px' }}>
                    <span className="material-icons-outlined" style={{ fontSize: '3rem', opacity: 0.6, marginBottom: '12px' }}>receipt_long</span>
                    <p style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>No model predictions recorded yet.<br/>Predictions hit this log automatically on trip completion.</p>
                  </div>
                ) : (
                  logs.map((log, idx) => (
                    <div key={log._id} className={`insight-item ${idx === 0 ? 'latest' : ''}`}>
                      <span className="material-icons-outlined" style={{ color: idx === 0 ? 'var(--status-info)' : 'var(--text-tertiary)', marginTop: '2px' }}>
                        {idx === 0 ? 'auto_graph' : 'history'}
                      </span>
                      <div className="insight-text" style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                           <strong>Prediction Output Request {log.trip ? `(Trip ${log.trip.tripId})` : ''}</strong>
                           <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{new Date(log.createdAt).toLocaleString()}</span>
                        </div>
                        
                        {renderPredictionBadge(log.prediction)}

                        <div style={{ display: 'flex', gap: '16px', color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '8px' }}>
                          <span><strong>Load:</strong> {log.metrics.actual_load || 0} T</span>
                          <span><strong>Route:</strong> {log.metrics.route_info || 'N/A'}</span>
                          <span><strong>Usage:</strong> {log.metrics.usage_hours || 0} hr</span>
                          <span><strong>Since Svc:</strong> {log.metrics.days_since_service || 0} d</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-state" style={{ height: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span className="material-icons-outlined" style={{ fontSize: '3rem', opacity: 0.5, marginBottom: '1rem' }}>local_shipping</span>
            <h2>No Fleet Vehicles Found</h2>
            <p>Add a truck to the fleet to enable ML linking.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PredictiveMaintenance;
