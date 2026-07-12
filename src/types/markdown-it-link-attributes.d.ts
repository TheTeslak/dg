declare module 'markdown-it-link-attributes' {
  import type MarkdownIt from 'markdown-it'

  interface Options {
    matcher?: (href: string, config: unknown) => boolean
    attrs?: Record<string, string>
  }

  const plugin: MarkdownIt.PluginWithOptions<Options>
  export default plugin
}
