// SolarPanel.js
import React from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

export function SolarPanel({ tiltAngleDegrees = 30 }) {
  const { scene } = useGLTF('/models/solar_panel_module_with_microinverter/scene.gltf');

  // Convert degrees to radians
  const tiltAngleRad = THREE.MathUtils.degToRad(tiltAngleDegrees+15);

  // Tilt the panel by tiltAngleDegrees around the X-axis
  return (
    <group rotation={[-tiltAngleRad, 1.5707963267948966, 1.5707963267948966]}>
      <primitive object={scene} dispose={null} />
    </group>
  );
}
