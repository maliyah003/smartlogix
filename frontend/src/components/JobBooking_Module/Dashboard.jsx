import { useState, useEffect } from 'react';
import { vehicleAPI, jobAPI } from '../../services/api';
import StatCard from '../StatCard';
import { AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import './Dashboard.css';
import { BlinkBlur } from 'react-loading-indicators';

function Dashboard() {
    const [stats, setStats] = useState({
        totalJobs: 0,
        activeTrips: 0,
        availableVehicles: 0,
        totalRevenue: 0,
        fleetHealth: 100,
        trends: {
            jobs: { val: '0%', dir: 'neutral' },
            active: { val: '0%', dir: 'neutral' },
            revenue: { val: '0%', dir: 'neutral' }
        }
    });
    const [recentJobs, setRecentJobs] = useState([]);
    const [vehicleStatus, setVehicleStatus] = useState([]);
    const [weeklyData, setWeeklyData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            const [vehiclesRes, jobsRes, logsRes] = await Promise.all([
                vehicleAPI.getAll(),
                jobAPI.getAll({ limit: 100 }),
                vehicleAPI.getRecentMaintenanceLogs().catch(() => ({ data: { logs: [] } }))
            ]);

            const vehicles = vehiclesRes.data.vehicles || [];
            const jobs = jobsRes.data.jobs || [];
            const recentLogs = logsRes.data.logs || [];

            const activeJobs = jobs.filter(j => j.status === 'in-progress' || j.status === 'active').length;
            const availableCount = vehicles.filter(v => v.status === 'available').length;
            const totalRevenue = jobs.reduce((sum, j) => sum + (j.pricing?.quotedPrice || 0), 0);

            // Calculate Time-Series Trends
            const now = new Date();
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
            
            const jobsThisWeek = jobs.filter(j => new Date(j.createdAt) >= sevenDaysAgo);
            const jobsLastWeek = jobs.filter(j => new Date(j.createdAt) >= fourteenDaysAgo && new Date(j.createdAt) < sevenDaysAgo);
            
            const activeTripsThisWeek = jobsThisWeek.filter(j => j.status === 'in-progress' || j.status === 'active').length;
            const activeTripsLastWeek = jobsLastWeek.filter(j => j.status === 'in-progress' || j.status === 'active').length;
            
            const revThisWeek = jobsThisWeek.reduce((sum, j) => sum + (j.pricing?.quotedPrice || 0), 0);
            const revLastWeek = jobsLastWeek.reduce((sum, j) => sum + (j.pricing?.quotedPrice || 0), 0);

            const calculateTrend = (current, previous) => {
                if (previous === 0) return current > 0 ? '+100%' : '0%';
                const diff = ((current - previous) / previous) * 100;
                return `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`;
            };
            const calculateDir = (current, previous) => {
                if (previous === 0) return current > 0 ? 'up' : 'neutral';
                return current >= previous ? 'up' : 'down';
            };

            const trends = {
                jobs: { val: calculateTrend(jobsThisWeek.length, jobsLastWeek.length), dir: calculateDir(jobsThisWeek.length, jobsLastWeek.length) },
                active: { val: calculateTrend(activeTripsThisWeek, activeTripsLastWeek), dir: calculateDir(activeTripsThisWeek, activeTripsLastWeek) },
                revenue: { val: calculateTrend(revThisWeek, revLastWeek), dir: calculateDir(revThisWeek, revLastWeek) },
            };

            // Calculate Fleet Health Score (100% minus the % of vehicles reporting > 40% ML failure probability)
            let atRiskCount = 0;
            const latestLogByVehicle = {};
            recentLogs.forEach(log => {
                if (!latestLogByVehicle[log.vehicle._id] || new Date(log.createdAt) > new Date(latestLogByVehicle[log.vehicle._id].createdAt)) {
                     latestLogByVehicle[log.vehicle._id] = log;
                }
            });
            Object.values(latestLogByVehicle).forEach(log => {
                const prob = log.prediction?.failure_probability || 0;
                if (prob > 0.40) atRiskCount++; 
            });
            const healthScore = vehicles.length > 0 ? Math.round(((vehicles.length - atRiskCount) / vehicles.length) * 100) : 100;

            setStats({
                totalJobs: jobs.length,
                activeTrips: activeJobs,
                availableVehicles: availableCount,
                totalRevenue: totalRevenue,
                fleetHealth: healthScore,
                trends: trends
            });

            setRecentJobs(jobs.slice(0, 5));

            const statusCounts = vehicles.reduce((acc, v) => {
                acc[v.status] = (acc[v.status] || 0) + 1;
                return acc;
            }, {});

            setVehicleStatus([
                { name: 'Available', value: statusCounts['available'] || 0, color: '#34D399' },
                { name: 'In Transit', value: statusCounts['in-transit'] || 0, color: '#60A5FA' },
                { name: 'Maintenance', value: statusCounts['maintenance'] || 0, color: '#FBBF24' }
            ]);

            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const newWeeklyData = Array(7).fill().map((_, i) => {
                const targetDate = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
                const dayName = days[targetDate.getDay()];
                
                const jobsOnDay = jobs.filter(j => {
                    const jDate = new Date(j.createdAt);
                    return jDate.getDate() === targetDate.getDate() && jDate.getMonth() === targetDate.getMonth() && jDate.getFullYear() === targetDate.getFullYear();
                });
                
                return {
                    day: dayName,
                    jobs: jobsOnDay.length
                };
            });
            setWeeklyData(newWeeklyData);

        } catch (err) {
            console.error('Failed to load dashboard data:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <BlinkBlur color="#f59e0b" size="medium" text="" textColor="" />
            </div>
        );
    }

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <div>
                    <p className="dashboard-subtitle">Manage and track your logistics</p>
                    <h1 className="dashboard-title">Dashboard</h1>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div className="health-score-badge" style={{
                        display: 'flex', alignItems: 'center', gap: '10px', 
                        padding: '10px 18px', borderRadius: '50px', 
                        backgroundColor: stats.fleetHealth >= 80 ? '#F0FDF4' : stats.fleetHealth >= 50 ? '#FFFBEB' : '#FEF2F2',
                        border: `1px solid ${stats.fleetHealth >= 80 ? '#BBF7D0' : stats.fleetHealth >= 50 ? '#FEF08A' : '#FECACA'}`,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                    }}>
                        <span className="material-icons-outlined" style={{ 
                            color: stats.fleetHealth >= 80 ? '#16A34A' : stats.fleetHealth >= 50 ? '#D97706' : '#DC2626',
                            fontSize: '24px' 
                        }}>
                            {stats.fleetHealth >= 80 ? 'health_and_safety' : stats.fleetHealth >= 50 ? 'warning_amber' : 'engineering'}
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fleet ML Health Score</span>
                            <span style={{ fontSize: '18px', fontWeight: 700, color: '#111827', lineHeight: '1', marginTop: '2px' }}>{stats.fleetHealth}%</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="stats-grid">
                <StatCard
                    title="Total Jobs"
                    value={stats.totalJobs}
                    materialIcon="inventory_2"
                    color="coral"
                    trend={stats.trends.jobs.dir}
                    trendValue={stats.trends.jobs.val}
                />
                <StatCard
                    title="Active Trips"
                    value={stats.activeTrips}
                    materialIcon="local_shipping"
                    color="blue"
                    trend={stats.trends.active.dir}
                    trendValue={stats.trends.active.val}
                />
                <StatCard
                    title="Available Vehicles"
                    value={stats.availableVehicles}
                    materialIcon="directions_car"
                    color="mint"
                />
                <StatCard
                    title="Revenue"
                    value={`Rs ${(stats.totalRevenue / 1000).toFixed(1)}k`}
                    materialIcon="account_balance_wallet"
                    color="peach"
                    trend={stats.trends.revenue.dir}
                    trendValue={stats.trends.revenue.val}
                />
            </div>

            <div className="content-grid">
                <div className="card">
                    <div className="card-header">
                        <h3>Recent Jobs</h3>
                        <button className="btn-text">
                            View All
                            <span className="material-icons-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
                        </button>
                    </div>
                    <div className="jobs-list">
                        {recentJobs.length > 0 ? (
                            recentJobs.map((job, index) => (
                                <div key={index} className="job-item">
                                    <div className="job-icon">
                                        <span className="material-icons-outlined">inventory_2</span>
                                    </div>
                                    <div className="job-info">
                                        <div className="job-title">{job.jobId || `JOB-${index + 1}`}</div>
                                        <div className="job-meta">
                                            {job.cargo?.description || 'General Cargo'} &middot; {job.cargo?.weight || 0}kg
                                        </div>
                                    </div>
                                    <span className={`status-badge status-${job.status}`}>
                                        {job.status || 'pending'}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className="empty-state">No recent jobs</div>
                        )}
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3>Vehicle Status</h3>
                    </div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={180}>
                            <PieChart>
                                <Pie
                                    data={vehicleStatus}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={45}
                                    outerRadius={72}
                                    paddingAngle={4}
                                    dataKey="value"
                                    strokeWidth={0}
                                >
                                    {vehicleStatus.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="chart-legend">
                            {vehicleStatus.map((item, index) => (
                                <div key={index} className="legend-item">
                                    <span className="legend-dot" style={{ background: item.color }}></span>
                                    <span>{item.name}: {item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <h3>Weekly Performance</h3>
                    <div className="chart-filters">
                        <button className="filter-chip active">Jobs</button>
                        <button className="filter-chip">Revenue</button>
                    </div>
                </div>
                <div className="chart-container">
                    <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={weeklyData}>
                            <defs>
                                <linearGradient id="colorJobs" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#1A1D26" stopOpacity={0.08} />
                                    <stop offset="95%" stopColor="#1A1D26" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                            <XAxis dataKey="day" stroke="#9CA3AF" style={{ fontSize: '11px' }} tickLine={false} axisLine={false} />
                            <YAxis stroke="#9CA3AF" style={{ fontSize: '11px' }} tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: '8px',
                                    border: '1px solid #E5E7EB',
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                                    fontSize: '12px'
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="jobs"
                                stroke="#1A1D26"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorJobs)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
