import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
    vehicleAPI,
    jobAPI,
    tripAPI,
    driverAPI,
    notificationAPI,
    tripCostAPI,
} from '../../services/api';
import StatCard from '../StatCard';
import {
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from 'recharts';
import './Dashboard.css';
import PageLoading from '../common/PageLoading';

function formatLkr(n) {
    if (n == null || Number.isNaN(n)) return 'Rs 0';
    const v = Number(n);
    if (v >= 100000) return `Rs ${(v / 100000).toFixed(2)}L`;
    if (v >= 1000) return `Rs ${(v / 1000).toFixed(1)}k`;
    return `Rs ${Math.round(v).toLocaleString()}`;
}

function greetingLabel() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
}

function Dashboard() {
    const [stats, setStats] = useState({
        totalJobs: 0,
        activeTrips: 0,
        availableVehicles: 0,
        earnedRevenue: 0,
        pendingJobs: 0,
        fleetHealth: 100,
        totalDrivers: 0,
        unreadNotifications: 0,
        operatingCostTracked: 0,
        trends: {
            jobs: { val: '0%', dir: 'neutral' },
            revenue: { val: '0%', dir: 'neutral' },
        },
    });
    const [recentJobs, setRecentJobs] = useState([]);
    const [vehicleStatus, setVehicleStatus] = useState([]);
    const [weeklyData, setWeeklyData] = useState([]);
    const [notificationsPreview, setNotificationsPreview] = useState([]);
    const [chartMetric, setChartMetric] = useState('jobs');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            const [
                vehiclesRes,
                jobsRes,
                logsRes,
                tripsRes,
                driversRes,
                notifRes,
                costsRes,
            ] = await Promise.all([
                vehicleAPI.getAll(),
                jobAPI.getAll({ limit: 500 }),
                vehicleAPI.getRecentMaintenanceLogs().catch(() => ({ data: { logs: [] } })),
                tripAPI.getAllTrips().catch(() => ({ data: { trips: [] } })),
                driverAPI.getAll().catch(() => ({ data: { drivers: [] } })),
                notificationAPI.getNotifications().catch(() => ({
                    data: { notifications: [], unreadCount: 0 },
                })),
                tripCostAPI.getSummary().catch(() => ({ data: { costs: [] } })),
            ]);

            const vehicles = vehiclesRes.data.vehicles || [];
            const jobs = jobsRes.data.jobs || [];
            const recentLogs = logsRes.data.logs || [];
            const trips = tripsRes.data.trips || [];
            const drivers = driversRes.data.drivers || [];
            const notifications = notifRes.data.notifications || [];
            const unreadCount = notifRes.data.unreadCount ?? 0;
            const costRecords = costsRes.data.costs || [];

            const activeTrips = trips.filter((t) => t.status === 'active').length;
            const availableCount = vehicles.filter((v) => v.status === 'available').length;
            const pendingJobs = jobs.filter((j) => j.status === 'pending').length;

            const earnedRevenue = jobs
                .filter((j) => j.status === 'completed')
                .reduce((sum, j) => sum + (j.pricing?.quotedPrice || 0), 0);

            const operatingCostTracked = costRecords
                .filter((c) => c.status === 'finalized')
                .reduce((sum, c) => sum + (c.calculations?.totalCost || 0), 0);

            const now = new Date();
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

            const jobsThisWeek = jobs.filter((j) => new Date(j.createdAt) >= sevenDaysAgo);
            const jobsLastWeek = jobs.filter(
                (j) =>
                    new Date(j.createdAt) >= fourteenDaysAgo &&
                    new Date(j.createdAt) < sevenDaysAgo
            );

            const revThisWeek = jobsThisWeek
                .filter((j) => j.status === 'completed')
                .reduce((sum, j) => sum + (j.pricing?.quotedPrice || 0), 0);
            const revLastWeek = jobsLastWeek
                .filter((j) => j.status === 'completed')
                .reduce((sum, j) => sum + (j.pricing?.quotedPrice || 0), 0);

            const calculateTrend = (current, previous) => {
                if (previous === 0) return current > 0 ? '+100%' : '0%';
                const diff = ((current - previous) / previous) * 100;
                return `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`;
            };
            const calculateDir = (current, previous) => {
                if (current === previous) return 'neutral';
                if (previous === 0) return current > 0 ? 'up' : 'neutral';
                return current > previous ? 'up' : 'down';
            };

            const trends = {
                jobs: {
                    val: calculateTrend(jobsThisWeek.length, jobsLastWeek.length),
                    dir: calculateDir(jobsThisWeek.length, jobsLastWeek.length),
                },
                revenue: {
                    val: calculateTrend(revThisWeek, revLastWeek),
                    dir: calculateDir(revThisWeek, revLastWeek),
                },
            };

            let atRiskCount = 0;
            const latestLogByVehicle = {};
            recentLogs.forEach((log) => {
                const vid = log.vehicle?._id || log.vehicle;
                if (!vid) return;
                const prev = latestLogByVehicle[vid];
                if (!prev || new Date(log.createdAt) > new Date(prev.createdAt)) {
                    latestLogByVehicle[vid] = log;
                }
            });
            Object.values(latestLogByVehicle).forEach((log) => {
                const prob = log.prediction?.failure_probability || 0;
                if (prob > 0.4) atRiskCount++;
            });
            const healthScore =
                vehicles.length > 0
                    ? Math.round(((vehicles.length - atRiskCount) / vehicles.length) * 100)
                    : 100;

            setStats({
                totalJobs: jobs.length,
                activeTrips,
                availableVehicles: availableCount,
                earnedRevenue,
                pendingJobs,
                fleetHealth: healthScore,
                totalDrivers: drivers.length,
                unreadNotifications: unreadCount,
                operatingCostTracked,
                trends,
            });

            const sortedJobs = [...jobs].sort(
                (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
            );
            setRecentJobs(sortedJobs.slice(0, 6));

            const statusCounts = vehicles.reduce((acc, v) => {
                acc[v.status] = (acc[v.status] || 0) + 1;
                return acc;
            }, {});

            setVehicleStatus([
                { name: 'Available', value: statusCounts.available || 0, color: '#34D399' },
                { name: 'In transit', value: statusCounts['in-transit'] || 0, color: '#60A5FA' },
                { name: 'Maintenance', value: statusCounts.maintenance || 0, color: '#FBBF24' },
            ]);

            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const newWeeklyData = Array(7)
                .fill()
                .map((_, i) => {
                    const targetDate = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
                    const dayName = days[targetDate.getDay()];

                    const jobsOnDay = jobs.filter((j) => {
                        const jDate = new Date(j.createdAt);
                        return (
                            jDate.getDate() === targetDate.getDate() &&
                            jDate.getMonth() === targetDate.getMonth() &&
                            jDate.getFullYear() === targetDate.getFullYear()
                        );
                    });

                    const revenueOnDay = jobsOnDay
                        .filter((j) => j.status === 'completed')
                        .reduce((sum, j) => sum + (j.pricing?.quotedPrice || 0), 0);

                    return {
                        day: dayName,
                        jobs: jobsOnDay.length,
                        revenue: Math.round(revenueOnDay),
                    };
                });
            setWeeklyData(newWeeklyData);
            setNotificationsPreview(notifications.slice(0, 4));
        } catch (err) {
            console.error('Failed to load dashboard data:', err);
        } finally {
            setLoading(false);
        }
    };

    const pieTotal = useMemo(
        () => vehicleStatus.reduce((s, x) => s + x.value, 0),
        [vehicleStatus]
    );

    if (loading) {
        return <PageLoading />;
    }

    const healthOk = stats.fleetHealth >= 80;
    const healthWarn = stats.fleetHealth >= 50 && stats.fleetHealth < 80;

    return (
        <div className="dashboard">
            <section className="dashboard-hero">
                <div className="dashboard-hero-inner">
                    <div className="dashboard-hero-copy">
                        <p className="dashboard-subtitle">{greetingLabel()} — here’s your live snapshot</p>
                        <h1 className="dashboard-title">Operations dashboard</h1>
                        <p className="dashboard-hero-date">
                            {new Date().toLocaleDateString(undefined, {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                            })}
                        </p>
                    </div>
                    <div className="dashboard-hero-aside">
                        <div
                            className={`health-score-badge health-score-badge--${healthOk ? 'ok' : healthWarn ? 'warn' : 'bad'}`}
                        >
                            <span
                                className="material-icons-outlined health-score-badge__icon"
                                aria-hidden
                            >
                                {healthOk
                                    ? 'health_and_safety'
                                    : healthWarn
                                      ? 'warning_amber'
                                      : 'engineering'}
                            </span>
                            <div>
                                <span className="health-score-badge__label">Fleet ML health</span>
                                <span className="health-score-badge__value">{stats.fleetHealth}%</span>
                            </div>
                        </div>
                        <div className="dashboard-pills">
                            <span className="dashboard-pill">
                                <span className="material-icons-outlined">groups</span>
                                {stats.totalDrivers} drivers
                            </span>
                            <span className="dashboard-pill">
                                <span className="material-icons-outlined">pending_actions</span>
                                {stats.pendingJobs} pending jobs
                            </span>
                            <span className="dashboard-pill">
                                <span className="material-icons-outlined">receipt_long</span>
                                {formatLkr(stats.operatingCostTracked)} costs logged
                            </span>
                            {stats.unreadNotifications > 0 && (
                                <span className="dashboard-pill dashboard-pill--accent">
                                    <span className="material-icons-outlined">notifications_active</span>
                                    {stats.unreadNotifications} unread
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <div className="stats-grid">
                <StatCard
                    title="Total jobs"
                    value={stats.totalJobs}
                    materialIcon="inventory_2"
                    color="coral"
                    trend={stats.trends.jobs.dir}
                    trendValue={stats.trends.jobs.val}
                />
                <StatCard
                    title="Live trips"
                    value={stats.activeTrips}
                    materialIcon="local_shipping"
                    color="blue"
                />
                <StatCard
                    title="Available vehicles"
                    value={stats.availableVehicles}
                    materialIcon="directions_car"
                    color="mint"
                />
                <StatCard
                    title="Earned revenue"
                    value={formatLkr(stats.earnedRevenue)}
                    materialIcon="account_balance_wallet"
                    color="peach"
                    trend={stats.trends.revenue.dir}
                    trendValue={stats.trends.revenue.val}
                />
            </div>

            <div className="content-grid content-grid--main">
                <div className="card dashboard-card-recent">
                    <div className="card-header">
                        <h3>Recent jobs</h3>
                        <Link to="/trips" className="btn-text dashboard-link-all">
                            View trips
                            <span className="material-icons-outlined" style={{ fontSize: '16px' }}>
                                arrow_forward
                            </span>
                        </Link>
                    </div>
                    <div className="jobs-list">
                        {recentJobs.length > 0 ? (
                            recentJobs.map((job) => (
                                <div key={job._id || job.jobId} className="job-item">
                                    <div className="job-icon">
                                        <span className="material-icons-outlined">inventory_2</span>
                                    </div>
                                    <div className="job-info">
                                        <div className="job-title">{job.jobId || 'Job'}</div>
                                        <div className="job-meta">
                                            {job.cargo?.description || 'General cargo'} ·{' '}
                                            {job.cargo?.weight ?? 0} kg
                                        </div>
                                    </div>
                                    <span className={`status-badge status-${job.status || 'pending'}`}>
                                        {(job.status || 'pending').replace(/-/g, ' ')}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className="empty-state">No jobs yet — book one from Book job.</div>
                        )}
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3>Fleet by status</h3>
                    </div>
                    <div className="chart-container">
                        {pieTotal === 0 ? (
                            <div className="empty-state chart-empty">No vehicles in fleet yet.</div>
                        ) : (
                            <>
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie
                                            data={vehicleStatus}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={48}
                                            outerRadius={78}
                                            paddingAngle={4}
                                            dataKey="value"
                                            strokeWidth={0}
                                        >
                                            {vehicleStatus.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(v) => [v, 'Vehicles']}
                                            contentStyle={{
                                                borderRadius: '8px',
                                                border: '1px solid var(--border-light)',
                                                fontSize: '12px',
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="chart-legend">
                                    {vehicleStatus.map((item, index) => (
                                        <div key={index} className="legend-item">
                                            <span
                                                className="legend-dot"
                                                style={{ background: item.color }}
                                            />
                                            <span>
                                                {item.name}: {item.value}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="card dashboard-card-notifications">
                    <div className="card-header">
                        <h3>Alerts</h3>
                        <span className="dashboard-muted-caption">From notification center</span>
                    </div>
                    <ul className="dashboard-notif-list">
                        {notificationsPreview.length > 0 ? (
                            notificationsPreview.map((n) => (
                                <li
                                    key={n._id}
                                    className={`dashboard-notif-item ${n.isRead ? '' : 'dashboard-notif-item--unread'}`}
                                >
                                    <span className="material-icons-outlined dashboard-notif-icon">
                                        {n.isRead ? 'notifications_none' : 'circle'}
                                    </span>
                                    <div>
                                        <div className="dashboard-notif-title">{n.title || 'Notification'}</div>
                                        <div className="dashboard-notif-body">
                                            {(n.message || '').slice(0, 72)}
                                            {(n.message || '').length > 72 ? '…' : ''}
                                        </div>
                                    </div>
                                </li>
                            ))
                        ) : (
                            <li className="empty-state">No recent notifications.</li>
                        )}
                    </ul>
                </div>
            </div>

            <div className="card dashboard-chart-card">
                <div className="card-header">
                    <h3>7-day performance</h3>
                    <div className="chart-filters">
                        <button
                            type="button"
                            className={`filter-chip ${chartMetric === 'jobs' ? 'active' : ''}`}
                            onClick={() => setChartMetric('jobs')}
                        >
                            New jobs
                        </button>
                        <button
                            type="button"
                            className={`filter-chip ${chartMetric === 'revenue' ? 'active' : ''}`}
                            onClick={() => setChartMetric('revenue')}
                        >
                            Earned revenue
                        </button>
                    </div>
                </div>
                <div className="chart-container">
                    <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={weeklyData}>
                            <defs>
                                <linearGradient id="dashColorJobs" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#FF8A65" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#FF8A65" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="dashColorRev" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#7CB8FF" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#7CB8FF" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                            <XAxis
                                dataKey="day"
                                stroke="#9CA3AF"
                                style={{ fontSize: '11px' }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#9CA3AF"
                                style={{ fontSize: '11px' }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(v) =>
                                    chartMetric === 'revenue' ? formatLkr(v).replace('Rs ', '') : v
                                }
                            />
                            <Tooltip
                                formatter={(value) =>
                                    chartMetric === 'revenue'
                                        ? [formatLkr(value), 'Earned']
                                        : [value, 'Jobs']
                                }
                                contentStyle={{
                                    borderRadius: '8px',
                                    border: '1px solid #E5E7EB',
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                                    fontSize: '12px',
                                }}
                            />
                            {chartMetric === 'jobs' ? (
                                <Area
                                    type="monotone"
                                    dataKey="jobs"
                                    stroke="#E65100"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#dashColorJobs)"
                                />
                            ) : (
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#2563EB"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#dashColorRev)"
                                />
                            )}
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
