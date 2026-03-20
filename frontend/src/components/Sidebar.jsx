import { NavLink } from 'react-router-dom';
import './Sidebar.css';

function Sidebar() {
    const navItems = [
        { path: '/', icon: 'dashboard', title: 'Dashboard' },
        { path: '/vehicles', icon: 'local_shipping', title: 'Vehicles' },
        { path: '/drivers', icon: 'badge', title: 'Drivers' },
        { path: '/book-job', icon: 'add_box', title: 'Book Job' },
        { path: '/trips', icon: 'route', title: 'Trips' },
        { path: '/refusals', icon: 'fact_check', title: 'Refusal Requests' },
        { path: '/predictive-maintenance', icon: 'memory', title: 'Predictive Engine' }
    ];

    return (
        <aside className="sidebar">
            <nav className="sidebar-nav">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `nav-item ${isActive ? 'active' : ''}`
                        }
                        end={item.path === '/'}
                        title={item.title}
                    >
                        <span className="material-icons-outlined nav-icon">{item.icon}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className="user-profile" title="Profile">
                    <span className="material-icons-outlined">person</span>
                </div>
            </div>
        </aside>
    );
}

export default Sidebar;
