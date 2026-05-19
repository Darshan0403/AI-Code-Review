import React, { useState } from 'react';

export default function Repos() {
  const [isAdding, setIsAdding] = useState(false);
  const [newRepo, setNewRepo] = useState('');

  // Mock Data
  const initialRepos = [
    { id: '1', name: 'Darshan0403/core-api', reviews: 42, lastActive: '2h ago' },
    { id: '2', name: 'Darshan0403/frontend-web', reviews: 18, lastActive: '1d ago' },
    { id: '3', name: 'Darshan0403/infrastructure', reviews: 7, lastActive: '3d ago' }
  ];

  const [repos, setRepos] = useState(initialRepos);

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newRepo.trim()) return;
    
    setRepos([{ 
      id: Date.now().toString(), 
      name: newRepo, 
      reviews: 0, 
      lastActive: 'Just now' 
    }, ...repos]);
    
    setNewRepo('');
    setIsAdding(false);
  };

  return (
    <div style={{ maxWidth: '800px' }}>
      
      {/* Header */}
      <header className="animate-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem' }}>
        <div>
          <h1 className="text-huge">Repositories</h1>
          <p className="text-muted" style={{ marginTop: '0.5rem' }}>Monitored codebases.</p>
        </div>
        
        {/* Toggle Add Input */}
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="text-mono"
            style={{ 
              background: 'rgba(255, 255, 255, 0.04)', 
              border: '1px solid var(--border-visible)', 
              color: 'var(--white)',
              cursor: 'pointer', 
              padding: '0.6rem 1.25rem', 
              borderRadius: '6px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.08)';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.04)';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            + Add Repo
          </button>
        )}
      </header>

      {/* Inline Add Form (Revealed on click) */}
      <div className={`void-collapse ${isAdding ? 'open' : ''}`} style={{ marginBottom: isAdding ? '2rem' : '0' }}>
        <div className="void-collapse-inner">
          <form onSubmit={handleAdd} style={{ display: 'flex', gap: '1rem', paddingBottom: '1rem' }}>
            <input 
              type="text" 
              placeholder="owner/repo-name"
              value={newRepo}
              onChange={(e) => setNewRepo(e.target.value)}
              className="text-mono text-large"
              autoFocus={isAdding}
              style={{ 
                flex: 1, 
                background: 'transparent', 
                border: 'none', 
                borderBottom: '1px solid var(--border-visible)', 
                color: 'var(--white)',
                padding: '0.5rem 0',
                outline: 'none'
              }}
            />
            <button type="submit" className="text-mono" style={{ background: 'var(--white)', color: 'var(--black)', border: 'none', padding: '0 1.5rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>
              Connect
            </button>
          </form>
        </div>
      </div>

      {/* Repo List */}
      <div className="stagger">
        {repos.map((repo, i) => (
          <div key={repo.id} className="void-row animate-in" style={{ animationDelay: `${160 + (i * 80)}ms` }}>
            <div style={{ flex: 1 }}>
              <span className="text-mono" style={{ color: 'var(--gray-100)', fontSize: '1rem' }}>{repo.name}</span>
            </div>
            <div style={{ display: 'flex', gap: '4rem' }}>
              <span className="text-muted text-mono">{repo.reviews} reviews</span>
              <span className="text-muted text-mono" style={{ width: '80px', textAlign: 'right' }}>{repo.lastActive}</span>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}