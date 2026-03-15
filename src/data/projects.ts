export interface ProjectItem {
  name: string
  name_ru?: string
  name_es?: string
  link: string
  desc: string
  desc_ru?: string
  desc_es?: string
  icon?: string
}

export interface ProjectSection {
  title: string
  title_ru?: string
  title_es?: string
  projects: ProjectItem[]
}

export const projects: ProjectSection[] = [
  {
    title: 'kFamily',
    title_ru: 'kFamily',
    title_es: 'kFamily',
    projects: [
      {
        name: 'Vite DevTools',
        link: 'https://github.com/vitejs/devtools',
        desc: 'Inspect the intermediate state of Vite bundle and pipeline',
        desc_ru: 'Просмотр промежуточного состояния сборки Vite',
        desc_es: 'Herramientas para inspeccionar el estado del paquete de Vite',
        icon: 'i-simple-icons-vite',
      },
      {
        name: 'Nuxt DevTools',
        link: 'https://github.com/nuxt/devtools',
        desc: 'Unleash Nuxt Developer Experience',
        desc_ru: 'Новый уровень опыта разработки для Nuxt',
        desc_es: 'Desata la experiencia de desarrollador de Nuxt',
        icon: 'i-logos-nuxt-icon saturate-0',
      },
      {
        name: 'Nuxt Playground',
        link: 'https://github.com/nuxt/learn.nuxt.com',
        desc: 'Interactive Playground for learning Nuxt',
        desc_ru: 'Интерактивная песочница для изучения Nuxt',
        desc_es: 'Entorno interactivo para aprender Nuxt',
        icon: 'i-logos-nuxt-icon saturate-0',
      },
    ],
  },
  {
    title: 'Tools',
    title_ru: 'Инструменты',
    title_es: 'Herramientas',
    projects: [
      {
        name: 'Vite',
        link: 'https://github.com/vitejs/vite',
        desc: 'Native-ESM powered web dev build tool',
        desc_ru: 'Сборщик для веба на базе нативных ESM модулей',
        desc_es: 'Herramienta de desarrollo web impulsada por ESM',
        icon: 'i-simple-icons-vite',
      },
      {
        name: 'Vitest',
        link: 'https://vitest.dev',
        desc: 'A blazing fast unit-test framework powered by Vite',
        desc_ru: 'Невероятно быстрый фреймворк для юнит-тестов на базе Vite',
        desc_es: 'Framework de pruebas unitarias ultrarrápido',
        icon: 'vitest',
      },
      {
        name: 'vite-plugin-inspect',
        link: 'https://github.com/antfu/vite-plugin-inspect',
        desc: 'Inspect the intermediate state of Vite plugins',
        desc_ru: 'Инспекция работы плагинов Vite на промежуточных этапах',
        desc_es: 'Inspecciona el estado intermedio de los plugins de Vite',
        icon: 'i-carbon-search-locate',
      },
      {
        name: 'vite-ssg',
        link: 'https://github.com/antfu/vite-ssg',
        desc: 'Server-side generation for Vite',
        desc_ru: 'Генерация статических сайтов (SSG) для Vite',
        desc_es: 'Generación estática del lado del servidor para Vite',
        icon: 'i-carbon-printer',
      },
    ],
  },
]
