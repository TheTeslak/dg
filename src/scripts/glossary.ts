/**
 * Glossary runtime — a vanilla-TS port of dg's GlossaryTerm.vue +
 * WrapperPost.vue glossary provider, preserving the full behavior:
 *
 * - desktop (≥1024px): hover shows a fixed margin note mirroring the ToC
 *   column; leaving the term closes it after 300ms; click pins it (pin icon
 *   with wiggle/fly-away animations); clicking the pinned term or the pin
 *   unpins with a 150ms delayed close; outside clicks close unpinned notes;
 * - the note is positioned at the term's viewport top, clamped to the
 *   viewport with a ResizeObserver re-clamping on content changes;
 * - mobile (<1024px): a bottom sheet with backdrop and body scroll lock.
 */

interface GlossaryState {
  term: string
  definition: string
  termEl: HTMLElement
  pinned: boolean
}

let active: GlossaryState | null = null
let marginNote: HTMLElement | null = null
let sheet: HTMLElement | null = null
let backdrop: HTMLElement | null = null
let preferredTop = 16
let hoverTimeout: ReturnType<typeof setTimeout> | null = null
let closeTimeout: ReturnType<typeof setTimeout> | null = null
let leaveFrame: ReturnType<typeof setTimeout> | null = null
let resizeObserver: ResizeObserver | null = null

const isMobile = () => window.innerWidth < 1024

// ---------------------------------------------------------------------------
// Margin note (desktop)
// ---------------------------------------------------------------------------

function ensureMarginNote(): HTMLElement {
  if (marginNote && document.body.contains(marginNote))
    return marginNote
  const el = document.createElement('div')
  el.className = 'margin-note'
  el.style.display = 'none'
  el.innerHTML = `
    <div class="margin-note-header">
      <div class="margin-note-term"></div>
      <div class="margin-note-pin i-solar:pin-bold pin-icon-hidden" role="button" tabindex="0" title="Unpin" aria-label="Unpin"></div>
    </div>
    <div class="margin-note-body"></div>
  `
  document.body.appendChild(el)
  const pin = el.querySelector<HTMLElement>('.margin-note-pin')!
  pin.addEventListener('pointerdown', (e) => {
    e.stopPropagation()
    e.preventDefault()
    unpin()
  })
  pin.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.stopPropagation()
      e.preventDefault()
      unpin()
    }
  })
  marginNote = el
  return el
}

function clampMarginNotePosition() {
  if (!marginNote || marginNote.style.display === 'none')
    return
  const maxTop = Math.max(16, window.innerHeight - marginNote.offsetHeight - 16)
  marginNote.style.top = `${Math.max(16, Math.min(preferredTop, maxTop))}px`
}

function renderMarginNote(state: GlossaryState, termChanged: boolean) {
  const note = ensureMarginNote()
  note.querySelector('.margin-note-term')!.textContent = state.term
  note.querySelector('.margin-note-body')!.innerHTML = state.definition

  const pin = note.querySelector<HTMLElement>('.margin-note-pin')!
  pin.classList.toggle('pin-icon-hidden', !state.pinned)
  pin.classList.toggle('pin-icon-shown', state.pinned)

  if (termChanged) {
    preferredTop = state.termEl.getBoundingClientRect().top
    note.style.top = `${Math.max(16, Math.min(preferredTop, window.innerHeight - 16))}px`
  }

  if (note.style.display === 'none') {
    note.style.display = ''
    note.classList.remove('margin-note-leave-active')
    note.classList.add('margin-note-enter-active')
  }

  requestAnimationFrame(() => clampMarginNotePosition())

  resizeObserver?.disconnect()
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = resizeObserver || new ResizeObserver(() => clampMarginNotePosition())
    resizeObserver.observe(note)
  }
}

function hideMarginNote() {
  if (!marginNote || marginNote.style.display === 'none')
    return
  const note = marginNote
  note.classList.remove('margin-note-enter-active')
  note.classList.add('margin-note-leave-active')
  const cleanup = () => {
    note.classList.remove('margin-note-leave-active')
    note.style.display = 'none'
  }
  note.addEventListener('animationend', cleanup, { once: true })
  setTimeout(cleanup, 250)
  resizeObserver?.disconnect()
}

// ---------------------------------------------------------------------------
// Bottom sheet (mobile)
// ---------------------------------------------------------------------------

function ensureSheet() {
  if (sheet && backdrop && document.body.contains(sheet))
    return { sheet, backdrop }
  backdrop = document.createElement('div')
  backdrop.className = 'glossary-backdrop is-hidden'
  backdrop.style.display = 'none'
  backdrop.addEventListener('click', () => setActive(null))
  document.body.appendChild(backdrop)

  sheet = document.createElement('div')
  sheet.className = 'glossary-sheet is-hidden'
  sheet.style.display = 'none'
  sheet.innerHTML = `
    <div class="glossary-sheet-header">
      <div class="glossary-sheet-term"></div>
      <button class="glossary-sheet-close" aria-label="Close"><div class="i-ri-close-line" aria-hidden="true"></div></button>
    </div>
    <div class="glossary-sheet-body"></div>
  `
  sheet.querySelector('.glossary-sheet-close')!.addEventListener('click', (e) => {
    e.stopPropagation()
    setActive(null)
  })
  document.body.appendChild(sheet)
  return { sheet, backdrop }
}

