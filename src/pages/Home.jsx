import { useState, useMemo } from 'react';
import FloorMap from '../components/FloorMap';
import Controls from '../components/Controls';
import RoutePanel from '../components/RoutePanel';
import ARNavigation from '../components/ARNavigation';
import nodesData from '../data/nodes.json';
import edgesData from '../data/edges.json';
import {
  buildGraph,
  bfs,
  dijkstra,
  aStar,
  calcPathDistance,
  generateInstructions,
} from '../algorithms/bfs';

export default function Home() {
  const [source,       setSource]       = useState('');
  const [dest,         setDest]         = useState('');
  const [pathIds,      setPathIds]      = useState(null);
  const [distance,     setDistance]     = useState(0);
  const [instructions, setInstructions] = useState([]);
  const [algorithm,    setAlgorithm]    = useState('bfs');
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [arActive,     setArActive]     = useState(false); // AR mode flag
  const [searchTerm,   setSearchTerm]   = useState('');

  const graph = useMemo(() => buildGraph(nodesData, edgesData), []);

  const nodeMap = useMemo(
    () => Object.fromEntries(nodesData.map((n) => [n.id, n])),
    []
  );

  const handleFindRoute = () => {
    if (!source || !dest || source === dest) return;
    setError('');
    setLoading(true);

    setTimeout(() => {
      let result;
      try {
        if (algorithm === 'bfs') {
          const path = bfs(graph, source, dest);
          const dist = path ? calcPathDistance(graph, path) : 0;
          result = { path, distance: dist };
        } else if (algorithm === 'dijkstra') {
          result = dijkstra(graph, source, dest);
        } else {
          result = aStar(graph, source, dest);
        }

        if (!result.path) {
          setError('No route found between selected locations.');
          setPathIds(null);
          setInstructions([]);
          setDistance(0);
        } else {
          setPathIds(result.path);
          setDistance(result.distance);
          setInstructions(generateInstructions(graph, result.path));
        }
      } catch (err) {
        setError('An error occurred while finding the route.');
        console.error(err);
      }
      setLoading(false);
    }, 400);
  };

  const handleNodeClick = (nodeId) => {
    const node = nodesData.find(n => n.id === nodeId);
    if (!node || (node.type && node.type !== 'room')) return;

    if (!source) {
      setSource(nodeId);
    } else if (!dest && nodeId !== source) {
      setDest(nodeId);
    } else {
      setSource(nodeId);
      setDest('');
      setPathIds(null);
      setInstructions([]);
      setDistance(0);
    }
  };

  // ── AR Navigation overlay ─────────────────────────────────
  if (arActive && pathIds) {
    return (
      <ARNavigation
        pathIds={pathIds}
        nodeMap={nodeMap}
        graph={graph}
        totalDistance={distance}
        onExit={() => setArActive(false)}
      />
    );
  }

  return (
    <div
      className="dashboard-layout"
      style={{
        display: 'flex',
        gap: 16,
        padding: '16px',
        height: '100%',
        minHeight: '100vh',
        alignItems: 'flex-start',
      }}
    >
      {/* ── Left Panel ─────────────────────── */}
      <div className="left-panel" style={{ width: 280, flexShrink: 0 }}>
        <Controls
          nodes={nodesData}
          source={source}
          dest={dest}
          onSourceChange={(v) => { setSource(v); setPathIds(null); setInstructions([]); setDistance(0); }}
          onDestChange={(v) => { setDest(v); setPathIds(null); setInstructions([]); setDistance(0); }}
          onFindRoute={handleFindRoute}
          algorithm={algorithm}
          onAlgorithmChange={setAlgorithm}
          loading={loading}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />

        {/* ── Directions Summary ──── */}
        {pathIds && (
          <div
            className="glass-card"
            style={{
              marginTop: 12,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              background: 'rgba(15, 23, 42, 0.45)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>🚶‍♂️</span>
              <span style={{ fontWeight: 800, fontSize: 13, color: '#f1f5f9', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                Directions Summary
              </span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#94a3b8' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>
                  Current Location
                </span>
                <strong style={{ color: '#f1f5f9' }}>
                  {nodeMap[source]?.name || 'Entrance'}
                </strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', margin: '2px 0', paddingLeft: 4 }}>
                <div style={{ width: 1.5, height: 10, background: '#3b82f6', opacity: 0.4 }} />
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>
                  Destination
                </span>
                <strong style={{ color: '#f1f5f9' }}>
                  {nodeMap[dest]?.name || 'Destination'}
                </strong>
              </div>
            </div>
            
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>
                  Distance
                </span>
                <strong style={{ fontSize: 16, color: '#3b82f6' }}>{distance} ft</strong>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: '#64748b', display: 'block', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>
                  Est. Time
                </span>
                <strong style={{ fontSize: 16, color: '#10b981' }}>
                  {Math.round(distance / 2.6)} sec
                </strong>
              </div>
            </div>
          </div>
        )}

        {/* ── Start AR Navigation Button ──── */}
        {pathIds && (
          <div style={{ marginTop: 12 }}>
            <button
              id="start-ar-btn"
              onClick={() => setArActive(true)}
              style={{
                width: '100%',
                padding: '13px 20px',
                borderRadius: 14,
                background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                border: 'none',
                color: '#fff',
                fontSize: 14,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                boxShadow: '0 4px 24px rgba(124,58,237,0.4)',
                letterSpacing: 0.3,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Shine animation */}
              <span
                style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
                  animation: 'shine 2s infinite',
                }}
              />
              <span style={{ fontSize: 20 }}>📡</span>
              <span>Start AR Navigation</span>
            </button>

            <p style={{
              textAlign: 'center',
              fontSize: 10,
              color: 'rgba(148,163,184,0.45)',
              marginTop: 6,
            }}>
              Opens camera · {pathIds.length} waypoints · Press Space to advance
            </p>
          </div>
        )}
      </div>

      {/* ── Center Panel ───────────────────── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Error banner */}
        {error && (
          <div
            className="rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2"
            style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)', color: '#f43f5e' }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* Floor Map */}
        <FloorMap
          nodes={nodesData}
          edges={edgesData}
          pathIds={pathIds}
          onNodeClick={handleNodeClick}
          selectedSource={source}
          selectedDest={dest}
          searchTerm={searchTerm}
          distance={distance}
        />

        {/* Bottom quick-info bar */}
        <div className="glass-card px-4 py-3 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span style={{ color: '#10b981' }}>●</span>
            <span>Source: <strong style={{ color: '#e2e8f0' }}>{source ? nodeMap[source]?.name : 'Not set'}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span style={{ color: '#f43f5e' }}>●</span>
            <span>Destination: <strong style={{ color: '#e2e8f0' }}>{dest ? nodeMap[dest]?.name : 'Not set'}</strong></span>
          </div>
          {pathIds && (
            <>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span style={{ color: '#06b6d4' }}>●</span>
                <span>Distance: <strong style={{ color: '#06b6d4' }}>{distance} ft</strong></span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span style={{ color: '#8b5cf6' }}>●</span>
                <span>Waypoints: <strong style={{ color: '#8b5cf6' }}>{pathIds.length}</strong></span>
              </div>
              {/* Inline AR shortcut */}
              <button
                onClick={() => setArActive(true)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(6,182,212,0.2))',
                  border: '1px solid rgba(124,58,237,0.4)',
                  color: '#a78bfa',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                📡 AR
              </button>
            </>
          )}
          <div className="ml-auto">
            <span className="badge badge-purple">
              Floor G · {nodesData.filter(n => n.type === 'room').length} Rooms · {nodesData.filter(n => n.type === 'waypoint').length} Waypoints · {edgesData.length} Edges
            </span>
          </div>
        </div>
      </div>

      {/* ── Right Panel ────────────────────── */}
      <div className="right-panel" style={{ width: 280, flexShrink: 0 }}>
        <RoutePanel
          pathIds={pathIds}
          nodeMap={nodeMap}
          distance={distance}
          instructions={instructions}
          algorithm={algorithm}
        />

        {/* AR teaser card (no route yet) */}
        {!pathIds && (
          <div
            style={{
              marginTop: 12,
              padding: '16px',
              borderRadius: 16,
              background: 'rgba(124,58,237,0.06)',
              border: '1px solid rgba(124,58,237,0.2)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>📡</div>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', margin: '0 0 4px' }}>
              AR Navigation Ready
            </p>
            <p style={{ fontSize: 10, color: 'rgba(148,163,184,0.5)', margin: 0, lineHeight: 1.6 }}>
              Find a route first, then<br />tap "Start AR Navigation"
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
