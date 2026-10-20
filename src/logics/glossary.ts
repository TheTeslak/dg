import type { InjectionKey, Ref } from 'vue'

export interface GlossaryState {
  term: string
  definition: string
  termEl: HTMLElement
  pinned?: boolean
}

export const glossaryKey: InjectionKey<{
  active: Ref<GlossaryState | null>
  setActive: (state: GlossaryState | null) => void
}> = Symbol('glossary')
