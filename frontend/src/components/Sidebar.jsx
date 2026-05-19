import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Sidebar() {
  const navItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/reviews', label: 'Reviews' },
    { path: '/repos', label: 'Repositories' },
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '220px',
      height: '100vh',
      background: 'var(--black)', // Merges perfectly with the void
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
              // Active: White text & subtle background. Inactive: Muted gray text.
              color: isActive ? 'var(--white)' : 'var(--gray-600)',
              background: isActive ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
            })}
            // We use className for the hover effects defined in CSS, but React Router's inline style
            // handles the dynamic isActive colors cleaner.
            className="nav-link"
          >
            {({ isActive }) => (
              <>
                {/* The 2px accent line that appears on active or hover */}
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

      {/* Muted footer */}
      <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)' }}>
        Darshan © 2026
      </div>
    </div>
  );
}