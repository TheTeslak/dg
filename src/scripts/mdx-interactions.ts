// Client-side interactions for markdown-rendered components: text-copy
// buttons, lazy YouTube embeds and animated spoilers (WAAPI height
// animation ported from dg WrapperPost.vue). Glossary lives in glossary.ts.
import './glossary.ts'

// ---- text-copy ----
;(() => {
  function init() {
    document.querySelectorAll<HTMLButtonElement>('[data-text-copy]').forEach((btn) => {
      if (btn.dataset.bound === '1')
        return
      btn.dataset.bound = '1'
      let timer: ReturnType<typeof setTimeout> | undefined
      btn.addEventListener('click', async () => {
        const value = btn.dataset.value || btn.querySelector('.text-copy-value')?.textContent || ''
        try {
          await navigator.clipboard.writeText(value)
          btn.classList.add('is-copied')
          if (timer)
            clearTimeout(timer)
          timer = setTimeout(() => btn.classList.remove('is-copied'), 1500)
        }
        catch {}
      })
    })
  }
  init()
  document.addEventListener('astro:page-load', init)
})()

// ---- lazy youtube ----
;(() => {
  function init() {
    document.querySelectorAll<HTMLElement>('[data-youtube-embed]').forEach((wrap) => {
      const trigger = wrap.querySelector<HTMLButtonElement>('[data-youtube-trigger]')
      if (!trigger || trigger.dataset.bound === '1')
        return
      trigger.dataset.bound = '1'
      trigger.addEventListener('click', () => {
        const src = wrap.dataset.src
        if (!src)
          return
        const iframe = document.createElement('iframe')
        iframe.src = `${src}&autoplay=1`
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
        iframe.allowFullscreen = true
        iframe.loading = 'lazy'
        iframe.title = trigger.getAttribute('aria-label') || 'YouTube video'
        wrap.innerHTML = ''
        wrap.appendChild(iframe)
      })
    })
  }
  init()
  document.addEventListener('astro:page-load', init)
})()

// ---- animated spoilers (dg WrapperPost animateSpoiler port) ----
;(() => {
  function animateSpoiler(details: HTMLDetailsElement) {
    const summary = details.querySelector<HTMLElement>('summary')
    const body = details.querySelector<HTMLElement>('.spoiler-content')
    if (!summary || !body)
      return

    let running: Animation | null = null

    summary.addEventListener('click', (e) => {
      e.preventDefault()

      if (running) {
        running.cancel()
        running = null
      }

      const isOpen = details.hasAttribute('open')

      if (!isOpen) {
        details.setAttribute('open', '')
        const h = body.scrollHeight
        running = body.animate(
          [
            { height: '0px', opacity: 0 },
            { height: `${h}px`, opacity: 1 },
          ],
          { duration: 280, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
        )
        running.onfinish = () => {
          running = null
        }
      }
      else {
        const h = body.scrollHeight
        running = body.animate(
          [
            { height: `${h}px`, opacity: 1 },
            { height: '0px', opacity: 0 },
          ],
          { duration: 220, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' },
        )
        running.onfinish = () => {
          details.removeAttribute('open')
          running!.cancel()
          running = null
        }
      }
    })
  }

  function init() {
    document.querySelectorAll<HTMLDetailsElement>('details.spoiler').forEach((details) => {
      if (details.dataset.spoilerBound === '1')
        return
      details.dataset.spoilerBound = '1'
      animateSpoiler(details)
    })
  }
  init()
  document.addEventListener('astro:page-load', init)
})()
