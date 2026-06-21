const iconMap = {
  Entrance:      '🚪',
  Exit:          '🚪',
  Admin:         '🏛️',
  Stairs:        '🪜',
  Washroom:      '🚻',
  'Computer Lab':'💻',
  C006:          '📚',
  C007:          '📚',
  C011:          '📚',
  C012:          '📚',
  C013:          '📚',
};

const stepColors = [
  '#10b981','#06b6d4','#3b82f6','#8b5cf6','#f59e0b','#f43f5e',
  '#10b981','#06b6d4','#3b82f6','#8b5cf6','#f59e0b',
];

export default function RoutePanel({ pathIds, nodeMap, distance, instructions, algorithm }) {
  if (!pathIds || pathIds.length === 0) {
    return (
      <div className="glass-card p-5 flex flex-col gap-4 h-full">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 18 }}>📋</span>
          <div>
            <h2 className="text-base font-bold text-slate-100">Route Info</h2>
            <p className="text-xs text-slate-400">Results appear here</p>
          </div>
        </div>

        <div style={{ height: 1, background: 'rgba(99,179,237,0.1)' }} />

        {/* Empty state */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4" style={{ minHeight: 200 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: 'rgba(59,130,246,0.1)',
            border: '1px solid rgba(59,130,246,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32,
          }}>
            🗺️
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-300">No Route Yet</p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Select a source and destination,<br />then click "Find Route"
            </p>
          </div>

          {/* Feature chips */}
          <div className="flex flex-wrap gap-2 justify-center">
            {['BFS', 'Dijkstra', 'A*', 'Animated'].map((f) => (
              <span key={f} className="badge badge-blue">{f}</span>
            ))}
          </div>
        </div>

        {/* AR roadmap teaser */}
        <div style={{
          borderTop: '1px solid rgba(99,179,237,0.1)',
          paddingTop: 14,
          marginTop: 'auto',
        }}>
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2">🚀 Coming Soon</p>
          <div className="flex flex-col gap-1.5">
            {['QR Code Detection', 'ARCore Integration', 'Multi-Floor Navigation', 'Campus-Wide Navigation'].map((f) => (
              <div key={f} className="flex items-center gap-2">
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(99,179,237,0.4)' }} />
                <span className="text-xs text-slate-500">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const algoLabel = { bfs: 'BFS', dijkstra: 'Dijkstra', astar: 'A* Star' };
  // Filter: show only named room nodes in the path pills
  const roomPath = pathIds.filter(id => nodeMap[id]?.type === 'room' || !nodeMap[id]?.type);

  return (
    <div className="glass-card p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 18 }}>✅</span>
          <div>
            <h2 className="text-base font-bold text-slate-100">Route Found</h2>
            <p className="text-xs text-slate-400">Step-by-step directions</p>
          </div>
        </div>
        <span className="badge badge-cyan">{algoLabel[algorithm] || algorithm}</span>
      </div>

      <div style={{ height: 1, background: 'rgba(99,179,237,0.1)' }} />

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <p className="text-xs text-slate-400 mb-1">Rooms</p>
          <p className="text-xl font-bold" style={{ color: '#10b981' }}>{roomPath.length}</p>
        </div>
        <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }}>
          <p className="text-xs text-slate-400 mb-1">Distance</p>
          <p className="text-xl font-bold" style={{ color: '#06b6d4' }}>{distance}</p>
          <p className="text-xs text-slate-500">ft</p>
        </div>
        <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
          <p className="text-xs text-slate-400 mb-1">Steps</p>
          <p className="text-xl font-bold" style={{ color: '#8b5cf6' }}>{instructions.length}</p>
        </div>
      </div>

      {/* Route path pills */}
      <div>
        <p className="field-label mb-2"><span>🛤️</span> Path</p>
        <div className="flex flex-wrap items-center gap-1">
          {roomPath.map((id, idx) => (
            <div key={id} className="flex items-center gap-1">
              <span
                className="text-xs font-semibold px-2 py-1 rounded-lg"
                style={{
                  background: `${stepColors[idx]}22`,
                  color: stepColors[idx],
                  border: `1px solid ${stepColors[idx]}44`,
                }}
              >
                {iconMap[nodeMap[id]?.name] || '📍'} {nodeMap[id]?.name}
              </span>
              {idx < roomPath.length - 1 && (
                <span className="text-slate-500 text-xs">→</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step-by-step instructions */}
      <div>
        <p className="field-label mb-2"><span>📝</span> Instructions</p>
        <div className="flex flex-col" style={{ gap: 0 }}>
          {instructions.map((step, idx) => (
            <div
              key={idx}
              className="route-step"
              style={{ animationDelay: `${idx * 0.08}s` }}
            >
              {/* Step number */}
              <div
                className="flex-shrink-0 flex items-center justify-center text-xs font-bold rounded-full"
                style={{
                  width: 26, height: 26,
                  background: `${stepColors[idx]}22`,
                  color: stepColors[idx],
                  border: `1px solid ${stepColors[idx]}44`,
                }}
              >
                {idx + 1}
              </div>
              {/* Vertical line connector */}
              <div className="flex-1">
                <p className="text-sm text-slate-200">{step}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Total distance callout */}
      <div
        className="rounded-xl p-4 flex items-center gap-3"
        style={{
          background: 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(59,130,246,0.08))',
          border: '1px solid rgba(6,182,212,0.2)',
        }}
      >
        <div style={{ fontSize: 28 }}>📏</div>
        <div>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Distance</p>
          <p className="text-2xl font-black mt-0.5" style={{ color: '#06b6d4' }}>
            {distance} <span className="text-sm font-medium text-slate-400">feet</span>
          </p>
        </div>
      </div>
    </div>
  );
}
