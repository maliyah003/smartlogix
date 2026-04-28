import { useEffect, useState } from 'react';
import { proofOfDeliveryAPI } from '../../services/api';
import PageLoading from '../common/PageLoading';
import '../../pages/Vehicles.css';
import './ProofOfDelivery.css';

function asDataUri(raw) {
    if (!raw) return '';
    if (String(raw).startsWith('data:image/')) return raw;
    return `data:image/jpeg;base64,${raw}`;
}

function ProofOfDelivery() {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredRecords = records.filter((r) => {
        if (!searchTerm.trim()) return true;

        const query = searchTerm.toLowerCase();
        const tripId = (r.trip?.tripId || '').toLowerCase();
        const jobId = (r.trip?.primaryJob?.jobId || '').toLowerCase();
        const driverName = (r.trip?.driver?.name || '').toLowerCase();
        const vehicleReg = (r.trip?.vehicle?.registrationNumber || '').toLowerCase();

        return tripId.includes(query) ||
            jobId.includes(query) ||
            driverName.includes(query) ||
            vehicleReg.includes(query);
    });

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const res = await proofOfDeliveryAPI.getAll({ limit: 50 });
                setRecords(res.data?.proofs || []);
                setError('');
            } catch (e) {
                console.error(e);
                setError('Failed to load proof of delivery records');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) return <PageLoading />;

    return (
        <div className="pod-page">
            <div className="page-header-section">
                <div>
                    <p className="page-subtitle-new">Delivery evidence captured by drivers</p>
                    <h1 className="page-title-new">Proof of Delivery</h1>
                </div>
            </div>

            {error ? <div className="error-message">{error}</div> : null}

            <div className="vehicles-toolbar">
                <div className="search-box">
                    <span className="material-icons-outlined search-icon">search</span>
                    <input
                        type="text"
                        placeholder="Search proof records..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>
            </div>

            <div className="pod-grid">
                {filteredRecords.map((r) => (
                    <article key={r._id} className="pod-card">
                        <div className="pod-head">
                            <div className="pod-title">{r.trip?.primaryJob?.jobId || 'Unknown job'}</div>
                            <div className="pod-date">{new Date(r.recordedAt).toLocaleString()}</div>
                        </div>
                        <div className="pod-meta">
                            <span>Job: {r.trip?.primaryJob?.jobId || 'N/A'}</span>
                            <span>Driver: {r.trip?.driver?.name || 'N/A'}</span>
                            <span>Vehicle: {r.trip?.vehicle?.registrationNumber || 'N/A'}</span>
                        </div>

                        <div className="pod-images">
                            <div className="pod-img-block">
                                <div className="pod-img-label">Delivery Photo</div>
                                <img src={asDataUri(r.deliveryPhotoBase64)} alt="Delivery proof" className="pod-img" />
                            </div>
                            <div className="pod-img-block">
                                <div className="pod-img-label">Customer Signature</div>
                                <img src={asDataUri(r.customerSignatureBase64)} alt="Customer signature" className="pod-img pod-signature" />
                            </div>
                        </div>
                    </article>
                ))}
            </div>

            {filteredRecords.length === 0 && !error ? (
                <div className="empty-state-full">
                    <h3>{searchTerm.trim() ? 'No matching proof records' : 'No proof records yet'}</h3>
                    <p>
                        {searchTerm.trim()
                            ? 'Try a different job ID, driver name, or vehicle number.'
                            : 'Delivery proof will appear here after drivers complete trips.'}
                    </p>
                </div>
            ) : null}
        </div>
    );
}

export default ProofOfDelivery;

