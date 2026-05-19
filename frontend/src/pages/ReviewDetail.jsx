import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// --- Subcomponent: A Single AI Comment Card ---
const CommentCard = ({ comment, delay }) => {
  return (
    <div className="void-card animate-in" style={{ animationDelay: `${delay}ms`, padding: '1.25rem' }}>
      {/* The persistent severity left-border indicator */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: '1rem',
        bottom: '1rem',
        width: '2px',
        background: `var(--${comment.severityColor})`,
        borderRadius: '0 2px 2px 0'
      }} />

      {/* Header: Line Number & Severity */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingLeft: '1rem' }}>
        <span className="text-mono text-muted">Line {comment.line}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className={`dot dot-${comment.severityColor}`} />
          <span className="text-muted" style={{ textTransform: 'capitalize', fontSize: '0.75rem' }}>
            {comment.severity}
          </span>
        </div>
      </div>

      {/* Body: The AI Explanation */}
      <div style={{ paddingLeft: '1rem', color: 'var(--gray-100)', lineHeight: 1.6, fontSize: '0.9rem' }}>
        {/* We simulate Markdown inline code blocks here */}
        <p>
          {comment.text.split('`').map((chunk, i) => 
            i % 2 !== 0 ? (
              <span key={i} className="text-mono" style={{ 
                background: 'rgba(255,255,255,0.06)', 
                padding: '0.1rem 0.3rem', 
                borderRadius: '4px',
                color: 'var(--white)'
              }}>
                {chunk}
              </span>
            ) : chunk
          )}
        </p>
      </div>
    </div>
  );
};

export default function ReviewDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [expandedFiles, setExpandedFiles] = useState({ 'src/main.go': true, 'src/auth.go': true });

  const toggleFile = (file) => {
    setExpandedFiles(prev => ({ ...prev, [file]: !prev[file] }));
  };

  // Mock Data (Matches your Python/Go schema)
  const review = {
    repo: 'Darshan0403/core-api',
    pr: 18,
    status: 'Open',
    severities: { error: 2, warning: 1, info: 0 },
    files: {
      'src/main.go': [
        { id: 1, line: 42, severity: 'error', severityColor: 'red', text: 'Goroutine leak detected. The channel `errCh` is never closed, which will cause the goroutine to hang indefinitely if an error occurs.' },
        { id: 2, line: 88, severity: 'warning', severityColor: 'amber', text: 'Consider using `errors.Is()` instead of checking the error string directly for better error wrapping support.' }
      ],
      'src/auth.go': [
        { id: 3, line: 112, severity: 'error', severityColor: 'red', text: 'Hardcoded JWT secret found: `"super-secret-key-123"`. This must be moved to an environment variable immediately.' }
      ]
    }
  };

  return (
    <div style={{ maxWidth: '900px' }}>
      
      {/* Back Button */}
      <button 
        onClick={() => navigate('/')}
        className="text-muted text-mono animate-in"
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', marginBottom: '2rem' }}
      >
        ← Back to Dashboard
      </button>

      {/* --- PR Header --- */}
      <header className="animate-in" style={{ marginBottom: '3rem', animationDelay: '80ms' }}>
        <div style={{ color: 'var(--gray-400)', marginBottom: '0.5rem' }}>{review.repo}</div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <h1 className="text-huge">#{review.pr}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(34,197,94,0.1)', padding: '0.25rem 0.75rem', borderRadius: '4px', border: '1px solid rgba(34,197,94,0.2)' }}>
            <span className="dot dot-green" />
            <span style={{ color: 'var(--green)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>{review.status}</span>
          </div>
        </div>

        {/* Minimal Severity Summary */}
        <div style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid var(--border-invisible)', paddingBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="dot dot-red" /> <span className="text-large">{review.severities.error}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="dot dot-amber" /> <span className="text-large">{review.severities.warning}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="dot dot-blue" /> <span className="text-large">{review.severities.info}</span>
          </div>
        </div>
      </header>

      {/* --- File Groups & Comments --- */}
      <div className="stagger">
        {Object.entries(review.files).map(([fileName, comments], index) => (
          <div key={fileName} className="animate-in" style={{ marginBottom: '2rem', animationDelay: `${160 + (index * 80)}ms` }}>
            
            {/* File Header (Clickable) */}
            <div 
              onClick={() => toggleFile(fileName)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', cursor: 'pointer', borderBottom: '1px solid var(--border-invisible)', marginBottom: '1rem' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className="text-muted" style={{ transform: expandedFiles[fileName] ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▶</span>
                <span className="text-mono">{fileName}</span>
              </div>
              <span className="text-muted text-mono">{comments.length} issues</span>
            </div>

            {/* Comments List */}
            {/* --- NEW: Smoothly Animated Comments List --- */}
            <div className={`void-collapse ${expandedFiles[fileName] ? 'open' : ''}`}>
              <div className="void-collapse-inner">
                {/* We add paddingBottom here so it doesn't clip the shadow of the last card */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingLeft: '1.5rem', paddingBottom: '1rem', paddingTop: '0.5rem' }}>
                  {comments.map((comment, i) => (
                    <CommentCard key={comment.id} comment={comment} delay={240 + (i * 80)} />
                  ))}
                </div>
              </div>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}