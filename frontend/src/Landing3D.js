import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useNavigate } from "react-router-dom";
import { Stars, useTexture } from "@react-three/drei";
import { useRef, useState, useEffect, useMemo } from "react";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import "./Landing3D.css";

/*
  CAMERA STRATEGY — everything lives much closer to camera:
  - Sun at z=-30 (fills ~30% of screen width)
  - Planets orbit at radii 8–28 (not 18–120)
  - Camera stays between z=6–18, never pulls past z=22
  - FOV = 75° wide — feels immersive, fills screen edge-to-edge
  - Warp: camera rushes FORWARD (z goes from 30 → 6), stars stretch
  - Reveal: gentle sideways drift, planets loom large
*/

/* ── SUN ─────────────────────────────────────────────────────────────────── */
function Sun() {
  const texture = useTexture("/textures/sun.jpg");
  const coreRef  = useRef();
  const c1Ref    = useRef();
  const c2Ref    = useRef();

  useFrame(({ clock }) => {
    if (coreRef.current) coreRef.current.rotation.y += 0.004;
    const t = clock.getElapsedTime();
    if (c1Ref.current) c1Ref.current.scale.setScalar(1 + Math.sin(t * 1.3) * 0.03);
    if (c2Ref.current) c2Ref.current.scale.setScalar(1 + Math.sin(t * 0.7 + 1) * 0.05);
  });

  return (
    <group position={[4, -1, -30]}>
      <mesh ref={coreRef}>
        <sphereGeometry args={[7, 64, 64]} />
        <meshBasicMaterial map={texture} />
      </mesh>
      <mesh ref={c1Ref}>
        <sphereGeometry args={[8.2, 32, 32]} />
        <meshBasicMaterial color="#ff7700" transparent opacity={0.09} side={THREE.BackSide} />
      </mesh>
      <mesh ref={c2Ref}>
        <sphereGeometry args={[10.5, 32, 32]} />
        <meshBasicMaterial color="#ff4400" transparent opacity={0.04} side={THREE.BackSide} />
      </mesh>
      <mesh>
        <sphereGeometry args={[14, 32, 32]} />
        <meshBasicMaterial color="#ff2200" transparent opacity={0.015} side={THREE.BackSide} />
      </mesh>
      <pointLight intensity={18} color="#fff8cc" distance={300} decay={1.0} />
    </group>
  );
}

/* ── EARTH ───────────────────────────────────────────────────────────────── */
function Earth({ orbitR, speed, startA }) {
  const grpRef  = useRef();
  const bodyRef = useRef();
  const texture = useTexture("/textures/earth.jpg");
  const angle   = useRef(startA);

  useFrame((_, delta) => {
    angle.current += speed * delta;
    const a = angle.current;
    if (grpRef.current) {
      grpRef.current.position.set(
        4 + Math.cos(a) * orbitR,
        Math.sin(a * 0.4) * 0.6,
        -30 + Math.sin(a) * orbitR
      );
    }
    if (bodyRef.current) bodyRef.current.rotation.y += delta * 0.25;
  });

  return (
    <group ref={grpRef}>
      <mesh ref={bodyRef}>
        <sphereGeometry args={[1.4, 80, 80]} />
        <meshStandardMaterial map={texture} roughness={0.55} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.5, 48, 48]} />
        <meshStandardMaterial color="#4488ff" transparent opacity={0.1} side={THREE.BackSide} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.65, 32, 32]} />
        <meshStandardMaterial color="#1133cc" transparent opacity={0.04} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

/* ── GENERIC PLANET ──────────────────────────────────────────────────────── */
function Planet({ texUrl, size, orbitR, speed, startA = 0, selfSpin = 0.18 }) {
  const ref     = useRef();
  const texture = useTexture(texUrl);
  const angle   = useRef(startA);

  useFrame((_, delta) => {
    angle.current += speed * delta;
    const a = angle.current;
    ref.current.position.set(
      4 + Math.cos(a) * orbitR,
      Math.sin(a * 0.3) * 0.5,
      -30 + Math.sin(a) * orbitR
    );
    ref.current.rotation.y += delta * selfSpin;
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[size, 56, 56]} />
      <meshStandardMaterial map={texture} roughness={0.75} />
    </mesh>
  );
}

