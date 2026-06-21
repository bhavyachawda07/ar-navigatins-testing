import { useState } from 'react';

const ALGORITHM_LABELS = { bfs: 'BFS', dijkstra: 'Dijkstra', astar: 'A* Star' };

export default function Controls({
  nodes,
  source,
  dest,
  onSourceChange,
  onDestChange,
  onFindRoute,
  algorithm,
  onAlgorithmChange,
  loading,
  searchTerm,
  onSearchChange,
}) {
  const [darkMode, setDarkMode]     = useState(true);

  // Only named rooms are selectable — hide corridor waypoints and doors
  const roomNodes    = nodes.filter(n => n.type === 'room' || !n.type);
  const filteredNodes = roomNodes.filter((n) =>
    n.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canFindRoute = source && dest && source !== dest;

  return (
    <div className="glass-card p-5 flex flex-col gap-5">
      {/* Panel header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <span style={{ fontSize: 18 }}>🧭</span> Navigation
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Set your route</p>
        </div>
        {/* Dark mode toggle (decorative — app is always dark themed) */}
        <button
          onClick={() => setDarkMode((d) => !d)}
          className="badge badge-purple"
          style={{ cursor: 'pointer', border: 'none' }}
          title="Theme (always dark)"
        >
          {darkMode ? '🌙 Dark' : '☀️ Light'}
        </button>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(99,179,237,0.1)' }} />

      {/* Room Search */}
      <div>
        <div className="field-label">
          <span>🔍</span> Search Room
        </div>
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔎</span>
          <input
            className="search-input"
            type="text"
            placeholder="Filter rooms..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      {/* Source */}
      <div>
        <div className="field-label">
          <span style={{ color: '#10b981' }}>●</span> Current Location
        </div>
        <select
          id="source-select"
          className="nav-select"
          value={source}
          onChange={(e) => onSourceChange(e.target.value)}
        >
          <option value="">— Select source —</option>
          {(searchTerm ? filteredNodes : roomNodes).map((n) => (
            <option key={n.id} value={n.id}>{n.name}</option>
          ))}
        </select>
      </div>

      {/* Swap button */}
      <div className="flex justify-center">
        <button
          onClick={() => { onSourceChange(dest); onDestChange(source); }}
          className="badge badge-cyan"
          style={{ cursor: 'pointer', padding: '6px 16px', border: 'none', fontSize: 13 }}
          title="Swap source & destination"
        >
          ⇅ Swap
        </button>
      </div>

      {/* Destination */}
      <div>
        <div className="field-label">
          <span style={{ color: '#f43f5e' }}>●</span> Destination
        </div>
        <select
          id="dest-select"
          className="nav-select"
          value={dest}
          onChange={(e) => onDestChange(e.target.value)}
        >
          <option value="">— Select destination —</option>
          {(searchTerm ? filteredNodes : roomNodes).map((n) => (
            <option key={n.id} value={n.id}>{n.name}</option>
          ))}
        </select>
      </div>

      {/* Algorithm selector */}
      <div>
        <div className="field-label">
          <span>⚙️</span> Algorithm
        </div>
        <div className="flex gap-2">
          {Object.entries(ALGORITHM_LABELS).map(([key, label]) => (
            <button
              key={key}
              id={`algo-${key}`}
              className={`algo-tab ${algorithm === key ? 'active' : ''}`}
              onClick={() => onAlgorithmChange(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Find Route button */}
      <button
        id="find-route-btn"
        className="btn-primary"
        onClick={onFindRoute}
        disabled={!canFindRoute || loading}
      >
        {loading ? (
          <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 12h18M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {loading ? 'Calculating...' : 'Find Route'}
      </button>

      {/* Validation message */}
      {!canFindRoute && (source || dest) && (
        <p className="text-xs text-center" style={{ color: '#f59e0b' }}>
          {source === dest
            ? '⚠️ Source and destination are the same'
            : '⚠️ Please select both source and destination'}
        </p>
      )}

      {/* Info footer */}
      <div style={{ borderTop: '1px solid rgba(99,179,237,0.1)', paddingTop: 14 }}>
        <p className="text-xs text-slate-500 text-center leading-relaxed">
          🏫 P. P. Savani University<br />
          Indoor AR Navigation System
        </p>
      </div>
    </div>
  );
}
