import React, { useState } from 'react';

function TrackingSearch({ onSearch, isLoading }) {
    const [trackingId, setTrackingId] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (trackingId.trim()) {
            onSearch(trackingId.trim());
        }
    };

    return (
        <div className="card tracking-search-card">
            <div className="card-header" style={{ marginBottom: '0.5rem' }}>
                <h3>Track your shipment</h3>
            </div>
            <p className="page-subtitle" style={{ marginBottom: '1.25rem' }}>
                Enter your internal Job ID to see real-time delivery updates.
            </p>

            <form onSubmit={handleSubmit} className="tracking-search-form">
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label" htmlFor="tracking-job-id">
                        Job ID
                    </label>
                    <div className="tracking-input-wrap">
                        <span className="material-icons-outlined tracking-input-icon">search</span>
                        <input
                            id="tracking-job-id"
                            type="text"
                            placeholder="e.g. JOB-2026-1234"
                            value={trackingId}
                            onChange={(e) => setTrackingId(e.target.value)}
                            className="form-input tracking-input-field"
                            required
                        />
                    </div>
                </div>
                <button
                    type="submit"
                    className="btn-primary tracking-submit-btn"
                    disabled={isLoading || !trackingId.trim()}
                >
                    <span className="material-icons-outlined" style={{ fontSize: '18px' }}>
                        {isLoading ? 'hourglass_empty' : 'near_me'}
                    </span>
                    {isLoading ? 'Searching…' : 'Track package'}
                </button>
            </form>
        </div>
    );
}

export default TrackingSearch;
