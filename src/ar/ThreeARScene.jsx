/**
 * ThreeARScene.jsx
 * ─────────────────────────────────────────────────────────────────
 * Three.js AR overlay rendered on a transparent WebGL canvas.
 *
 * - Positions 3D floor arrows (cone + box) at world-space waypoint coords.
 * - Arrows are anchored to the floor and face the next waypoint.
 * - Pulsing animation on the nearest (first) arrow.
 * - Device orientation rotates the Three.js camera (simulates AR tracking).
 * - Destination beacon glows red/pink.
 *
 * Coordinate mapping:
 *   Floor plan (ft): x = east, y = north
 *   Three.js (world): x = east, z = south  (y is vertical)
 *   Scale: 1 ft → 0.3 world units
 *
 * Future WebXR upgrade:
 *   Replace camera.rotation with renderer.xr.enabled = true and use
 *   XRFrame.getViewerPose() for the camera matrix. Arrow positions
 *   remain the same (already in world space).
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// ─── Constants ────────────────────────────────────────────────
const SCALE     = 0.3;    // 1 ft = 0.3 Three.js world units
const EYE_H     = 1.65;   // Camera eye height (meters)
const LOOK_DIST = 8;      // How far ahead the camera looks (world units)
const LOOK_DOWN = 0.4;    // How much to look downward (0 = level, 1 = floor)

// Runway arrow distances from camera position (world units)
const RUNWAY_DISTS  = [1.5, 3.5, 6.0, 9.0, 13.0];
const ARROW_COLORS  = [0x00ffff, 0x06b6d4, 0x06b6d4, 0x06b6d4, 0x06b6d4];
const ARROW_EMISS   = [1.0,     0.6,     0.5,     0.35,    0.2];
const ARROW_OPACITY = [1.0,     0.85,    0.7,     0.5,     0.3];

// ─── Helper: create a floor-lying arrow mesh group ────────────
// Arrow shaft points in +Z direction by default; rotated via .rotation.y
function makeArrowMesh(hexColor, emissiveIntensity, opacity, scaleMul = 1) {
  const group = new THREE.Group();
  const color = new THREE.Color(hexColor);

  const makeMat = () =>
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity,
      transparent: opacity < 1,
      opacity,
    });

  // Shaft — flat box along +Z
  const shaft = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.055, 0.55),
    makeMat()
  );
  shaft.position.set(0, 0.027, 0.12);
  group.add(shaft);

  // Arrowhead — cone pointing along +Z
  const head = new THREE.Mesh(
    new THREE.ConeGeometry(0.175, 0.38, 8),
    makeMat()
  );
  head.rotation.x = Math.PI / 2;
  head.position.set(0, 0.027, 0.55);
  group.add(head);

  group.scale.setScalar(scaleMul);
  return group;
}

// ─── Helper: floor plan coords → Three.js world XZ ───────────
function fp2world(node) {
  return { wx: node.x * SCALE, wz: -node.y * SCALE }; // y flipped for Three.js Z
}

// ─── Main Component ───────────────────────────────────────────
export default function ThreeARScene({ pathIds, nodeMap, stepIndex, orientation }) {
  const canvasRef = useRef(null);
  const refs      = useRef({}); // { scene, camera, renderer, arrowGroup, animId, clock }

  // ── Init Three.js (runs once) ─────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene    = new THREE.Scene();
    const camera   = new THREE.PerspectiveCamera(65, canvas.clientWidth / canvas.clientHeight, 0.01, 500);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setClearColor(0x000000, 0); // fully transparent background

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0x06b6d4, 1.2);
    dirLight.position.set(0, 10, 0);
    scene.add(dirLight);

    // Floor grid (subtle visual depth cue)
    const grid = new THREE.GridHelper(300, 150, 0x06b6d415, 0x06b6d40a);
    grid.position.y = 0;
    scene.add(grid);

    // Arrow group (rebuilt on each step change)
    const arrowGroup = new THREE.Group();
    scene.add(arrowGroup);

    // Animation clock
    const clock = new THREE.Clock();

    // Store refs
    refs.current = { scene, camera, renderer, arrowGroup, clock };

    // Resize handler
    const onResize = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    // Render loop
    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Pulse the closest arrow
      const group = refs.current.arrowGroup;
      const arrows = group.children.filter(c => c.isGroup);
      if (arrows.length > 0) {
        const pulse = 1 + 0.2 * Math.sin(t * 2.8);
        arrows[0].scale.setScalar(pulse * 1.6);
      }

      // Rotate destination beacon
      const beacon = refs.current.destBeacon;
      if (beacon) beacon.rotation.y = t * 1.2;

      renderer.render(scene, camera);
    };
    animate();

    refs.current.animId = animId;
    refs.current.cleanupFn = () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };

    return () => refs.current.cleanupFn?.();
  }, []); // eslint-disable-line

  // ── Rebuild arrows when step changes ──────────────────────
  useEffect(() => {
    const { scene, camera, arrowGroup } = refs.current;
    if (!scene || !arrowGroup) return;

    // Clear previous arrows + lights
    while (arrowGroup.children.length > 0) {
      const c = arrowGroup.children[0];
      arrowGroup.remove(c);
      if (c.isMesh) { c.geometry.dispose(); c.material?.dispose(); }
    }
    refs.current.destBeacon = null;

    const currentNode = nodeMap[pathIds[stepIndex]];
    const nextIdx     = Math.min(stepIndex + 1, pathIds.length - 1);
    const nextNode    = nodeMap[pathIds[nextIdx]];
    const destNode    = nodeMap[pathIds[pathIds.length - 1]];

    const { wx: cx, wz: cz } = fp2world(currentNode);
    const { wx: nx, wz: nz } = fp2world(nextNode);

    // Camera position (eye level at current waypoint)
    camera.position.set(cx, EYE_H, cz);

    // Direction toward next waypoint
    const dx = nx - cx, dz = nz - cz;
    const len = Math.sqrt(dx * dx + dz * dz) || 0.001;
    const ndx = dx / len, ndz = dz / len;

    // Y-rotation angle for arrow to face next waypoint
    // (atan2(dx, -dz) because Three.js Z is inverted from floor-plan Y)
    const angle = Math.atan2(ndx, -ndz);

    // Camera lookAt: look ahead in direction of travel, slightly downward
    camera.lookAt(
      cx + ndx * LOOK_DIST,
      EYE_H * (1 - LOOK_DOWN),
      cz + ndz * LOOK_DIST,
    );

    // ── Runway arrows ────────────────────────────────────────
    RUNWAY_DISTS.forEach((dist, i) => {
      const arrow = makeArrowMesh(
        ARROW_COLORS[i],
        ARROW_EMISS[i],
        ARROW_OPACITY[i],
        i === 0 ? 1.6 : 1,
      );
      arrow.position.set(cx + ndx * dist, 0.025, cz + ndz * dist);
      arrow.rotation.y = angle;
      arrowGroup.add(arrow);

      // Point light on nearest arrow
      if (i === 0) {
        const light = new THREE.PointLight(0x06b6d4, 1.5, 6);
        light.position.set(cx + ndx * dist, 0.6, cz + ndz * dist);
        arrowGroup.add(light);
      }
    });

    // ── Upcoming waypoint markers ───────────────────────────
    const futureCount = Math.min(6, pathIds.length - stepIndex - 1);
    for (let i = 1; i <= futureCount; i++) {
      const wNode = nodeMap[pathIds[stepIndex + i]];
      if (!wNode) continue;
      const { wx, wz } = fp2world(wNode);
      const isRoom = wNode.type === 'room';
      const isDest = stepIndex + i === pathIds.length - 1;

      const col = isDest ? 0xf43f5e : isRoom ? 0x10b981 : 0x06b6d4;
      const r   = isRoom ? 0.28 : 0.12;
      const geo = isRoom
        ? new THREE.CylinderGeometry(r, r, 0.05, 12)
        : new THREE.SphereGeometry(r, 8, 8);
      const mat = new THREE.MeshStandardMaterial({
        color: col, emissive: col, emissiveIntensity: isDest ? 1.0 : 0.6,
        transparent: true, opacity: isDest ? 0.85 : 0.55,
      });
      const marker = new THREE.Mesh(geo, mat);
      marker.position.set(wx, 0.025, wz);
      arrowGroup.add(marker);

      // Beam of light at destination
      if (isDest) {
        const beam = new THREE.PointLight(0xf43f5e, 2, 10);
        beam.position.set(wx, 1.5, wz);
        arrowGroup.add(beam);

        // Spinning beacon ring
        const ringGeo = new THREE.TorusGeometry(0.55, 0.05, 8, 24);
        const ringMat = new THREE.MeshStandardMaterial({
          color: 0xf43f5e, emissive: 0xf43f5e, emissiveIntensity: 0.9,
          transparent: true, opacity: 0.7,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.set(wx, 0.35, wz);
        ring.rotation.x = Math.PI / 2;
        arrowGroup.add(ring);
        refs.current.destBeacon = ring;
      }
    }

    refs.current.arrowAngle = angle;
  }, [stepIndex, pathIds, nodeMap]);

  // ── Apply device orientation to camera ───────────────────
  useEffect(() => {
    const { camera } = refs.current;
    if (!camera) return;
    if (orientation?.alpha === null || orientation?.alpha === undefined) return;

    const toRad = (deg) => (deg * Math.PI) / 180;
    const a = toRad(orientation.alpha ?? 0);
    const b = toRad(orientation.beta  ?? 0);
    const g = toRad(orientation.gamma ?? 0);

    // YXZ Euler order matches device orientation semantics
    camera.rotation.set(b, -a, -g, 'YXZ');
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
      }}
    />
  );
}
