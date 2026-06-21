/**
 * CameraService.js
 * Utility service to wrap mediaDevice APIs, capture rear cameras,
 * check compatibility, and normalize browser camera errors.
 */

export class CameraService {
  /**
   * Checks if browser supports basic mediaDevices API
   * @returns {boolean}
   */
  static isSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  /**
   * Checks if current context is HTTPS (secure context)
   * @returns {boolean}
   */
  static isHttps() {
    return window.isSecureContext || window.location.protocol === 'https:';
  }

  /**
   * Queries permissions state for camera if API is supported
   * @returns {Promise<'granted'|'prompt'|'denied'|'unsupported'>}
   */
  static async queryPermissionState() {
    if (!navigator.permissions || !navigator.permissions.query) {
      return 'unsupported';
    }
    try {
      // Note: Firefox might throw or not support 'camera' query in permissions
      const status = await navigator.permissions.query({ name: 'camera' });
      return status.state;
    } catch (e) {
      return 'unsupported';
    }
  }

  /**
   * Requests camera stream with environment (rear) camera prioritized
   * @returns {Promise<MediaStream>}
   */
  static async startCamera() {
    if (!this.isSupported()) {
      const err = new Error('navigator.mediaDevices is not supported in this browser.');
      err.name = 'SecurityError'; // Insecure HTTP often causes this
      throw err;
    }

    const constraints = {
      video: {
        facingMode: 'environment', // Rear camera priority
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false // No audio needed for AR navigation overlays
    };

    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      // If environment (rear) camera causes OverconstrainedError (e.g. desktop webcam), try fallback
      if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
        console.warn('Rear camera constraint failed. Retrying with default camera...', error);
        return await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      throw error;
    }
  }

  /**
   * Stops all active tracks on a MediaStream
   * @param {MediaStream|null} stream 
   */
  static stopCamera(stream) {
    if (stream && stream.getTracks) {
      stream.getTracks().forEach((track) => {
        if (track.readyState === 'live') {
          track.stop();
        }
      });
    }
  }

  /**
   * Translates common camera API error names into user-friendly diagnostic messages
   * @param {Error} error 
   * @returns {{title: string, message: string}}
   */
  static mapError(error) {
    console.error('CameraService error context:', error);
    
    switch (error.name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return {
          title: 'Permission Denied',
          message: 'Access to the camera was blocked by the user or browser. Please allow camera permissions in your browser address bar/settings, then try again.'
        };
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return {
          title: 'Camera Not Found',
          message: 'No video capture device (camera) was detected. If you are on a laptop or desktop, make sure your webcam is plugged in and enabled.'
        };
      case 'OverconstrainedError':
      case 'ConstraintNotSatisfiedError':
        return {
          title: 'Constraint Conflict',
          message: 'The requested environment (rear) camera parameters could not be met. Ensure no other application is using the camera.'
        };
      case 'SecurityError':
        return {
          title: 'Security / Insecure Context',
          message: 'Media capture is blocked in insecure origins. You must serve and access the site over HTTPS (e.g., https://192.168.x.x:5173) to query the camera.'
        };
      default:
        // Generic fallback error message
        return {
          title: 'Camera Access Error',
          message: error.message || 'An unexpected error occurred while requesting camera access. Verify permissions and check browser capability.'
        };
    }
  }
}