/* ── JUPITER ─────────────────────────────────────────────────────────────── */
function Jupiter({ orbitR, speed, startA }) {
  const ref     = useRef();
  const texture = useTexture("/textures/jupiter.jpg");
  const angle   = useRef(startA);

  useFrame((_, delta) => {
    angle.current += speed * delta;
    const a = angle.current;
    ref.current.position.set(
      4 + Math.cos(a) * orbitR,
      Math.sin(a * 0.2) * 0.8,
      -30 + Math.sin(a) * orbitR
    );
    ref.current.rotation.y += delta * 0.28;
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[2.8, 64, 64]} />
      <meshStandardMaterial map={texture} roughness={0.6} />
    </mesh>
  );
}

/* ── SATURN ──────────────────────────────────────────────────────────────── */
function Saturn({ orbitR, speed, startA }) {
  const grpRef  = useRef();
  const bodyRef = useRef();
  const bodyTex = useTexture("/textures/saturn.jpg");
  const ringTex = useTexture("/textures/saturn_ring.png");
  const angle   = useRef(startA);

  useFrame((_, delta) => {
    angle.current += speed * delta;
    const a = angle.current;
    if (grpRef.current) {
      grpRef.current.position.set(
        4 + Math.cos(a) * orbitR,
        Math.sin(a * 0.15) * 0.6,
        -30 + Math.sin(a) * orbitR
      );
      grpRef.current.rotation.y += delta * 0.09;
    }
    if (bodyRef.current) bodyRef.current.rotation.y += delta * 0.1;
  });

  return (
    <group ref={grpRef}>
      <mesh ref={bodyRef}>
        <sphereGeometry args={[2.0, 64, 64]} />
        <meshStandardMaterial map={bodyTex} roughness={0.7} />
      </mesh>
      <mesh rotation={[Math.PI / 2 + 0.45, 0, 0.12]}>
        <ringGeometry args={[2.8, 4.8, 96]} />
        <meshBasicMaterial map={ringTex} transparent side={THREE.DoubleSide} opacity={0.9} />
      </mesh>
    </group>
  );
}

