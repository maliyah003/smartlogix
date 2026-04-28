import { NavLink } from 'react-router-dom';
import logo from '../assets/SmartLogixLOGO.png';
import './Sidebar.css';

function Sidebar() {
    const navItems = [
        { path: '/', icon: 'dashboard', title: 'Dashboard' },
        { path: '/vehicles', icon: 'local_shipping', title: 'Vehicles' },
        { path: '/drivers', icon: 'badge', title: 'Drivers' },
        { path: '/book-job', icon: 'add_box', title: 'Book Job' },
        { path: '/trips', icon: 'route', title: 'Trips' },
        { path: '/refusals', icon: 'fact_check', title: 'Refusal Requests' },
        { path: '/predictive-maintenance', icon: 'memory', title: 'Predictive Engine' },
        { path: '/economics', icon: 'account_balance_wallet', title: 'Trip Economics' },
        { path: '/fuel-consistency', icon: 'local_gas_station', title: 'Fuel Consistency' },
        { path: '/proof-of-delivery', icon: 'verified', title: 'Proof Of Delivery' }
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <img src={logo} alt="SmartLogix" className="sidebar-logo-img" />
            </div>
            <nav className="sidebar-nav">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `nav-item ${isActive ? 'active' : ''}`
                        }
                        end={item.path === '/'}
                    >
                        <span className="material-icons-outlined nav-icon">{item.icon}</span>
                        <span className="nav-text">{item.title}</span>
                    </NavLink>
                ))}
            </nav>
        </aside>
    );
}

export default Sidebar;
