import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PageLoading from '../common/PageLoading';
import TrackingSearch from './TrackingSearch';
import ProgressTimeline from './ProgressTimeline';
import LiveMap from './LiveMap';
import heroImage from '../../assets/Smartlogix Hero.jpg';
import './OrderTracking.css';

const API_URL = 'https://smartlogix-production.up.railway.app/api/customer-portal';

/** Map + delivery instructions only once the trip is live or finished (not while scheduled). */
function shouldShowMapAndDeliveryInstructions(job) {
    const tripStatus = job?.assignedTrip?.status;
    if (!tripStatus) return false;
    return tripStatus === 'active' || tripStatus === 'completed';
}

function OrderTrackingPortal() {
    const [jobData, setJobData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSearch = async (trackingId) => {
        setLoading(true);
        setError(null);
        setJobData(null);

        try {
            const response = await axios.get(`${API_URL}/track/${trackingId}`);
            if (response.data.success) {
                setJobData(response.data.job);
            } else {
                setError(response.data.error || 'Package not found.');
            }
        } catch (err) {
            console.error('Failed to fetch tracking data', err);
            setError(err.response?.data?.error || 'Invalid Tracking ID or server down.');
        } finally {
            setLoading(false);
        }
    };

    // While trip is scheduled, refetch (immediate + interval) so map + instructions appear as soon as it turns active
    useEffect(() => {
        const jobId = jobData?.jobId;
        const tripStatus = jobData?.assignedTrip?.status;
        if (!jobId || tripStatus !== 'scheduled') return;

        let cancelled = false;

        const tick = async () => {
            if (cancelled) return;
            try {
                const response = await axios.get(`${API_URL}/track/${jobId}`);
                if (!cancelled && response.data.success) {
                    setJobData(response.data.job);
                }
            } catch (err) {
                console.error('Failed to refresh job', err);
            }
        };

        tick();
        const interval = setInterval(tick, 6000);

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [jobData?.jobId, jobData?.assignedTrip?.status]);

    const tripId = jobData?.assignedTrip?.tripId || null;
    const routeCoords = jobData?.assignedTrip?.route?.coordinates || [];
    const pickupCoords = jobData?.pickup?.location?.coordinates || null;
    const deliveryCoords = jobData?.delivery?.location?.coordinates || null;

    const tripStatus = jobData?.assignedTrip?.status;
    const showMapAndDelivery = jobData ? shouldShowMapAndDeliveryInstructions(jobData) : false;

    return (
        <div className="fade-in order-tracking-page">
            {!jobData ? (
                <div className="order-tracking-hero">
                    <div className="order-tracking-hero__media">
                        <img
                            src={heroImage}
                            alt=""
                            className="order-tracking-hero__img"
                            decoding="async"
                        />
                        <div className="order-tracking-hero__overlay" aria-hidden="true" />
                    </div>
                    <div className="order-tracking-hero__inner">
                        <div className="page-header order-tracking-hero__header">
                            <div>
                                <p className="page-subtitle">Enter your Job ID for live delivery status</p>
                                <h1 className="page-title">Order tracking</h1>
                            </div>
                        </div>
                        <div className="order-tracking-landing">
                            {loading ? (
                                <PageLoading
                                    className="order-tracking-hero__loading"
                                    style={{ minHeight: 'min(360px, 50vh)' }}
                                />
                            ) : (
                                <>
                                    <TrackingSearch onSearch={handleSearch} isLoading={false} />
                                    {error && (
                                        <div className="error order-tracking-error" role="alert">
                                            <span className="material-icons-outlined">error_outline</span>
                                            <span>{error}</span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="tracking-active-layout order-tracking-results">
                            <div className="card active-header-bar">
                                <div className="left-meta">
                                    <h3 className="active-layout-title">Shipment details</h3>
                                    <p className="active-layout-tracking">
                                        Tracking ID: <strong>{jobData.jobId}</strong>
                                    </p>
                                </div>
                                <div className="right-details">
                                    <div className="detail-item">
                                        <span className="material-icons-outlined label-icon">inventory_2</span>
                                        <div className="detail-meta">
                                            <span>Type</span>
                                            <strong>{jobData.cargo?.type || 'General'}</strong>
                                        </div>
                                    </div>
                                    <div className="detail-item hide-mobile">
                                        <span className="material-icons-outlined label-icon">scale</span>
                                        <div className="detail-meta">
                                            <span>Weight / vol</span>
                                            <strong>
                                                {jobData.cargo?.weight}kg / {jobData.cargo?.volume}m³
                                            </strong>
                                        </div>
                                    </div>
                                    {jobData.assignedVehicle && (
                                        <div className="detail-item hide-mobile">
                                            <span className="material-icons-outlined label-icon">local_shipping</span>
                                            <div className="detail-meta">
                                                <span>Vehicle</span>
                                                <strong>{jobData.assignedVehicle.registrationNumber}</strong>
                                            </div>
                                        </div>
                                    )}
                                    {jobData.assignedTrip?.driver?.name && (
                                        <div className="detail-item">
                                            <span className="material-icons-outlined label-icon">person</span>
                                            <div className="detail-meta">
                                                <span>Driver</span>
                                                <strong>{jobData.assignedTrip.driver.name}</strong>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {error && (
                                <div className="error order-tracking-error" style={{ marginBottom: '1.25rem' }} role="alert">
                                    <span className="material-icons-outlined">error_outline</span>
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="card timeline-section">
                                <ProgressTimeline status={jobData.status} job={jobData} />
                            </div>

                            {showMapAndDelivery ? (
                                <div className="map-section">
                                    <LiveMap
                                        jobId={jobData.jobId}
                                        tripId={tripId}
                                        tripStatus={tripStatus}
                                        jobStatus={jobData.status}
                                        routeCoords={routeCoords}
                                        pickupCoords={pickupCoords}
                                        deliveryCoords={deliveryCoords}
                                        initialPosition={jobData.assignedTrip?.currentPosition}
                                        initialNote={jobData.specialInstructions}
                                        onNoteSaved={(next) =>
                                            setJobData((prev) =>
                                                prev ? { ...prev, specialInstructions: next } : null
                                            )
                                        }
                                    />
                                </div>
                            ) : (
                                <div className="card track-map-placeholder" role="status">
                                    <span className="material-icons-outlined track-map-placeholder__icon">
                                        map
                                    </span>
                                    <h3 className="track-map-placeholder__title">Map & delivery instructions</h3>
                                    {tripStatus === 'scheduled' && (
                                        <p className="track-map-placeholder__text">
                                            Your driver hasn’t started this trip yet. The live map and delivery
                                            instructions will appear here as soon as the trip becomes active.
                                        </p>
                                    )}
                                    {jobData.assignedTrip && tripStatus === 'cancelled' && (
                                        <p className="track-map-placeholder__text">
                                            Map and delivery instructions aren’t shown for cancelled trips.
                                        </p>
                                    )}
                                    {!jobData.assignedTrip && (
                                        <p className="track-map-placeholder__text">
                                            A trip hasn’t been assigned to this order yet. Check back after
                                            dispatch.
                                        </p>
                                    )}
                                    {jobData.assignedTrip &&
                                        tripStatus &&
                                        tripStatus !== 'scheduled' &&
                                        tripStatus !== 'cancelled' &&
                                        tripStatus !== 'active' &&
                                        tripStatus !== 'completed' && (
                                            <p className="track-map-placeholder__text">
                                                Tracking details aren’t available for this shipment state.
                                            </p>
                                        )}
                                </div>
                            )}
                </div>
            )}
        </div>
    );
}

export default OrderTrackingPortal;
