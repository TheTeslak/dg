import {
  createLocalFontProcessor,
} from '@unocss/preset-web-fonts/local'
import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetWebFonts,
  presetWind3,
  transformerDirectives,
} from 'unocss'

export default defineConfig({
  shortcuts: [
    {
      'bg-base': 'bg-[var(--c-bg)]',
      'color-base': 'text-black dark:text-white',
      'border-base': 'border-[#8884]',
      'quote-wisper': 'font-wisper font-bold op80 text-1.75rem leading-2rem',
      'img-wide': 'block w-full rounded-xl shadow !my-[1.75em] lg:!w-[120%] lg:!-mx-[10%] lg:!max-w-none',
    },
    [/^btn-(\w+)$/, ([, color]) => `op50 px2.5 py1 transition-all duration-200 ease-out no-underline! hover:(op100 text-${color} bg-${color}/10) border border-base! rounded`],
  ],
  rules: [
    [/^slide-enter-(\d+)$/, ([, n]) => ({
      '--enter-stage': n,
    })],
  ],
  presets: [
    presetIcons({
      extraProperties: {
        'display': 'inline-block',
        'height': '1.2em',
        'width': '1.2em',
        'vertical-align': 'text-bottom',
      },
    }),
    presetAttributify(),
    presetWind3(),
    presetWebFonts({
      fonts: {
        sans: 'Inter',
        mono: 'IBM Plex Mono',
        condensed: 'Roboto Condensed',
        wisper: 'Caveat',
      },
      // Fonts are downloaded at build time and self-hosted from /fonts —
      // no runtime requests to a third-party CDN (matches the original dg).
      processors: createLocalFontProcessor({
        cacheDir: 'node_modules/.cache/unocss/fonts',
        fontAssetsDir: 'public/fonts',
        fontServeBaseUrl: '/fonts',
      }),
    }),
  ],
  transformers: [
    transformerDirectives(),
  ],
  safelist: [
    'img-wide',
    'i-solar:pin-bold',
    'i-ri-question-line',
    'i-ri-arrow-right-s-line',
    'i-carbon-translate',
    'i-ri-menu-2-fill',
    'i-ri-sun-line',
    'i-ri-moon-line',
    'i-ri-close-line',
    'i-ri-search-line',
    'i-ri-arrow-up-line',
    'i-ri-rss-line',
    'i-ri-telegram-2-line',
    'i-ri-links-line',
    'i-ri-check-line',
    'i-ri-play-fill',
    'i-ri-pause-fill',
    'i-ri-download-line',
    'i-ri-alert-line',
    'i-ri-corner-left-up-line',
    'i-carbon-language',
    'i-carbon-checkmark',
    'i-carbon-arrow-up-right',
    'i-carbon-at',
    'i-fluent-skip-back-15-20-regular',
    'i-fluent-skip-forward-15-20-regular',
  ],
})
