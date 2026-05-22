import React, { useState, useEffect } from 'react';

export default function Repos() {
  const [isAdding, setIsAdding] = useState(false);
  const [newRepo, setNewRepo] = useState('');
  const [newSecret, setNewSecret] = useState('');
  const [repos, setRepos] = useState([]);
  
  const token = localStorage.getItem('void_token');
  const isAdmin = !!token;

  useEffect(() => {
    fetchRepos();
  }, []);

  const fetchRepos = async () => {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const res = await fetch('http://localhost:8083/api/v1/repos', { headers });
      if (!res.ok) throw new Error('Failed to fetch repos');
      const data = await res.json();
      setRepos(data || []);
    } catch (error) {
      console.error("Error fetching repos:", error);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newRepo.trim() || !newSecret.trim()) return;
    
    try {
      const res = await fetch('http://localhost:8083/api/v1/repos', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          github_full_name: newRepo,
          webhook_secret: newSecret
        })
      });

      if (!res.ok) throw new Error('Failed to add repo');

      setNewRepo('');
      setNewSecret('');
      setIsAdding(false);
      fetchRepos();
      
    } catch (error) {
      console.error("Error adding repo:", error);
      alert("Failed to connect repository. Make sure your API server is running.");
    }
  };

  const handleTogglePause = async (id) => {
    if (!isAdmin) return;

    try {
      const res = await fetch(`http://localhost:8083/api/v1/repos/${id}/toggle-pause`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!res.ok) throw new Error('Failed to toggle status');
      const data = await res.json();
      
      // Update UI instantly
      setRepos(repos.map(r => r.id === id ? { ...r, is_paused: data.is_paused } : r));
    } catch (err) {
      console.error(err);
      alert("Failed to toggle repository status.");
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <header className="animate-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem' }}>
        <div>
          <h1 className="text-huge">Repositories</h1>
          <p className="text-muted" style={{ marginTop: '0.5rem' }}>Monitored codebases.</p>
        </div>
        
        {!isAdding && isAdmin && (
          <button onClick={() => setIsAdding(true)} className="text-mono"
            style={{ 
              background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-visible)', 
              color: 'var(--white)', cursor: 'pointer', padding: '0.6rem 1.25rem', borderRadius: '6px', transition: 'all 0.2s ease'
            }}>
            + Add Repo
          </button>
        )}
      </header>

      <div className={`void-collapse ${isAdding ? 'open' : ''}`} style={{ marginBottom: isAdding ? '2rem' : '0' }}>
        <div className="void-collapse-inner">
          <form onSubmit={handleAdd} style={{ display: 'flex', gap: '1rem', paddingBottom: '1rem', alignItems: 'center' }}>
            <input type="text" placeholder="owner/repo-name" value={newRepo} onChange={(e) => setNewRepo(e.target.value)} className="text-mono" autoFocus={isAdding}
              style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-visible)', color: 'var(--white)', padding: '0.5rem 0', outline: 'none', fontSize: '1rem' }} />
            <input type="password" placeholder="Webhook Secret" value={newSecret} onChange={(e) => setNewSecret(e.target.value)} className="text-mono"
              style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-visible)', color: 'var(--white)', padding: '0.5rem 0', outline: 'none', fontSize: '1rem' }} />
            <button type="submit" className="text-mono" style={{ background: 'var(--white)', color: 'var(--black)', border: 'none', padding: '0.6rem 1.5rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>
              Connect
            </button>
          </form>
        </div>
      </div>

      <div className="stagger">
        {repos.length === 0 && !isAdding && (
          <div className="text-muted" style={{ padding: '2rem 0', textAlign: 'center' }}>No repositories connected.</div>
        )}
        {repos.map((repo, i) => (
          <div key={repo.id} className="void-row animate-in" style={{ animationDelay: `${160 + (i * 80)}ms`, opacity: repo.is_paused ? 0.6 : 1, transition: 'opacity 0.3s' }}>
            <div style={{ flex: 1 }}>
              <span className="text-mono" style={{ color: 'var(--white)', fontSize: '1.1rem' }}>
                {repo.github_full_name}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
              <span className="text-muted text-mono">{repo.total_reviews || 0} reviews</span>
              
              <span className="text-mono" style={{ width: '80px', textAlign: 'right', color: repo.is_paused ? 'var(--gray-500)' : (repo.last_review_at ? 'var(--accent-1)' : 'var(--blue)') }}>
                {repo.is_paused ? 'PAUSED' : (repo.last_review_at ? 'ACTIVE' : 'NEW')}
              </span>
              
              {isAdmin && (
                <button 
                  onClick={() => handleTogglePause(repo.id)} 
                  className="text-mono" 
                  style={{ 
                    background: repo.is_paused ? 'var(--accent-1)' : 'transparent', 
                    color: repo.is_paused ? 'black' : 'var(--white)', 
                    border: repo.is_paused ? '1px solid var(--accent-1)' : '1px solid var(--border-visible)', 
                    padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', width: '90px' 
                  }}
                >
                  {repo.is_paused ? 'RESUME' : 'PAUSE'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}