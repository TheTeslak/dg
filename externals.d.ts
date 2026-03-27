declare module 'markdown-it-table-of-contents' {
  const plugin: import('markdown-it').PluginWithOptions<Record<string, unknown>>
  export default plugin
}

declare module '*.svg?component' {
  const component: import('vue').DefineComponent<{}, {}, any>
  export default component
}

interface Window {
  twttr?: {
    widgets?: {
      load: (element?: Element | null) => void
    }
  }
}
