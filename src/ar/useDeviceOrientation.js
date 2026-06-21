/**
 * useDeviceOrientation.js
 * ─────────────────────────────────────────────────────────────────
 * React hook that subscribes to device orientation events.
 *
 * Returns: { alpha, beta, gamma, isSupported, requestPermission }
 *   alpha  — compass heading 0–360° (y-axis rotation)
 *   beta   — front/back tilt -180°–180° (x-axis tilt)
 *   gamma  — left/right tilt -90°–90° (z-axis tilt)
 *
 * iOS 13+ requires explicit permission via DeviceOrientationEvent.requestPermission().
 * Android and desktop grant access automatically.
 *
 * Future upgrade: swap this hook's data source with WebXR pose data when
 * running inside an immersive-ar session.
 */

import { useState, useEffect, useCallback } from 'react';

export function useDeviceOrientation() {
  const [orientation, setOrientation] = useState({
    alpha: null, beta: null, gamma: null,
  });
  const [isSupported, setIsSupported]       = useState(false);
  const [permissionState, setPermissionState] = useState('unknown'); // 'unknown'|'granted'|'denied'

  const handleOrientation = useCallback((e) => {
    setOrientation({
      alpha: e.alpha,
      beta:  e.beta,
      gamma: e.gamma,
    });
  }, []);

  const subscribe = useCallback(() => {
    if (!window.DeviceOrientationEvent) {
      setIsSupported(false);
      return;
    }
    setIsSupported(true);
    window.addEventListener('deviceorientation', handleOrientation, true);
    setPermissionState('granted');
  }, [handleOrientation]);

  // Request explicit permission (iOS 13+)
  const requestPermission = useCallback(async () => {
    if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
      try {
        const state = await DeviceOrientationEvent.requestPermission();
        if (state === 'granted') {
          subscribe();
          setPermissionState('granted');
        } else {
          setPermissionState('denied');
        }
      } catch {
        setPermissionState('denied');
      }
    } else {
      // Android / desktop — no permission required
      subscribe();
    }
  }, [subscribe]);

  useEffect(() => {
    // Auto-subscribe on non-iOS devices
    if (typeof DeviceOrientationEvent?.requestPermission !== 'function') {
      subscribe();
    }
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [subscribe, handleOrientation]);

  return { ...orientation, isSupported, permissionState, requestPermission };
}
