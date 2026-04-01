export interface MagicLinkEntry {
  imageUrl: string
  link: string
}

export const magicLinks = {
  'NuxtLabs': {
    link: 'https://nuxtlabs.com',
    imageUrl: 'https://github.com/nuxtlabs.png',
  },
  'Vercel': {
    link: 'https://vercel.com',
    imageUrl: 'https://github.com/vercel.png',
  },
  'Vitest': {
    link: 'https://github.com/vitest-dev/vitest',
    imageUrl: 'https://github.com/vitest-dev.png',
  },
  'Slidev': {
    link: 'https://github.com/slidevjs/slidev',
    imageUrl: 'https://github.com/slidevjs.png',
  },
  'VueUse': {
    link: 'https://github.com/vueuse/vueuse',
    imageUrl: 'https://github.com/vueuse.png',
  },
  'UnoCSS': {
    link: 'https://github.com/unocss/unocss',
    imageUrl: 'https://github.com/unocss.png',
  },
  'Elk': {
    link: 'https://github.com/elk-zone/elk',
    imageUrl: 'https://github.com/elk-zone.png',
  },
  'Type Challenges': {
    link: 'https://github.com/type-challenges/type-challenges',
    imageUrl: 'https://github.com/type-challenges.png',
  },
  'Vue': {
    link: 'https://github.com/vuejs/core',
    imageUrl: 'https://vuejs.org/logo.svg',
  },
  'Nuxt': {
    link: 'https://github.com/nuxt/nuxt',
    imageUrl: 'https://nuxt.com/assets/design-kit/icon-green.svg',
  },
  'Vite': {
    link: 'https://github.com/vitejs/vite',
    imageUrl: 'https://vitejs.dev/logo.svg',
  },
  'Shiki': {
    link: 'https://github.com/shikijs/shiki',
    imageUrl: 'https://github.com/shikijs.png',
  },
  'Twoslash': {
    link: 'https://github.com/twoslashes/twoslash',
    imageUrl: 'https://github.com/twoslashes.png',
  },
  'ESLint Stylistic': {
    link: 'https://github.com/eslint-stylistic/eslint-stylistic',
    imageUrl: 'https://github.com/eslint-stylistic.png',
  },
} satisfies Record<string, MagicLinkEntry>
