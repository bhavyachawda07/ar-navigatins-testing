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
import { CameraService } from '../services/CameraService';

export default function CameraLayer({ onReady, onError, active = true }) {
  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const playTriggered = useRef(false);

  useEffect(() => {
    if (!active) return;

    let mounted = true;
    playTriggered.current = false;

    async function startCamera() {
      try {
        const stream = await CameraService.startCamera();
        if (!mounted) {
          CameraService.stopCamera(stream);
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        if (mounted) {
          const errorDetails = CameraService.mapError(err);
          onError?.(errorDetails.message);
        }
      }
    }

    startCamera();

    return () => {
      mounted = false;
      if (streamRef.current) {
        CameraService.stopCamera(streamRef.current);
        streamRef.current = null;
      }
    };
  }, [active, onError]);

  const handlePlay = () => {
    if (playTriggered.current) return;
    playTriggered.current = true;
    onReady?.();
  };

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      onPlay={handlePlay}
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

