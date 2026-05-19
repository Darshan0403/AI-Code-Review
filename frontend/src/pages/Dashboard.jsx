import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCountUp } from '../hooks/useCountUp';

// --- Subcomponent: The Invisible Stat Card ---
const StatCard = ({ title, value, delay, isAlert, suffix = "" }) => {
  const displayValue = useCountUp(value);

  return (
    <div className="void-card animate-in" style={{ animationDelay: `${delay}ms` }}>
      <h3 className="text-muted" style={{ marginBottom: '0.5rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {title}
      </h3>
      <div className="text-huge" style={{ color: isAlert ? 'var(--red)' : 'var(--white)' }}>
        {displayValue}{suffix}
      </div>
    </div>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  
  // Mock Data (Matches your Go API)
  const stats = { total_reviews: 142, total_comments: 843, critical_bugs: 12, avg_time: 2.4 };
  const severityDist = { error: 15, warning: 55, info: 30 }; // Percentages
  
  const recentReviews = [
    { id: '1', repo: 'Darshan0403/ai-code-review-test-repo', pr: 42, comments: 14, worstSeverity: 'red', time: '10m ago' },
    { id: '2', repo: 'Darshan0403/core-api', pr: 18, comments: 5, worstSeverity: 'amber', time: '1h ago' },
    { id: '3', repo: 'Darshan0403/frontend-web', pr: 99, comments: 2, worstSeverity: 'blue', time: '3h ago' },
    { id: '4', repo: 'Darshan0403/infrastructure', pr: 7, comments: 0, worstSeverity: 'green', time: '5h ago' },
  ];

  // Animate the severity strip on load
  const [barWidths, setBarWidths] = useState({ error: 0, warning: 0, info: 0 });
  useEffect(() => {
    // Slight delay to allow page transition to finish before expanding
    const timer = setTimeout(() => setBarWidths(severityDist), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>
      
      {/* --- Top Section: Stats & Strip --- */}
      <section>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <StatCard title="Total Reviews" value={stats.total_reviews} delay={0} />
          <StatCard title="AI Comments" value={stats.total_comments} delay={80} />
          <StatCard title="Critical Bugs" value={stats.critical_bugs} delay={160} isAlert={true} />
          <StatCard title="Avg Time" value={stats.avg_time} suffix="s" delay={240} />
        </div>

        {/* The Minimal Severity Strip */}
        <div className="animate-in" style={{ animationDelay: '320ms' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span className="text-muted">Severity Ratio</span>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="dot dot-red" /> <span className="text-muted">Error</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="dot dot-amber" /> <span className="text-muted">Warn</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="dot dot-blue" /> <span className="text-muted">Info</span>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', height: '4px', borderRadius: '2px', overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
            <div style={{ width: `${barWidths.error}%`, background: 'var(--red)', transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)' }} />
            <div style={{ width: `${barWidths.warning}%`, background: 'var(--amber)', transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1) 0.1s' }} />
            <div style={{ width: `${barWidths.info}%`, background: 'var(--blue)', transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1) 0.2s' }} />
          </div>
        </div>
      </section>

      {/* --- Bottom Section: Recent Reviews --- */}
      <section>
        <div className="animate-in" style={{ animationDelay: '400ms', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem' }}>
          <h2 className="text-large">Recent Reviews</h2>
          <span className="text-muted">Showing last 4</span>
        </div>
        
        <div className="stagger">
          {recentReviews.length > 0 ? (
            recentReviews.map((review, i) => (
              <div 
                key={review.id}
                onClick={() => navigate(`/reviews/${review.id}`)}
                className="void-row animate-in"
                // Delays stack on top of the section delay
                style={{ animationDelay: `${480 + (i * 80)}ms` }}
              >
                {/* Left side: Severity Dot + Repo Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1 }}>
                  <div className={`dot dot-${review.worstSeverity}`} />
                  <span className="text-mono" style={{ color: 'var(--gray-400)' }}>{review.repo}</span>
                </div>

                {/* Right side: PR + Comments + Time */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '3rem' }}>
                  <span className="text-mono" style={{ color: 'var(--white)' }}>#{review.pr}</span>
                  <span className="text-muted" style={{ width: '80px', textAlign: 'right' }}>
                    {review.comments} {review.comments === 1 ? 'issue' : 'issues'}
                  </span>
                  <span className="text-muted" style={{ width: '60px', textAlign: 'right' }}>{review.time}</span>
                </div>
              </div>
            ))
          ) : (
            /* The Void Empty State */
            <div className="animate-in" style={{ padding: '4rem 0', textAlign: 'center', animationDelay: '480ms' }}>
              <span className="text-muted">No reviews yet.</span>
            </div>
          )}
        </div>
      </section>
      
    </div>
  );
}