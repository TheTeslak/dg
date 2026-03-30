// Node 22+ with --localstorage-file (no valid path) partially defines
// globalThis.localStorage without getItem/setItem, crashing @typescript/vfs.
// This preload patches it before any module loads.
if (typeof globalThis.localStorage !== 'undefined' && typeof globalThis.localStorage.getItem !== 'function') {
  globalThis.localStorage = {
    _store: {},
    getItem(key) { return this._store[key] ?? null },
    setItem(key, value) { this._store[key] = String(value) },
    removeItem(key) { delete this._store[key] },
    clear() { this._store = {} },
    get length() { return Object.keys(this._store).length },
    key(i) { return Object.keys(this._store)[i] ?? null },
  }
}
