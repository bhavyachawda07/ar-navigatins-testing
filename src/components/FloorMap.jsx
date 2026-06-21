import { useState, useRef, useCallback, useEffect } from 'react';

// ─── Coordinate system (Building dimensions: 71 ft wide × 28 ft tall) ───
const MAP_X_MAX = 76;   // x range 0–71 + small right-padding
const MAP_Y_MAX = 32;   // y range 0–28 + small top-padding
const PAD_X     = 12;
const PAD_Y     = 12;

function toSvg(x, y, svgW, svgH) {
  return {
    cx: PAD_X + (x / MAP_X_MAX) * (svgW - PAD_X * 2),
    cy: svgH - PAD_Y - (y / MAP_Y_MAX) * (svgH - PAD_Y * 2),
  };
}

// Convert floor plan bounding coordinates into SVG rect bounds
function toSvgRect(x1, y1, x2, y2, W, H) {
  const bl = toSvg(x1, y1, W, H);
  const tr = toSvg(x2, y2, W, H);
  return { x: bl.cx, y: tr.cy, width: tr.cx - bl.cx, height: bl.cy - tr.cy };
}

// ─── Physical Room Zones ───
const ROOM_ZONES = [
  { name: 'Admin',        x1: 0,  y1: 18, x2: 18, y2: 28, nodeId: 'N2',  icon: '🏛️'  },
  { name: 'Stairs',       x1: 18, y1: 18, x2: 33, y2: 28, nodeId: 'N3',  icon: '🪜'  },
  { name: 'C006',         x1: 33, y1: 18, x2: 48, y2: 28, nodeId: 'N4',  icon: '📚'  },
  { name: 'C007',         x1: 48, y1: 18, x2: 63, y2: 28, nodeId: 'N5',  icon: '📚'  },
  { name: 'Washroom',     x1: 63, y1: 18, x2: 71, y2: 28, nodeId: 'N6',  icon: '🚻'  },
  { name: 'C013',         x1: 0,  y1: 0,  x2: 15, y2: 10, nodeId: 'N8',  icon: '📚'  },
  { name: 'C012',         x1: 17, y1: 0,  x2: 32, y2: 10, nodeId: 'N9',  icon: '📚'  },
  { name: 'C011',         x1: 34, y1: 0,  x2: 49, y2: 10, nodeId: 'N10', icon: '📚'  },
  { name: 'Computer Lab', x1: 51, y1: 0,  x2: 71, y2: 10, nodeId: 'N11', icon: '💻'  },
];

// Physical wall blocks between the bottom rooms
const WALL_ZONES = [
  { x1: 15, y1: 0, x2: 17, y2: 10 },
  { x1: 32, y1: 0, x2: 34, y2: 10 },
  { x1: 49, y1: 0, x2: 51, y2: 10 }
];

// Doorway layout (matching the graph nodes D1 - D9)
const DOORS = [
  { doorX: 9,  doorY: 18, dir: 'up',   label: 'Admin' },
  { doorX: 25, doorY: 18, dir: 'up',   label: 'Stairs' },
  { doorX: 41, doorY: 18, dir: 'up',   label: 'C006' },
  { doorX: 55, doorY: 18, dir: 'up',   label: 'C007' },
  { doorX: 67, doorY: 18, dir: 'up',   label: 'Washroom' },
  { doorX: 7,  doorY: 10, dir: 'down', label: 'C013' },
  { doorX: 24, doorY: 10, dir: 'down', label: 'C012' },
  { doorX: 41, doorY: 10, dir: 'down', label: 'C011' },
  { doorX: 61, doorY: 10, dir: 'down', label: 'CompLab' }
];

