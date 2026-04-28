import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationAPI } from '../services/api';
import { clearSession } from '../auth/session';
import './Header.css';
import logoImg from '../assets/SmartLogixLogo.png';

function Header() {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    const fetchNotifications = async () => {
        try {
            const res = await notificationAPI.getNotifications();
            if (res.data.success) {
                setNotifications(res.data.notifications);
                setUnreadCount(res.data.unreadCount);
            }
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        }
    };

    useEffect(() => {
        // Initial fetch
        fetchNotifications();

        // Poll every 15 seconds
        const interval = setInterval(fetchNotifications, 15000);
        return () => clearInterval(interval);
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };

        if (isDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isDropdownOpen]);

    const handleNotificationClick = async (notification) => {
        if (!notification.isRead) {
            try {
                await notificationAPI.markAsRead(notification._id);
                // Optimistic UI update
                setNotifications(prev =>
                    prev.map(n => n._id === notification._id ? { ...n, isRead: true } : n)
                );
                setUnreadCount(prev => Math.max(0, prev - 1));
            } catch (error) {
                console.error(error);
            }
        }

        setIsDropdownOpen(false);
        if (notification.link) {
            navigate(notification.link);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await notificationAPI.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error(error);
        }
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + date.toLocaleDateString();
    };

    const getIcon = (type) => {
        switch (type) {
            case 'trip_started': return 'play_arrow';
            case 'trip_completed': return 'check';
            case 'trip_refused': return 'warning';
            default: return 'info';
        }
    };

    return (
        <header className="header">
            <div className="header-left">
                {/* Logo removed as requested */}
            </div>

            <div className="header-right">

                <div className="notification-container" ref={dropdownRef}>
                    <button
                        className="header-action"
                        title="Notifications"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                        <span className="material-icons-outlined">notifications_none</span>
                        {unreadCount > 0 && <span className="header-badge"></span>}
                    </button>

                    {isDropdownOpen && (
                        <div className="notification-dropdown">
                            <div className="dropdown-header">
                                <h4>Notifications {unreadCount > 0 && `(${unreadCount})`}</h4>
                                {unreadCount > 0 && (
                                    <button className="mark-read-btn" onClick={handleMarkAllRead}>
                                        Mark all as read
                                    </button>
                                )}
                            </div>

                            <div className="dropdown-list">
                                {notifications.length === 0 ? (
                                    <div className="empty-notifications">
                                        No new notifications
                                    </div>
                                ) : (
                                    notifications.map(notif => (
                                        <div
                                            key={notif._id}
                                            className={`notification-item ${!notif.isRead ? 'unread' : ''}`}
                                            onClick={() => handleNotificationClick(notif)}
                                        >
                                            <div className={`notification-icon icon-${notif.type}`}>
                                                <span className="material-icons-outlined">{getIcon(notif.type)}</span>
                                            </div>
                                            <div className="notification-content">
                                                <p className="notification-title">{notif.title}</p>
                                                <p className="notification-message">{notif.message}</p>
                                                <p className="notification-time">{formatTime(notif.createdAt)}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <span className="header-divider"></span>

                <button
                    type="button"
                    className="header-sign-out"
                    title="Sign out"
                    onClick={() => {
                        clearSession();
                        navigate('/track', { replace: true });
                    }}
                >
                    Sign out
                </button>

                <div className="header-user">
                    <div className="header-user-avatar">SL</div>
                    <div className="header-user-info">
                        <span className="header-user-name">Admin</span>
                        <span className="header-user-role">Fleet Manager</span>
                    </div>
                </div>
            </div>
        </header>
    );
}

export default Header;
