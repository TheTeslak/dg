/**
 * Generative-art backdrops for `dg-astro`.
 *
 * Each element below is a self-contained vanilla-JS Web Component that draws
 * a low-key, low-contrast pattern behind the page content. They all:
 *   - respect `prefers-reduced-motion: reduce`;
 *   - pause when the document tab is hidden;
 *   - resize with the window (debounced);
 *   - use the same `#88888825` ink so they stay subtle in light + dark mode.
 *
 * The components are registered lazily from `Default.astro` to keep
 * non-art pages free of any canvas JS.
 */

type Ctx = CanvasRenderingContext2D

interface BaseArtState {
  raf: number
  resizeTimer: number | null
  abort: AbortController
}

function setupCanvas(host: HTMLElement): { canvas: HTMLCanvasElement, ctx: Ctx, dpr: number } {
  const canvas = document.createElement('canvas')
  canvas.setAttribute('aria-hidden', 'true')
  canvas.style.cssText = 'display:block;width:100%;height:100%;'
  host.appendChild(canvas)
  const dpr = window.devicePixelRatio || 1
  const ctx = canvas.getContext('2d')!
  function size() {
    const w = host.clientWidth || window.innerWidth
    const h = host.clientHeight || window.innerHeight
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  size()
  ;(canvas as unknown as { __resize: () => void }).__resize = size
  return { canvas, ctx, dpr }
}

function hostBase(): HTMLElement {
  const el = document.createElement('div')
  el.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;overflow:hidden;pointer-events:none;'
  return el
}

function setupHost(component: HTMLElement) {
  component.style.cssText = 'display:block;position:absolute;inset:0;width:100%;height:100%;pointer-events:none;'
  const host = hostBase()
  component.appendChild(host)
  return host
}

abstract class BaseArt extends HTMLElement {
  protected state: BaseArtState = { raf: 0, resizeTimer: null, abort: new AbortController() }
  protected reducedMotion = false

  connectedCallback() {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const onResize = () => {
      if (this.state.resizeTimer) window.clearTimeout(this.state.resizeTimer)
      this.state.resizeTimer = window.setTimeout(() => this.resize(), 120)
    }
    const onVisibility = () => {
      if (document.hidden) this.pause()
      else this.resume()
    }
    window.addEventListener('resize', onResize, { signal: this.state.abort.signal })
    document.addEventListener('visibilitychange', onVisibility, { signal: this.state.abort.signal })
    this.setup()
  }

  disconnectedCallback() {
    this.pause()
    this.state.abort.abort()
  }

  protected pause() {
    if (this.state.raf) {
      cancelAnimationFrame(this.state.raf)
      this.state.raf = 0
    }
  }

  protected resume() {
    // Subclasses override if they want to keep animating.
  }

  protected abstract setup(): void
  protected abstract resize(): void
}

/* ---- ArtPlum: branching ink-stroke fractal ---- */
class ArtPlum extends BaseArt {
  private ctx: Ctx | null = null
  protected setup() {
    const host = setupHost(this)
    const { ctx } = setupCanvas(host)
    this.ctx = ctx
    this.start()
  }
  protected resize() {
    if (!this.ctx) return
    const host = this.firstElementChild as HTMLElement | null
    const canvas = host?.firstElementChild as HTMLCanvasElement | null
    if (canvas) (canvas as unknown as { __resize: () => void }).__resize?.()
    this.start()
  }
  protected resume() { this.start() }

  private start() {
    if (!this.ctx) return
    const ctx = this.ctx
    const r180 = Math.PI
    const r90 = Math.PI / 2
    const r15 = Math.PI / 12
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    ctx.lineWidth = 1
    ctx.strokeStyle = '#88888825'
    const w = ctx.canvas.width / (window.devicePixelRatio || 1)
    const h = ctx.canvas.height / (window.devicePixelRatio || 1)
    const len = 6
    const MIN = 30
    let steps: Array<() => void> = []
    let prev: Array<() => void> = []
    const polar2 = (x: number, y: number, r: number, t: number) => [x + r * Math.cos(t), y + r * Math.sin(t)]
    const step = (x: number, y: number, rad: number, counter = { value: 0 }) => {
      const l = Math.random() * len
      counter.value += 1
      const [nx, ny] = polar2(x, y, l, rad)
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(nx, ny)
      ctx.stroke()
      if (nx < -100 || nx > w + 100 || ny < -100 || ny > h + 100) return
      const rate = counter.value <= MIN ? 0.8 : 0.5
      if (Math.random() < rate) steps.push(() => step(nx, ny, rad + Math.random() * r15, counter))
      if (Math.random() < rate) steps.push(() => step(nx, ny, rad - Math.random() * r15, counter))
    }
    const rm = () => Math.random() * 0.6 + 0.2
    steps = [
      () => step(rm() * w, -5, r90),
      () => step(rm() * w, h + 5, -r90),
      () => step(-5, rm() * h, 0),
      () => step(w + 5, rm() * h, r180),
    ]
    if (this.reducedMotion) {
      while (steps.length) {
        const s = steps.shift()!
        s()
        if (steps.length > 5000) break
      }
      return
    }
    let lastTime = performance.now()
    const interval = 1000 / 40
    const frame = () => {
      if (performance.now() - lastTime >= interval) {
        prev = steps
        steps = []
        lastTime = performance.now()
        if (!prev.length) {
          this.pause()
          return
        }
        prev.forEach((s) => {
          if (Math.random() < 0.5) steps.push(s)
          else s()
        })
      }
      this.state.raf = requestAnimationFrame(frame)
    }
    this.state.raf = requestAnimationFrame(frame)
  }
}

/* ---- ArtDots: drifting dot field ---- */
class ArtDots extends BaseArt {
  private ctx: Ctx | null = null
  private dots: { x: number, y: number, vx: number, vy: number, r: number }[] = []
  protected setup() {
    const host = setupHost(this)
    const { ctx } = setupCanvas(host)
    this.ctx = ctx
    this.seed()
    if (!this.reducedMotion) this.loop()
    else this.drawStatic()
  }
  protected resize() {
    if (!this.ctx) return
    const host = this.firstElementChild as HTMLElement | null
    const canvas = host?.firstElementChild as HTMLCanvasElement | null
    if (canvas) (canvas as unknown as { __resize: () => void }).__resize?.()
    this.seed()
    if (this.reducedMotion) this.drawStatic()
  }
  protected resume() { if (!this.reducedMotion) this.loop() }
  private seed() {
    if (!this.ctx) return
    const w = this.ctx.canvas.width / (window.devicePixelRatio || 1)
    const h = this.ctx.canvas.height / (window.devicePixelRatio || 1)
    const count = Math.min(140, Math.floor((w * h) / 18000))
    this.dots = []
    for (let i = 0; i < count; i++) {
      this.dots.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: Math.random() * 1.5 + 0.5,
      })
    }
  }
  private drawStatic() {
    const ctx = this.ctx!
    const w = ctx.canvas.width / (window.devicePixelRatio || 1)
    const h = ctx.canvas.height / (window.devicePixelRatio || 1)
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = '#88888828'
    for (const d of this.dots) {
      ctx.beginPath()
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  private loop = () => {
    if (!this.ctx) return
    const ctx = this.ctx
    const w = ctx.canvas.width / (window.devicePixelRatio || 1)
    const h = ctx.canvas.height / (window.devicePixelRatio || 1)
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = '#88888828'
    for (const d of this.dots) {
      d.x += d.vx
      d.y += d.vy
      if (d.x < 0 || d.x > w) d.vx *= -1
      if (d.y < 0 || d.y > h) d.vy *= -1
      ctx.beginPath()
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
      ctx.fill()
    }
    this.state.raf = requestAnimationFrame(this.loop)
  }
}

/* ---- ArtCellular: cellular-automaton speckle ---- */
class ArtCellular extends BaseArt {
  private ctx: Ctx | null = null
  private cols = 0
  private rows = 0
  private grid: number[][] = []
  private opacityGrid: number[][] = []
  private lastTick = 0
  private generationCount = 0

  private readonly CELL_SIZE = 12
  private readonly TICK_INTERVAL = 1400
  private readonly INITIAL_DENSITY = 0.15
  private readonly FADE_SPEED = 0.007

  protected setup() {
    const host = setupHost(this)
    const { ctx } = setupCanvas(host)
    this.ctx = ctx
    this.initGrid()
    if (!this.reducedMotion) {
      this.lastTick = performance.now()
      this.loop()
    } else {
      this.drawStatic()
    }
  }

  protected resize() {
    if (!this.ctx) return
    const host = this.firstElementChild as HTMLElement | null
    const canvas = host?.firstElementChild as HTMLCanvasElement | null
    if (canvas) (canvas as unknown as { __resize: () => void }).__resize?.()
    this.initGrid()
    if (this.reducedMotion) this.drawStatic()
  }

  protected resume() {
    if (!this.reducedMotion) {
      this.lastTick = performance.now()
      this.loop()
    }
  }

  private initGrid() {
    if (!this.ctx) return
    const w = this.ctx.canvas.width / (window.devicePixelRatio || 1)
    const h = this.ctx.canvas.height / (window.devicePixelRatio || 1)
    this.cols = Math.ceil(w / this.CELL_SIZE) + 2
    this.rows = Math.ceil(h / this.CELL_SIZE) + 2

    this.grid = []
    this.opacityGrid = []
    for (let r = 0; r < this.rows; r++) {
      this.grid[r] = []
      this.opacityGrid[r] = []
      for (let c = 0; c < this.cols; c++) {
        const alive = Math.random() < this.INITIAL_DENSITY ? 1 : 0
        this.grid[r][c] = alive
        this.opacityGrid[r][c] = alive ? Math.random() * 0.5 : 0
      }
    }
  }

  private countNeighbors(r: number, c: number): number {
    let count = 0
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue
        const nr = (r + dr + this.rows) % this.rows
        const nc = (c + dc + this.cols) % this.cols
        count += this.grid[nr][nc]
      }
    }
    return count
  }

  private nextGeneration() {
    const next: number[][] = []
    for (let r = 0; r < this.rows; r++) {
      next[r] = []
      for (let c = 0; c < this.cols; c++) {
        const neighbors = this.countNeighbors(r, c)
        if (this.grid[r][c] === 1) {
          next[r][c] = (neighbors === 2 || neighbors === 3) ? 1 : 0
        } else {
          next[r][c] = neighbors === 3 ? 1 : 0
        }
      }
    }
    this.grid = next
  }

  private injectPattern() {
    const cr = Math.floor(Math.random() * (this.rows - 10)) + 5
    const cc = Math.floor(Math.random() * (this.cols - 10)) + 5
    const patterns = [
      [[0, 1], [0, 2], [1, 0], [1, 1], [2, 1]], // R-pentomino
      [[0, 1], [1, 3], [2, 0], [2, 1], [2, 4], [2, 5], [2, 6]], // Acorn
      [[0, 6], [1, 0], [1, 1], [2, 1], [2, 5], [2, 6], [2, 7]], // Diehard
    ]
    const pattern = patterns[Math.floor(Math.random() * patterns.length)]
    for (const [dr, dc] of pattern) {
      const r = (cr + dr) % this.rows
      const c = (cc + dc) % this.cols
      this.grid[r][c] = 1
    }
  }

  private drawStatic() {
    if (!this.ctx) return
    const ctx = this.ctx
    const w = ctx.canvas.width / (window.devicePixelRatio || 1)
    const h = ctx.canvas.height / (window.devicePixelRatio || 1)
    ctx.clearRect(0, 0, w, h)
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const opacity = this.grid[r][c] === 1 ? 0.15 : 0
        if (opacity > 0.01) {
          const x = c * this.CELL_SIZE
          const y = r * this.CELL_SIZE
          const radius = this.CELL_SIZE / 2 - 1
          ctx.beginPath()
          ctx.arc(x + this.CELL_SIZE / 2, y + this.CELL_SIZE / 2, Math.max(radius, 0.5), 0, Math.PI * 2)
          ctx.fillStyle = `rgba(136, 136, 136, ${opacity})`
          ctx.fill()
        }
      }
    }
  }

  private loop = () => {
    if (!this.ctx) return
    const ctx = this.ctx
    const w = ctx.canvas.width / (window.devicePixelRatio || 1)
    const h = ctx.canvas.height / (window.devicePixelRatio || 1)
    const now = performance.now()

    if (now - this.lastTick > this.TICK_INTERVAL) {
      this.nextGeneration()
      this.lastTick = now
      this.generationCount++
      if (this.generationCount % 60 === 0) {
        this.injectPattern()
      }
    }

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const target = this.grid[r][c] === 1 ? 0.15 : 0
        if (this.opacityGrid[r][c] < target) {
          this.opacityGrid[r][c] = Math.min(this.opacityGrid[r][c] + this.FADE_SPEED, target)
        } else if (this.opacityGrid[r][c] > target) {
          this.opacityGrid[r][c] = Math.max(this.opacityGrid[r][c] - this.FADE_SPEED * 0.5, target)
        }
      }
    }

    ctx.clearRect(0, 0, w, h)
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const opacity = this.opacityGrid[r][c]
        if (opacity > 0.01) {
          const x = c * this.CELL_SIZE
          const y = r * this.CELL_SIZE
          const radius = (this.CELL_SIZE / 2 - 1) * Math.min(opacity / 0.15, 1)
          ctx.beginPath()
          ctx.arc(x + this.CELL_SIZE / 2, y + this.CELL_SIZE / 2, Math.max(radius, 0.5), 0, Math.PI * 2)
          ctx.fillStyle = `rgba(136, 136, 136, ${opacity})`
          ctx.fill()
        }
      }
    }

    this.state.raf = requestAnimationFrame(this.loop)
  }

  protected pause() {
    if (this.state.raf) {
      cancelAnimationFrame(this.state.raf)
      this.state.raf = 0
    }
  }
}

