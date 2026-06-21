import { useEffect, useRef, useState } from 'react';
import { CameraService } from '../services/CameraService';
import CameraStatus from '../components/CameraStatus';

export default function CameraTest() {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [cameraState, setCameraState] = useState('Inactive'); // Inactive, Active, Error
  const [permissionState, setPermissionState] = useState('prompt');
  const [errorDetails, setErrorDetails] = useState(null);
  const [arOverlayActive, setArOverlayActive] = useState(true);

  // Auto-start camera on component mount
  useEffect(() => {
    // Check permission state initially
    CameraService.queryPermissionState().then((state) => {
      setPermissionState(state);
    });

    handleStartCamera();

    return () => {
      // Cleanup: stop camera on unmount
      handleStopCamera();
    };
  }, []);

  const handleStartCamera = async () => {
    setErrorDetails(null);
    setCameraState('Inactive');

    try {
      const activeStream = await CameraService.startCamera();
      setStream(activeStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = activeStream;
      }
      
      setCameraState('Active');
      setPermissionState('granted');
    } catch (err) {
      setCameraState('Error');
      const mapped = CameraService.mapError(err);
      setErrorDetails(mapped);
      
      // Update permission state based on error type
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionState('denied');
      } else {
        CameraService.queryPermissionState().then((state) => {
          setPermissionState(state);
        });
      }
    }
  };

  const handleStopCamera = () => {
    if (stream) {
      CameraService.stopCamera(stream);
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraState('Stopped');
  };

  return (
    <div style={{ padding: '20px 0', minHeight: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ─── Page Title / Header ─── */}
      <div>
        <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <span style={{ fontSize: '28px' }}>📷</span> Rear Camera Test Page
        </h2>
        <p style={{ fontSize: '14px', color: '#94a3b8', margin: '4px 0 0 0' }}>
          Troubleshoot camera access and HTTPS configurations locally for mobile AR compatibility.
        </p>
      </div>

      {/* ─── Main Content Grid ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', lgGridTemplateColumns: '3fr 2fr', gap: '20px', alignItems: 'start' }}>
        
        {/* Left Column: Video Preview and Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Video Container */}
          <div 
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '16/9',
              background: '#090d16',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              overflow: 'hidden',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(1)', // Keep environment camera non-mirrored
              }}
            />

            {/* Inactive State Visual */}
            {(cameraState === 'Inactive' || cameraState === 'Stopped') && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', background: '#090d16', zIndex: 2 }}>
                <span style={{ fontSize: '48px', animation: cameraState === 'Inactive' ? 'pulse 2s infinite' : 'none' }}>🎥</span>
                <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 600 }}>
                  {cameraState === 'Inactive' ? 'Connecting to rear camera...' : 'Camera stream is turned off'}
                </span>
              </div>
            )}

            {/* Error Overlay Visual */}
            {cameraState === 'Error' && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', background: 'rgba(9, 13, 22, 0.95)', zIndex: 2, padding: '20px', textAlign: 'center' }}>
                <span style={{ fontSize: '48px' }}>⚠️</span>
                <strong style={{ color: '#f43f5e', fontSize: '15px' }}>{errorDetails?.title}</strong>
                <p style={{ color: '#94a3b8', fontSize: '12px', maxWidth: '360px', margin: 0, lineHeight: 1.6 }}>
                  {errorDetails?.message}
                </p>
                <button
                  onClick={handleStartCamera}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '10px',
                    background: '#f43f5e',
                    border: 'none',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer',
                    marginTop: '8px'
                  }}
                >
                  Retry Request
                </button>
              </div>
            )}

            {/* AR Prototyping HUD Overlay (Future WebXR Simulation) */}
            {cameraState === 'Active' && arOverlayActive && (
              <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '16px' }}>
                
                {/* HUD Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <div style={{ background: 'rgba(0,0,0,0.5)', padding: '4px 10px', borderRadius: '6px', fontSize: '10px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid rgba(16,185,129,0.3)' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', animation: 'ping 1.5s infinite' }} />
                    <span>HUD CALIBRATED</span>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.5)', padding: '4px 10px', borderRadius: '6px', fontSize: '10px', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.3)' }}>
                    <span>AR MODE ACTIVE</span>
                  </div>
                </div>

                {/* Reticle / Navigation Crosshair */}
                <div style={{ alignSelf: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  {/* Outer circle */}
                  <div style={{ width: '90px', height: '90px', borderRadius: '50%', border: '2px dashed rgba(6, 182, 212, 0.45)', animation: 'spin 20s linear infinite' }} />
                  {/* Inner ring */}
                  <div style={{ position: 'absolute', width: '50px', height: '50px', borderRadius: '50%', border: '1.5px solid rgba(139, 92, 246, 0.6)' }} />
                  {/* Center Dot */}
                  <div style={{ position: 'absolute', width: '6px', height: '6px', borderRadius: '50%', background: '#06b6d4' }} />
                  
                  {/* Waypoint simulation arrow overlay */}
                  <svg 
                    width="40" 
                    height="40" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="#8b5cf6" 
                    strokeWidth="3" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    style={{
                      position: 'absolute',
                      top: '-60px',
                      animation: 'bounce 1.5s infinite'
                    }}
                  >
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                  <span style={{ position: 'absolute', top: '-85px', fontSize: '10px', color: '#8b5cf6', fontWeight: 800, background: 'rgba(10,15,30,0.85)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                    TURN AHEAD (15 ft)
                  </span>
                </div>

                {/* HUD Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'rgba(255,255,255,0.7)', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                  <span>PITCH: -2.3° · YAW: 104.5°</span>
                  <span>ACCELEROMETER ACTIVE</span>
                </div>
              </div>
            )}
          </div>

          {/* Camera Access Actions Button Bar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            <button
              onClick={handleStartCamera}
              disabled={cameraState === 'Active'}
              style={{
                flex: 1,
                minWidth: '140px',
                padding: '12px 20px',
                borderRadius: '12px',
                background: cameraState === 'Active' ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #10b981, #059669)',
                border: 'none',
                color: cameraState === 'Active' ? '#64748b' : '#fff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: cameraState === 'Active' ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: cameraState === 'Active' ? 'none' : '0 4px 14px rgba(16,185,129,0.3)',
                transition: 'all 0.25s'
              }}
            >
              <span>🚀</span> Start Camera
            </button>

            <button
              onClick={handleStopCamera}
              disabled={cameraState !== 'Active'}
              style={{
                flex: 1,
                minWidth: '140px',
                padding: '12px 20px',
                borderRadius: '12px',
                background: cameraState !== 'Active' ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #ef4444, #dc2626)',
                border: 'none',
                color: cameraState !== 'Active' ? '#64748b' : '#fff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: cameraState !== 'Active' ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: cameraState !== 'Active' ? 'none' : '0 4px 14px rgba(239,68,68,0.3)',
                transition: 'all 0.25s'
              }}
            >
              <span>🛑</span> Stop Camera
            </button>

            {cameraState === 'Active' && (
              <button
                onClick={() => setArOverlayActive(a => !a)}
                style={{
                  padding: '12px 20px',
                  borderRadius: '12px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  color: '#3b82f6',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
              >
                <span>📡</span> {arOverlayActive ? 'Hide AR HUD' : 'Show AR HUD'}
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Step-by-Step Instructions & Help */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Onboarding Instructions */}
          <div 
            className="glass-card"
            style={{
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span style={{ fontSize: '18px' }}>📲</span>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#f1f5f9', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                WiFi Mobile Instructions
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px', color: '#cbd5e1', lineHeight: '1.6' }}>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justify: 'center', fontWeight: 'bold', flexShrink: 0, fontSize: '11px', justifyContent: 'center' }}>
                  1
                </div>
                <div>
                  <strong style={{ color: '#fff' }}>Connect to Same Network</strong>
                  <div style={{ color: '#94a3b8', fontSize: '11px' }}>Ensure your mobile phone and development laptop are on the same local WiFi network.</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justify: 'center', fontWeight: 'bold', flexShrink: 0, fontSize: '11px', justifyContent: 'center' }}>
                  2
                </div>
                <div>
                  <strong style={{ color: '#fff' }}>Run Dev Server</strong>
                  <div style={{ color: '#94a3b8', fontSize: '11px' }}>Start your environment with <code style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 4px', borderRadius: '4px', color: '#06b6d4' }}>npm run dev</code>.</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justify: 'center', fontWeight: 'bold', flexShrink: 0, fontSize: '11px', justifyContent: 'center' }}>
                  3
                </div>
                <div>
                  <strong style={{ color: '#fff' }}>Open HTTPS Local IP</strong>
                  <div style={{ color: '#94a3b8', fontSize: '11px' }}>
                    Open your phone's browser and type the HTTPS LAN URL, for example:
                    <div style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6,182,212,0.2)', padding: '6px 10px', borderRadius: '8px', color: '#06b6d4', marginTop: '4px', fontFamily: 'monospace', fontSize: '10px', wordBreak: 'break-all' }}>
                      https://192.168.x.x:5173/camera-test
                    </div>
                    <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '10px', display: 'block', marginTop: '4px' }}>
                      ⚠ Accept the SSL/cert warning in your mobile browser to proceed.
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justify: 'center', fontWeight: 'bold', flexShrink: 0, fontSize: '11px', justifyContent: 'center' }}>
                  4
                </div>
                <div>
                  <strong style={{ color: '#fff' }}>Allow Camera Permission</strong>
                  <div style={{ color: '#94a3b8', fontSize: '11px' }}>When prompted by the browser, click "Allow" to grant the site access to your camera.</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justify: 'center', fontWeight: 'bold', flexShrink: 0, fontSize: '11px', justifyContent: 'center' }}>
                  5
                </div>
                <div>
                  <strong style={{ color: '#fff' }}>Verify Rear Camera</strong>
                  <div style={{ color: '#94a3b8', fontSize: '11px' }}>Verify that the rear environment camera stream starts automatically with HUD reticle elements.</div>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* ─── Debug / Diagnostics Row ─── */}
      <CameraStatus cameraState={cameraState} permissionState={permissionState} />

    </div>
  );
}
