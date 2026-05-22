import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const CommentCard = ({ comment, delay }) => {
  return (
    <div className="void-card animate-in" style={{ animationDelay: `${delay}ms`, padding: '1.25rem' }}>
      <div style={{ position: 'absolute', left: 0, top: '1rem', bottom: '1rem', width: '2px', background: `var(--${comment.severityColor})`, borderRadius: '0 2px 2px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingLeft: '1rem' }}>
        <span className="text-mono text-muted">Line {comment.line_number}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className={`dot dot-${comment.severityColor}`} />
          <span className="text-muted" style={{ textTransform: 'capitalize', fontSize: '0.75rem' }}>{comment.severity}</span>
        </div>
      </div>
      <div style={{ paddingLeft: '1rem', color: 'var(--gray-100)', lineHeight: 1.6, fontSize: '0.9rem' }}>
        <p>
          {(comment.comment_text || '').split('`').map((chunk, i) => 
            i % 2 !== 0 ? <span key={i} className="text-mono" style={{ background: 'rgba(255,255,255,0.06)', padding: '0.1rem 0.3rem', borderRadius: '4px', color: 'var(--white)' }}>{chunk}</span> : chunk
          )}
        </p>
      </div>
    </div>
  );
};

export default function ReviewDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dbData, setDbData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedFiles, setExpandedFiles] = useState({});

  useEffect(() => {
    const token = localStorage.getItem('void_token');

    fetch(`http://localhost:8083/api/v1/reviews/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(res => res.json())
      .then(data => {
        setDbData(data);
        const initialExpanded = {};
        if (data.comments) {
          data.comments.forEach(c => { initialExpanded[c.file_path] = true; });
        }
        setExpandedFiles(initialExpanded);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch review detail:", err);
        setLoading(false);
      });
  }, [id]);

  const toggleFile = (file) => setExpandedFiles(prev => ({ ...prev, [file]: !prev[file] }));

  if (loading) return <div className="text-mono text-muted" style={{ marginTop: '4rem', textAlign: 'center' }}>Loading review matrix...</div>;
  if (!dbData || !dbData.review) return <div className="text-mono text-muted" style={{ marginTop: '4rem', textAlign: 'center' }}>Review not found in database.</div>;

  const { review, comments } = dbData;
  const severities = { error: 0, warning: 0, info: 0 };
  const groupedFiles = {};

  if (comments) {
    comments.forEach(c => {
      const sev = (c.severity || 'info').toLowerCase();
      if (severities[sev] !== undefined) severities[sev]++;
      let color = 'blue';
      if (sev === 'error') color = 'red';
      if (sev === 'warning') color = 'amber';
      c.severityColor = color;
      const file = c.file_path || 'unknown_file';
      if (!groupedFiles[file]) groupedFiles[file] = [];
      groupedFiles[file].push(c);
    });
  }

  return (
    <div style={{ maxWidth: '900px' }}>
      <button onClick={() => navigate('/reviews')} className="text-muted text-mono animate-in" style={{ background: 'transparent', border: 'none', cursor: 'pointer', marginBottom: '2rem' }}>← Back to Reviews</button>
      <header className="animate-in" style={{ marginBottom: '3rem', animationDelay: '80ms' }}>
        <div style={{ color: 'var(--gray-400)', marginBottom: '0.5rem' }}>{review.repo_full_name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <h1 className="text-huge">#{review.pr_number}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(34,197,94,0.1)', padding: '0.25rem 0.75rem', borderRadius: '4px', border: '1px solid rgba(34,197,94,0.2)' }}>
            <span className="dot dot-green" /> <span style={{ color: 'var(--green)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>REVIEWED</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid var(--border-invisible)', paddingBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><span className="dot dot-red" /> <span className="text-large">{severities.error}</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><span className="dot dot-amber" /> <span className="text-large">{severities.warning}</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><span className="dot dot-blue" /> <span className="text-large">{severities.info}</span></div>
        </div>
      </header>

      <div className="stagger">
        {Object.entries(groupedFiles).map(([fileName, fileComments], index) => (
          <div key={fileName} className="animate-in" style={{ marginBottom: '2rem', animationDelay: `${160 + (index * 80)}ms` }}>
            <div onClick={() => toggleFile(fileName)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', cursor: 'pointer', borderBottom: '1px solid var(--border-invisible)', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className="text-muted" style={{ transform: expandedFiles[fileName] ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▶</span>
                <span className="text-mono">{fileName}</span>
              </div>
              <span className="text-muted text-mono">{fileComments.length} issues</span>
            </div>
            <div className={`void-collapse ${expandedFiles[fileName] ? 'open' : ''}`}>
              <div className="void-collapse-inner">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingLeft: '1.5rem', paddingBottom: '1rem', paddingTop: '0.5rem' }}>
                  {fileComments.map((comment, i) => <CommentCard key={comment.id} comment={comment} delay={240 + (i * 80)} />)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}