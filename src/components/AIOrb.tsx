'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;
  uniform float uTime;
  uniform float uActivity;

  //	Simplex 3D Noise
  vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
  float snoise(vec3 v){
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod(i, 289.0);
    vec4 p = permute( permute( permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    float n_ = 1.0/7.0;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
  }

  void main() {
    vUv = uv;
    vNormal = normal;
    vec3 pos = position;

    float noise = snoise(pos * 2.0 + uTime * 0.3) * 0.15 * (1.0 + uActivity * 0.5);
    float noise2 = snoise(pos * 4.0 - uTime * 0.2) * 0.08 * (1.0 + uActivity * 0.3);

    pos += normal * (noise + noise2);
    vPosition = pos;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;
  uniform float uTime;
  uniform float uActivity;
  uniform vec3 uColor1;
  uniform vec3 uColor2;

  void main() {
    float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.5);

    vec3 color = mix(uColor1, uColor2, fresnel + sin(uTime * 0.5) * 0.2);

    float pulse = 0.6 + 0.4 * sin(uTime * 1.5 + vPosition.y * 3.0);
    float alpha = (0.3 + fresnel * 0.7) * pulse * (0.8 + uActivity * 0.2);

    // Inner glow
    float innerGlow = 0.15 * (1.0 + 0.3 * sin(uTime * 2.0));
    color += uColor1 * innerGlow;

    gl_FragColor = vec4(color, alpha);
  }
`;

function OrbMesh({ activity }: { activity: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uActivity: { value: 0 },
      uColor1: { value: new THREE.Color('#4AAFD5') },
      uColor2: { value: new THREE.Color('#6DB33F') },
    }),
    [],
  );

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    uniforms.uTime.value = t;
    uniforms.uActivity.value = THREE.MathUtils.lerp(
      uniforms.uActivity.value,
      activity,
      0.05,
    );

    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.15;
      meshRef.current.rotation.x = Math.sin(t * 0.1) * 0.1;
    }

    if (glowRef.current) {
      const scale = 1.3 + Math.sin(t * 1.5) * 0.05 + activity * 0.1;
      glowRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group>
      {/* Outer glow sphere */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color="#4AAFD5"
          transparent
          opacity={0.04}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Main orb */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 64, 64]} />
        <shaderMaterial
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Wireframe ring 1 */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.4, 0.005, 16, 100]} />
        <meshBasicMaterial color="#4AAFD5" transparent opacity={0.2} />
      </mesh>

      {/* Wireframe ring 2 */}
      <mesh rotation={[Math.PI / 3, Math.PI / 4, 0]}>
        <torusGeometry args={[1.6, 0.003, 16, 100]} />
        <meshBasicMaterial color="#6DB33F" transparent opacity={0.12} />
      </mesh>

      {/* Wireframe ring 3 */}
      <mesh rotation={[Math.PI / 6, -Math.PI / 3, Math.PI / 5]}>
        <torusGeometry args={[1.5, 0.004, 16, 100]} />
        <meshBasicMaterial color="#4AAFD5" transparent opacity={0.08} />
      </mesh>
    </group>
  );
}

interface AIOrbProps {
  activity?: number; // 0 = idle, 1 = active/speaking
  size?: string;
}

export default function AIOrb({ activity = 0, size = '280px' }: AIOrbProps) {
  return (
    <div
      style={{ width: size, height: size }}
      className="relative mx-auto"
    >
      {/* Ambient glow behind the orb */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, rgba(74,175,213,${0.12 + activity * 0.08}) 0%, transparent 70%)`,
          filter: 'blur(30px)',
          transform: 'scale(1.5)',
        }}
      />
      <Canvas
        camera={{ position: [0, 0, 3.5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.2} />
        <pointLight position={[5, 5, 5]} intensity={0.5} color="#4AAFD5" />
        <pointLight position={[-5, -5, 5]} intensity={0.3} color="#6DB33F" />
        <OrbMesh activity={activity} />
      </Canvas>
    </div>
  );
}
