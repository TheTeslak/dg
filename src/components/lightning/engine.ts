import type { Variable } from 'three/examples/jsm/misc/GPUComputationRenderer.js'
import * as THREE from 'three'
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js'
import {
  LIGHTNING_POLYGON,
  MOUSE_FORCE,
  MOUSE_RADIUS,
  PARTICLE_COUNT,
  SIM_SIZE,
} from './constants'
import {
  particleFragmentShader,
  particleVertexShader,
  positionShader,
  velocityShader,
} from './shaders'

export interface LightningEngine {
  start: () => void
  pause: () => void
  destroy: () => void
}

function pointInPolygon(
  point: { x: number, y: number },
  polygon: readonly { x: number, y: number }[],
): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x
    const yi = polygon[i].y
    const xj = polygon[j].x
    const yj = polygon[j].y
    const intersect
      = ((yi > point.y) !== (yj > point.y))
        && (point.x < ((xj - xi) * (point.y - yi)) / ((yj - yi) || 1e-9) + xi)
    if (intersect)
      inside = !inside
  }
  return inside
}

export function createLightningEngine(
  canvas: HTMLCanvasElement,
  container: HTMLElement,
  onError?: (error: unknown) => void,
): LightningEngine {
  const rect = container.getBoundingClientRect()
  const initialWidth = Math.max(rect.width || 400, 100)
  const initialHeight = Math.max(rect.height || 300, 100)

  const svgBounds = LIGHTNING_POLYGON.reduce((b, p) => ({
    minX: Math.min(b.minX, p.x),
    maxX: Math.max(b.maxX, p.x),
    minY: Math.min(b.minY, p.y),
    maxY: Math.max(b.maxY, p.y),
  }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity })

  const cx = (svgBounds.minX + svgBounds.maxX) * 0.5
  const cy = (svgBounds.minY + svgBounds.maxY) * 0.5

  const shapeScale = 4.2 / Math.max(svgBounds.maxX - svgBounds.minX, svgBounds.maxY - svgBounds.minY)

  const POLY = LIGHTNING_POLYGON.map(p => ({
    x: (p.x - cx) * shapeScale,
    y: -(p.y - cy) * shapeScale,
  }))

  const bounds = POLY.reduce((b, p) => ({
    minX: Math.min(b.minX, p.x),
    maxX: Math.max(b.maxX, p.x),
    minY: Math.min(b.minY, p.y),
    maxY: Math.max(b.maxY, p.y),
  }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity })

  const center = {
    x: (bounds.minX + bounds.maxX) * 0.5,
    y: (bounds.minY + bounds.maxY) * 0.5,
  }

  function sampleInsideSolid() {
    for (let i = 0; i < 4000; i++) {
      const x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX)
      const y = bounds.minY + Math.random() * (bounds.maxY - bounds.minY)
      const p = { x, y }
      if (pointInPolygon(p, POLY))
        return p
    }
    return { x: center.x, y: center.y }
  }

  let renderer: THREE.WebGLRenderer | null = null
  let gpuCompute: GPUComputationRenderer | null = null
  let positionTexture: THREE.DataTexture | null = null
  let velocityTexture: THREE.DataTexture | null = null
  let positionVariable: Variable | null = null
  let velocityVariable: Variable | null = null
  let geometry: THREE.BufferGeometry | null = null
  let particleMaterial: THREE.ShaderMaterial | null = null
  let resizeObserver: ResizeObserver | null = null
  let listenersAttached = false
  let animId: number | null = null
  let isRunning = false

  const pointerNDC = new THREE.Vector2(2, 2)
  const targetMouseWorld = new THREE.Vector3(999, 999, 999)
  const smoothMouseWorld = new THREE.Vector3(999, 999, 999)
  const raycaster = new THREE.Raycaster()
  const interactionPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)

  let pointerInside = false
  let pointerDown = false
  let lastPointerMove = performance.now()

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(
    42,
    initialWidth / initialHeight,
    0.1,
    100,
  )
  camera.position.set(0.0, 0.0, 7.5)

  let isDisposed = false

  const onContextLost = (e: Event) => {
    e.preventDefault()
    console.error('Lightning WebGL context lost')
    disposeResources()
    onError?.(new Error('WebGL context lost'))
  }

  function updatePointer(clientX: number, clientY: number) {
    const r = canvas.getBoundingClientRect()
    if (r.width === 0 || r.height === 0)
      return
    pointerNDC.x = ((clientX - r.left) / r.width) * 2 - 1
    pointerNDC.y = -((clientY - r.top) / r.height) * 2 + 1
    raycaster.setFromCamera(pointerNDC, camera)
    raycaster.ray.intersectPlane(interactionPlane, targetMouseWorld)
    pointerInside = true
    lastPointerMove = performance.now()
  }

  const onPointerMove = (e: PointerEvent) => {
    updatePointer(e.clientX, e.clientY)
  }

  const onPointerDown = (e: PointerEvent) => {
    pointerDown = true
    updatePointer(e.clientX, e.clientY)
    if (velocityVariable?.material?.uniforms?.uMouseForce)
      velocityVariable.material.uniforms.uMouseForce.value = MOUSE_FORCE * 2.15
  }

  const onWindowPointerUp = () => {
    pointerDown = false
    if (velocityVariable?.material?.uniforms?.uMouseForce)
      velocityVariable.material.uniforms.uMouseForce.value = MOUSE_FORCE
  }

  const onPointerLeave = () => {
    pointerInside = false
  }

  function handleResize(width: number, height: number) {
    if (width <= 0 || height <= 0 || !renderer || !particleMaterial)
      return

    camera.aspect = width / height
    camera.updateProjectionMatrix()

    const dpr = Math.min(window.devicePixelRatio, 2)
    renderer.setPixelRatio(dpr)
    renderer.setSize(width, height)

    particleMaterial.uniforms.uPixelRatio.value = dpr
  }

  function disposeResources() {
    if (isDisposed)
      return
    isDisposed = true

    isRunning = false
    if (animId !== null) {
      cancelAnimationFrame(animId)
      animId = null
    }

    if (listenersAttached) {
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointerleave', onPointerLeave)
      window.removeEventListener('pointerup', onWindowPointerUp)
      canvas.removeEventListener('webglcontextlost', onContextLost)
      listenersAttached = false
    }

    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }

    geometry?.dispose()
    geometry = null
    particleMaterial?.dispose()
    particleMaterial = null

    if (gpuCompute) {
      gpuCompute.dispose()
      gpuCompute = null
      positionTexture = null
      velocityTexture = null
      positionVariable = null
      velocityVariable = null
    }
    else {
      positionTexture?.dispose()
      positionTexture = null
      velocityTexture?.dispose()
      velocityTexture = null
    }

    renderer?.dispose()
    renderer = null
  }

  let points: THREE.Points | null = null

  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.debug.onShaderError = (_gl, _program, _glVertexShader, _glFragmentShader) => {
      throw new Error('WebGL shader compilation or linking error')
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(initialWidth, initialHeight)
    renderer.setClearColor(0x000000, 0)

    const targetPositions = new Float32Array(PARTICLE_COUNT * 3)
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = sampleInsideSolid()
      const z = (Math.random() * 2 - 1) * 0.11
      targetPositions[i * 3 + 0] = p.x
      targetPositions[i * 3 + 1] = p.y
      targetPositions[i * 3 + 2] = z
    }

    gpuCompute = new GPUComputationRenderer(
      SIM_SIZE,
      SIM_SIZE,
      renderer,
    )

    positionTexture = gpuCompute.createTexture()
    velocityTexture = gpuCompute.createTexture()

    const posData = positionTexture.image.data
    const velData = velocityTexture.image.data

    if (posData && velData) {
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        posData[i * 4 + 0] = targetPositions[i * 3 + 0]
        posData[i * 4 + 1] = targetPositions[i * 3 + 1]
        posData[i * 4 + 2] = targetPositions[i * 3 + 2]
        posData[i * 4 + 3] = 1

        velData[i * 4 + 0] = 0
        velData[i * 4 + 1] = 0
        velData[i * 4 + 2] = 0
        velData[i * 4 + 3] = 1
      }
    }

    positionVariable = gpuCompute.addVariable(
      'uPosition',
      positionShader,
      positionTexture,
    )
    velocityVariable = gpuCompute.addVariable(
      'uVelocity',
      velocityShader,
      velocityTexture,
    )

    gpuCompute.setVariableDependencies(positionVariable, [positionVariable, velocityVariable])
    gpuCompute.setVariableDependencies(velocityVariable, [positionVariable, velocityVariable])

    positionVariable.material.uniforms.uDelta = { value: 1 / 60 }
    Object.assign(velocityVariable.material.uniforms, {
      uOriginalPosition: { value: positionTexture },
      uTime: { value: 0 },
      uDelta: { value: 1 / 60 },
      uMouse: { value: new THREE.Vector3(999, 999, 999) },
      uMouseActive: { value: 0 },
      uMouseForce: { value: MOUSE_FORCE },
      uMouseRadius: { value: MOUSE_RADIUS },
    })

    const gpuError = gpuCompute.init()
    if (gpuError !== null) {
      throw new Error(`GPGPU initialization failed: ${gpuError}`)
    }

    geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    const references = new Float32Array(PARTICLE_COUNT * 2)
    const randoms = new Float32Array(PARTICLE_COUNT)

    for (let y = 0; y < SIM_SIZE; y++) {
      for (let x = 0; x < SIM_SIZE; x++) {
        const i = y * SIM_SIZE + x
        references[i * 2 + 0] = (x + 0.5) / SIM_SIZE
        references[i * 2 + 1] = (y + 0.5) / SIM_SIZE
        randoms[i] = Math.random()
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aReference', new THREE.BufferAttribute(references, 2))
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1))

    particleMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,

      uniforms: {
        uPositionTexture: { value: null },
        uVelocityTexture: { value: null },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uTime: { value: 0 },
        uBoundsMin: { value: new THREE.Vector2(bounds.minX, bounds.minY) },
        uBoundsMax: { value: new THREE.Vector2(bounds.maxX, bounds.maxY) },
      },

      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
    })

    points = new THREE.Points(geometry, particleMaterial)
    points.frustumCulled = false
    scene.add(points)

    canvas.addEventListener('pointermove', onPointerMove, { passive: true })
    canvas.addEventListener('pointerdown', onPointerDown, { passive: true })
    canvas.addEventListener('pointerleave', onPointerLeave, { passive: true })
    window.addEventListener('pointerup', onWindowPointerUp, { passive: true })
    canvas.addEventListener('webglcontextlost', onContextLost)
    listenersAttached = true

    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          handleResize(width, height)
        }
      }
    })
    resizeObserver.observe(container)
  }
  catch (err) {
    disposeResources()
    throw err
  }

  let lastTime = performance.now()
  let elapsed = 0

  function animate() {
    if (!isRunning || !renderer || !gpuCompute || !particleMaterial || !positionVariable || !velocityVariable || !points)
      return

    try {
      const now = performance.now()
      const delta = Math.min((now - lastTime) / 1000, 1 / 30)
      lastTime = now
      elapsed += delta

      if (pointerInside) {
        if (smoothMouseWorld.x > 900) {
          smoothMouseWorld.copy(targetMouseWorld)
        }
        else {
          smoothMouseWorld.lerp(targetMouseWorld, 0.20)
        }
      }

      const idleFor = performance.now() - lastPointerMove
      const active = pointerInside && (pointerDown || idleFor < 1800) ? 1 : 0

      velocityVariable.material.uniforms.uTime.value = elapsed
      velocityVariable.material.uniforms.uDelta.value = delta
      velocityVariable.material.uniforms.uMouse.value.copy(smoothMouseWorld)
      velocityVariable.material.uniforms.uMouseActive.value = THREE.MathUtils.lerp(
        velocityVariable.material.uniforms.uMouseActive.value,
        active,
        0.08,
      )

      positionVariable.material.uniforms.uDelta.value = delta

      gpuCompute.compute()

      particleMaterial.uniforms.uPositionTexture.value
        = gpuCompute.getCurrentRenderTarget(positionVariable).texture
      particleMaterial.uniforms.uVelocityTexture.value
        = gpuCompute.getCurrentRenderTarget(velocityVariable).texture
      particleMaterial.uniforms.uTime.value = elapsed

      points.rotation.z = Math.sin(elapsed * 0.12) * 0.010
      points.rotation.x = Math.sin(elapsed * 0.08) * 0.010
      points.rotation.y = Math.sin(elapsed * 0.10) * 0.016

      renderer.render(scene, camera)

      if (isRunning) {
        animId = requestAnimationFrame(animate)
      }
    }
    catch (frameError) {
      console.error('Lightning animation frame error:', frameError)
      disposeResources()
      onError?.(frameError)
    }
  }

  return {
    start() {
      if (!isRunning) {
        isRunning = true
        lastTime = performance.now()
        lastPointerMove = performance.now()
        animate()
      }
    },
    pause() {
      isRunning = false
      if (animId !== null) {
        cancelAnimationFrame(animId)
        animId = null
      }
    },
    destroy() {
      disposeResources()
    },
  }
}
