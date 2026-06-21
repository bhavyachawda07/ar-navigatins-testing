/**
 * ARNavigation.jsx
 * ─────────────────────────────────────────────────────────────────
 * Redesigned minimal Google Maps Live View style AR Navigation.
 * Displays a full-screen camera view with floor-anchored arrows path.
 *
 * Minimal HUD overlays:
 *   - Top Left: "AR ACTIVE" status pill
 *   - Top Center: Destination name
 *   - Top Right: "Exit AR" button
 *   - Bottom Center: "Follow the arrows" prompt
 *   - Simulation: Press Space or Right Arrow to simulate walking to next waypoint.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import ARCameraView from '../ar/ARCameraView';
import ARArrowRenderer from '../ar/ARArrowRenderer';
import { useDeviceOrientation } from '../ar/useDeviceOrientation';

// ─── Arrived Screen overlay ───────────────────────────────────────────
function ArrivedScreen({ destName, onExit }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 25,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at center, rgba(16,185,129,0.15), rgba(9, 13, 22, 0.96))',
        color: '#e2e8f0',
        gap: '24px',
        textAlign: 'center',
        padding: '32px',
      }}
    >
      <div style={{ fontSize: '80px', animation: 'bounce 1s infinite alternate' }}>🏁</div>
      <div>
        <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#10b981', margin: '0 0 8px', letterSpacing: '0.5px' }}>
          ARRIVED AT DESTINATION
        </h2>
        <p style={{ fontSize: '16px', color: '#94a3b8', margin: 0 }}>
          You have successfully reached <strong style={{ color: '#fff' }}>{destName}</strong>
        </p>
      </div>
      <button
        onClick={onExit}
        style={{
          marginTop: '12px',
          padding: '14px 44px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #10b981, #06b6d4)',
          border: 'none',
          color: '#fff',
          fontWeight: 800,
          fontSize: '15px',
          cursor: 'pointer',
          boxShadow: '0 8px 32px rgba(16,185,129,0.4)',
          letterSpacing: '0.5px',
        }}
      >
        Close Navigation
      </button>
    </div>
  );
}

// ─── Motion / Orientation Permission Screen ───────────────────
function MotionPermissionScreen({ onRequest, onSkip }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at center, rgba(15,23,42,0.98), #090d16)',
        color: '#e2e8f0',
        padding: '32px',
        gap: '24px',
        textAlign: 'center',
      }}
    >
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: '24px',
        background: 'rgba(6,182,212,0.1)',
        border: '1px solid rgba(6,182,212,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '38px',
        boxShadow: '0 0 32px rgba(6,182,212,0.15)',
      }}>
        🧭
      </div>
      <div>
        <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#06b6d4', margin: '0 0 10px', letterSpacing: '0.5px' }}>
          Motion Sensors Access
        </h2>
        <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.6', maxWidth: '300px', margin: '0 auto' }}>
          To align the path arrows correctly with your direction, we need access to your device's orientation gyroscopes.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '260px' }}>
        <button
          onClick={onRequest}
          style={{
            padding: '14px 28px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
            border: 'none',
            color: '#fff',
            fontWeight: 800,
            fontSize: '14px',
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(6,182,212,0.35)',
            letterSpacing: '0.5px'
          }}
        >
          Enable Motion Access
        </button>
        <button
          onClick={onSkip}
          style={{
            padding: '12px 28px',
            borderRadius: '14px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#94a3b8',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          Skip Permission
        </button>
      </div>
    </div>
  );
}

export default function ARNavigation({ pathIds, nodeMap, onExit }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [showArrived, setShowArrived] = useState(false);
  const [skippedPermission, setSkippedPermission] = useState(false);

  const orientation = useDeviceOrientation();

  const destNode = useMemo(() => {
    if (!pathIds || pathIds.length === 0) return null;
    return nodeMap[pathIds[pathIds.length - 1]];
  }, [pathIds, nodeMap]);

  // ── Simulate: advance to next waypoint on Space or Right Arrow ──
  const handleNext = useCallback(() => {
    if (stepIndex >= pathIds.length - 1) return;
    const next = stepIndex + 1;
    setStepIndex(next);
    if (next === pathIds.length - 1) {
      setTimeout(() => setShowArrived(true), 800);
    }
  }, [stepIndex, pathIds]);

  // ── Keyboard shortcut (Space / ArrowRight to advance in desktop/simulation) ──
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
      if (e.code === 'Escape') onExit?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleNext, onExit]);

  // ── Scroll lock ──
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.classList.add('ar-active');
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('ar-active');
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#000',
        overflow: 'hidden',
        fontFamily: '"Inter", sans-serif',
        userSelect: 'none',
      }}
    >
      {/* 1. Live Camera Feed (z-index: 0) */}
      <ARCameraView active={true} />

      {/* 2. Three.js Floor Arrows Path Overlay (z-index: 2) */}
      <ARArrowRenderer
        pathIds={pathIds}
        nodeMap={nodeMap}
        stepIndex={stepIndex}
        orientation={orientation}
      />

      {/* 3. Scanline CRT Overlay (z-index: 3) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 3,
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.03) 3px, rgba(0,0,0,0.03) 4px)',
          pointerEvents: 'none',
        }}
      />

      {/* 4. Minimal HUD UI Overlay (z-index: 10) */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '20px' }}>
        
        {/* TOP ROW */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
          
          {/* Top Left: AR ACTIVE badge */}
          <div
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '20px',
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#06b6d4',
                boxShadow: '0 0 8px #06b6d4',
                display: 'inline-block',
                animation: 'pulse-dot 1.5s infinite',
              }}
            />
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#06b6d4', letterSpacing: '1px' }}>
              AR ACTIVE
            </span>
          </div>

          {/* Top Center: Destination name floating card */}
          {destNode && (
            <div
              style={{
                textAlign: 'center',
                padding: '10px 24px',
                borderRadius: '16px',
                background: 'rgba(15, 23, 42, 0.75)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                maxWidth: '240px',
                alignSelf: 'center',
              }}
            >
              <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
                Destination
              </span>
              <strong style={{ fontSize: '15px', color: '#fff', fontWeight: 800, wordBreak: 'break-word', display: 'block' }}>
                {destNode.name}
              </strong>
            </div>
          )}

          {/* Top Right: Exit AR button */}
          <button
            onClick={onExit}
            style={{
              pointerEvents: 'auto',
              padding: '6px 14px',
              borderRadius: '20px',
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.35)',
              color: '#f43f5e',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer',
              letterSpacing: '0.5px',
              backdropFilter: 'blur(12px)',
              transition: 'background 0.2s',
            }}
          >
            ✕ Exit AR
          </button>
        </div>

        {/* BOTTOM ROW */}
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginBottom: '16px' }}>
          
          {/* Bottom Center: Follow the arrows prompt */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 28px',
              borderRadius: '20px',
              background: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(6, 182, 212, 0.35)',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 800,
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              animation: 'pulse-card 2s infinite',
            }}
          >
            <span>🚶‍♂️</span>
            <span>Follow the arrows</span>
          </div>
        </div>
      </div>

      {/* 5. Device Orientation HUD display */}
      {orientation.isSupported && orientation.alpha !== null && (
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            zIndex: 10,
            padding: '4px 8px',
            borderRadius: '8px',
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            fontSize: '10px',
            color: '#10b981',
            pointerEvents: 'none',
          }}
        >
          🧭 {Math.round(orientation.alpha ?? 0)}°
        </div>
      )}

      {/* 6. Arrived Screen Overlay */}
      {showArrived && (
        <ArrivedScreen destName={destNode?.name} onExit={onExit} />
      )}

      {/* 7. Motion Permission Consent Screen Overlay */}
      {orientation.isSupported && orientation.permissionState === 'unknown' && !skippedPermission && (
        <MotionPermissionScreen
          onRequest={orientation.requestPermission}
          onSkip={() => setSkippedPermission(true)}
        />
      )}
    </div>
  );
}