/* ── ASTEROID BELT ───────────────────────────────────────────────────────── */
function AsteroidBelt({ innerR, outerR, count = 400 }) {
  const ref   = useRef();
  const rocks = useMemo(() => Array.from({ length: count }, () => {
    const a = Math.random() * Math.PI * 2;
    const r = innerR + Math.random() * (outerR - innerR);
    return {
      angle: a, r,
      y:     (Math.random() - 0.5) * 1.5,
      size:  0.025 + Math.random() * 0.1,
      speed: 0.08 + Math.random() * 0.12,
    };
  }), [innerR, outerR, count]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.children.forEach((m, i) => {
      rocks[i].angle += rocks[i].speed * delta * 0.4;
      m.position.x = 4 + Math.cos(rocks[i].angle) * rocks[i].r;
      m.position.z = -30 + Math.sin(rocks[i].angle) * rocks[i].r;
      m.rotation.x += delta * 0.6;
      m.rotation.z += delta * 0.4;
    });
  });

  return (
    <group ref={ref}>
      {rocks.map((r, i) => (
        <mesh key={i}
          position={[4 + Math.cos(r.angle) * r.r, r.y, -30 + Math.sin(r.angle) * r.r]}
        >
          <dodecahedronGeometry args={[r.size, 0]} />
          <meshStandardMaterial color="#8a7a68" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

/* ── ORBIT RINGS ─────────────────────────────────────────────────────────── */
function OrbitLine({ r, opacity = 0.05 }) {
  const pts = useMemo(() => {
    const a = [];
    for (let i = 0; i <= 128; i++) {
      const ang = (i / 128) * Math.PI * 2;
      a.push(4 + Math.cos(ang) * r, 0, -30 + Math.sin(ang) * r);
    }
    return new Float32Array(a);
  }, [r]);

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={pts}
          count={pts.length / 3}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#88bbff" transparent opacity={opacity} />
    </line>
  );
}

/* ── COMET ───────────────────────────────────────────────────────────────── */
function Comet() {
  const ref   = useRef();
  const state = useRef({ x: -35, y: 10, z: -10 });

  useFrame((_, delta) => {
    if (!ref.current) return;
    state.current.x += 0.7 * delta * 30;
    state.current.y -= 0.15 * delta * 30;
    state.current.z -= 0.3 * delta * 30;
    if (state.current.x > 40) state.current = { x: -35, y: 10, z: -10 };
    ref.current.position.set(state.current.x, state.current.y, state.current.z);
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.14, 8, 8]} />
      <meshBasicMaterial color="#cceeff" />
    </mesh>
  );
}

/* ── WARP STAR STREAKS ───────────────────────────────────────────────────── */
function WarpStreaks({ active }) {
  const ref   = useRef();
  const COUNT = 200;

  const streaks = useMemo(() => Array.from({ length: COUNT }, () => ({
    x:     (Math.random() - 0.5) * 30,
    y:     (Math.random() - 0.5) * 20,
    z:     -Math.random() * 80 - 5,
    speed: 12 + Math.random() * 28,
  })), []);

  const posArr = useMemo(() => new Float32Array(COUNT * 6), []);

  useFrame((_, delta) => {
    if (!active || !ref.current) return;
    for (let i = 0; i < COUNT; i++) {
      streaks[i].z += streaks[i].speed * delta * 6;
      if (streaks[i].z > 8) {
        streaks[i].z    = -80 - Math.random() * 20;
        streaks[i].x    = (Math.random() - 0.5) * 30;
        streaks[i].y    = (Math.random() - 0.5) * 20;
        streaks[i].speed = 12 + Math.random() * 28;
      }
      const z      = streaks[i].z;
      const tail   = streaks[i].speed * 0.08;
      const base   = i * 6;
      posArr[base]   = streaks[i].x; posArr[base+1] = streaks[i].y; posArr[base+2] = z;
      posArr[base+3] = streaks[i].x; posArr[base+4] = streaks[i].y; posArr[base+5] = z + tail;
    }
    const attr = ref.current.geometry.attributes.position;
    attr.array.set(posArr);
    attr.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <lineSegments ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={posArr}
          count={COUNT * 2}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#00ffcc" transparent opacity={0.55} />
    </lineSegments>
  );
}

/* ── CAMERA SEQUENCE ─────────────────────────────────────────────────────── */
function CinematicCamera({ phase }) {
  const { camera } = useThree();
  const tick       = useRef(0);

  useFrame((_, delta) => {
    tick.current += delta;
    const t = tick.current;

    if (phase === 0) {
      /* WARP — wide FOV, heavy shake, rushing forward */
      camera.fov = THREE.MathUtils.lerp(camera.fov, 110, delta * 4);
      camera.updateProjectionMatrix();
      camera.position.x = Math.sin(t * 43) * 0.14;
      camera.position.y = Math.sin(t * 37) * 0.10;
      camera.position.z = 28 - t * 9;             // rushes from 28 → ~1 in 3s
      if (camera.position.z < 6) camera.position.z = 6;
      camera.lookAt(4, 0, -30);
    }

    if (phase === 1) {
      /* SNAP — fov crash, camera jolts sideways */
      camera.fov = THREE.MathUtils.lerp(camera.fov, 72, delta * 6);
      camera.updateProjectionMatrix();
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, -3, delta * 4);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y,  2, delta * 4);
      camera.position.z = THREE.MathUtils.lerp(camera.position.z,  8, delta * 5);
      camera.lookAt(4, 0, -30);
    }

    if (phase === 2) {
      /* REVEAL — camera glides sideways, slight upward drift */
      camera.fov = THREE.MathUtils.lerp(camera.fov, 72, delta * 1.5);
      camera.updateProjectionMatrix();
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, -6, delta * 0.7);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y,  3, delta * 0.7);
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, 10, delta * 1.2);
      camera.lookAt(2, -1, -30);
    }

    if (phase === 3) {
      /* ORBIT — slow cinematic sweep, stays close */
      camera.fov = THREE.MathUtils.lerp(camera.fov, 70, delta * 0.5);
      camera.updateProjectionMatrix();
      const tx = Math.sin(t * 0.11) * 8;
      const ty = 2 + Math.sin(t * 0.07) * 2;
      const tz = 10 + Math.sin(t * 0.09) * 2.5;
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, tx, delta * 0.4);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, ty, delta * 0.35);
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, tz, delta * 0.35);
      camera.lookAt(1, -0.5, -30);
    }
  });

  return null;
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN
   ══════════════════════════════════════════════════════════════════════════ */
