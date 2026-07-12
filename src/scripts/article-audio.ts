class ArticleAudioPlayer extends HTMLElement {
  private audio!: HTMLAudioElement
  private interacted = false
  private waiting = false
  private observer?: IntersectionObserver
  private sentinel?: HTMLElement
  private rates = [1, 1.25, 1.5, 2]
  private rateIndex = 0
  private lastSaved = 0

  connectedCallback() {
    if (this.dataset.bound === 'true') return
    this.dataset.bound = 'true'
    this.audio = this.querySelector('audio')!
    const play = this.querySelector<HTMLButtonElement>('[data-audio-play]')!
    const back = this.querySelector<HTMLButtonElement>('[data-audio-back]')!
    const forward = this.querySelector<HTMLButtonElement>('[data-audio-forward]')!
    const speed = this.querySelector<HTMLButtonElement>('[data-audio-speed]')!
    const progress = this.querySelector<HTMLInputElement>('[data-audio-progress]')!

    play.addEventListener('click', () => this.audio.paused ? void this.start() : this.audio.pause())
    back.addEventListener('click', () => this.seek(this.audio.currentTime - 15))
    forward.addEventListener('click', () => this.seek(this.audio.currentTime + 15))
    speed.addEventListener('click', () => {
      this.rateIndex = (this.rateIndex + 1) % this.rates.length
      this.audio.playbackRate = this.rates[this.rateIndex]
      speed.textContent = `${this.rates[this.rateIndex]}×`
    })
    progress.addEventListener('input', () => this.seek(Number(progress.value)))
    this.audio.addEventListener('loadedmetadata', () => { this.restore(); this.update() })
    this.audio.addEventListener('timeupdate', () => { this.update(); this.save() })
    this.audio.addEventListener('play', () => { this.waiting = false; this.syncState() })
    this.audio.addEventListener('pause', () => this.syncState())
    this.audio.addEventListener('waiting', () => { this.waiting = true; this.syncState() })
    this.audio.addEventListener('canplay', () => { this.waiting = false; this.syncState() })
    this.audio.addEventListener('ended', () => { localStorage.removeItem(this.dataset.storageKey || ''); this.syncState() })
    this.audio.addEventListener('error', () => { this.querySelector<HTMLElement>('[data-audio-error]')!.hidden = false; this.syncState() })
    this.sentinel = document.createElement('span')
    this.sentinel.setAttribute('aria-hidden', 'true')
    this.sentinel.style.cssText = 'display:block;height:0;pointer-events:none'
    this.before(this.sentinel)
    this.observer = new IntersectionObserver(([entry]) => {
      const sticky = this.interacted && !entry.isIntersecting && entry.boundingClientRect.top < 0
      this.classList.toggle('is-sticky', sticky)
      if (this.sentinel) this.sentinel.style.height = sticky ? `${this.offsetHeight}px` : '0'
    })
    this.observer.observe(this.sentinel)
    this.updateMediaSession()
  }

  disconnectedCallback() {
    this.observer?.disconnect()
    this.sentinel?.remove()
    this.audio?.pause()
    if ('mediaSession' in navigator) {
      for (const action of ['play', 'pause', 'seekbackward', 'seekforward'] as MediaSessionAction[]) {
        try { navigator.mediaSession.setActionHandler(action, null) } catch {}
      }
    }
  }

  private async start() {
    this.interacted = true
    this.waiting = true
    this.syncState()
    try { await this.audio.play() } catch { this.waiting = false; this.syncState() }
  }

  private seek(value: number) {
    this.interacted = true
    const duration = Number.isFinite(this.audio.duration) ? this.audio.duration : value
    this.audio.currentTime = Math.max(0, Math.min(duration, value))
    this.update()
  }

  private update() {
    const duration = Number.isFinite(this.audio.duration) ? this.audio.duration : 0
    const progress = this.querySelector<HTMLInputElement>('[data-audio-progress]')!
    progress.max = String(duration)
    progress.value = String(this.audio.currentTime)
    this.querySelector<HTMLElement>('[data-audio-current]')!.textContent = this.format(this.audio.currentTime)
    const durationEl = this.querySelector<HTMLElement>('[data-audio-duration]')!
    if (duration && durationEl.textContent === '0:00') durationEl.textContent = this.format(duration)
    this.querySelector<HTMLElement>('[data-audio-timeline]')!.hidden = !(this.interacted || this.audio.currentTime > 0)
  }

  private syncState() {
    const icon = this.querySelector<HTMLElement>('[data-audio-play-icon]')!
    const spinner = this.querySelector<HTMLElement>('[data-audio-spinner]')!
    spinner.hidden = !this.waiting
    icon.hidden = this.waiting
    icon.className = this.audio.paused ? 'i-ri-play-fill' : 'i-ri-pause-fill'
    const button = this.querySelector<HTMLButtonElement>('[data-audio-play]')!
    const label = this.audio.paused ? this.dataset.playLabel : this.dataset.pauseLabel
    button.setAttribute('aria-label', label || '')
    button.title = label || ''
  }

  private restore() {
    try {
      const saved = Number(localStorage.getItem(this.dataset.storageKey || ''))
      if (saved > 1 && saved < this.audio.duration - 3) { this.audio.currentTime = saved; this.interacted = true }
    } catch {}
  }

  private save() {
    if (!this.interacted || Date.now() - this.lastSaved < 2000) return
    this.lastSaved = Date.now()
    try { localStorage.setItem(this.dataset.storageKey || '', this.audio.currentTime.toFixed(1)) } catch {}
  }

  private format(value: number) {
    const seconds = Math.max(0, Math.floor(value || 0))
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const tail = String(seconds % 60).padStart(2, '0')
    return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${tail}` : `${minutes}:${tail}`
  }

  private updateMediaSession() {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.metadata = new MediaMetadata({ title: this.dataset.title, artist: this.dataset.artist, artwork: [{ src: this.dataset.image || '/avatar.avif' }] })
    navigator.mediaSession.setActionHandler('play', () => void this.start())
    navigator.mediaSession.setActionHandler('pause', () => this.audio.pause())
    navigator.mediaSession.setActionHandler('seekbackward', details => this.seek(this.audio.currentTime - (details.seekOffset || 15)))
    navigator.mediaSession.setActionHandler('seekforward', details => this.seek(this.audio.currentTime + (details.seekOffset || 15)))
  }
}

if (!customElements.get('article-audio-player')) customElements.define('article-audio-player', ArticleAudioPlayer)
