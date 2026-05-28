import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism'; 

export default function Assistant() {
  const navigate = useNavigate();
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingType, setLoadingType] = useState(''); 

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const selectWrapperRef = useRef(null);

  const token = localStorage.getItem('void_token');

  const forceLogout = () => {
    localStorage.removeItem('void_token');
    navigate('/login');
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (selectWrapperRef.current && !selectWrapperRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchRepos();
  }, []);

  const fetchRepos = async () => {
    try {
      const res = await fetch('http://localhost:8083/api/v1/repos', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) return forceLogout();
      if (res.ok) {
        const data = await res.json();
        setRepos(data || []);
        if (data && data.length > 0) setSelectedRepo(data[0].github_full_name);
      }
    } catch (err) {
      console.error("Failed to fetch repos", err);
    }
  };

  const handleUnderstandRepo = async () => {
    if (!selectedRepo) return;
    setIsLoading(true);
    setLoadingType('summary');
    setResponse(null);

    try {
      const repoObj = repos.find(r => r.github_full_name === selectedRepo);
      const res = await fetch(`http://localhost:8083/api/v1/repos/${repoObj.id}/summary`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) return forceLogout();
      
      const data = await res.json();
      setResponse({ answer: data.summary, type: 'summary' });
    } catch (err) {
      setResponse({ answer: "Failed to generate summary.", type: 'error' });
    }
    setIsLoading(false);
  };

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    if (!question.trim() || !selectedRepo) return;
    
    setIsLoading(true);
    setLoadingType('question');
    setResponse(null);

    try {
      const res = await fetch('http://localhost:8083/api/v1/repos/explain', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          repo_name: selectedRepo,
          question: question
        })
      });
      if (res.status === 401) return forceLogout();

      const data = await res.json();
      setResponse({ ...data, type: 'qa' });
    } catch (err) {
      setResponse({ answer: "Failed to query the codebase.", type: 'error' });
    }
    
    setIsLoading(false);
    // FIX: Removed setQuestion('') so the user's prompt remains in the search bar!
  };

  // --- LIGHTWEIGHT MARKDOWN PARSER ---
  const formatInlineCode = (str) => {
    const parts = str.split(/(`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} style={{ background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-3)', padding: '0.15rem 0.35rem', borderRadius: '4px', fontSize: '0.85em' }}>{part.slice(1, -1)}</code>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const formatInlineBold = (str) => {
    const parts = str.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ color: 'var(--white)', fontWeight: 700 }}>{formatInlineCode(part.slice(2, -2))}</strong>;
      }
      return formatInlineCode(part);
    });
  };

  const formatText = (text) => {
    if (!text) return null;
    
    const lines = text.replace(/\\n/g, '\n').split('\n');
    
    return lines.map((line, idx) => {
      let trimmed = line.trim();
      
      // Empty Lines
      if (!trimmed) return <div key={idx} style={{ height: '0.75rem' }} />;
      
      // Match Headers (1 to 6 hashes)
      const headerMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
      
      if (headerMatch) {
        const level = headerMatch[1].length; // Counts how many hashes
        // Brutally strip any weird/unclosed asterisks the LLM tries to put in headers
        const cleanText = headerMatch[2].replace(/\*\*/g, ''); 
        
        // Treat anything H3 or smaller (4, 5, 6) as our custom H3 style
        if (level >= 3) return <h3 key={idx} className="text-mono" style={{ color: 'var(--accent-1)', fontSize: '1.1rem', marginTop: '1.5rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{cleanText}</h3>;
        if (level === 2) return <h2 key={idx} className="text-mono" style={{ color: 'var(--accent-2)', fontSize: '1.3rem', marginTop: '1.75rem', marginBottom: '0.75rem' }}>{cleanText}</h2>;
        if (level === 1) return <h1 key={idx} className="text-mono" style={{ color: 'var(--white)', fontSize: '1.6rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginTop: '2rem', marginBottom: '1rem' }}>{cleanText}</h1>;
      }
      
      // Handle Lists
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        // Strip the starting bullet and any leading asterisks if the LLM hallucinated
        let content = trimmed.slice(2).replace(/^\*\*/, '');
        return (
          <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem', paddingLeft: '1rem' }}>
            <span style={{ color: 'var(--accent-3)', marginTop: '0.1rem' }}>▹</span>
            <div style={{ flex: 1, lineHeight: 1.6 }}>{formatInlineBold(content)}</div>
          </div>
        );
      }
      
      // Standard Paragraph
      return <p key={idx} style={{ marginBottom: '0.75rem', lineHeight: 1.7, color: 'var(--gray-300)' }}>{formatInlineBold(trimmed)}</p>;
    });
  };

  // FIX: Multi-Line Code Block Extractor
  const renderMarkdown = (text) => {
    if (!text) return null;
    
    // Split the text by multi-line code blocks (```...```)
    const blocks = text.split(/(```[\s\S]*?```)/g);

    return blocks.map((block, index) => {
      // If it's a code block, render it with SyntaxHighlighter
      if (block.startsWith('```') && block.endsWith('```')) {
        const content = block.slice(3, -3).trim();
        const lines = content.split('\n');
        const firstLine = lines[0].trim();
        
        // Detect language (e.g., 'python', 'go', 'javascript')
        const isLang = /^[a-zA-Z0-9_+-]+$/.test(firstLine) && firstLine.length < 15;
        const lang = isLang ? firstLine : 'javascript';
        const code = isLang ? lines.slice(1).join('\n') : content;

        return (
          <div key={index} style={{ margin: '1.5rem 0', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: '#0a0a0a' }}>
            <SyntaxHighlighter 
              language={lang} 
              style={atomDark} 
              customStyle={{ margin: 0, padding: '1.25rem', fontSize: '0.85rem', background: 'transparent' }}
            >
              {code}
            </SyntaxHighlighter>
          </div>
        );
      }
      
      // If it's standard text, pass it to our inline formatter
      return <div key={index}>{formatText(block)}</div>;
    });
  };

  const selectedLabel = repos.find(r => r.github_full_name === selectedRepo)?.github_full_name ?? 'No repositories found';

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '4rem' }}>
      
      <style>{`
        .neon-select-trigger {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.8rem 1.25rem;
          background: rgba(0, 0, 0, 0.4);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          user-select: none;
          animation: neonActivePulse 4s infinite alternate;
        }

        .neon-select-trigger:hover {
          background: rgba(255,255,255,0.02);
        }

        .neon-select-label {
          flex: 1;
          font-family: var(--font-mono);
          font-size: 0.95rem;
          color: var(--white);
          font-weight: 600;
        }

        .query-button {
          background: rgba(6, 182, 212, 0.1);
          color: var(--accent-3);
          border: 1px solid rgba(6, 182, 212, 0.4);
          border-radius: 8px;
          padding: 0 2rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s;
        }
        .query-button:hover:not(:disabled) {
          background: rgba(6, 182, 212, 0.2);
          box-shadow: 0 0 15px rgba(6, 182, 212, 0.4);
        }
        .query-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: transparent;
          border-color: var(--border-visible);
          color: var(--gray-500);
          box-shadow: none;
        }
      `}</style>

      <header className="animate-in" style={{ marginBottom: '3rem' }}>
        <h1 className="text-huge" style={{ fontFamily:'var(--mono)' }}>Assistant</h1>
        <p className="text-muted" style={{ marginTop: '0.5rem' }}>Query your indexed codebase.</p>
      </header>

      <div className="animate-in" style={{ position: 'relative', zIndex: 50, animationDelay: '100ms', display: 'flex', gap: '1rem', marginBottom: '2.5rem' }}>        
        <div className="custom-select-wrapper" ref={selectWrapperRef} style={{ flex: 1, zIndex: 50 }}>
          <div className="neon-select-trigger" onClick={() => setDropdownOpen(prev => !prev)}>
            <span className="dot" style={{ background: 'var(--accent-2)', boxShadow: '0 0 8px var(--accent-2)' }} />
            <span className="neon-select-label">{selectedLabel}</span>
            <span className={`custom-select-chevron ${dropdownOpen ? 'open' : ''}`}>▼</span>
          </div>

          <div className={`custom-select-dropdown ${dropdownOpen ? 'open' : ''}`} style={{ top: 'calc(100% + 8px)', border: '1px solid rgba(139, 92, 246, 0.4)' }}>
            {repos.length === 0 ? (
              <div className="custom-select-option">No repositories found</div>
            ) : repos.map(r => (
              <div key={r.id} className={`custom-select-option ${r.github_full_name === selectedRepo ? 'selected' : ''}`}
                onClick={() => { setSelectedRepo(r.github_full_name); setDropdownOpen(false); }}
              >
                <span className="custom-select-option-dot" style={{ background: 'var(--accent-2)' }} />
                {r.github_full_name}
              </div>
            ))}
          </div>
        </div>

        <button onClick={handleUnderstandRepo} disabled={isLoading} className="text-mono" style={{ 
            background: 'var(--white)', color: 'var(--black)', border: 'none', 
            padding: '0 1.5rem', borderRadius: '8px', cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: 600,
            opacity: isLoading ? 0.5 : 1
          }}>
          {isLoading && loadingType === 'summary' ? 'ANALYZING...' : 'SUMMARIZE ARCHITECTURE'}
        </button>
      </div>

      <form onSubmit={handleAskQuestion} className="animate-in" style={{ animationDelay: '150ms', marginBottom: '3rem', display: 'flex', gap: '1rem' }}>
        <input 
          type="text" 
          value={question} 
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question... (e.g. 'How are user tokens verified?')" 
          className="assistant-input"
          disabled={isLoading}
          style={{ flex: 1 }}
        />
        <button type="submit" disabled={isLoading || !question.trim()} className="text-mono query-button">
          INITIALIZE QUERY
        </button>
      </form>

      {isLoading && (
        <div className="assistant-response animate-in" style={{ border: '1px solid rgba(6, 182, 212, 0.3)' }}>
          <div className="text-muted text-mono" style={{ marginBottom: '1.5rem', color: 'var(--accent-3)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="dot dot-blue" style={{ animation: 'pulse 1s infinite' }} />
            {loadingType === 'summary' ? 'Synthesizing repository architecture...' : 'Traversing vector embeddings...'}
          </div>
          <div className="breathing-skeleton" style={{ width: '100%' }}></div>
          <div className="breathing-skeleton" style={{ width: '85%' }}></div>
          <div className="breathing-skeleton" style={{ width: '92%' }}></div>
          <div className="breathing-skeleton" style={{ width: '60%' }}></div>
        </div>
      )}

      {response && !isLoading && (
        <div className="assistant-response animate-in" style={{ border: response.type === 'error' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255,255,255,0.1)' }}>
          
          {response.type === 'qa' && response.confidence > 0 && (
             <div className="text-mono" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
               <span style={{ color: 'var(--gray-400)', fontSize: '0.8rem' }}>AI ANALYSIS COMPLETED</span>
               <span style={{ color: 'var(--accent-3)', fontSize: '0.85rem', background: 'rgba(6, 182, 212, 0.1)', padding: '0.3rem 0.8rem', borderRadius: '4px' }}>
                 Confidence: {response.confidence}%
               </span>
             </div>
          )}
          
          <div style={{ fontSize: '0.95rem' }}>
            {renderMarkdown(response.answer)}
          </div>

          {response.type === 'qa' && response.referenced_functions?.length > 0 && (
            <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-invisible)' }}>
              <div className="text-muted text-mono" style={{ fontSize: '0.75rem', marginBottom: '1rem', letterSpacing: '0.05em' }}>REFERENCED VECTORS:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {response.referenced_functions.map((ref, idx) => (
                  <span key={idx} className="text-mono" style={{ 
                    fontSize: '0.8rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                    padding: '0.4rem 0.75rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.5rem'
                  }}>
                    <span style={{ color: 'var(--accent-1)' }}>ƒ</span>
                    <span style={{ color: 'var(--white)' }}>{ref.name}</span>
                    <span style={{ color: 'var(--gray-500)' }}>{ref.file}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}