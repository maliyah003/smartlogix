import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PageLoading from '../common/PageLoading';
import './TripEconomics.css';

const TripEconomics = () => {
    const [tripCosts, setTripCosts] = useState([]);
    const [loading, setLoading] = useState(true);

    const getCustomerPrice = (cost) => {
        const pricing = cost.trip?.primaryJob?.pricing;
        return Number(pricing?.finalPrice ?? pricing?.quotedPrice ?? 0);
    };

    const getTotalCost = (cost) => Number(cost.calculations?.totalCost ?? 0);

    const formatCurrency = (value) => Number(value || 0).toLocaleString();

    useEffect(() => {
        fetchTripCosts();
    }, []);

    const fetchTripCosts = async () => {
        try {
            const response = await axios.get('http://localhost:5001/api/trip-costs/summary');
            if (response.data.success) {
                setTripCosts(response.data.costs);
            }
        } catch (error) {
            console.error('Error fetching trip costs:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="fade-in trip-economics-page">
                <PageLoading />
            </div>
        );
    }

    return (
        <div className="fade-in trip-economics-page" style={{ maxWidth: '1400px' }}>
            <div className="page-header">
                <div>
                    <p className="page-subtitle">Per-trip fuel, distance, and cost summary</p>
                    <h1 className="page-title">Trip Economics</h1>
                </div>
            </div>

            <div className="card">
                <div className="card-header" style={{ marginBottom: '1rem' }}>
                    <h3>Overview</h3>
                </div>
                <div className="trip-economics-table-wrap">
                    <table className="trip-economics-table">
                        <thead>
                            <tr>
                                <th>Job ID</th>
                                <th>Vehicle</th>
                                <th>Driver</th>
                                <th>Status</th>
                                <th>Distance (km)</th>
                                <th>Efficiency (km/L)</th>
                                <th>Customer price (Rs)</th>
                                <th>Total cost (Rs)</th>
                                <th>Net amount (Rs)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tripCosts.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="trip-economics-empty">
                                        No trip cost data available yet.
                                    </td>
                                </tr>
                            ) : (
                                tripCosts.map((cost) => {
                                    const customerPrice = getCustomerPrice(cost);
                                    const totalCost = getTotalCost(cost);
                                    const netAmount = customerPrice - totalCost;

                                    return (
                                    <tr key={cost._id}>
                                        <td className="trip-economics-cell-strong">
                                            {cost.trip?.primaryJob?.jobId || cost.trip?.tripId || 'N/A'}
                                        </td>
                                        <td>{cost.trip?.vehicle?.registrationNumber || 'N/A'}</td>
                                        <td>{cost.driver?.name || 'N/A'}</td>
                                        <td>
                                            <span
                                                className={
                                                    cost.status === 'finalized'
                                                        ? 'badge badge-success'
                                                        : 'badge badge-warning'
                                                }
                                            >
                                                {cost.status.charAt(0).toUpperCase() + cost.status.slice(1)}
                                            </span>
                                        </td>
                                        <td>{cost.calculations?.distance || 0}</td>
                                        <td>{cost.calculations?.fuelEfficiency || 0}</td>
                                        <td className="trip-economics-cell-strong">
                                            {formatCurrency(customerPrice)}
                                        </td>
                                        <td className="trip-economics-cell-strong">{formatCurrency(totalCost)}</td>
                                        <td className="trip-economics-cell-strong">{formatCurrency(netAmount)}</td>
                                    </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TripEconomics;
