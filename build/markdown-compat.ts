import type { MarkdownExit, PluginSimple as MarkdownExitPluginSimple, PluginWithOptions as MarkdownExitPluginWithOptions } from 'markdown-exit'
import type { PluginSimple as MarkdownItPluginSimple, PluginWithOptions as MarkdownItPluginWithOptions } from 'markdown-it'

/**
 * markdown-exit is runtime-compatible with markdown-it plugins, but legacy
 * plugins still publish markdown-it-specific TypeScript signatures. Keep the
 * compatibility assertion at this boundary instead of weakening the parser
 * type throughout the Markdown pipeline.
 */
export function useMarkdownItPlugin(md: MarkdownExit, plugin: MarkdownItPluginSimple): void
export function useMarkdownItPlugin<T>(md: MarkdownExit, plugin: MarkdownItPluginWithOptions<T>, options: T): void
export function useMarkdownItPlugin<T>(
  md: MarkdownExit,
  plugin: MarkdownItPluginSimple | MarkdownItPluginWithOptions<T>,
  options?: T,
) {
  if (options === undefined)
    md.use(plugin as unknown as MarkdownExitPluginSimple)
  else
    md.use(plugin as unknown as MarkdownExitPluginWithOptions<T>, options)
}