/* ---- ArtTopography: stacked contour lines ---- */
class ArtTopography extends BaseArt {
  private ctx: Ctx | null = null
  private phase = 0
  protected setup() {
    const host = setupHost(this)
    const { ctx } = setupCanvas(host)
    this.ctx = ctx
    if (this.reducedMotion) this.draw()
    else this.loop()
  }
  protected resize() {
    if (!this.ctx) return
    const host = this.firstElementChild as HTMLElement | null
    const canvas = host?.firstElementChild as HTMLCanvasElement | null
    if (canvas) (canvas as unknown as { __resize: () => void }).__resize?.()
    this.draw()
  }
  protected resume() { if (!this.reducedMotion) this.loop() }
  private draw() {
    if (!this.ctx) return
    const ctx = this.ctx
    const w = ctx.canvas.width / (window.devicePixelRatio || 1)
    const h = ctx.canvas.height / (window.devicePixelRatio || 1)
    ctx.clearRect(0, 0, w, h)
    ctx.strokeStyle = '#88888820'
    ctx.lineWidth = 1
    const lines = 30
    for (let i = 0; i < lines; i++) {
      ctx.beginPath()
      const y0 = (h / lines) * i
      ctx.moveTo(0, y0)
      for (let x = 0; x <= w; x += 8) {
        const y = y0 + Math.sin(x * 0.01 + i * 0.4 + this.phase) * 10
        ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
  }
  private loop = () => {
    this.phase += 0.01
    this.draw()
    this.state.raf = requestAnimationFrame(this.loop)
  }
}

/* ---- ArtInterference: moiré rings ---- */
class ArtInterference extends BaseArt {
  private ctx: Ctx | null = null
  private t = 0
  protected setup() {
    const host = setupHost(this)
    const { ctx } = setupCanvas(host)
    this.ctx = ctx
    if (this.reducedMotion) this.draw()
    else this.loop()
  }
  protected resize() {
    if (!this.ctx) return
    const host = this.firstElementChild as HTMLElement | null
    const canvas = host?.firstElementChild as HTMLCanvasElement | null
    if (canvas) (canvas as unknown as { __resize: () => void }).__resize?.()
    this.draw()
  }
  protected resume() { if (!this.reducedMotion) this.loop() }
  private draw() {
    if (!this.ctx) return
    const ctx = this.ctx
    const w = ctx.canvas.width / (window.devicePixelRatio || 1)
    const h = ctx.canvas.height / (window.devicePixelRatio || 1)
    ctx.clearRect(0, 0, w, h)
    ctx.strokeStyle = '#88888820'
    ctx.lineWidth = 1
    const cx1 = w * 0.35 + Math.sin(this.t) * 30
    const cy1 = h * 0.5
    const cx2 = w * 0.65 + Math.cos(this.t) * 30
    const cy2 = h * 0.5
    for (let r = 8; r < Math.max(w, h); r += 16) {
      ctx.beginPath()
      ctx.arc(cx1, cy1, r, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(cx2, cy2, r, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
  private loop = () => {
    this.t += 0.01
    this.draw()
    this.state.raf = requestAnimationFrame(this.loop)
  }
}

/* ---- ArtRandom: picks one of plum/dots/cellular each load ---- */
class ArtRandom extends HTMLElement {
  connectedCallback() {
    const weighted = ['plum', 'plum', 'plum', 'dots', 'dots', 'cellular', 'cellular']
    let last: string | null = null
    try {
      last = localStorage.getItem('dg-last-art')
    } catch {}
    const pool = last ? weighted.filter(a => a !== last) : weighted
    const pick = (pool.length ? pool : weighted)[Math.floor(Math.random() * (pool.length || weighted.length))]
    try {
      localStorage.setItem('dg-last-art', pick)
    } catch {}
    const tag = `art-${pick}`
    const node = document.createElement(tag)
    node.style.cssText = this.style.cssText
    this.replaceWith(node)
  }
}

const registry: [string, CustomElementConstructor][] = [
  ['art-plum', ArtPlum],
  ['art-dots', ArtDots],
  ['art-cellular', ArtCellular],
  ['art-topography', ArtTopography],
  ['art-interference', ArtInterference],
  ['art-random', ArtRandom],
]
for (const [name, ctor] of registry) {
  if (!customElements.get(name))
    customElements.define(name, ctor)
}

export {}
