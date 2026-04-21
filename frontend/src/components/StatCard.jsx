import './StatCard.css';

function StatCard({ title, value, materialIcon, trend, trendValue, color = 'coral' }) {
    return (
        <div className={`stat-card stat-card-${color}`}>
            <div className="stat-header">
                {materialIcon && (
                    <div className="stat-icon">
                        <span className="material-icons-outlined">{materialIcon}</span>
                    </div>
                )}
                {trend && trend !== 'neutral' && (
                    <div className={`stat-trend stat-trend-${trend}`}>
                        <span className="material-icons-outlined trend-arrow">
                            {trend === 'up' ? 'trending_up' : 'trending_down'}
                        </span>
                        <span>{trendValue}</span>
                    </div>
                )}
            </div>
            <div className="stat-content">
                <div className="stat-value">{value}</div>
                <div className="stat-title">{title}</div>
            </div>
        </div>
    );
}

export default StatCard;
