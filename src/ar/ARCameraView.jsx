import { useState } from 'react';
import CameraLayer from './CameraLayer';

/**
 * ARCameraView.jsx
 *
 * Fullscreen live camera background. Handles connection loader and permissions
 * or capture failures gracefully.
 *
 * @param {boolean} active - whether the camera feed is active
 * @param {Function} onReady - trigger when stream starts successfully
 * @param {Function} onError - trigger if camera fails to load
 */
export default function ARCameraView({ active = true, onReady, onError }) {
  const [loading, setLoading] = useState(true);
  const [cameraError, setCameraError] = useState(null);

  const handleReady = () => {
    setLoading(false);
    onReady?.();
  };

  const handleError = (errorMsg) => {
    setLoading(false);
    setCameraError(errorMsg);
    onError?.(errorMsg);
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        background: '#000',
        overflow: 'hidden',
      }}
    >
      {/* Real Live Camera Layer */}
      <CameraLayer
        active={active}
        onReady={handleReady}
        onError={handleError}
      />

      {/* Dark overlay for vignette aesthetic */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.4) 100%)',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />

      {/* Loading Overlay */}
      {loading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: '#090d16',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '4px solid rgba(6,182,212,0.1)',
              borderTop: '4px solid #06b6d4',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 600, letterSpacing: '0.5px' }}>
            CONNECTING TO LENS FEED...
          </span>
        </div>
      )}

      {/* Fullscreen Camera Failure Overlay */}
      {cameraError && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at center, rgba(15,23,42,0.97), #070b16)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px',
            zIndex: 20,
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: '48px' }}>📷</span>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#f43f5e', margin: '0 0 8px' }}>
              Camera Feed Offline
            </h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.6', maxWidth: '340px', margin: '0 auto' }}>
              {cameraError}
            </p>
          </div>
          <div
            style={{
              padding: '12px 18px',
              borderRadius: '12px',
              background: 'rgba(244,63,94,0.06)',
              border: '1px solid rgba(244,63,94,0.15)',
              fontSize: '11px',
              color: '#94a3b8',
              maxWidth: '300px',
              lineHeight: '1.5',
            }}
          >
            💡 Note: AR mode will run in <strong style={{ color: '#06b6d4' }}>Simulation Mode</strong>.
            The floor arrows remain active, but the camera feed is replaced by a digital background.
          </div>
        </div>
      )}
    </div>
  );
}
