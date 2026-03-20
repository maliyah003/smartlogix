import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import loginImage from '../assets/Login.png';

function Login() {
    const navigate = useNavigate();
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const handleLogin = (e) => {
        e.preventDefault();
        setLoading(true);
        setTimeout(() => {
            navigate('/');
        }, 800);
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
                {/* Header Greetings */}
                <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '800', color: '#111827', margin: '0 0 0.5rem 0', letterSpacing: '-0.5px' }}>Welcome</h1>
                    <p style={{ fontSize: '1rem', color: '#6B7280', margin: 0 }}>Please login to admin dashboard</p>
                </div>

                {/* Form Inputs */}
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    
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
