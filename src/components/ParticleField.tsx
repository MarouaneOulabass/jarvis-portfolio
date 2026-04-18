'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, ChromaticAberration, Vignette, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';

interface ParticleFieldProps {
  activity?: number;
}

function StarField({ activity }: { activity: number }) {
  const pointsRef = useRef<THREE.Points>(null);

  const COUNT = 1400;
  const geometry = useMemo(() => {
    const p = new Float32Array(COUNT * 3);
    const s = new Float32Array(COUNT);
    const sd = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      const r = 4 + Math.random() * 26;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * 0.9;
      p[i * 3] = Math.cos(theta) * r;
      p[i * 3 + 1] = Math.sin(phi) * r * 0.6;
      p[i * 3 + 2] = Math.sin(theta) * r - 8;
      s[i] = Math.random() * 0.6 + 0.15;
      sd[i] = Math.random() * Math.PI * 2;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(s, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(sd, 1));
    return g;
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uActivity: { value: 0 },
      uPixelRatio: {
        value: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1,
      },
    }),
    [],
  );

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    uniforms.uTime.value = t;
    uniforms.uActivity.value = THREE.MathUtils.lerp(
      uniforms.uActivity.value,
      activity,
      0.04,
    );
    if (pointsRef.current) {
      pointsRef.current.rotation.y = t * 0.02;
      pointsRef.current.rotation.x =
        state.pointer.y * 0.08 + Math.sin(t * 0.15) * 0.02;
      pointsRef.current.rotation.z = state.pointer.x * 0.04;
    }
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={`
          attribute float aSize;
          attribute float aSeed;
          uniform float uTime;
          uniform float uActivity;
          uniform float uPixelRatio;
          varying float vAlpha;
          varying float vSeed;
          void main() {
            vec3 pos = position;
            float wave = sin(uTime * 0.8 + aSeed * 6.28) * 0.15;
            pos.y += wave * (0.5 + uActivity);
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * mvPosition;

            float scale = aSize * (1.0 + uActivity * 0.8);
            gl_PointSize = scale * (320.0 / -mvPosition.z) * uPixelRatio;
            vAlpha = 0.35 + 0.65 * sin(uTime * 0.7 + aSeed * 3.14);
            vSeed = aSeed;
          }
        `}
        fragmentShader={`
          uniform float uActivity;
          varying float vAlpha;
          varying float vSeed;
          void main() {
            vec2 uv = gl_PointCoord - 0.5;
            float d = length(uv);
            if (d > 0.5) discard;
            float glow = pow(1.0 - d * 2.0, 2.5);
            vec3 blue = vec3(0.29, 0.69, 0.84);
            vec3 green = vec3(0.43, 0.70, 0.25);
            vec3 col = mix(blue, green, smoothstep(0.0, 1.0, vSeed / 6.28));
            gl_FragColor = vec4(col, glow * vAlpha * (0.6 + uActivity * 0.5));
          }
        `}
      />
    </points>
  );
}

function GridFloor({ activity }: { activity: number }) {
  const ref = useRef<THREE.LineSegments>(null);
  const mat = useRef<THREE.LineBasicMaterial>(null);
  const geo = useMemo(() => {
    const size = 60;
    const divisions = 30;
    const step = size / divisions;
    const verts: number[] = [];
    const half = size / 2;
    for (let i = 0; i <= divisions; i++) {
      const p = -half + i * step;
      verts.push(-half, 0, p, half, 0, p);
      verts.push(p, 0, -half, p, 0, half);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    return g;
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (ref.current) {
      ref.current.position.z = (t * 0.8) % 2 - 1;
      ref.current.rotation.x = -Math.PI / 2.05;
    }
    if (mat.current) {
      mat.current.opacity = 0.08 + activity * 0.06 + Math.sin(t * 1.2) * 0.02;
    }
  });

  return (
    <lineSegments ref={ref} geometry={geo} position={[0, -4, -5]}>
      <lineBasicMaterial
        ref={mat}
        color="#4AAFD5"
        transparent
        opacity={0.1}
        depthWrite={false}
      />
    </lineSegments>
  );
}

function EnergyRing({ activity }: { activity: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (ref.current) {
      ref.current.rotation.z = t * 0.1;
      ref.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.3) * 0.1;
      const scale = 1 + activity * 0.3 + Math.sin(t * 0.5) * 0.05;
      ref.current.scale.setScalar(scale);
    }
  });
  return (
    <mesh ref={ref} position={[0, 0, -6]}>
      <ringGeometry args={[8, 8.05, 128]} />
      <meshBasicMaterial color="#4AAFD5" transparent opacity={0.15} side={THREE.DoubleSide} />
    </mesh>
  );
}

export default function ParticleField({ activity = 0 }: ParticleFieldProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="particle-field pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ background: 'transparent' }}
      >
        <StarField activity={activity} />
        <GridFloor activity={activity} />
        <EnergyRing activity={activity} />
        <EffectComposer multisampling={0}>
          <Bloom
            intensity={0.9 + activity * 0.4}
            luminanceThreshold={0.12}
            luminanceSmoothing={0.9}
            mipmapBlur
            radius={0.85}
          />
          <ChromaticAberration
            blendFunction={BlendFunction.NORMAL}
            offset={new THREE.Vector2(0.0008, 0.0012)}
            radialModulation={false}
            modulationOffset={0}
          />
          <Noise
            premultiply
            blendFunction={BlendFunction.ADD}
            opacity={0.06}
          />
          <Vignette eskil={false} offset={0.1} darkness={0.85} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
