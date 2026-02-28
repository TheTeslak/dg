/* eslint-disable */

/// <reference types="vite/client" />

// Декларации файлов .vue
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// Декларации файлов .md (так как они работают как Vue компоненты)
declare module '*.md' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// Расширение типов Vue Router
import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    frontmatter?: any
    locale?: string
  }
}