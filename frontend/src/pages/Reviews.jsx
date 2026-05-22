import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Reviews() {
  const navigate = useNavigate();
  const [groupedReviews, setGroupedReviews] = useState({});
  const [expandedRepos, setExpandedRepos] = useState({});

  useEffect(() => {
    const token = localStorage.getItem('void_token');
    fetch('http://localhost:8083/api/v1/reviews', {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    })
      .then((res) => res.json())
      .then((data) => {
        const grouped = (data || []).reduce((acc, review) => {
          const repo = review.repo_full_name;
          const date = new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          
          if (!acc[repo]) acc[repo] = {};
          if (!acc[repo][date]) acc[repo][date] = [];
          acc[repo][date].push(review);
          return acc;
        }, {});
        setGroupedReviews(grouped);
      })
      .catch((err) => console.error("Failed to fetch reviews:", err));
  }, []);

  const toggleRepo = (repo) => setExpandedRepos(prev => ({ ...prev, [repo]: !prev[repo] }));

  // Dynamic Health Badge Logic
  const renderBadge = (review) => {
    const errs = review.error_count || 0;
    const warns = review.warning_count || 0;
    const total = review.total_comments || 0;

    const badgeStyle = { padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 'bold', letterSpacing: '0.05em' };

    if (errs > 0) return <span style={{ ...badgeStyle, color: 'var(--red)', border: '1px solid var(--red)' }}>{errs} ERRORS</span>;
    if (warns > 0) return <span style={{ ...badgeStyle, color: 'var(--amber)', border: '1px solid var(--amber)' }}>{warns} WARNS</span>;
    if (total > 0) return <span style={{ ...badgeStyle, color: 'var(--blue)', border: '1px solid var(--blue)' }}>{total} ISSUES</span>;
    
    return <span style={{ ...badgeStyle, color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.4)' }}>LGTM</span>;
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '4rem' }}>
      
      <style>{`
        .repo-header {
          cursor: pointer;
          padding: 0.85rem 1.25rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          overflow: hidden;
        }
        .repo-header:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(168, 85, 247, 0.4);
        }
        /* The Standard Purple Dashboard Highlight */
        .repo-header.active {
          background: rgba(168, 85, 247, 0.05);
          border-color: #a855f7;
          box-shadow: 0 0 15px rgba(168, 85, 247, 0.25), inset 0 0 8px rgba(168, 85, 247, 0.1);
        }
        
        .chevron {
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          font-size: 0.8rem;
          color: var(--gray-400);
        }
        .repo-header.active .chevron {
          transform: rotate(90deg);
          color: #a855f7;
        }

        .dropdown-wrapper {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .dropdown-wrapper.open {
          grid-template-rows: 1fr;
        }
        .dropdown-inner {
          overflow: hidden;
        }
        
        .review-item {
          transition: transform 0.2s, background 0.2s;
        }
        .review-item:hover {
          transform: translateX(6px);
          background: rgba(255, 255, 255, 0.05) !important;
        }
      `}</style>

      <header className="animate-in" style={{ marginBottom: '2.5rem' }}>
        <h1 className="text-huge" style={{ fontSize: '2.2rem' }}>Review Archive</h1>
        <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Organized by repository and timeline.</p>
      </header>

      {Object.keys(groupedReviews).length === 0 ? (
        <div className="text-muted text-mono animate-in" style={{ padding: '2rem 0', textAlign: 'center', fontSize: '0.9rem' }}>
          No reviews recorded yet.
        </div>
      ) : (
        Object.keys(groupedReviews).map((repo, idx) => {
          const isActive = expandedRepos[repo];

          return (
            <div key={repo} className="animate-in" style={{ marginBottom: '1rem', animationDelay: `${idx * 80}ms` }}>
              
              <div className={`repo-header ${isActive ? 'active' : ''}`} onClick={() => toggleRepo(repo)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className={`dot ${isActive ? 'dot-purple' : 'dot-blue'}`} style={{ backgroundColor: isActive ? '#a855f7' : '', transform: isActive ? 'scale(1.2)' : 'scale(1)' }} />
                  <h2 className="text-mono" style={{ fontSize: '0.95rem', color: isActive ? '#a855f7' : 'var(--white)', margin: 0, transition: 'color 0.3s' }}>
                    {repo}
                  </h2>
                </div>
                <span className="chevron">▶</span>
              </div>

              <div className={`dropdown-wrapper ${isActive ? 'open' : ''}`}>
                <div className="dropdown-inner">
                  <div style={{ padding: '1rem 0.5rem 0.5rem 2.5rem' }}>
                    
                    {Object.entries(groupedReviews[repo]).map(([date, reviews]) => (
                      <div key={date} style={{ marginBottom: '1.5rem' }}>
                        
                        <h3 className="text-mono" style={{ color: 'var(--gray-400)', fontSize: '0.75rem', marginBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.4rem', textTransform: 'uppercase' }}>
                          {date}
                        </h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          {reviews.map(review => (
                            <div 
                              key={review.id} 
                              onClick={() => navigate(`/reviews/${review.id}`)} 
                              className="void-row review-item" 
                              style={{ cursor: 'pointer', padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.2)' }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                  <span className="text-mono" style={{ color: 'var(--white)', fontSize: '0.85rem' }}>
                                    #{review.pr_number}
                                  </span>
                                  {/* THE HEALTH BADGE */}
                                  {renderBadge(review)}
                                </div>
                                <span className="text-muted text-mono" style={{ fontSize: '0.7rem' }}>
                                  {new Date(review.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>

                      </div>
                    ))}
                    
                  </div>
                </div>
              </div>

            </div>
          );
        })
      )}
    </div>
  );
}