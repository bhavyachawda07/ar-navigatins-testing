import * as THREE from 'three';

/**
 * Creates a canvas texture containing the text label.
 *
 * @param {string} text - text to render (e.g. "Computer Lab")
 * @returns {THREE.CanvasTexture}
 */
function createTextLabelTexture(text) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  // Set dimensions for high resolution
  canvas.width = 512;
  canvas.height = 128;

  // Clear canvas
  context.clearRect(0, 0, canvas.width, canvas.height);

  // Draw rounded rect container background
  const x = 16;
  const y = 16;
  const w = canvas.width - 32;
  const h = canvas.height - 32;
  const r = 24; // corner radius

  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + w - r, y);
  context.quadraticCurveTo(x + w, y, x + w, y + r);
  context.lineTo(x + w, y + h - r);
  context.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  context.lineTo(x + r, y + h);
  context.quadraticCurveTo(x, y + h, x, y + h - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();

  // Dark background gradient
  const bgGrad = context.createLinearGradient(0, 0, canvas.width, 0);
  bgGrad.addColorStop(0, 'rgba(10, 15, 30, 0.88)');
  bgGrad.addColorStop(1, 'rgba(15, 23, 42, 0.95)');
  context.fillStyle = bgGrad;
  context.fill();

  // Glowing border outline
  context.lineWidth = 4;
  context.strokeStyle = '#06b6d4'; // teal glowing border
  context.shadowBlur = 12;
  context.shadowColor = '#06b6d4';
  context.stroke();
  
  // Reset shadows for text rendering
  context.shadowBlur = 0;

  // Draw Icon emoji prefix
  context.font = 'bold 36px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
  context.fillStyle = '#ffffff';
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  context.fillText('🎯', 36, canvas.height / 2);

  // Draw Text
  context.font = '800 28px "Inter", "Segoe UI", sans-serif';
  context.fillStyle = '#ffffff';
  context.fillText(text.toUpperCase(), 92, canvas.height / 2 + 2); // Shift slightly down for perfect baseline alignment

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/**
 * Factory function to create a 3D Destination Marker Group.
 * Includes:
 *   - Bobbing floating 3D pin mesh
 *   - Canvas billboard text label sprite
 *   - Ground spinning pulse target rings
 *
 * @param {object} node - Destination node object ({ x, y })
 * @param {string} name - Room label name
 * @param {number} scale - Scaling factor (1 ft = scale Three.js units)
 * @returns {THREE.Group}
 */
export function createDestinationMarker(node, name, scale = 0.3) {
  const group = new THREE.Group();
  
  const wx = node.x * scale;
  const wz = -node.y * scale;
  
  group.position.set(wx, 0, wz);

  // 1. Spinning Ground Target Rings
  const groundRingGroup = new THREE.Group();
  const ringGeo = new THREE.TorusGeometry(0.32, 0.022, 8, 32);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x06b6d4,
    emissiveIntensity: 1.0,
    transparent: true,
    opacity: 0.6,
  });
  
  const innerRing = new THREE.Mesh(ringGeo, ringMat);
  innerRing.rotation.x = Math.PI / 2;
  innerRing.position.y = 0.005;
  groundRingGroup.add(innerRing);

  const outerRingMat = ringMat.clone();
  outerRingMat.opacity = 0.25;
  const outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.015, 8, 32), outerRingMat);
  outerRing.rotation.x = Math.PI / 2;
  outerRing.position.y = 0.005;
  groundRingGroup.add(outerRing);

  group.add(groundRingGroup);

  // 2. Floating bobbing 3D Pin beacon
  const pinGroup = new THREE.Group();
  pinGroup.position.y = 0.45; // Start floating height

  const pinColor = new THREE.Color(0xf43f5e); // Hot pink/red pin
  const pinMat = new THREE.MeshStandardMaterial({
    color: pinColor,
    emissive: pinColor,
    emissiveIntensity: 0.85,
    roughness: 0.2,
    metalness: 0.5,
  });

  // Pin sphere head
  const sphereGeo = new THREE.SphereGeometry(0.16, 16, 16);
  const pinSphere = new THREE.Mesh(sphereGeo, pinMat);
  pinSphere.position.set(0, 0.22, 0);
  pinGroup.add(pinSphere);

  // Pin cone point
  const coneGeo = new THREE.ConeGeometry(0.12, 0.26, 16);
  const pinCone = new THREE.Mesh(coneGeo, pinMat);
  pinCone.rotation.x = Math.PI; // point down
  pinCone.position.set(0, 0.06, 0);
  pinGroup.add(pinCone);

  // Add Point light inside the pin
  const light = new THREE.PointLight(0xf43f5e, 1.8, 8);
  light.position.set(0, 0.22, 0);
  pinGroup.add(light);

  group.add(pinGroup);

  // 3. Floating canvas text sprite label
  const labelTexture = createTextLabelTexture(name || 'Destination');
  const spriteMat = new THREE.SpriteMaterial({
    map: labelTexture,
    transparent: true,
    depthTest: false, // Ensure label is drawn on top of the pin
  });
  
  const labelSprite = new THREE.Sprite(spriteMat);
  // Aspect ratio is 4:1 (512x128), so width=1.4, height=0.35
  labelSprite.scale.set(1.4, 0.35, 1.0);
  labelSprite.position.set(0, 0.98, 0); // Position above the pin
  group.add(labelSprite);

  // Save references for animation updates
  group.userData = {
    update(time) {
      // 1. Bob the pin up and down
      pinGroup.position.y = 0.45 + Math.sin(time * 3.0) * 0.06;
      
      // 2. Pulse and spin target rings on the ground
      innerRing.rotation.z = time * 0.8;
      outerRing.rotation.z = -time * 0.4;
      const ringScale = 1.0 + Math.sin(time * 2.5) * 0.08;
      groundRingGroup.scale.set(ringScale, ringScale, 1.0);
    }
  };

  return group;
}
