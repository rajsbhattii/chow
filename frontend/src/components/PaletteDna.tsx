import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { Group } from 'three'

type CuisineEntry = { name: string; color: string; pct: number }
type Vec3 = [number, number, number]

const HEIGHT = 15
const RADIUS = 2.8
const TURNS = 3
const RUNGS = 40
const BACKBONE_STEPS = 160

// Golden-ratio interleave: spreads each cuisine evenly across the strand
// instead of grouping them in blocks
const PHI = 1.6180339887
function rungColor(index: number, cuisines: CuisineEntry[]): string {
  const pos = (index * PHI) % 1
  let cum = 0
  for (const c of cuisines) {
    cum += c.pct / 100
    if (pos < cum) return c.color
  }
  return cuisines[cuisines.length - 1]?.color ?? '#888'
}

function helixPoint(t: number, phase: number): Vec3 {
  const y = (t - 0.5) * HEIGHT
  const angle = t * TURNS * Math.PI * 2 + phase
  return [Math.cos(angle) * RADIUS, y, Math.sin(angle) * RADIUS]
}

function Backbone({ points }: { points: Vec3[] }) {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)))
    return new THREE.TubeGeometry(curve, points.length, 0.1, 8, false)
  }, [points])
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#9ba3af" roughness={0.5} metalness={0.15} />
    </mesh>
  )
}

function Rung({ from, to, color }: { from: Vec3; to: Vec3; color: string }) {
  const { position, rotation, length } = useMemo(() => {
    const start = new THREE.Vector3(...from)
    const end = new THREE.Vector3(...to)
    const dir = new THREE.Vector3().subVectors(end, start)
    const len = dir.length()
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize(),
    )
    const euler = new THREE.Euler().setFromQuaternion(quat)
    return {
      position: [mid.x, mid.y, mid.z] as Vec3,
      rotation: [euler.x, euler.y, euler.z] as Vec3,
      length: len,
    }
  }, [from, to])
  return (
    <mesh position={position} rotation={rotation}>
      <cylinderGeometry args={[0.08, 0.08, length, 16]} />
      <meshStandardMaterial color={color} roughness={0.2} metalness={0.2} />
    </mesh>
  )
}

function Node({ position, color }: { position: Vec3; color: string }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.28, 16, 16]} />
      <meshStandardMaterial color={color} roughness={0.2} metalness={0.25} />
    </mesh>
  )
}

function Helix({ cuisines }: { cuisines: CuisineEntry[] }) {
  const group = useRef<Group>(null)
  useFrame((_, delta) => { if (group.current) group.current.rotation.y += delta * 0.2 })

  const { backboneA, backboneB, rungs } = useMemo(() => {
    const a: Vec3[] = [], b: Vec3[] = []
    for (let i = 0; i <= BACKBONE_STEPS; i++) {
      const t = i / BACKBONE_STEPS
      a.push(helixPoint(t, 0))
      b.push(helixPoint(t, Math.PI))
    }
    const r = Array.from({ length: RUNGS }, (_, i) => {
      const t = i / (RUNGS - 1)
      return { p1: helixPoint(t, 0), p2: helixPoint(t, Math.PI), color: rungColor(i, cuisines) }
    })
    return { backboneA: a, backboneB: b, rungs: r }
  }, [cuisines])

  return (
    <group ref={group}>
      <Backbone points={backboneA} />
      <Backbone points={backboneB} />
      {rungs.map((r, i) => (
        <group key={i}>
          <Rung from={r.p1} to={r.p2} color={r.color} />
          <Node position={r.p1} color={r.color} />
          <Node position={r.p2} color={r.color} />
        </group>
      ))}
    </group>
  )
}

export default function PaletteDna({ cuisines }: { cuisines: CuisineEntry[] }) {
  return (
    <div style={{ display: 'flex', gap: 0 }}>
      {/* DNA canvas — 70% */}
      <div style={{
        width: '70%', height: 360, borderRadius: 12, overflow: 'hidden', flexShrink: 0,
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)',
        maskImage: 'linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)',
      }}>
        <Canvas
          camera={{ position: [0, 0, 6.5], fov: 60 }}
          dpr={[1, 2]}
          gl={{ alpha: true, antialias: true }}
        >
          <ambientLight intensity={1.3} />
          <directionalLight position={[5, 8, 5]} intensity={1.5} />
          <directionalLight position={[-6, -4, -3]} intensity={0.6} />
          <pointLight position={[0, 0, 6]} intensity={0.8} />
          <Helix cuisines={cuisines} />
          <OrbitControls enablePan={false} minDistance={4} maxDistance={14} />
        </Canvas>
      </div>

      {/* Legend — 30% */}
      <div style={{
        width: '30%', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', gap: 0, paddingLeft: 28,
      }}>
        {cuisines.map((c, i) => (
          <div key={c.name} style={{
            display: 'flex', flexDirection: 'column', gap: 6,
            padding: '10px 0',
            borderBottom: i < cuisines.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{c.name}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-4)' }}>{c.pct}%</span>
            </div>
            <div style={{ height: 4, borderRadius: 99, background: 'var(--surface-2)' }}>
              <div style={{ height: '100%', width: `${c.pct}%`, borderRadius: 99, background: c.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
