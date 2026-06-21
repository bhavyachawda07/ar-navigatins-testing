import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { generateRouteArrows } from './RouteArrowGenerator';
import { createDestinationMarker } from './DestinationMarker';

const SCALE = 0.3;      // 1 ft = 0.3 Three.js units
const EYE_H = 1.65;     // Camera height (meters)
const LOOK_DIST = 8;    // Forward projection distance
const LOOK_DOWN = 0.35;  // Camera downward pitch

export default function ARArrowRenderer({ pathIds, nodeMap, stepIndex = 0, orientation }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({
    scene: null,
    camera: null,
    renderer: null,
    arrowMaterials: [],
    destMarker: null,
    clock: null,
    animId: null
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 1. Initialize Scene, Camera, and WebGL Renderer
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      65,
      w / h,
      0.01,
      200
    );
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.setClearColor(0x000000, 0); // Transparent background

    // 2. Lighting Setup (Bright cyan/blue ambient + directional)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    
    const dirLight = new THREE.DirectionalLight(0x06b6d4, 1.5);
    dirLight.position.set(0, 10, 0);
    scene.add(dirLight);

    // 3. Arrow Group
    const arrowGroup = new THREE.Group();
    scene.add(arrowGroup);

    // 4. Clock for animations
    const clock = new THREE.Clock();

    // Store references
    stateRef.current.scene = scene;
    stateRef.current.camera = camera;
    stateRef.current.renderer = renderer;
    stateRef.current.clock = clock;

    // 5. Build AR Path Elements
    const buildPath = () => {
      // Clear previous geometries/materials
      while (arrowGroup.children.length > 0) {
        const child = arrowGroup.children[0];
        arrowGroup.remove(child);
        if (child.isMesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      }

      stateRef.current.arrowMaterials = [];
      stateRef.current.destMarker = null;

      if (!pathIds || pathIds.length === 0) return;

      const currentNode = nodeMap[pathIds[stepIndex]];
      const nextIdx = Math.min(stepIndex + 1, pathIds.length - 1);
      const nextNode = nodeMap[pathIds[nextIdx]];
      const destNode = nodeMap[pathIds[pathIds.length - 1]];

      if (!currentNode) return;

      const cx = currentNode.x * SCALE;
      const cz = -currentNode.y * SCALE;

      // Position Camera at eye level at the current active waypoint
      camera.position.set(cx, EYE_H, cz);

      // Orientation heading projection
      let lookTargetX = cx;
      let lookTargetZ = cz - LOOK_DIST;

      if (nextNode) {
        const nx = nextNode.x * SCALE;
        const nz = -nextNode.y * SCALE;
        const dx = nx - cx;
        const dz = nz - cz;
        const len = Math.sqrt(dx * dx + dz * dz) || 0.001;
        lookTargetX = cx + (dx / len) * LOOK_DIST;
        lookTargetZ = cz + (dz / len) * LOOK_DIST;
      }

      // Initial Camera alignment (slightly downward pitch)
      camera.lookAt(lookTargetX, EYE_H * (1 - LOOK_DOWN), lookTargetZ);

      // Generate arrows chain along the path
      const arrowDescriptors = generateRouteArrows(pathIds.slice(stepIndex), nodeMap, 3.8); // 3.8 feet spacing
      const arrowMaterials = [];

      arrowDescriptors.forEach((desc, idx) => {
        const color = new THREE.Color(0x06b6d4); // Vibrant cyan
        const mat = new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.5,
          transparent: true,
          opacity: 0.75,
          roughness: 0.1,
          metalness: 0.1
        });

        arrowMaterials.push(mat);

        // Build flat arrow mesh
        const meshGroup = new THREE.Group();
        
        // Arrow shaft box
        const shaftGeo = new THREE.BoxGeometry(0.12, 0.02, 0.45);
        const shaft = new THREE.Mesh(shaftGeo, mat);
        shaft.position.set(0, 0.01, 0.1);
        meshGroup.add(shaft);

        // Arrow head cone
        const headGeo = new THREE.ConeGeometry(0.2, 0.3, 8);
        const head = new THREE.Mesh(headGeo, mat);
        head.rotation.x = Math.PI / 2; // Lie flat
        head.position.set(0, 0.01, 0.4);
        meshGroup.add(head);

        // Positioning
        meshGroup.position.set(desc.x * SCALE, 0.02, -desc.y * SCALE);
        // Angle in description is rotated matching Three.js inverted Z
        meshGroup.rotation.y = desc.angle;

        arrowGroup.add(meshGroup);
      });

      stateRef.current.arrowMaterials = arrowMaterials;

      // Add Destination Pin & Billboard Marker
      if (destNode) {
        const destMarker = createDestinationMarker(destNode, destNode.name, SCALE);
        arrowGroup.add(destMarker);
        stateRef.current.destMarker = destMarker;
      }
    };

    buildPath();

    // 6. Responsive Resize Handler
    const handleResize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    // 7. AR Core Frame Rendering and Animation Loop
    const renderLoop = () => {
      const animId = requestAnimationFrame(renderLoop);
      stateRef.current.animId = animId;

      const t = clock.getElapsedTime();

      // Flowing Arrow Traffic Lights Animation
      const materials = stateRef.current.arrowMaterials;
      if (materials.length > 0) {
        materials.forEach((mat, idx) => {
          // Forward moving wave based on distance index
          const phase = (t * 5.0 - idx * 0.7) % (Math.PI * 2);
          const weight = Math.max(0.1, Math.sin(phase));
          
          mat.emissiveIntensity = 0.2 + 1.2 * weight;
          mat.opacity = 0.35 + 0.6 * weight;
        });
      }

      // Bob & spin destination marker
      const marker = stateRef.current.destMarker;
      if (marker && marker.userData.update) {
        marker.userData.update(t);
      }

      renderer.render(scene, camera);
    };
    
    renderLoop();

    return () => {
      cancelAnimationFrame(stateRef.current.animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [pathIds, nodeMap, stepIndex]);

  // ── Apply device orientation to rotate camera ───────────────────
  useEffect(() => {
    const { camera } = stateRef.current;
    if (!camera) return;
    if (orientation?.alpha === null || orientation?.alpha === undefined) return;

    const toRad = (deg) => (deg * Math.PI) / 180;
    const alpha = toRad(orientation.alpha ?? 0);
    const beta = toRad(orientation.beta ?? 0);
    const gamma = toRad(orientation.gamma ?? 0);

    const deviceEuler = new THREE.Euler();
    const deviceQuaternion = new THREE.Quaternion();
    const worldTransform = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // -90 deg around X

    // Set Euler rotation using standard YXZ order matching device coordinates
    deviceEuler.set(beta, alpha, -gamma, 'YXZ');
    deviceQuaternion.setFromEuler(deviceEuler);

    // Copy to camera and correct the coordinate frame so it looks forward
    camera.quaternion.copy(deviceQuaternion).multiply(worldTransform);
  }, [orientation]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 2,
        border: 'none',
        outline: 'none'
      }}
    />
  );
}