function renderSheet(state: GlossaryState) {
  const { sheet: sheetEl, backdrop: backdropEl } = ensureSheet()
  sheetEl.querySelector('.glossary-sheet-term')!.textContent = state.term
  sheetEl.querySelector('.glossary-sheet-body')!.innerHTML = state.definition
  sheetEl.style.display = ''
  backdropEl!.style.display = ''
  requestAnimationFrame(() => {
    sheetEl.classList.remove('is-hidden')
    backdropEl!.classList.remove('is-hidden')
  })
  document.body.style.overflow = 'hidden'
}

function hideSheet() {
  if (!sheet || !backdrop)
    return
  const sheetEl = sheet
  const backdropEl = backdrop
  sheetEl.classList.add('is-hidden')
  backdropEl.classList.add('is-hidden')
  setTimeout(() => {
    if (sheetEl.classList.contains('is-hidden')) {
      sheetEl.style.display = 'none'
      backdropEl.style.display = 'none'
    }
  }, 380)
  document.body.style.overflow = ''
}

// ---------------------------------------------------------------------------
// State machine (ported from WrapperPost provider + GlossaryTerm handlers)
// ---------------------------------------------------------------------------

function setActive(state: GlossaryState | null) {
  const termChanged = !!state && active?.termEl !== state.termEl
  const previous = active
  active = state

  previous?.termEl.classList.remove('is-active', 'is-pinned')

  if (!state) {
    hideMarginNote()
    hideSheet()
    return
  }

  state.termEl.classList.add('is-active')
  state.termEl.classList.toggle('is-pinned', state.pinned)
  state.termEl.setAttribute('aria-expanded', 'true')
  previous?.termEl !== state.termEl && previous?.termEl.setAttribute('aria-expanded', 'false')

  if (isMobile()) {
    hideMarginNote()
    renderSheet(state)
  }
  else {
    hideSheet()
    renderMarginNote(state, termChanged)
  }
}

function unpin() {
  if (!active)
    return
  const termEl = active.termEl
  setActive({ ...active, pinned: false })
  if (closeTimeout)
    clearTimeout(closeTimeout)
  closeTimeout = setTimeout(() => {
    closeTimeout = null
    if (active?.termEl === termEl && !active.pinned)
      setActive(null)
  }, 150)
}

function stateFor(termEl: HTMLElement, pinned: boolean): GlossaryState {
  return {
    term: termEl.getAttribute('data-term') || termEl.textContent || '',
    definition: termEl.getAttribute('data-definition') || '',
    termEl,
    pinned,
  }
}

function handleClick(termEl: HTMLElement) {
  if (hoverTimeout) {
    clearTimeout(hoverTimeout)
    hoverTimeout = null
  }

  // Toggle off if clicking the same term and it's already pinned:
  // fly the pin away first, then close after 150ms.
  if (active?.termEl === termEl && active.pinned) {
    unpin()
    return
  }

  setActive(stateFor(termEl, true))
}

function handleMouseEnter(termEl: HTMLElement) {
  if (isMobile())
    return
  if (leaveFrame) {
    clearTimeout(leaveFrame)
    leaveFrame = null
  }
  // Hovering the already pinned term should not unpin it. Hovering another
  // term replaces the pinned state with a regular hover preview.
  if (active?.pinned && active.termEl === termEl)
    return
  setActive(stateFor(termEl, false))
}

function handleMouseLeave(termEl: HTMLElement) {
  if (isMobile())
    return
  if (active?.termEl === termEl && !active.pinned) {
    leaveFrame = setTimeout(() => {
      if (active?.termEl === termEl && !active.pinned)
        setActive(null)
    }, 300)
  }
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------

function bindTerms() {
  document.querySelectorAll<HTMLElement>('[data-glossary-term]').forEach((termEl) => {
    if (termEl.dataset.glossaryBound === '1')
      return
    termEl.dataset.glossaryBound = '1'
    termEl.addEventListener('click', (e) => {
      e.stopPropagation()
      handleClick(termEl)
    })
    termEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.stopPropagation()
        e.preventDefault()
        handleClick(termEl)
      }
    })
    termEl.addEventListener('mouseenter', () => handleMouseEnter(termEl))
    termEl.addEventListener('mouseleave', () => handleMouseLeave(termEl))
    // Keep the margin note open while the pointer is over it.
    ensureMarginNote().addEventListener('mouseenter', () => {
      if (leaveFrame) {
        clearTimeout(leaveFrame)
        leaveFrame = null
      }
    })
    ensureMarginNote().addEventListener('mouseleave', () => {
      if (active && !active.pinned)
        handleMouseLeave(active.termEl)
    })
  })
}

function init() {
  bindTerms()

  if ((window as any).__glossaryGlobalBound)
    return
  ;(window as any).__glossaryGlobalBound = true

  document.addEventListener('click', (e) => {
    if (!active || active.pinned)
      return
    const target = e.target as HTMLElement
    if (target.closest('.glossary-term'))
      return
    if (target.closest('.margin-note') || target.closest('.glossary-sheet'))
      return
    setActive(null)
  })

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && active)
      setActive(null)
  })

  window.addEventListener('resize', () => {
    if (!active)
      return
    if (isMobile()) {
      hideMarginNote()
      renderSheet(active)
    }
    else {
      hideSheet()
      renderMarginNote(active, false)
    }
  })
}

init()
document.addEventListener('astro:page-load', init)
document.addEventListener('astro:before-swap', () => setActive(null))
