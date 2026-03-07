export interface ProjectItem {
  name: string
  link: string
  desc: string
  icon: string
}

export type ProjectsBySection = Record<string, ProjectItem[]>

export const projects: ProjectsBySection = {
  'Current Focus': [
    {
      name: 'Vite DevTools',
      link: 'https://github.com/vitejs/devtools',
      desc: 'Inspect the intermediate state of Vite bundle and pipeline',
      icon: 'i-simple-icons-vite',
    },
    {
      name: 'Nuxt DevTools',
      link: 'https://github.com/nuxt/devtools',
      desc: 'Unleash Nuxt Developer Experience',
      icon: 'i-logos-nuxt-icon saturate-0',
    },
    {
      name: 'Nuxt Playground',
      link: 'https://github.com/nuxt/learn.nuxt.com',
      desc: 'Interactive Playground for learning Nuxt',
      icon: 'i-logos-nuxt-icon saturate-0',
    },
  ],

  'Vite Ecosystem': [
    {
      name: 'Vite',
      link: 'https://github.com/vitejs/vite',
      desc: 'Native-ESM powered web dev build tool',
      icon: 'i-simple-icons-vite',
    },
    {
      name: 'Vitest',
      link: 'https://vitest.dev',
      desc: 'A blazing fast unit-test framework powered by Vite',
      icon: 'vitest',
    },
    {
      name: 'vite-plugin-inspect',
      link: 'https://github.com/antfu/vite-plugin-inspect',
      desc: 'Inspect the intermediate state of Vite plugins',
      icon: 'i-carbon-search-locate',
    },
    {
      name: 'vite-ssg',
      link: 'https://github.com/antfu/vite-ssg',
      desc: 'Server-side generation for Vite',
      icon: 'i-carbon-printer',
    },
  ],
}
