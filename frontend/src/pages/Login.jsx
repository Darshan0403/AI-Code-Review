import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [buttonText, setButtonText] = useState('AUTHORIZE SESSION');

  const handleLogin = async (e) => {
    // Safely prevent default if the event exists
    if (e && e.preventDefault) e.preventDefault();
    
    // Give immediate feedback if the field is empty
    if (!password.trim()) {
      setError('PLEASE ENTER A PASSPHRASE.');
      return;
    }
    
    setError(''); 
    setButtonText('VERIFYING...');

    console.log("1. Vault Door: Initiating secure handshake...");

    try {
      const res = await fetch('http://localhost:8083/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      console.log("2. Vault Door: API responded with status", res.status);

      if (res.ok) {
        const data = await res.json();
        console.log("3. Vault Door: Token acquired. Routing to Matrix.");
        localStorage.setItem('void_token', data.token);
        navigate('/dashboard');
      } else {
        setButtonText('AUTHORIZE SESSION');
        if (res.status === 401) {
          setError('ACCESS DENIED: INCORRECT PASSPHRASE.');
        } else {
          setError(`AUTHENTICATION FAILURE: STATUS ${res.status}`);
        }
      }
    } catch (err) {
      console.error("Vault Door Crash:", err);
      setButtonText('AUTHORIZE SESSION');
      setError('SECURITY ARCHITECTURE OFFLINE: NETWORK FAILURE.');
    }
  };

  // Explicitly listen for the Enter key since we removed the <form> wrapper
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleLogin(e);
    }
  };

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', background: 'var(--black)' }}>
      
      <button 
        type="button"
        onClick={() => navigate('/')}
        className="text-mono text-muted"
        style={{ 
          position: 'absolute', top: '2rem', left: '2rem', 
          background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.9rem'
        }}
      >
        ← ABORT GUEST SESSION
      </button>

      <div className="void-card" style={{ width: '100%', maxWidth: '400px', padding: '3rem 2rem', textAlign: 'center' }}>
        <div className="dot dot-red" style={{ marginBottom: '1.5rem', transform: 'scale(1.5)', display: 'inline-block' }} />
        <h1 className="text-large text-mono" style={{ marginBottom: '0.5rem', color: 'var(--white)' }}>RESTRICTED AREA</h1>
        <p className="text-muted text-mono" style={{ marginBottom: '2.5rem', fontSize: '0.85rem' }}>ENTER ACCESS KEY</p>

        {/* Removed <form> tags completely. Replaced with a standard <div> layout. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown} // Listen for Enter key manually
            placeholder="Passphrase"
            autoFocus
            style={{
              background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-visible)',
              padding: '0.75rem', color: 'var(--white)', 
              borderRadius: '4px', fontFamily: 'monospace', textAlign: 'center', outline: 'none'
            }}
          />
          <button
            type="button" // CRITICAL: "button" prevents native browser hijacking
            onClick={handleLogin} // Explicitly bind the click event
            style={{
              background: 'var(--accent-1)', 
              color: 'black', border: 'none', padding: '0.75rem', borderRadius: '4px', 
              cursor: 'pointer', fontWeight: 'bold', fontFamily: 'monospace', marginTop: '0.5rem'
            }}
          >
            {buttonText}
          </button>
        </div>

        {error && (
          <div className="text-mono" style={{ color: 'var(--red)', marginTop: '1.5rem', fontSize: '0.8rem', lineHeight: 1.4, fontWeight: 'bold' }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}