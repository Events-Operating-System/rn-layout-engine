// Vista 3D (bloque 9, primer paso). Three.js SOLO acá: este archivo se carga
// aparte, al abrir la ruta /3d (ver App.tsx), y nunca desde el editor.
// Formas simples generadas en código con las medidas reales; sillas, mesas,
// cajas y tramos de muro instanciados (una malla por tipo, sin importar
// cuántas piezas haya). Sin modelos descargados.
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { Item3D } from '@/lib/scene3d'
import { itemsBounds } from '@/lib/scene3d'

export interface Background3D {
  url: string
  x: number
  y: number
  width: number
  height: number
  opacity: number
}

export interface Stats3D {
  fps: number
  drawCalls: number
  triangles: number
  buildMs: number
}

export interface Viewer3DApi {
  overview: () => void
  person: () => void
}

interface Props {
  items: Item3D[]
  background?: Background3D | null
  onStats?: (s: Stats3D) => void
  onReady?: (api: Viewer3DApi) => void
  // Giro automático (para medir cuadros por segundo).
  autoRotate?: boolean
}

const UP = new THREE.Vector3(0, 1, 0)

export default function Viewer3D({ items, background, onStats, onReady, autoRotate = false }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef(onStats)
  statsRef.current = onStats
  const readyRef = useRef(onReady)
  readyRef.current = onReady

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const t0 = performance.now()
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(host.clientWidth, host.clientHeight)
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    // Escena clara (pedido de Javier): cielo gris azulado, luz de ambiente
    // pareja y un sol suave; el piso claro con la grilla bien visible.
    scene.background = new THREE.Color(0xdde5ee)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb8c2cf, 2.2))
    scene.add(new THREE.AmbientLight(0xffffff, 0.5))
    const sun = new THREE.DirectionalLight(0xffffff, 1.6)
    scene.add(sun)

    const b = itemsBounds(items) ?? { minX: -10, minZ: -10, maxX: 10, maxZ: 10 }
    const cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2
    const span = Math.max(10, b.maxX - b.minX, b.maxZ - b.minZ)
    sun.position.set(cx + span * 0.4, span * 1.2, cz + span * 0.3)

    const disposables: { dispose: () => void }[] = []
    const keep = <T extends { dispose: () => void }>(x: T) => { disposables.push(x); return x }

    // Piso y grilla de 1 m (5 m si el plano es grande).
    const floor = new THREE.Mesh(keep(new THREE.PlaneGeometry(span * 1.6, span * 1.6)), keep(new THREE.MeshStandardMaterial({ color: 0xeef1f5, roughness: 1 })))
    floor.rotation.x = -Math.PI / 2
    floor.position.set(cx, -0.01, cz)
    scene.add(floor)
    const step = span > 120 ? 5 : 1
    const divisions = Math.min(400, Math.ceil((span * 1.6) / step))
    const grid = new THREE.GridHelper(divisions * step, divisions, 0x8a97a8, 0xc5cdd8)
    grid.position.set(cx, 0.002, cz)
    scene.add(grid)
    disposables.push(grid.geometry, grid.material as THREE.Material)

    // Plano del local en el piso.
    if (background) {
      const tex = keep(new THREE.TextureLoader().load(background.url))
      tex.colorSpace = THREE.SRGBColorSpace
      const plane = new THREE.Mesh(
        keep(new THREE.PlaneGeometry(background.width, background.height)),
        keep(new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: Math.max(0.35, background.opacity) })),
      )
      plane.rotation.x = -Math.PI / 2
      plane.position.set(background.x + background.width / 2, 0.004, background.y + background.height / 2)
      scene.add(plane)
    }

    const mat = keep(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 }))
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color()

    // Mallas instanciadas por tipo.
    const solid = items.filter(i => !i.translucent)
    const boxes = solid.filter(i => i.kind === 'box')
    const tables = items.filter(i => i.kind === 'table')
    const cyls = solid.filter(i => i.kind === 'cylinder')
    const chairs = items.filter(i => i.kind === 'chair')
    const trees = items.filter(i => i.kind === 'tree')
    const walls = items.filter(i => i.kind === 'wall')

    const inst = (geo: THREE.BufferGeometry, n: number) => {
      const m = new THREE.InstancedMesh(keep(geo), mat, Math.max(1, n))
      m.count = n
      if (n) scene.add(m)
      return m
    }
    const place = (mesh: THREE.InstancedMesh, i: number, x: number, y: number, z: number, rotY: number, sx: number, sy: number, sz: number, color: string) => {
      q.setFromAxisAngle(UP, rotY)
      m4.compose(p.set(x, y, z), q, s.set(sx, sy, sz))
      mesh.setMatrixAt(i, m4)
      mesh.setColorAt(i, col.set(color))
    }

    const boxMesh = inst(new THREE.BoxGeometry(1, 1, 1), boxes.length)
    boxes.forEach((it, i) => place(boxMesh, i, it.cx, it.height / 2, it.cz, it.rotY, it.width, it.height, it.depth, it.color))

    // Mesas del color del MANTEL. Mantel largo: hasta el piso. Corto: el
    // mantel cubre los últimos 25 cm y abajo se ve el pie.
    const longT = tables.filter(it => !it.shortCloth)
    const shortT = tables.filter(it => it.shortCloth)
    const tableMesh = inst(new THREE.CylinderGeometry(0.5, 0.5, 1, 32), longT.length)
    longT.forEach((it, i) => place(tableMesh, i, it.cx, it.height / 2, it.cz, it.rotY, it.width, it.height, it.depth, it.color))
    const clothMesh = inst(new THREE.CylinderGeometry(0.5, 0.5, 1, 32), shortT.length)
    const legMesh = inst(new THREE.CylinderGeometry(0.5, 0.5, 1, 12), shortT.length)
    shortT.forEach((it, i) => {
      const skirt = Math.min(0.25, it.height)
      place(clothMesh, i, it.cx, it.height - skirt / 2, it.cz, it.rotY, it.width, skirt, it.depth, it.color)
      place(legMesh, i, it.cx, (it.height - skirt) / 2, it.cz, 0, 0.12, it.height - skirt, 0.12, '#6b7280')
    })

    const cylMesh = inst(new THREE.CylinderGeometry(0.5, 0.5, 1, 32), cyls.length)
    cyls.forEach((it, i) => place(cylMesh, i, it.cx, it.height / 2, it.cz, it.rotY, it.width, it.height, it.depth, it.color))

    // Silla: asiento (0–0,45 m) y respaldo del lado de afuera de la mesa
    // (borde local y = 0 del 2D → z local negativo).
    const seatMesh = inst(new THREE.BoxGeometry(1, 1, 1), chairs.length)
    const backMesh = inst(new THREE.BoxGeometry(1, 1, 1), chairs.length)
    chairs.forEach((it, i) => {
      const seat = Math.min(0.45, it.height / 2)
      const back = Math.max(0.02, it.height - seat)
      place(seatMesh, i, it.cx, seat / 2, it.cz, it.rotY, it.width, seat, it.depth, it.color)
      const off = new THREE.Vector3(0, 0, -it.depth / 2 + 0.04).applyAxisAngle(UP, it.rotY)
      place(backMesh, i, it.cx + off.x, seat + back / 2, it.cz + off.z, it.rotY, it.width, back, 0.08, it.color)
    })

    const trunkMesh = inst(new THREE.CylinderGeometry(0.12, 0.16, 1, 10), trees.length)
    const crownMesh = inst(new THREE.SphereGeometry(0.5, 16, 12), trees.length)
    trees.forEach((it, i) => {
      place(trunkMesh, i, it.cx, 0.8, it.cz, 0, 1, 1.6, 1, '#78350f')
      place(crownMesh, i, it.cx, 2.6, it.cz, it.rotY, it.width, 2.6, it.depth, it.color || '#16a34a')
    })

    // Tramos de muro y curvas abiertas: una caja por tramo, todas en una malla.
    const segs: { x1: number; z1: number; x2: number; z2: number; it: Item3D }[] = []
    for (const it of walls) {
      const o = it.outline ?? []
      const n = o.length / 2
      for (let i = 0; i < (it.closed ? n : n - 1); i++) {
        const j = (i + 1) % n
        segs.push({ x1: o[i * 2], z1: o[i * 2 + 1], x2: o[j * 2], z2: o[j * 2 + 1], it })
      }
    }
    const wallMesh = inst(new THREE.BoxGeometry(1, 1, 1), segs.length)
    segs.forEach((sg, i) => {
      const len = Math.hypot(sg.x2 - sg.x1, sg.z2 - sg.z1)
      const ang = -Math.atan2(sg.z2 - sg.z1, sg.x2 - sg.x1)
      const t = sg.it.thickness ?? 0.15
      // Un poco más largo para que las esquinas y las curvas cierren.
      place(wallMesh, i, (sg.x1 + sg.x2) / 2, sg.it.height / 2, (sg.z1 + sg.z2) / 2, ang, len + t, sg.it.height, t, sg.it.color === '#e2e8f0' ? '#94a3b8' : sg.it.color)
    })

    // Polígonos (con curvas) extruidos; estructuras grandes translúcidas.
    const translucentMat = keep(new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, depthWrite: false }))
    for (const it of items.filter(i => i.kind === 'extrude')) {
      const o = it.outline ?? []
      if (o.length < 6) continue
      const shape = new THREE.Shape()
      shape.moveTo(o[0], o[1])
      for (let i = 2; i < o.length; i += 2) shape.lineTo(o[i], o[i + 1])
      const geo = keep(new THREE.ExtrudeGeometry(shape, { depth: it.height, bevelEnabled: false }))
      geo.rotateX(Math.PI / 2)
      const m = keep((it.translucent ? translucentMat : mat).clone() as THREE.MeshStandardMaterial)
      m.color.set(it.color)
      const mesh = new THREE.Mesh(geo, m)
      mesh.position.y = it.height
      scene.add(mesh)
    }
    for (const it of items.filter(i => i.translucent && i.kind !== 'extrude')) {
      const geo = keep(it.kind === 'cylinder' ? new THREE.CylinderGeometry(0.5, 0.5, 1, 32) : new THREE.BoxGeometry(1, 1, 1))
      const m = keep(translucentMat.clone() as THREE.MeshStandardMaterial)
      m.color.set(it.color)
      const mesh = new THREE.Mesh(geo, m)
      mesh.position.set(it.cx, it.height / 2, it.cz)
      mesh.rotation.y = it.rotY
      mesh.scale.set(it.width, it.height, it.depth)
      scene.add(mesh)
      const edges = new THREE.LineSegments(keep(new THREE.EdgesGeometry(geo)), keep(new THREE.LineBasicMaterial({ color: it.color })))
      edges.position.copy(mesh.position); edges.rotation.copy(mesh.rotation); edges.scale.copy(mesh.scale)
      scene.add(edges)
    }

    // Cámara y controles: girar (arrastrar), acercar (rueda), mover (clic
    // derecho) y recorrer con W A S D o flechas.
    const camera = new THREE.PerspectiveCamera(50, host.clientWidth / Math.max(1, host.clientHeight), 0.1, span * 30)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.maxPolarAngle = Math.PI / 2 - 0.02
    controls.minDistance = 0.5
    controls.maxDistance = span * 5
    const overview = () => {
      camera.position.set(cx + span * 0.55, span * 0.6, cz + span * 0.8)
      controls.target.set(cx, 0, cz)
      controls.update()
    }
    // A la altura de los ojos, adentro del plano (cerca de un borde) y
    // mirando hacia el centro.
    const person = () => {
      const dz = (b.maxZ - b.minZ) * 0.3
      camera.position.set(cx, 1.65, cz + dz)
      controls.target.set(cx, 1.4, cz - dz)
      controls.update()
    }
    overview()
    readyRef.current?.({ overview, person })

    const keys = new Set<string>()
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (!['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(k)) return
      if (e.type === 'keydown') keys.add(k); else keys.delete(k)
      if (k.startsWith('arrow')) e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)

    const ro = new ResizeObserver(() => {
      renderer.setSize(host.clientWidth, host.clientHeight)
      camera.aspect = host.clientWidth / Math.max(1, host.clientHeight)
      camera.updateProjectionMatrix()
    })
    ro.observe(host)

    let raf = 0, last = performance.now(), frames = 0, statStart = last
    const fwd = new THREE.Vector3(), right = new THREE.Vector3(), move = new THREE.Vector3()
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      if (keys.size) {
        camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize()
        right.crossVectors(fwd, UP)
        move.set(0, 0, 0)
        if (keys.has('w') || keys.has('arrowup')) move.add(fwd)
        if (keys.has('s') || keys.has('arrowdown')) move.sub(fwd)
        if (keys.has('d') || keys.has('arrowright')) move.add(right)
        if (keys.has('a') || keys.has('arrowleft')) move.sub(right)
        if (move.lengthSq()) {
          move.normalize().multiplyScalar((keys.has('shift') ? 12 : 4) * dt)
          camera.position.add(move); controls.target.add(move)
        }
      }
      if (autoRotate) {
        const a = now / 4000
        camera.position.set(cx + Math.cos(a) * span * 0.8, span * 0.45, cz + Math.sin(a) * span * 0.8)
        controls.target.set(cx, 0, cz)
      }
      controls.update()
      renderer.render(scene, camera)
      frames++
      if (now - statStart >= 1000) {
        statsRef.current?.({ fps: Math.round((frames * 1000) / (now - statStart)), drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, buildMs: Math.round(buildMs) })
        frames = 0; statStart = now
      }
      raf = requestAnimationFrame(tick)
    }
    const buildMs = performance.now() - t0
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
      ro.disconnect()
      controls.dispose()
      for (const d of disposables) d.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [items, background, autoRotate])

  return <div ref={hostRef} className="absolute inset-0" />
}
