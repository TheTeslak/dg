function initToc(root: HTMLElement) {
  if (root.dataset.bound === 'true') return
  root.dataset.bound = 'true'
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-toc-id]')]
  const headings = buttons.map(button => document.getElementById(button.dataset.tocId || '')).filter((heading): heading is HTMLElement => !!heading)
  const progress = root.querySelector<HTMLElement>('[data-toc-progress]')!
  const bar = document.querySelector<HTMLElement>('[data-mobile-toc-bar]')
  const sheet = document.querySelector<HTMLElement>('[data-mobile-toc-sheet]')
  const backdrop = document.querySelector<HTMLElement>('[data-mobile-toc-backdrop]')
  const mobileButtons = [...(sheet?.querySelectorAll<HTMLButtonElement>('[data-toc-id]') || [])]
  const labels = JSON.parse(root.dataset.labels || '{}')
  let active = -1
  let ticking = false
  const controller = new AbortController()

  const scrollTo = (id: string, fromSheet = false) => {
    const target = document.getElementById(id)
    if (!target) return
    if (fromSheet) closeSheet()
    window.setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), fromSheet ? 280 : 0)
    history.replaceState(null, '', `#${id}`)
  }
  buttons.forEach(button => button.addEventListener('click', () => scrollTo(button.dataset.tocId || '')))
  mobileButtons.forEach(button => button.addEventListener('click', () => scrollTo(button.dataset.tocId || '', true)))

  const update = () => {
    ticking = false
    if (!headings.length) return
    const marker = window.scrollY + Math.min(180, window.innerHeight * 0.3)
    let next = 0
    headings.forEach((heading, index) => { if (heading.offsetTop <= marker) next = index })
    if (next !== active) {
      active = next
      buttons.forEach((button, index) => button.classList.toggle('is-active', index === active))
      mobileButtons.forEach((button, index) => button.classList.toggle('is-active', index === active))
      buttons[active]?.scrollIntoView({ block: 'nearest' })
    }
    const article = headings[0]?.closest('article')
    if (article) {
      const start = article.offsetTop
      const distance = Math.max(1, article.offsetHeight - window.innerHeight)
      progress.style.height = `${Math.max(0, Math.min(100, ((window.scrollY - start) / distance) * 100))}%`
    }
  }
  const schedule = () => { if (!ticking) { ticking = true; requestAnimationFrame(update) } }
  window.addEventListener('scroll', schedule, { passive: true, signal: controller.signal })
  window.addEventListener('resize', schedule, { passive: true, signal: controller.signal })
  window.addEventListener('mousemove', event => root.classList.toggle('is-near', event.clientX < 72), { passive: true, signal: controller.signal })

  function openSheet() {
    if (!sheet || !backdrop) return
    sheet.hidden = false
    backdrop.hidden = false
    document.body.style.overflow = 'hidden'
    sheet.querySelector<HTMLElement>('button')?.focus()
  }
  function closeSheet() {
    if (!sheet || !backdrop) return
    sheet.hidden = true
    backdrop.hidden = true
    document.body.style.overflow = ''
  }
  bar?.querySelector('[data-mobile-toc-open]')?.addEventListener('click', openSheet)
  sheet?.querySelector('[data-mobile-toc-close]')?.addEventListener('click', closeSheet)
  backdrop?.addEventListener('click', closeSheet)
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && sheet && !sheet.hidden) closeSheet() }, { signal: controller.signal })
  document.addEventListener('astro:before-swap', () => { closeSheet(); controller.abort() }, { once: true, signal: controller.signal })
  const copy = bar?.querySelector<HTMLButtonElement>('[data-mobile-copy]')
  copy?.addEventListener('click', async () => {
    await navigator.clipboard.writeText(`${location.origin}${location.pathname}`)
    copy.querySelector('[data-mobile-copy-icon]')!.className = 'i-ri-check-line'
    const text = copy.querySelector<HTMLElement>('[data-mobile-copy-text]')!
    text.hidden = false
    copy.setAttribute('aria-label', labels.copied)
    window.setTimeout(() => { text.hidden = true; copy.querySelector('[data-mobile-copy-icon]')!.className = 'i-ri-links-line'; copy.setAttribute('aria-label', labels.link) }, 1800)
  })
  update()
}

function initAllTocs() { document.querySelectorAll<HTMLElement>('[data-scroll-toc]').forEach(initToc) }
document.addEventListener('astro:page-load', initAllTocs)
initAllTocs()
