import { useState } from 'react';

function BackhaulSelectionModal({ isOpen, onClose, backhauls, onSelect, loading }) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '700px' }}>
                <div className="modal-header">
                    <h2>
                        <span className="material-icons-outlined" style={{ verticalAlign: 'middle', marginRight: '8px', color: 'var(--primary-color)' }}>
                            sync_alt
                        </span>
                        Select Return Trip (Backhaul)
                    </h2>
                    <button className="close-btn" onClick={onClose} disabled={loading}>&times;</button>
                </div>

                <div className="modal-body">
                    <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
                        We found return trips near your delivery destination. Selecting a backhaul improves efficiency and reduces empty return costs.
                    </p>

                    {backhauls && backhauls.length > 0 ? (
                        <div className="card-grid" style={{ gridTemplateColumns: '1fr', gap: '1rem' }}>
                            {backhauls.map((backhaul) => (
                                <div key={backhaul._id} className="card" style={{ padding: '1.25rem', border: '1px solid var(--border-color)', cursor: 'pointer', transition: 'border-color 0.2s', ':hover': { borderColor: 'var(--primary-color)' } }} onClick={() => !loading && onSelect(backhaul._id)}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                        <div>
                                            <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', display: 'block', marginBottom: '4px' }}>{backhaul.jobId}</strong>
                                            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                                {backhaul.cargo?.description} ({backhaul.cargo?.weight}kg / {backhaul.cargo?.volume}m³)
                                            </span>
                                        </div>
                                        {backhaul.score && (
                                            <div style={{ textAlign: 'right' }}>
                                                <span className="badge badge-success" style={{ marginBottom: '4px', display: 'inline-block' }}>
                                                    Match: {backhaul.score}%
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ fontSize: '0.875rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                                        <div style={{ marginBottom: '4px' }}>
                                            <strong>From:</strong> {backhaul.pickup?.address}
                                        </div>
                                        <div>
                                            <strong>To:</strong> {backhaul.delivery?.address}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                                            <span className="material-icons-outlined" style={{ fontSize: '16px', verticalAlign: 'text-bottom', marginRight: '4px' }}>distance</span>
                                            {(backhaul.distanceFromDelivery / 1000).toFixed(1)} km from delivery
                                        </span>
                                        <button
                                            className="btn-primary"
                                            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSelect(backhaul._id);
                                            }}
                                            disabled={loading}
                                        >
                                            {loading ? 'Processing...' : 'Select Trip'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state" style={{ padding: '3rem 1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                            <span className="material-icons-outlined" style={{ fontSize: '48px', color: 'var(--text-tertiary)', marginBottom: '1rem' }}>
                                no_transfer
                            </span>
                            <h3 style={{ marginBottom: '0.5rem' }}>No Return Trips Found</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                There are currently no pending jobs near the delivery location that fit this vehicle.
                            </p>
                        </div>
                    )}
                </div>

                <div className="modal-footer" style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                        You can skip this step and proceed with the primary booking.
                    </span>
                    <button
                        style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', fontWeight: 500, cursor: 'pointer', padding: '0.5rem 1rem' }}
                        onClick={() => onSelect('skip')}
                        disabled={loading}
                    >
                        {loading ? 'Skipping...' : 'Skip Backhaul'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default BackhaulSelectionModal;
