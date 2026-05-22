import React from 'react';
import { useNavigate } from 'react-router-dom';
import LandingSphere from '../components/LandingSphere';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#020202' }}>
      
      {/* 3D Breathing Particle Matrix */}
      <LandingSphere />

      {/* Scoped CSS Injector */}
      <style>{`
        .glowing-neon-container {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        }
        .matrix-neon-btn {
          background: #000000 !important;
          color: #22c55e !important;
          border: 2px solid #22c55e !important;
          padding: 1.5rem 4rem !important;
          font-size: 1.4rem !important;
          font-family: monospace !important;
          font-weight: 900 !important;
          letter-spacing: 0.15em !important;
          text-transform: uppercase;
          cursor: pointer;
          border-radius: 4px;
          outline: none;
          z-index: 100;
          position: relative;
          box-shadow: 0 0 15px rgba(34, 197, 94, 0.3), inset 0 0 10px rgba(34, 197, 94, 0.2);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          animation: coreNeonBreathe 2.5s infinite alternate;
        }
        .matrix-neon-btn:hover {
          background: rgba(34, 197, 94, 0.08) !important;
          color: #4ade80 !important;
          border-color: #4ade80 !important;
          transform: translateY(-2px) scale(1.03);
          box-shadow: 0 0 30px rgba(34, 197, 94, 0.7), inset 0 0 15px rgba(34, 197, 94, 0.3);
          filter: drop-shadow(0 0 10px rgba(34,197,94,0.5));
        }
        .matrix-neon-btn:active {
          transform: translateY(0) scale(0.98);
        }
        @keyframes coreNeonBreathe {
          0% {
            box-shadow: 0 0 12px rgba(34, 197, 94, 0.2), inset 0 0 8px rgba(34, 197, 94, 0.1);
            border-color: #166534;
          }
          100% {
            box-shadow: 0 0 24px rgba(34, 197, 94, 0.5), inset 0 0 16px rgba(34, 197, 94, 0.3);
            border-color: #22c55e;
          }
        }
      `}</style>

      {/* UI Split Grid Frame */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', width: '100%', height: '100%' }}>
        
        {/* LEFT VIEWPORT: Deep Context Layout */}
        <div style={{ 
          flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', 
          padding: '5rem', paddingLeft: '8%', borderRight: '1px solid rgba(255,255,255,0.03)',
          background: 'linear-gradient(90deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 100%)'
        }}>
          <div className="dot dot-blue" style={{ transform: 'scale(1.4)', marginBottom: '2rem', animation: 'skeletonBreathe 2s infinite' }} />
          
          <h1 style={{ fontSize: '4.5rem', marginBottom: '1.5rem', lineHeight: '1.05', fontWeight: 800, color: 'var(--white)' }}>
            CodeSense AI
          </h1>
          
          <p className="text-muted text-mono" style={{ maxWidth: '480px', fontSize: '1.05rem', lineHeight: '1.8' }}>
            An event-driven, autonomous code review pipeline. Intercepts GitHub pull requests, executes deep semantic differential analysis via contextual LLM configurations, and streams structural vulnerabilities over stateful tracking matrices.
          </p>
        </div>

        {/* RIGHT VIEWPORT: Interaction Portal */}
        <div style={{ flex: 1, background: 'rgba(0,0,0,0.1)' }}>
          <div className="glowing-neon-container">
            <button 
              className="matrix-neon-btn"
              onClick={() => navigate('/dashboard')}
            >
              Enter Matrix
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}