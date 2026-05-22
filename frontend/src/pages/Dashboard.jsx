import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCountUp } from '../hooks/useCountUp';
import LiveFeed from '../components/LiveFeed';
import { useWebSocket } from '../hooks/useWebSocket'; 

const StatCard = ({ title, value, delay, isAlert, suffix = "" }) => {
  const displayValue = useCountUp(value || 0);

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

  const [stats, setStats] = useState({ total_reviews: 0, total_comments: 0, total_repos: 0, avg_comments_per_review: 0 });
  const [recentReviews, setRecentReviews] = useState([]);
  const [barWidths, setBarWidths] = useState({ error: 0, warning: 0, info: 0 });

  // 1. Hook into the WebSocket
  const { messages } = useWebSocket('ws://localhost:8083/ws/live');

  // 2. Extracted fetch logic
  const fetchDashboardData = useCallback(() => {
    const token = localStorage.getItem('void_token');
    const headers = token 
      ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json' };

    fetch('http://localhost:8083/api/v1/analytics/dashboard', { headers })
      .then(res => res.json())
      .then(data => {
        if (!data) return;

        if (data.stats) {
          // --- FIX 1: Rounding the Average Comments to 1 decimal place ---
          const rawAvg = data.stats.AvgCommentsPerReview ?? data.stats.avg_comments_per_review ?? 0;

          setStats({
            total_reviews: data.stats.TotalReviews ?? data.stats.total_reviews ?? 0,
            total_comments: data.stats.TotalComments ?? data.stats.total_comments ?? 0,
            total_repos: data.stats.TotalRepos ?? data.stats.total_repos ?? 0,
            avg_comments_per_review: Number(Number(rawAvg).toFixed(1)) 
          });

          // --- FIX 2: Dynamic Severity Ratio Calculation ---
          // Looking for severity counts. If the Go backend doesn't send them yet, defaults to 0.
          const errs = data.stats.error_count ?? data.stats.ErrorCount ?? 0;
          const warns = data.stats.warning_count ?? data.stats.WarningCount ?? 0;
          const infos = data.stats.info_count ?? data.stats.InfoCount ?? 0;
          
          const totalSev = errs + warns + infos;

          // Short timeout ensures the React DOM renders the empty bars first, 
          // allowing the CSS transition to "slide" them in beautifully.
          setTimeout(() => {
            if (totalSev > 0) {
              setBarWidths({
                error: (errs / totalSev) * 100,
                warning: (warns / totalSev) * 100,
                info: (infos / totalSev) * 100
              });
            } else {
              // Graceful fallback for 0 errors
              setBarWidths({ error: 0, warning: 0, info: 0 });
            }
          }, 150);
        }

        if (data.recent_reviews) {
          setRecentReviews(data.recent_reviews.slice(0, 4));
        }
      })
      .catch(err => console.error("Dashboard fetch error:", err));
  }, []);

  // 3. Initial Load Effect
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]); // Removed the hardcoded timeout from here!

  // 4. WebSocket Listener Effect
  useEffect(() => {
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      if (latestMessage.type === 'review_completed' || latestMessage.status === 'completed') {
        console.log("Matrix Update: Review completed. Refreshing Dashboard Stats...");
        fetchDashboardData();
      }
    }
  }, [messages, fetchDashboardData]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>
      <section>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <StatCard title="Total Reviews" value={stats.total_reviews} delay={0} />
          <StatCard title="AI Comments" value={stats.total_comments} delay={80} />
          <StatCard title="Monitored Repos" value={stats.total_repos} delay={160} />
          <StatCard title="Avg Comments/PR" value={stats.avg_comments_per_review} delay={240} />
        </div>

        <div className="animate-in" style={{ animationDelay: '320ms' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span className="text-muted">Severity Ratio</span> 
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><span className="dot dot-red" /> <span className="text-muted">Error</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><span className="dot dot-amber" /> <span className="text-muted">Warn</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><span className="dot dot-blue" /> <span className="text-muted">Info</span></div>
            </div>
          </div>
          
          <div style={{ display: 'flex', height: '4px', borderRadius: '2px', overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
            <div style={{ width: `${barWidths.error}%`, background: 'var(--red)', transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)' }} />
            <div style={{ width: `${barWidths.warning}%`, background: 'var(--amber)', transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1) 0.1s' }} />
            <div style={{ width: `${barWidths.info}%`, background: 'var(--blue)', transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1) 0.2s' }} />
          </div>
        </div>
      </section>

      <section className="animate-in" style={{ animationDelay: '360ms' }}>
        <LiveFeed />
      </section>

      <section>
        <div className="animate-in" style={{ animationDelay: '400ms', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem' }}>
          <h2 className="text-large">Recent Reviews</h2>
          <span className="text-muted">Showing last 4</span>
        </div>

        <div className="stagger">
          {recentReviews.length > 0 ? (
            recentReviews.map((review, i) => (
              <div key={review.id} onClick={() => navigate(`/reviews/${review.id}`)} className="void-row animate-in" style={{ animationDelay: `${480 + (i * 80)}ms`, cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1 }}>
                  <div className="dot dot-blue" />
                  <span className="text-mono" style={{ color: 'var(--gray-400)' }}>{review.repo_full_name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3rem' }}>
                  <span className="text-mono" style={{ color: 'var(--white)' }}>#{review.pr_number}</span>
                  <span className="text-muted" style={{ width: '150px', textAlign: 'right' }}>{new Date(review.created_at).toLocaleString()}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="animate-in" style={{ padding: '4rem 0', textAlign: 'center', animationDelay: '480ms' }}><span className="text-muted">No reviews yet.</span></div>
          )}
        </div>
      </section>
    </div>
  );
}