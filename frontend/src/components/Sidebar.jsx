import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';

export default function Sidebar() {
  const navigate = useNavigate();
  const { isConnected } = useWebSocket('ws://localhost:8083/ws/live');
  
  // Check if we are in the Admin Vault
  const isAdmin = !!localStorage.getItem('void_token');

  const navItems = [
    { path: '/dashboard', label: 'Dashboard' }, // <-- Updated to match new routing
    { path: '/reviews', label: 'Reviews' },
    { path: '/repos', label: 'Repositories' },
  ];

  const handleAdminToggle = () => {
    if (isAdmin) {
      localStorage.removeItem('void_token');
      window.location.reload(); // Force full reload to wipe auth state
    } else {
      navigate('/login');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '220px',
      height: '100vh',
      background: 'var(--black)',
      borderRight: '1px solid var(--border-invisible)',
      display: 'flex',
      flexDirection: 'column',
      padding: '2.5rem 2rem',
      zIndex: 50
    }}>
      {/* Ultra-minimal text logo */}
      <div style={{ marginBottom: '3.5rem', letterSpacing: '-0.03em', fontSize: '1.2rem' }}>
        <span style={{ fontWeight: 800, color: 'var(--white)' }}>CodeSense</span>
        <span style={{ fontWeight: 800, color: 'var(--gray-600)' }}>AI</span>
      </div>

      {/* Typographic Navigation */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              position: 'relative',
              display: 'block',
              padding: '0.5rem 0.75rem',
              textDecoration: 'none',
              fontSize: '0.9rem',
              fontWeight: 500,
              borderRadius: '4px',
              transition: 'all 0.3s ease',
              color: isActive ? 'var(--white)' : 'var(--gray-600)',
              background: isActive ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
            })}
            className="nav-link"
          >
            {({ isActive }) => (
              <>
                <span style={{
                  position: 'absolute',
                  left: 0,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  height: '60%',
                  width: '2px',
                  background: 'var(--accent-1)',
                  opacity: isActive ? 1 : 0,
                  transition: 'opacity 0.3s ease',
                  borderRadius: '0 2px 2px 0'
                }} className="nav-accent" />
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* --- Muted Footer & Auth Toggle --- */}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* The Admin Auth Toggle */}
        <button
          onClick={handleAdminToggle}
          className="text-mono"
          style={{
            background: isAdmin ? 'rgba(255,50,50,0.05)' : 'rgba(255,255,255,0.03)',
            color: isAdmin ? 'var(--red)' : 'var(--gray-400)',
            border: '1px solid',
            borderColor: isAdmin ? 'rgba(255,50,50,0.2)' : 'var(--border-invisible)',
            padding: '0.6rem',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.75rem',
            transition: 'all 0.2s ease',
            textAlign: 'center',
            textTransform: 'uppercase'
          }}
          onMouseEnter={(e) => { e.target.style.background = isAdmin ? 'rgba(255,50,50,0.1)' : 'rgba(255,255,255,0.08)' }}
          onMouseLeave={(e) => { e.target.style.background = isAdmin ? 'rgba(255,50,50,0.05)' : 'rgba(255,255,255,0.03)' }}
        >
          {isAdmin ? 'End Admin Session' : 'Admin Login'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)' }}>
            Darshan © 2026
          </div>
          
          {/* The Breathing Connection Dot */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--gray-600)' }} className="text-mono">
              {isConnected ? 'LIVE' : 'SYNCING'}
            </span>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: isConnected ? 'var(--green)' : 'var(--gray-600)',
              boxShadow: isConnected ? '0 0 8px rgba(34,197,94,0.4)' : 'none',
              animation: isConnected ? 'skeletonBreathe 2s infinite' : 'none'
            }} />
          </div>
        </div>

      </div>
    </div>
  );
}