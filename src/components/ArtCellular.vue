<script setup lang='ts'>
const el = ref<HTMLCanvasElement | null>(null)
const size = reactive(useWindowSize())

const CELL_SIZE = 12
const TICK_INTERVAL = 200 // ms between generations
const INITIAL_DENSITY = 0.15
const FADE_SPEED = 0.06

function initCanvas(canvas: HTMLCanvasElement, width = 400, height = 400) {
  const ctx = canvas.getContext('2d')!
  const dpr = window.devicePixelRatio || 1

  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  canvas.width = dpr * width
  canvas.height = dpr * height
  ctx.scale(dpr, dpr)

  return { ctx, dpr }
}

onMounted(() => {
  const canvas = el.value!
  const { ctx } = initCanvas(canvas, size.width, size.height)

  const cols = Math.ceil(size.width / CELL_SIZE) + 2
  const rows = Math.ceil(size.height / CELL_SIZE) + 2

  // Current state: 0 = dead, 1 = alive
  let grid: number[][] = []
  // Visual opacity for smooth fade transitions
  let opacityGrid: number[][] = []

  function createGrid(fill: boolean) {
    const g: number[][] = []
    const o: number[][] = []
    for (let r = 0; r < rows; r++) {
      g[r] = []
      o[r] = []
      for (let c = 0; c < cols; c++) {
        g[r][c] = fill ? (Math.random() < INITIAL_DENSITY ? 1 : 0) : 0
        o[r][c] = g[r][c] ? Math.random() * 0.5 : 0
      }
    }
    return { g, o }
  }

  const init = createGrid(true)
  grid = init.g
  opacityGrid = init.o

  function countNeighbors(r: number, c: number): number {
    let count = 0
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0)
          continue
        const nr = (r + dr + rows) % rows
        const nc = (c + dc + cols) % cols
        count += grid[nr][nc]
      }
    }
    return count
  }

  function nextGeneration() {
    const next: number[][] = []
    for (let r = 0; r < rows; r++) {
      next[r] = []
      for (let c = 0; c < cols; c++) {
        const neighbors = countNeighbors(r, c)
        if (grid[r][c] === 1) {
          // Survival: 2 or 3 neighbors
          next[r][c] = (neighbors === 2 || neighbors === 3) ? 1 : 0
        }
        else {
          // Birth: exactly 3 neighbors
          next[r][c] = neighbors === 3 ? 1 : 0
        }
      }
    }
    grid = next
  }

  // Inject a random pattern to keep it alive & interesting
  function injectPattern() {
    const cr = Math.floor(Math.random() * (rows - 10)) + 5
    const cc = Math.floor(Math.random() * (cols - 10)) + 5
    // Gosper glider gun fragment / R-pentomino
    const patterns = [
      // R-pentomino
      [[0, 1], [0, 2], [1, 0], [1, 1], [2, 1]],
      // Acorn
      [[0, 1], [1, 3], [2, 0], [2, 1], [2, 4], [2, 5], [2, 6]],
      // Diehard
      [[0, 6], [1, 0], [1, 1], [2, 1], [2, 5], [2, 6], [2, 7]],
    ]
    const pattern = patterns[Math.floor(Math.random() * patterns.length)]
    for (const [dr, dc] of pattern) {
      const r = (cr + dr) % rows
      const c = (cc + dc) % cols
      grid[r][c] = 1
    }
  }

  let lastTick = performance.now()
  let generationCount = 0

  const frame = () => {
    const now = performance.now()

    // Evolve on tick interval
    if (now - lastTick > TICK_INTERVAL) {
      nextGeneration()
      lastTick = now
      generationCount++

      // Every 60 generations, inject a methuselah to prevent stagnation
      if (generationCount % 60 === 0) {
        injectPattern()
      }
    }

    // Update opacity grid (smooth fade in / fade out)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const target = grid[r][c] === 1 ? 0.15 : 0
        if (opacityGrid[r][c] < target) {
          opacityGrid[r][c] = Math.min(opacityGrid[r][c] + FADE_SPEED, target)
        }
        else if (opacityGrid[r][c] > target) {
          opacityGrid[r][c] = Math.max(opacityGrid[r][c] - FADE_SPEED * 0.5, target)
        }
      }
    }

    // Draw
    ctx.clearRect(0, 0, size.width, size.height)

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const opacity = opacityGrid[r][c]
        if (opacity > 0.01) {
          const x = c * CELL_SIZE
          const y = r * CELL_SIZE
          const radius = (CELL_SIZE / 2 - 1) * Math.min(opacity / 0.15, 1)

          ctx.beginPath()
          ctx.arc(x + CELL_SIZE / 2, y + CELL_SIZE / 2, Math.max(radius, 0.5), 0, Math.PI * 2)
          ctx.fillStyle = `rgba(136, 136, 136, ${opacity})`
          ctx.fill()
        }
      }
    }
  }

  const controls = useRafFn(frame)

  onUnmounted(() => {
    controls.pause()
  })
})

const mask = computed(() => 'radial-gradient(circle, transparent, black);')
</script>

<template>
  <div
    class="fixed top-0 bottom-0 left-0 right-0 pointer-events-none print:hidden"
    style="z-index: -1"
    :style="`mask-image: ${mask};--webkit-mask-image: ${mask};`"
  >
    <canvas ref="el" width="400" height="400" aria-hidden="true" />
  </div>
</template>
