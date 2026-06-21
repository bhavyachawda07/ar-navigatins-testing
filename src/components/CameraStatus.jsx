import { useEffect, useState } from 'react';

export default function CameraStatus({ cameraState, permissionState }) {
  const [deviceInfo, setDeviceInfo] = useState({
    userAgent: navigator.userAgent,
    platform: navigator.userAgentData?.platform || navigator.platform || 'Unknown',
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
  });

  const isHttps = window.isSecureContext || window.location.protocol === 'https:';
  const isMediaSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  // Determine permission indicator style
  const getPermissionBadge = () => {
    switch (permissionState) {
      case 'granted':
        return { text: '✓ Camera Permission Granted', color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' };
      case 'denied':
        return { text: '✗ Camera Permission Denied', color: '#f43f5e', bg: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)' };
      case 'prompt':
        return { text: '⚠ Camera Permission Awaiting Approval', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' };
      default:
        return { text: 'ℹ Permission Check Unsupported (Must request first)', color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' };
    }
  };

  const permBadge = getPermissionBadge();

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', margin: '20px 0' }}>
      
      {/* ─── Permission Diagnostics Card ─── */}
      <div 
        className="glass-card" 
        style={{
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>🩺</span>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#f1f5f9', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            System Diagnostics
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px', color: '#94a3b8' }}>
          {/* HTTPS check */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: isHttps ? '#10b981' : '#f43f5e', fontSize: '14px' }}>
              {isHttps ? '✓' : '✗'}
            </span>
            <span>HTTPS Status: <strong style={{ color: isHttps ? '#10b981' : '#f43f5e' }}>{isHttps ? 'Enabled (Secure Context)' : 'Disabled (Insecure HTTP)'}</strong></span>
          </div>

          {/* Browser API support */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: isMediaSupported ? '#10b981' : '#f43f5e', fontSize: '14px' }}>
              {isMediaSupported ? '✓' : '✗'}
            </span>
            <span>Browser API Support: <strong style={{ color: isMediaSupported ? '#10b981' : '#f43f5e' }}>{isMediaSupported ? 'mediaDevices available' : 'mediaDevices blocked/missing'}</strong></span>
          </div>

          {/* Permission Status */}
          <div style={{ 
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '11px',
            fontWeight: 700,
            background: permBadge.bg,
            color: permBadge.color,
            border: permBadge.border,
            marginTop: '4px'
          }}>
            {permBadge.text}
          </div>

          {/* Device details */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px', marginTop: '4px' }}>
            <span style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '2px', fontWeight: 700, textTransform: 'uppercase' }}>
              Device / Client Agent
            </span>
            <div style={{ fontSize: '11px', color: '#cbd5e1', lineHeight: '1.4' }}>
              <div>OS/Platform: <strong>{deviceInfo.platform}</strong></div>
              <div>Resolution: <strong>{deviceInfo.screenWidth} × {deviceInfo.screenHeight} px</strong></div>
              <div style={{ 
                wordBreak: 'break-all', 
                fontSize: '9px', 
                color: '#64748b', 
                marginTop: '4px',
                maxHeight: '36px',
                overflowY: 'auto'
              }}>
                {deviceInfo.userAgent}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Debug Information Card ─── */}
      <div 
        className="glass-card" 
        style={{
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>🛠️</span>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#f1f5f9', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            Network Debugger
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#94a3b8' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '6px' }}>
            <span>Protocol:</span>
            <strong style={{ color: '#06b6d4' }}>{window.location.protocol.toUpperCase().replace(':', '')}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '6px' }}>
            <span>Host IP/Address:</span>
            <strong style={{ color: '#e2e8f0' }}>{window.location.hostname}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '6px' }}>
            <span>Port:</span>
            <strong style={{ color: '#8b5cf6' }}>{window.location.port || (window.location.protocol === 'https:' ? '443' : '80')}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '6px' }}>
            <span>Full URL:</span>
            <span style={{ color: '#06b6d4', textDecoration: 'underline', fontSize: '10px', wordBreak: 'break-all', textAlign: 'right', maxWidth: '180px' }}>
              {window.location.href}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
            <span>Camera Stream State:</span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontWeight: 800,
              color: cameraState === 'Active' ? '#10b981' : cameraState === 'Stopped' ? '#64748b' : '#f43f5e'
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: cameraState === 'Active' ? '#10b981' : cameraState === 'Stopped' ? '#64748b' : '#f43f5e',
                boxShadow: cameraState === 'Active' ? '0 0 8px #10b981' : 'none',
                display: 'inline-block'
              }} />
              {cameraState}
            </span>
          </div>
        </div>
      </div>
      
    </div>
  );
}
