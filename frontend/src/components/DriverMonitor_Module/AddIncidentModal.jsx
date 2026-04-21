import { useMemo, useState } from 'react';
import { driverAPI } from '../../services/api';

const CATEGORY_OPTIONS = [
    { value: 'accident', label: 'Accident / Collision' },
    { value: 'complaint', label: 'Customer Complaint' },
    { value: 'delay', label: 'Delivery Delay' },
    { value: 'missed_delivery', label: 'Missed Delivery' },
    { value: 'vehicle_issue', label: 'Vehicle Issue' },
    { value: 'traffic_violation', label: 'Traffic Violation' }
];

function severityOptionsFor(category) {
    if (category === 'complaint' || category === 'traffic_violation') {
        return [
            { value: 'minor', label: 'Minor' },
            { value: 'moderate', label: 'Moderate' },
            { value: 'serious', label: 'Serious' }
        ];
    }
    if (category === 'delay') {
        return [
            { value: 'minor', label: '10–30 mins' },
            { value: 'moderate', label: '30–60 mins' },
            { value: 'major', label: '60+ mins' }
        ];
    }
    if (category === 'missed_delivery') {
        return [
            { value: 'minor', label: 'With valid reason' },
            { value: 'major', label: 'Without valid reason' }
        ];
    }
    return [
        { value: 'minor', label: 'Minor' },
        { value: 'moderate', label: 'Moderate' },
        { value: 'major', label: 'Major' }
    ];
}

function buildMeta({ category, delayMinutes, delayReason, missedValidReason }) {
    if (category === 'delay') {
        return {
            delayMinutes: Number(delayMinutes),
            reason: delayReason || ''
        };
    }
    if (category === 'missed_delivery') {
        return {
            validReason: Boolean(missedValidReason)
        };
    }
    return {};
}

export default function AddIncidentModal({ isOpen, onClose, onIncidentAdded, driver }) {
    const [category, setCategory] = useState('accident');
    const [severity, setSeverity] = useState('minor');
    const [verified, setVerified] = useState(true);
    const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString().slice(0, 16));
    const [delayMinutes, setDelayMinutes] = useState('');
    const [delayReason, setDelayReason] = useState('traffic');
    const [missedValidReason, setMissedValidReason] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const severityOptions = useMemo(() => severityOptionsFor(category), [category]);

    if (!isOpen) return null;

    const handleCategoryChange = (e) => {
        const next = e.target.value;
        setCategory(next);
        const opts = severityOptionsFor(next);
        setSeverity(opts[0]?.value || 'minor');
        // Defaults that match your ethical rules
        if (next === 'complaint' || next === 'traffic_violation') setVerified(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!driver?._id) return;
        setLoading(true);
        setError(null);
        try {
            const meta = buildMeta({ category, delayMinutes, delayReason, missedValidReason });
            await driverAPI.addIncident(driver._id, {
                category,
                severity,
                verified,
                meta,
                occurredAt: new Date(occurredAt).toISOString()
            });
            onIncidentAdded?.();
            onClose?.();
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Failed to add incident');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '620px', width: '90%', padding: '2rem' }}>
                <div className="modal-header" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', margin: 0 }}>Add Incident</h2>
                        <div style={{ marginTop: '0.35rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            {driver?.name} • {driver?.licenseNumber}
                        </div>
                    </div>
                    <button className="close-btn" onClick={onClose} style={{ fontSize: '1.5rem' }}>&times;</button>
                </div>

                {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Category *</label>
                            <select className="form-select" value={category} onChange={handleCategoryChange}>
                                {CATEGORY_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Severity *</label>
                            <select className="form-select" value={severity} onChange={(e) => setSeverity(e.target.value)}>
                                {severityOptions.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Occurred at *</label>
                            <input
                                type="datetime-local"
                                className="form-input"
                                value={occurredAt}
                                onChange={(e) => setOccurredAt(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Verified</label>
                            <select className="form-select" value={verified ? 'yes' : 'no'} onChange={(e) => setVerified(e.target.value === 'yes')}>
                                <option value="yes">Yes (Supervisor/Verified)</option>
                                <option value="no">No</option>
                            </select>
                            <div style={{ marginTop: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                Complaints & traffic violations only deduct when verified.
                            </div>
                        </div>
                    </div>

                    {category === 'delay' && (
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Delay minutes *</label>
                                <input
                                    type="number"
                                    min="0"
                                    className="form-input"
                                    value={delayMinutes}
                                    onChange={(e) => setDelayMinutes(e.target.value)}
                                    required
                                    placeholder="e.g. 42"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Reason</label>
                                <select className="form-select" value={delayReason} onChange={(e) => setDelayReason(e.target.value)}>
                                    <option value="traffic">Traffic (−50%)</option>
                                    <option value="weather">Weather (−50%)</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {category === 'missed_delivery' && (
                        <div className="form-group">
                            <label className="form-label">Valid reason?</label>
                            <select className="form-select" value={missedValidReason ? 'yes' : 'no'} onChange={(e) => setMissedValidReason(e.target.value === 'yes')}>
                                <option value="yes">Yes (customer unavailable, etc.)</option>
                                <option value="no">No</option>
                            </select>
                        </div>
                    )}

                    <div className="modal-footer" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
                        <button type="button" className="btn-text" onClick={onClose} style={{ fontSize: '1rem' }}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Incident'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

