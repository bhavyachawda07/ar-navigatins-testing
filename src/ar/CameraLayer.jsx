/**
 * CameraLayer.jsx
 * ─────────────────────────────────────────────────────────────────
 * Live camera feed via navigator.mediaDevices.getUserMedia().
 *
 * Props:
 *   onReady  — called when stream is active
 *   onError  — called with error message string
 *   active   — boolean; stop stream when false
 *
 * Architecture note:
 *   In a future WebXR session this component becomes a no-op — the XR
 *   session provides its own camera feed automatically. The parent
 *   ARNavigation can detect XR availability and skip rendering this layer.
 */

import { useEffect, useRef } from 'react';

const CAMERA_CONSTRAINTS = {
  video: {
    facingMode: { ideal: 'environment' }, // rear camera on mobile
    width:  { ideal: 1280 },             // 720p is universally supported & lightweight for web AR
    height: { ideal: 720 },
  },
  audio: false,
};

// Helper to find the physical rear camera device ID
async function getRearCameraDeviceId() {
  try {
    if (!navigator.mediaDevices?.enumerateDevices) return null;
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(d => d.kind === 'videoinput');
    
    // Look for a device label containing "back", "rear", "environment", or "main"
    const rearDevice = videoDevices.find(d => {
      const label = d.label.toLowerCase();
      return label.includes('back') || label.includes('rear') || label.includes('environ') || label.includes('main');
    });
    
    return rearDevice ? rearDevice.deviceId : null;
  } catch (e) {
    console.warn('Failed to enumerate video devices:', e);
    return null;
  }
}

export default function CameraLayer({ onReady, onError, active = true }) {
  const videoRef  = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (!active) return;

    let mounted = true;

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        onError?.('Camera API not available in this browser.');
        return;
      }

      let stream;
      
      // Try to find the physical rear camera device ID first
      const deviceId = await getRearCameraDeviceId();
      
      const constraintOptions = [];
      if (deviceId) {
        // 1. Precise physical rear camera by device ID
        constraintOptions.push({
          video: {
            deviceId: { exact: deviceId },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
      }
      
      // Add standard fallbacks
      constraintOptions.push(CAMERA_CONSTRAINTS);
      constraintOptions.push({ video: { facingMode: 'environment' }, audio: false });
      constraintOptions.push({ video: true, audio: false });

      let lastError = null;
      for (const constraints of constraintOptions) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          if (stream) break;
        } catch (err) {
          lastError = err;
          console.warn('Camera constraints attempt failed:', constraints, err);
        }
      }

      if (!stream) {
        if (!mounted) return;
        const msg =
          lastError?.name === 'NotAllowedError'  ? 'Camera permission denied. Please allow camera access.' :
          lastError?.name === 'NotFoundError'    ? 'No camera found on this device.' :
          lastError?.name === 'NotReadableError' ? 'Camera is already in use by another application.' :
          `Camera error: ${lastError?.message || 'Could not start stream'}`;
        onError?.(msg);
        return;
      }

      if (!mounted) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      streamRef.current = stream;
      if (videoRef.current) {
        // Enforce muted and playsinline properties programmatically to bypass mobile browser restrictions
        videoRef.current.srcObject = stream;
        videoRef.current.defaultMuted = true;
        videoRef.current.muted = true;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('muted', 'true');

        // Try playing directly
        try {
          await videoRef.current.play();
          if (mounted) onReady?.();
        } catch (playErr) {
          console.warn('Direct play failed, setting up onloadedmetadata listener as fallback', playErr);
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play()
              .then(() => {
                if (mounted) onReady?.();
              })
              .catch((err) => {
                if (mounted) onError?.('Playback failed: ' + err.message);
              });
          };
        }
      }
    }

    startCamera();

    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, [active, onReady, onError]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        zIndex: 0,
        background: 'transparent',
        // Force hardware composition layer to fix black screen on mobile Chrome
        transform: 'translateZ(0)',
        willChange: 'transform',
      }}
    />
  );
}
