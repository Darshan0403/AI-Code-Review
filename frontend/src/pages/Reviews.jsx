import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Reviews() {
  const navigate = useNavigate();
  
  // Extended Mock Data for the global list
  const allReviews = [
    { id: '1', repo: 'Darshan0403/ai-code-review-test-repo', pr: 42, comments: 14, worstSeverity: 'red', time: '10m ago', status: 'Open' },
    { id: '2', repo: 'Darshan0403/core-api', pr: 18, comments: 5, worstSeverity: 'amber', time: '1h ago', status: 'Merged' },
    { id: '3', repo: 'Darshan0403/frontend-web', pr: 99, comments: 2, worstSeverity: 'blue', time: '3h ago', status: 'Open' },
    { id: '4', repo: 'Darshan0403/infrastructure', pr: 7, comments: 0, worstSeverity: 'green', time: '5h ago', status: 'Closed' },
    { id: '5', repo: 'Darshan0403/core-api', pr: 19, comments: 8, worstSeverity: 'red', time: '1d ago', status: 'Open' },
    { id: '6', repo: 'Darshan0403/auth-service', pr: 3, comments: 1, worstSeverity: 'amber', time: '2d ago', status: 'Merged' },
  ];

  return (
    <div style={{ maxWidth: '900px' }}>
      
      <header className="animate-in" style={{ marginBottom: '3rem' }}>
        <h1 className="text-huge">All Reviews</h1>
        <p className="text-muted" style={{ marginTop: '0.5rem' }}>Global review history across all monitored codebases.</p>
      </header>

      <div className="stagger">
        {allReviews.map((review, i) => (
          <div 
            key={review.id + i}
            onClick={() => navigate(`/reviews/${review.id}`)}
            className="void-row animate-in"
            style={{ animationDelay: `${160 + (i * 80)}ms` }}
          >
            {/* Left side: Severity + Repo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1 }}>
              <div className={`dot dot-${review.worstSeverity}`} />
              <span className="text-mono" style={{ color: 'var(--gray-400)' }}>{review.repo}</span>
            </div>

            {/* Right side: PR + Status + Comments + Time */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '3rem' }}>
              <span className="text-mono" style={{ color: 'var(--white)' }}>#{review.pr}</span>
              <span className="text-muted" style={{ width: '60px', textAlign: 'center' }}>
                {review.status}
              </span>
              <span className="text-muted" style={{ width: '80px', textAlign: 'right' }}>
                {review.comments} {review.comments === 1 ? 'issue' : 'issues'}
              </span>
              <span className="text-muted" style={{ width: '60px', textAlign: 'right' }}>
                {review.time}
              </span>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}