export default function Landing3D() {
  const navigate     = useNavigate();
  const [phase, setPhase]       = useState(0);
  const [showUI, setShowUI]     = useState(false);
  const [warpDone, setWarpDone] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1),                       2600);
    const t2 = setTimeout(() => { setPhase(2); setWarpDone(true); }, 4200);
    const t3 = setTimeout(() => setPhase(3),                       6400);
    const t4 = setTimeout(() => setShowUI(true),                   6900);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      className="container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Warp colour wash */}
      <AnimatePresence>
        {!warpDone && (
          <motion.div className="warp-overlay"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>

      {/* Deceleration flash */}
      <AnimatePresence>
        {phase === 1 && (
          <motion.div className="decel-flash"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          />
        )}
      </AnimatePresence>

      {/* Letterbox bars — hide once UI is visible */}
      <div className={`letterbox-top ${showUI ? "letterbox-hide" : ""}`} />
      <div className={`letterbox-bot ${showUI ? "letterbox-hide" : ""}`} />

      {/* Phase HUD label */}
      <AnimatePresence>
        {!showUI && (
          <motion.div className="phase-label"
            key={phase}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.4 }}
          >
            {phase === 0 && "INITIATING WARP SEQUENCE  ◈  ECOSORT AI"}
            {phase === 1 && "DROPPING OUT OF HYPERSPACE"}
            {phase === 2 && "SCANNING SOLAR SYSTEM  ◈  TARGET ACQUIRED"}
          </motion.div>
        )}
      </AnimatePresence>

      {/* CRT lines during warp */}
      {phase <= 1 && <div className="warp-scanlines" />}

      {/* ── 3D Canvas ── */}
      <Canvas
        camera={{ position: [0, 0, 28], fov: 75 }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        style={{ background: "#000005", width: "100%", height: "100%" }}
      >
        {/* Rich star field — CLOSE radius so stars fill screen */}
        <Stars radius={80}  depth={30} count={8000}  factor={5}   saturation={0.1}  fade speed={phase === 0 ? 4 : 0.3} />
        <Stars radius={200} depth={60} count={14000} factor={7}   saturation={0.05} fade speed={0.1} />

        {/* Warp streaks */}
        <WarpStreaks active={phase === 0} />

        {/* Solar system — all close-in */}
        <Sun />

        {/* Mercury-like */}
        <Planet texUrl="/textures/mars.jpg"    size={0.45} orbitR={5}  speed={0.65} startA={1.2} />
        {/* Venus-like */}
        <Planet texUrl="/textures/mars.jpg"    size={0.75} orbitR={8}  speed={0.42} startA={2.8} />
        {/* Earth */}
        <Earth  orbitR={11} speed={0.30} startA={0.5} />
        {/* Mars */}
        <Planet texUrl="/textures/mars.jpg"    size={0.55} orbitR={14} speed={0.22} startA={4.1} />
        {/* Asteroid belt */}
        <AsteroidBelt innerR={16} outerR={19} count={380} />
        {/* Jupiter */}
        <Jupiter orbitR={22} speed={0.13} startA={1.0} />
        {/* Saturn */}
        <Saturn  orbitR={28} speed={0.08} startA={3.3} />

        {/* Orbit rings */}
        {[5, 8, 11, 14, 22, 28].map(r => (
          <OrbitLine key={r} r={r} opacity={r === 11 ? 0.08 : 0.04} />
        ))}

        {/* Comet */}
        <Comet />

        {/* Lighting */}
        <ambientLight intensity={0.15} color="#112233" />

        {/* Camera */}
        <CinematicCamera phase={phase} />
      </Canvas>

      {/* Vignette overlay */}
      <div className="fade" />

      {/* ── Main UI ── */}
      <AnimatePresence>
        {showUI && (
          <motion.div className="overlay ready"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div className="overlay-eyebrow"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.9 }}
            >
              <div className="eyebrow-line" />
              <span className="eyebrow-text">AI Waste Intelligence · India</span>
              <div className="eyebrow-line" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20, scale: 0.93 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.45, duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            >
              ECO<span className="title-accent">SORT</span>
              <br />AI
            </motion.h1>

            <motion.p className="overlay-tagline"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.85, duration: 0.9 }}
            >
              Scan · Sort · Save the planet — one piece at a time
            </motion.p>

            <motion.button className="enter-btn"
              onClick={() => navigate("/scan")}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1, duration: 0.8 }}
              whileHover={{ scale: 1.05, y: -3 }}
              whileTap={{ scale: 0.97 }}
            >
              Enter System <span className="btn-arrow">→</span>
            </motion.button>

            <motion.div className="overlay-stats"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.45, duration: 0.8 }}
            >
              <div className="overlay-stat">
                <span className="overlay-stat-num">YOLOv8</span>
                <span className="overlay-stat-label">Detection</span>
              </div>
              <div className="overlay-stat-sep" />
              <div className="overlay-stat">
                <span className="overlay-stat-num">3</span>
                <span className="overlay-stat-label">Bin Types</span>
              </div>
              <div className="overlay-stat-sep" />
              <div className="overlay-stat">
                <span className="overlay-stat-num">Real-time</span>
                <span className="overlay-stat-label">AI Model</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}