export default function FloorMap({
  nodes,
  edges,
  pathIds,
  onNodeClick,
  selectedSource,
  selectedDest,
  searchTerm = '',
  distance = 0
}) {
  const [zoom,      setZoom]      = useState(1);
  const [pan,       setPan]       = useState({ x: 0, y: 0 });
  const [dragging,  setDragging]  = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [hovered,   setHovered]   = useState(null);
  const [animKey,   setAnimKey]   = useState(0);

  const SVG_W = 900;
  const SVG_H = 340;

  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));
  const pathSet = new Set(pathIds || []);

  // Increment animation key when a new route is selected to reset the drawing transition
  useEffect(() => {
    setAnimKey(k => k + 1);
  }, [pathIds]);



  // ─── Mouse/Wheel interaction ───
  const handleWheel = useCallback(e => {
    e.preventDefault();
    setZoom(z => Math.min(4, Math.max(0.4, z - e.deltaY * 0.001)));
  }, []);

  const handleMouseDown = useCallback(e => {
    // Only drag on left click and outside input fields/buttons
    if (e.button !== 0) return;
    setDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [pan]);

  const handleMouseMove = useCallback(e => {
    if (!dragging || !dragStart) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [dragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setDragging(false);
    setDragStart(null);
  }, []);

  // ─── Render: Door swinger symbol ───
  const renderDoor = ({ doorX, doorY, dir, label }) => {
    const width = 2.4;
    const startX = doorX - width / 2;
    const endX = doorX + width / 2;

    const startPt = toSvg(startX, doorY, SVG_W, SVG_H);
    const doorPt = toSvg(doorX, doorY, SVG_W, SVG_H);

    // Target height swing
    const targetY = dir === 'up' ? doorY + width : doorY - width;
    const targetPt = toSvg(doorX, targetY, SVG_W, SVG_H);

    const rx = Math.abs(doorPt.cx - startPt.cx);
    const ry = Math.abs(doorPt.cy - targetPt.cy);
    const sweep = dir === 'up' ? 0 : 1;

    return (
      <g key={label} opacity={0.9}>
        {/* Wall mask: hides the room boundary line under the door */}
        <line
          x1={toSvg(startX - 0.2, doorY, SVG_W, SVG_H).cx}
          y1={toSvg(startX - 0.2, doorY, SVG_W, SVG_H).cy}
          x2={toSvg(endX + 0.2, doorY, SVG_W, SVG_H).cx}
          y2={toSvg(endX + 0.2, doorY, SVG_W, SVG_H).cy}
          stroke="#FFFFFF"
          strokeWidth={4.5}
        />
        {/* Door panel line */}
        <line
          x1={startPt.cx}
          y1={startPt.cy}
          x2={targetPt.cx}
          y2={targetPt.cy}
          stroke="#A0A0A0"
          strokeWidth={1.5}
        />
        {/* Swing dashed arc */}
        <path
          d={`M ${targetPt.cx} ${targetPt.cy} A ${rx} ${ry} 0 0 ${sweep} ${startPt.cx} ${startPt.cy}`}
          stroke="#A0A0A0"
          strokeWidth={1}
          strokeDasharray="2 2"
          fill="none"
        />
      </g>
    );
  };

  // ─── Render: Floor plan, rooms, corridors, and walls ───
  const renderFloorPlan = () => {
    const corridor = toSvgRect(0, 10, 71, 18, SVG_W, SVG_H);

    return (
      <g>
        {/* Outer floor canvas background */}
        <rect
          x={0}
          y={0}
          width={SVG_W}
          height={SVG_H}
          fill="#F5F5F5"
        />

        {/* 1. Corridor Floor Area */}
        <rect
          {...corridor}
          fill="#EAEAEA"
          stroke="#CFCFCF"
          strokeWidth={1}
        />

        {/* Corridor center dashed guide-line */}
        {(() => {
          const l = toSvg(0, 14, SVG_W, SVG_H);
          const r = toSvg(71, 14, SVG_W, SVG_H);
          return (
            <line
              x1={l.cx}
              y1={l.cy}
              x2={r.cx}
              y2={r.cy}
              stroke="#D4D4D4"
              strokeWidth={1.5}
              strokeDasharray="8 6"
            />
          );
        })()}

        {/* 2. Room Rectangles (White fill, clean borders) */}
        {ROOM_ZONES.map(zone => {
          const r = toSvgRect(zone.x1, zone.y1, zone.x2, zone.y2, SVG_W, SVG_H);
          const isStart = zone.nodeId === selectedSource;
          const isEnd = zone.nodeId === selectedDest;
          const onPath = pathSet.has(zone.nodeId);
          const isSearched = searchTerm && zone.name.toLowerCase().includes(searchTerm.toLowerCase());

          const isHighlighted = isStart || isEnd || onPath || isSearched;
          
          let strokeColor = '#CFCFCF';
          let fillColor = '#FFFFFF';
          let strokeWidth = 2.5;

          if (isStart) {
            strokeColor = '#10B981'; // Google start green
            fillColor = '#E6F4EA';
          } else if (isEnd || isSearched) {
            strokeColor = '#EA4335'; // Google dest red
            fillColor = '#FCE8E6';
          } else if (onPath) {
            strokeColor = '#1A73E8'; // Google route blue
            fillColor = '#E8F0FE';
          }

          const groupClass = isHighlighted ? 'room-highlight-pulse' : '';

          const mx = (zone.x1 + zone.x2) / 2;
          const my = (zone.y1 + zone.y2) / 2;
          const { cx, cy } = toSvg(mx, my, SVG_W, SVG_H);

          return (
            <g
              key={zone.name}
              className={groupClass}
              onClick={() => onNodeClick && onNodeClick(zone.nodeId)}
              onMouseEnter={() => setHovered(zone.nodeId)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'pointer' }}
            >
              <rect
                {...r}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                style={{
                  transition: 'fill 0.25s ease, stroke 0.25s ease, stroke-width 0.25s ease'
                }}
              />
              {/* Subtle room label */}
              <text
                x={cx}
                y={cy + 4}
                textAnchor="middle"
                fontSize="11"
                fontFamily="var(--font-main)"
                fontWeight="600"
                fill="#3C4043"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {zone.name}
              </text>
            </g>
          );
        })}

        {/* 3. Outer boundary walls / pillars between bottom rooms */}
        {WALL_ZONES.map((w, idx) => {
          const rect = toSvgRect(w.x1, w.y1, w.x2, w.y2, SVG_W, SVG_H);
          return (
            <rect
              key={idx}
              {...rect}
              fill="#CFCFCF"
              stroke="#A0A0A0"
              strokeWidth={1}
            />
          );
        })}

        {/* 4. Render doorway swing indicators */}
        {DOORS.map(renderDoor)}

        {/* 5. Entrance / Exit annotations */}
        {[
          { x: 0,  y: 14, label: 'ENTRANCE 🟢', anchor: 'end',   dx: -8 },
          { x: 71, y: 14, label: '🏁 EXIT',      anchor: 'start', dx:  8 },
        ].map(({ x, y, label, anchor, dx }) => {
          const { cx, cy } = toSvg(x, y, SVG_W, SVG_H);
          return (
            <text
              key={label}
              x={cx + dx}
              y={cy + 4}
              textAnchor={anchor}
              fontSize="10"
              fontFamily="var(--font-main)"
              fontWeight="700"
              fill="#5F6368"
              letterSpacing="0.5px"
              style={{ userSelect: 'none', pointerEvents: 'none' }}
            >
              {label}
            </text>
          );
        })}
      </g>
    );
  };

  // ─── Render Route (Thick blue line + start/end markers) ───
  const renderRoute = () => {
    if (!pathIds || pathIds.length < 2) return null;

    const pts = pathIds.map(id => {
      const n = nodeMap[id];
      const { cx, cy } = toSvg(n.x, n.y, SVG_W, SVG_H);
      return `${cx},${cy}`;
    });
    const d = 'M ' + pts.join(' L ');

    return (
      <g key={`route-${animKey}`}>
        {/* Soft blue outer glow */}
        <path
          d={d}
          fill="none"
          stroke="rgba(26, 115, 232, 0.18)"
          strokeWidth={13}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Thick blue active path */}
        <path
          className="route-path"
          d={d}
          fill="none"
          stroke="#1A73E8"
          strokeWidth={6.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))'
          }}
        />

        {/* Start Marker (Green circle with white core) */}
        {(() => {
          const startNode = nodeMap[pathIds[0]];
          const { cx, cy } = toSvg(startNode.x, startNode.y, SVG_W, SVG_H);
          return (
            <g transform={`translate(${cx}, ${cy})`}>
              <circle
                cx={0}
                cy={0}
                r={8.5}
                fill="#10B981"
                stroke="#FFFFFF"
                strokeWidth={2}
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
              />
              <circle
                cx={0}
                cy={0}
                r={3}
                fill="#FFFFFF"
              />
            </g>
          );
        })()}

        {/* End Marker (Red Pin) */}
        {(() => {
          const endNode = nodeMap[pathIds[pathIds.length - 1]];
          const { cx, cy } = toSvg(endNode.x, endNode.y, SVG_W, SVG_H);
          return (
            <g transform={`translate(${cx}, ${cy})`}>
              <path
                d="M 0,0 C -5,-7 -9,-12 -9,-17 A 9,9 0 0,1 9,-17 C 9,-12 5,-7 0,0 Z"
                fill="#EA4335"
                stroke="#B31412"
                strokeWidth={1}
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))' }}
              />
              <circle
                cx={0}
                cy={-17}
                r={3.2}
                fill="#FFFFFF"
              />
            </g>
          );
        })()}
      </g>
    );
  };

  // ─── Render individual source marker (GPS dot) if path not calculated ───
  const renderSourceMarker = () => {
    if (!selectedSource || pathIds) return null;
    const n = nodeMap[selectedSource];
    if (!n) return null;
    const { cx, cy } = toSvg(n.x, n.y, SVG_W, SVG_H);
    return (
      <g transform={`translate(${cx}, ${cy})`}>
        <circle
          cx={0}
          cy={0}
          r={13}
          fill="rgba(66, 133, 244, 0.18)"
          className="pulse-ring"
        />
        <circle
          cx={0}
          cy={0}
          r={7}
          fill="#FFFFFF"
          style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.2))' }}
        />
        <circle
          cx={0}
          cy={0}
          r={4.5}
          fill="#4285F4"
        />
      </g>
    );
  };

  // ─── Render individual destination marker if path not calculated ───
  const renderDestMarker = () => {
    if (!selectedDest || pathIds) return null;
    const n = nodeMap[selectedDest];
    if (!n) return null;
    const { cx, cy } = toSvg(n.x, n.y, SVG_W, SVG_H);
    return (
      <g transform={`translate(${cx}, ${cy})`}>
        <path
          d="M 0,0 C -5,-7 -9,-12 -9,-17 A 9,9 0 0,1 9,-17 C 9,-12 5,-7 0,0 Z"
          fill="#EA4335"
          stroke="#B31412"
          strokeWidth={1}
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))' }}
        />
        <circle
          cx={0}
          cy={-17}
          r={3.2}
          fill="#FFFFFF"
        />
      </g>
    );
  };

  // ─── Tooltip ───
  const renderTooltip = () => {
    if (!hovered) return null;
    const n = nodeMap[hovered];
    if (!n || n.type !== 'room') return null;
    const { cx, cy } = toSvg(n.x, n.y, SVG_W, SVG_H);
    return (
      <g style={{ pointerEvents: 'none' }}>
        <rect
          x={cx - 60}
          y={cy - 48}
          width={120}
          height={24}
          rx={6}
          fill="#202124"
          style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.15))' }}
        />
        <text
          x={cx}
          y={cy - 33}
          textAnchor="middle"
          fontSize="10"
          fontFamily="var(--font-main)"
          fontWeight="600"
          fill="#FFFFFF"
        >
          {n.name}
        </text>
      </g>
    );
  };

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 16,
        border: '1px solid #E0E0E0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.03)',
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        minHeight: 480,
        fontFamily: 'var(--font-main)',
        color: '#202124',
        position: 'relative'
      }}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#202124', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
            <span style={{ fontSize: 18 }}>🗺️</span> Indoor Floor Plan
          </h2>
          <p style={{ fontSize: 12, color: '#5F6368', margin: '3px 0 0 0' }}>
            P. P. Savani University — Ground Floor Map
          </p>
        </div>
        
        {/* Navigation Action Buttons */}
        <div className="flex items-center gap-2">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#F1F3F4',
              borderRadius: 8,
              padding: 2
            }}
          >
            <button
              onClick={() => setZoom(z => Math.min(4, z + 0.25))}
              style={{
                width: 28, height: 28, border: 'none', background: 'transparent',
                fontSize: 16, fontWeight: 'bold', cursor: 'pointer', color: '#3C4043',
                borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
              title="Zoom In"
            >
              +
            </button>
            <span style={{ fontSize: 11, color: '#5F6368', width: 40, textAlign: 'center', fontWeight: 600 }}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(z => Math.max(0.4, z - 0.25))}
              style={{
                width: 28, height: 28, border: 'none', background: 'transparent',
                fontSize: 16, fontWeight: 'bold', cursor: 'pointer', color: '#3C4043',
                borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
              title="Zoom Out"
            >
              −
            </button>
          </div>
          <button
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            style={{
              height: 32, padding: '0 12px', border: '1px solid #DADCE0', background: '#FFFFFF',
              borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#3C4043', cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Map Legend */}
      <div className="flex flex-wrap gap-4" style={{ borderBottom: '1px solid #F1F3F4', paddingBottom: 10 }}>
        {[
          { fill: '#10B981', label: 'Start Point', shape: 'circle' },
          { fill: '#EA4335', label: 'Destination', shape: 'pin' },
          { fill: '#1A73E8', label: 'Navigation Path', shape: 'line' },
          { fill: '#CFCFCF', label: 'Architectural Walls', shape: 'rect' },
        ].map(({ fill, label, shape }) => (
          <div key={label} className="flex items-center gap-2">
            {shape === 'circle' && (
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: fill, border: '1.5px solid #FFFFFF', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
            )}
            {shape === 'pin' && (
              <div style={{ width: 8, height: 11, background: fill, borderRadius: '4px 4px 0 0', position: 'relative' }}>
                <div style={{ width: 3, height: 3, background: '#FFFFFF', borderRadius: '50%', position: 'absolute', top: 3, left: 2.5 }} />
              </div>
            )}
            {shape === 'line' && (
              <div style={{ width: 18, height: 3.5, background: fill, borderRadius: 2 }} />
            )}
            {shape === 'rect' && (
              <div style={{ width: 14, height: 8, background: fill, border: '1px solid #A0A0A0', borderRadius: 1 }} />
            )}
            <span style={{ fontSize: 11, color: '#5F6368', fontWeight: 500 }}>{label}</span>
          </div>
        ))}
      </div>

      {/* SVG Canvas Map Area */}
      <div
        className="relative flex-1 rounded-xl overflow-hidden"
        style={{
          background: '#F5F5F5',
          border: '1px solid #E0E0E0',
          cursor: dragging ? 'grabbing' : 'grab',
          minHeight: 350,
          boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.03)'
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          style={{
            width: '100%', height: '100%',
            transform: `scale(${zoom}) translate(${pan.x / zoom}px,${pan.y / zoom}px)`,
            transformOrigin: 'center center',
            transition: dragging ? 'none' : 'transform 0.25s cubic-bezier(0.1, 0.8, 0.2, 1)',
          }}
        >
          {renderFloorPlan()}
          {renderRoute()}
          {renderSourceMarker()}
          {renderDestMarker()}
          {renderTooltip()}
        </svg>



        {/* ─── Compass Overlay ─── */}
        <div
          onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
          style={{
            position: 'absolute',
            right: 14,
            top: 14,
            zIndex: 10,
            background: '#FFFFFF',
            width: 32,
            height: 32,
            borderRadius: '50%',
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            border: '1px solid #DADCE0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s'
          }}
          title="Reset View Orientation"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ transform: 'rotate(0deg)' }}>
            <polygon points="12,2 16,12 12,9 8,12" fill="#EA4335" />
            <polygon points="12,22 16,12 12,9 8,12" fill="#CFCFCF" />
          </svg>
        </div>

        {/* ─── Floor Selector Overlay ─── */}
        <div
          style={{
            position: 'absolute',
            right: 14,
            top: 56,
            zIndex: 10,
            background: '#FFFFFF',
            borderRadius: 8,
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            border: '1px solid #DADCE0',
            padding: 3,
            display: 'flex',
            flexDirection: 'column',
            gap: 3
          }}
        >
          <button
            style={{
              width: 26, height: 26, borderRadius: 6, border: 'none',
              background: '#1A73E8', color: '#FFFFFF', fontSize: 11, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            title="Ground Floor"
          >
            G
          </button>
          <button
            disabled
            style={{
              width: 26, height: 26, borderRadius: 6, border: 'none',
              background: '#F1F3F4', color: '#9AA0A6', fontSize: 11, fontWeight: 700,
              cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            title="1st Floor (Unavailable)"
          >
            1
          </button>
          <button
            disabled
            style={{
              width: 26, height: 26, borderRadius: 6, border: 'none',
              background: '#F1F3F4', color: '#9AA0A6', fontSize: 11, fontWeight: 700,
              cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            title="2nd Floor (Unavailable)"
          >
            2
          </button>
        </div>

        <div style={{ position: 'absolute', bottom: 10, left: 12, fontSize: 10, color: '#70757A', pointerEvents: 'none', selectNone: true }}>
          Scroll/Pinch to zoom · Drag to pan · Click room to select
        </div>
      </div>
    </div>
  );
}
