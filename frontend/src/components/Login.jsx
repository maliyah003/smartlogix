import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import loginImage from '../assets/Login.svg';
import { setAuthenticated } from '../auth/session';
import { validateAdminCredentials } from '../config/adminAuth';

function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = (e) => {
        e.preventDefault();
        setError('');
        const username = credentials.username.trim();
        const password = credentials.password;

        if (!validateAdminCredentials(username, password)) {
            setError('Invalid username or password.');
            return;
        }

        setLoading(true);
        setTimeout(() => {
            setAuthenticated();
            const from = location.state?.from?.pathname;
            const safePath = from && from !== '/login' ? from : '/';
            navigate(safePath, { replace: true });
            setLoading(false);
        }, 400);
    };

    return (
        <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            alignItems: 'center',
            width: '100vw', 
            height: '100vh', 
            margin: 0, 
            padding: 0, 
            overflow: 'hidden', 
            backgroundImage: `url(${loginImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            fontFamily: 'Inter, system-ui, sans-serif' 
        }}>
            
            {/* Floating Login Card on Right Side */}
            <div style={{ 
                position: 'relative',
                width: '100%', 
                maxWidth: '420px', 
                marginRight: '10vw',
                padding: '40px', 
                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'center'
            }}>
                <Link
                    to="/track"
                    aria-label="Back to tracking"
                    style={{
                        position: 'absolute',
                        left: 12,
                        top: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        color: '#374151',
                        textDecoration: 'none',
                        backgroundColor: 'rgba(243, 244, 246, 0.9)',
                        border: '1px solid #E5E7EB',
                    }}
                >
                    <span className="material-icons-outlined" style={{ fontSize: 22 }}>arrow_back</span>
                </Link>
                {/* Header Greetings */}
                <div style={{ marginBottom: '2.5rem', textAlign: 'center', paddingTop: 8 }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '800', color: '#111827', margin: '0 0 0.5rem 0', letterSpacing: '-0.5px' }}>Welcome</h1>
                    <p style={{ fontSize: '1rem', color: '#6B7280', margin: 0 }}>
                        Sign in to continue to your workspace.
                    </p>
                </div>

                {/* Form Inputs */}
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {error ? (
                        <div
                            role="alert"
                            style={{
                                padding: '0.75rem 1rem',
                                backgroundColor: '#FEF2F2',
                                border: '1px solid #FECACA',
                                borderRadius: '8px',
                                color: '#B91C1C',
                                fontSize: '0.875rem',
                            }}
                        >
                            {error}
                        </div>
                    ) : null}
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Username</label>
                        <input 
                            type="text"
                            style={{ 
                                padding: '0.875rem 1rem', 
                                borderRadius: '8px', 
                                border: '1px solid #D1D5DB', 
                                fontSize: '1rem', 
                                outline: 'none',
                                transition: 'border-color 0.2s',
                                backgroundColor: '#ffffff'
                            }}
                            placeholder="Enter your username"
                            value={credentials.username}
                            onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                            required
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Password</label>
                        <input 
                            type="password"
                            style={{ 
                                padding: '0.875rem 1rem', 
                                borderRadius: '8px', 
                                border: '1px solid #D1D5DB', 
                                fontSize: '1rem', 
                                outline: 'none',
                                transition: 'border-color 0.2s',
                                backgroundColor: '#ffffff'
                            }}
                            placeholder="••••••••"
                            value={credentials.password}
                            onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                            required
                        />
                    </div>

                    {/* Submit Action */}
                    <button 
                        type="submit" 
                        disabled={loading}
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                        style={{ 
                            marginTop: '1.5rem', 
                            padding: '0.875rem', 
                            backgroundColor: loading ? '#374151' : (isHovered ? '#f49522' : '#111827'), 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '8px', 
                            fontSize: '1rem', 
                            fontWeight: '600', 
                            cursor: loading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                        }}
                    >
                        {loading ? 'Authenticating...' : 'Sign In'}
                    </button>
                </form>

            </div>
        </div>
    );
}

export default Login;
