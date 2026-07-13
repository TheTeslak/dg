function initToc(root: HTMLElement) {
  if (root.dataset.bound === 'true') return
  root.dataset.bound = 'true'

  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-toc-id]')]
  const dots = [...root.querySelectorAll<SVGLineElement>('[data-toc-dot]')]
  const headings = buttons
    .map(button => document.getElementById(button.dataset.tocId || ''))
    .filter((heading): heading is HTMLElement => !!heading)
  const scrollWrapper = root.querySelector<HTMLElement>('[data-toc-scroll-wrapper]')
  const bar = document.querySelector<HTMLElement>('[data-mobile-toc-bar]')
  const sheet = document.querySelector<HTMLElement>('[data-mobile-toc-sheet]')
  const backdrop = document.querySelector<HTMLElement>('[data-mobile-toc-backdrop]')
  const mobileButtons = [...(sheet?.querySelectorAll<HTMLButtonElement>('[data-toc-id]') || [])]
  const labels = JSON.parse(root.dataset.labels || '{}')
  const controller = new AbortController()
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let activeIndex = -1
  let ticking = false
  let closeTimer = 0
  let copyTimer = 0
  let previousBodyOverflow = ''
  let sheetTrigger: HTMLElement | null = null

  const setActive = (next: number) => {
    if (next === activeIndex) return
    activeIndex = next
    buttons.forEach((button, index) => {
      const active = index === next
      button.classList.toggle('is-active', active)
      if (active) button.setAttribute('aria-current', 'true')
      else button.removeAttribute('aria-current')
    })
    dots.forEach((dot, index) => dot.classList.toggle('is-active', index === next))
    mobileButtons.forEach((button, index) => {
      const active = index === next
      button.classList.toggle('is-active', active)
      if (active) button.setAttribute('aria-current', 'true')
      else button.removeAttribute('aria-current')
    })

    if (next >= 0 && scrollWrapper) {
      const position = Number(buttons[next]?.dataset.tocPosition || 0)
      const target = Math.max(0, position - scrollWrapper.clientHeight / 2 + 11)
      scrollWrapper.scrollTo({ top: target, behavior: reducedMotion ? 'auto' : 'smooth' })
    }
  }

  const update = () => {
    ticking = false
    const threshold = window.scrollY + window.innerHeight * 0.3
    let next = -1
    headings.forEach((heading, index) => {
      const offset = heading.getBoundingClientRect().top + window.scrollY
      if (offset <= threshold) next = index
    })
    setActive(next)
  }
  const scheduleUpdate = () => {
    if (ticking) return
    ticking = true
    requestAnimationFrame(update)
  }

  const scrollToHeading = (id: string, fromSheet = false) => {
    const target = document.getElementById(id)
    if (!target) return
    const run = () => {
      const top = target.getBoundingClientRect().top + window.scrollY - 40
      window.scrollTo({ top, behavior: reducedMotion ? 'auto' : 'smooth' })
    }
    if (fromSheet) {
      closeSheet()
      window.setTimeout(run, reducedMotion ? 0 : 350)
    }
    else run()
  }

  buttons.forEach(button => button.addEventListener('click', () => scrollToHeading(button.dataset.tocId || ''), { signal: controller.signal }))
  mobileButtons.forEach(button => button.addEventListener('click', () => scrollToHeading(button.dataset.tocId || '', true), { signal: controller.signal }))
  window.addEventListener('scroll', scheduleUpdate, { passive: true, signal: controller.signal })
  window.addEventListener('resize', scheduleUpdate, { passive: true, signal: controller.signal })
  window.addEventListener('mousemove', event => root.classList.toggle('is-near', event.clientX <= 240), { passive: true, signal: controller.signal })

  const resizeObserver = new ResizeObserver(scheduleUpdate)
  resizeObserver.observe(document.body)

  function finishClose() {
    if (!sheet || !backdrop) return
    sheet.hidden = true
    backdrop.hidden = true
    sheet.setAttribute('aria-hidden', 'true')
  }

  function openSheet(event?: Event) {
    if (!sheet || !backdrop) return
    window.clearTimeout(closeTimer)
    sheetTrigger = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    sheet.hidden = false
    backdrop.hidden = false
    sheet.setAttribute('aria-hidden', 'false')
    requestAnimationFrame(() => {
      sheet.classList.add('is-open')
      backdrop.classList.add('is-open')
      sheet.querySelector<HTMLElement>('[data-mobile-toc-close]')?.focus()
    })
  }

  function closeSheet(immediate = false) {
    if (!sheet || !backdrop || sheet.hidden) return
    sheet.classList.remove('is-open')
    backdrop.classList.remove('is-open')
    document.body.style.overflow = previousBodyOverflow
    window.clearTimeout(closeTimer)
    if (immediate || reducedMotion) finishClose()
    else closeTimer = window.setTimeout(finishClose, 350)
    sheetTrigger?.focus()
    sheetTrigger = null
  }

  bar?.querySelector('[data-mobile-toc-open]')?.addEventListener('click', openSheet, { signal: controller.signal })
  sheet?.querySelector('[data-mobile-toc-close]')?.addEventListener('click', () => closeSheet(), { signal: controller.signal })
  backdrop?.addEventListener('click', () => closeSheet(), { signal: controller.signal })
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && sheet && !sheet.hidden) {
      event.preventDefault()
      closeSheet()
    }
  }, { signal: controller.signal })

  const copy = bar?.querySelector<HTMLButtonElement>('[data-mobile-copy]')
  copy?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(`${location.origin}${location.pathname}`) }
    catch { return }
    window.clearTimeout(copyTimer)
    copy.classList.add('is-copied')
    const icon = copy.querySelector<HTMLElement>('[data-mobile-copy-icon]')
    const text = copy.querySelector<HTMLElement>('[data-mobile-copy-text]')
    if (icon) icon.className = 'i-ri-check-line shrink-0 text-xl'
    if (text) text.hidden = false
    copy.title = labels.copied
    copy.setAttribute('aria-label', labels.copied)
    copyTimer = window.setTimeout(() => {
      copy.classList.remove('is-copied')
      if (icon) icon.className = 'i-ri-links-line shrink-0 text-xl'
      if (text) text.hidden = true
      copy.title = labels.link
      copy.setAttribute('aria-label', labels.link)
    }, 2000)
  }, { signal: controller.signal })

  document.addEventListener('astro:before-swap', () => {
    closeSheet(true)
    resizeObserver.disconnect()
    window.clearTimeout(closeTimer)
    window.clearTimeout(copyTimer)
    controller.abort()
  }, { once: true, signal: controller.signal })

  update()
  window.setTimeout(scheduleUpdate, 300)
  window.setTimeout(scheduleUpdate, 1500)
}

function initAllTocs() {
  document.querySelectorAll<HTMLElement>('[data-scroll-toc]').forEach(initToc)
}

document.addEventListener('astro:page-load', initAllTocs)
initAllTocs()
