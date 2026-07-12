import MiniSearch from 'minisearch'

interface SearchDocument {
  id: string
  path: string
  title: string
  description: string
  body: string
  tags: string
  type: string
  date: string
  lang: string
  duration: number | null
  servedLocales?: string[]
}

const STORE_FIELDS = ['path', 'title', 'date', 'type', 'lang', 'duration', 'description', 'servedLocales']
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function highlighted(value: string, terms: string[]) {
  const safe = escapeHtml(value)
  if (!terms.length)
    return safe
  return safe.replace(new RegExp(`(${terms.sort((a, b) => b.length - a.length).map(escapeRegex).join('|')})`, 'gi'), '<mark>$1</mark>')
}

function snippets(body: string, terms: string[]) {
  const lower = body.toLowerCase()
  const positions = terms.flatMap((term) => {
    const found: number[] = []
    let from = 0
    while (from < lower.length) {
      const index = lower.indexOf(term.toLowerCase(), from)
      if (index < 0) break
      found.push(index)
      from = index + Math.max(1, term.length)
    }
    return found
  }).sort((a, b) => a - b)
  const starts = positions.length ? positions.slice(0, 3) : [0]
  return starts.map((position) => {
    const start = Math.max(0, position - 55)
    const end = Math.min(body.length, position + 100)
    return `${start ? '…' : ''}${body.slice(start, end).trim()}${end < body.length ? '…' : ''}`
  })
}

function init(root: HTMLElement) {
  if (root.dataset.bound === 'true') return
  root.dataset.bound = 'true'
  const locale = root.dataset.locale || 'en'
  const labels = JSON.parse(root.dataset.labels || '{}')
  const filter = root.querySelector<HTMLButtonElement>('[data-language-filter]')!
  const filterIcon = root.querySelector<HTMLElement>('[data-language-filter-icon]')!
  const navigation = root.querySelector<HTMLElement>('[data-search-navigation]')!
  const openButton = root.querySelector<HTMLButtonElement>('[data-search-open]')!
  const form = root.querySelector<HTMLElement>('[data-search-form]')!
  const input = root.querySelector<HTMLInputElement>('[data-search-input]')!
  const closeButton = root.querySelector<HTMLButtonElement>('[data-search-close]')!
  const panel = root.querySelector<HTMLElement>('[data-search-panel]')!
  const status = root.querySelector<HTMLElement>('[data-search-status]')!
  const results = root.querySelector<HTMLElement>('[data-search-results]')!
  const content = root.querySelector<HTMLElement>('[data-search-content]')!
  let search: MiniSearch<SearchDocument> | undefined
  let documents = new Map<string, SearchDocument>()
  let timer = 0
  const controller = new AbortController()

  const setOnlyLocale = (enabled: boolean) => {
    try { localStorage.setItem('teslak-only-language', String(enabled)) } catch {}
    filter.dataset.active = String(enabled)
    filterIcon.className = enabled ? 'i-carbon-checkbox-checked' : 'i-carbon-checkbox'
    document.documentElement.dispatchEvent(new CustomEvent('teslak-only-language-change', { detail: enabled }))
  }
  let onlyLocale = false
  try { onlyLocale = localStorage.getItem('teslak-only-language') === 'true' } catch {}
  setOnlyLocale(onlyLocale)
  filter.addEventListener('click', () => setOnlyLocale(filter.dataset.active !== 'true'))

  async function ensureIndex() {
    if (search) return
    status.textContent = labels.searchLoading
    const response = await fetch('/search-index.json')
    if (!response.ok) throw new Error(`Search index not found (${response.status})`)
    const payload = await response.json()
    const docs: SearchDocument[] = payload.documents || payload
    documents = new Map(docs.map(doc => [String(doc.id), doc]))
    search = payload.version === 1 && payload.index
      ? MiniSearch.loadJS(payload.index, { fields: ['title', 'description', 'tags', 'body'], storeFields: STORE_FIELDS }) as MiniSearch<SearchDocument>
      : new MiniSearch<SearchDocument>({ fields: ['title', 'description', 'tags', 'body'], storeFields: STORE_FIELDS })
    if (!(payload.version === 1 && payload.index)) search.addAll(docs)
  }

  const render = () => {
    const query = input.value.trim()
    results.replaceChildren()
    if (!query || !search) {
      status.hidden = false
      status.textContent = query ? labels.searchLoading : labels.searchStartTyping
      return
    }
    const found = search.search(query, { boost: { title: 10, description: 5, tags: 3, body: 1 }, prefix: true, fuzzy: 0.2, combineWith: 'AND' })
      .map((result: any) => ({ result, doc: documents.get(String(result.id)), rank: result.lang === locale ? 0 : (result.servedLocales || []).includes(locale) ? 1 : 2 }))
      .filter(item => item.doc)
      .sort((a, b) => a.rank - b.rank || b.result.score - a.result.score)
      .slice(0, 20)
    status.hidden = found.length > 0
    status.textContent = labels.searchNoResults
    for (const { result, doc } of found) {
      const terms = Object.keys(result.match || {})
      const served = doc!.servedLocales || []
      const path = served.includes(locale) ? doc!.path.replace(/^\/[^/]+\//, `/${locale}/`) : doc!.path
      const date = doc!.date ? new Intl.DateTimeFormat(locale === 'pt' ? 'pt-BR' : locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(doc!.date)) : ''
      const card = document.createElement('a')
      card.className = 'search-result-card'
      card.href = path
      card.innerHTML = `<span class="search-result-title">${doc!.lang !== locale ? `<span class="search-result-lang-tag">${escapeHtml(doc!.lang.toUpperCase())}</span>` : ''}${highlighted(doc!.title, terms)}</span><span class="search-result-snippets">${snippets(doc!.body, terms).map((text, index) => `${index ? '<span class="search-snippet-divider"></span>' : ''}<span class="search-result-snippet">${highlighted(text, terms)}</span>`).join('')}</span><span class="search-result-meta">${date ? `<span>${escapeHtml(date)}</span>` : ''}${doc!.duration ? `<span>· ${doc!.duration} ${escapeHtml(labels.durationSuffix)}</span>` : ''}</span>`
      results.append(card)
    }
  }

  async function open(initial = '') {
    navigation.hidden = true
    openButton.hidden = true
    filter.hidden = true
    form.hidden = false
    panel.hidden = false
    content.hidden = true
    input.value = initial
    input.focus()
    try { await ensureIndex(); render() } catch (error) { console.error('[search]', error); status.textContent = labels.searchNoResults }
  }
  function close() {
    navigation.hidden = false
    openButton.hidden = false
    filter.hidden = false
    form.hidden = true
    panel.hidden = true
    content.hidden = false
    input.value = ''
    results.replaceChildren()
    openButton.focus()
  }

  openButton.addEventListener('click', () => void open())
  closeButton.addEventListener('click', close)
  input.addEventListener('input', () => { window.clearTimeout(timer); timer = window.setTimeout(render, 160) })
  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); form.hidden ? void open() : close(); return }
    if (event.key === 'Escape' && !form.hidden) { event.preventDefault(); close(); return }
    const target = event.target as HTMLElement
    if (form.hidden && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName) && !target?.isContentEditable) {
      event.preventDefault(); void open(event.key)
    }
  }, { signal: controller.signal })
  document.addEventListener('astro:before-swap', () => controller.abort(), { once: true, signal: controller.signal })
}

function initAll() { document.querySelectorAll<HTMLElement>('[data-search-subnav]').forEach(init) }
document.addEventListener('astro:page-load', initAll)
initAll()
