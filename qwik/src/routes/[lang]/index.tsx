import type { JSXOutput } from '@qwik.dev/core'
import type { DocumentHead } from '@qwik.dev/router'
import type { SupportedLocale } from '../../lib/locales'
import { component$ } from '@qwik.dev/core'
import { Link, useLocation } from '@qwik.dev/router'
import { HomeSponsorButtons } from '../../components/home-sponsor-buttons'
import { MagicLink } from '../../components/magic-link'
import { isSupportedLocale } from '../../lib/locales'

const socialLinks = [
  {
    href: 'https://github.com/antfu',
    icon: 'i-simple-icons-github',
    label: 'GitHub',
  },
  {
    href: 'https://bsky.app/profile/antfu.me',
    icon: 'i-ri-bluesky-fill',
    label: 'Bluesky',
  },
  {
    href: 'https://www.threads.net/@antfu7',
    icon: 'i-ri-threads-line',
    label: 'Threads',
  },
  {
    href: 'https://chat.antfu.me',
    icon: 'i-simple-icons-discord',
    label: 'Discord Server',
  },
  {
    href: 'https://www.youtube.com/anthonyfu7',
    icon: 'i-simple-icons-youtube',
    label: 'YouTube',
  },
  {
    href: 'https://www.instagram.com/antfu7',
    icon: 'i-simple-icons-instagram',
    label: 'Instagram',
  },
  {
    href: 'https://space.bilibili.com/668380',
    icon: 'i-simple-icons-bilibili',
    label: '哔哩哔哩',
  },
  {
    href: 'https://x.com/antfuzh',
    icon: 'i-ri-twitter-x-fill',
    label: '中文推',
  },
  {
    href: 'https://x.com/antfujp',
    icon: 'i-ri-twitter-x-fill',
    label: '日本語',
  },
] as const

const inactiveLinks = [
  {
    href: 'https://elk.zone/m.webtoo.ls/@antfu',
    icon: 'i-simple-icons-mastodon',
    label: 'Mastodon',
  },
  {
    href: 'https://x.com/antfu7',
    icon: 'i-ri-twitter-x-fill',
    label: 'Twitter',
  },
  {
    href: 'https://www.zhihu.com/people/antfu',
    icon: 'i-simple-icons-zhihu',
    label: '知乎',
  },
  {
    href: 'https://weibo.com/u/7485197193',
    icon: 'i-simple-icons-sinaweibo',
    label: '微博',
  },
] as const

const descriptions: Record<SupportedLocale, string> = {
  en: 'Anthony Fu\'s Portfolio',
  ru: 'Портфолио Anthony Fu',
  es: 'Portafolio de Anthony Fu',
}

function renderEnglishHome(locale: SupportedLocale): JSXOutput {
  return (
    <>
      <p>Hey! I&apos;m Anthony Fu, a fanatical open sourceror and design engineer.</p>

      <p>
        Working at
        {' '}
        {MagicLink({ text: 'NuxtLabs' })}
        {' '}
        /
        {' '}
        {MagicLink({ text: 'Vercel' })}
        <br />
        Creator of
        {' '}
        {MagicLink({ text: 'Vitest' })}
        {' '}
        {MagicLink({ text: 'Slidev' })}
        {' '}
        {MagicLink({ text: 'VueUse' })}
        {' '}
        {MagicLink({ text: 'UnoCSS' })}
        {' '}
        {MagicLink({ text: 'Elk' })}
        {' '}
        {MagicLink({ text: 'Type Challenges' })}
        <br />
        Core team of
        {' '}
        {MagicLink({ text: 'Vue' })}
        {' '}
        {MagicLink({ text: 'Nuxt' })}
        {' '}
        {MagicLink({ text: 'Vite' })}
        <br />
        Maintaining
        {' '}
        {MagicLink({ text: 'Shiki' })}
        {' '}
        {MagicLink({ text: 'Twoslash' })}
        {' '}
        {MagicLink({ text: 'ESLint Stylistic' })}
      </p>

      <p>
        Dreaming up cool ideas and making them come true is where my passion
        lies. I am enthusiastic about building tools that help myself and others
        to be more productive and enjoy the process of crafting. You can find my
        {' '}
        <Link href={`/${locale}/projects`}>full projects list here</Link>
        .
      </p>

      <p>
        I write
        {' '}
        <Link href={`/${locale}/articles`}>blog posts</Link>
        {' '}
        about open source, coding, and related ideas.
      </p>

      <p>
        From time to time, I make some generative-art and interactivity
        experiments on
        {' '}
        <a href="https://100.antfu.me/" target="_blank" rel="noopener noreferrer">
          100.antfu.me
        </a>
        .
      </p>

      <p>
        Outside of programming, I enjoy doing photography and traveling. I post
        {' '}
        <Link href={`/${locale}/photos`}>photos on this page</Link>
        . I also love anime, movies and dramas, and I keep a list of my
        {' '}
        <Link href={`/${locale}/media`}>media consumption</Link>
        . In case you are interested, here are the
        {' '}
        <Link href={`/${locale}/use`}>hardware and software I use</Link>
        .
      </p>

      <p>
        I recently
        {' '}
        <a href="/en/articles/hello-tokyo">
          moved to
          {' '}
          <span lang="ja">東京</span>
          {' '}
          (Tokyo)
        </a>
        , if you are around, please reach out and let&apos;s have some coffee or
        work together.
      </p>

      <div class="flex-auto" />

      <hr />

      <p>Find me on</p>

      <p class="mt-[-0.5rem]! flex flex-wrap gap-2">
        {socialLinks.map(link => (
          <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">
            <span aria-hidden="true" class={`${link.icon} op75`} />
            {' '}
            {link.label}
          </a>
        ))}
      </p>

      <p>
        Or mail me at
        {' '}
        <span class="font-mono">
          hi
          <span aria-hidden="true" class="i-carbon-at" />
          antfu.me
        </span>
      </p>

      <p>
        <span class="op50">(</span>
        {' '}
        Inactive on
        {' '}
        <span class="inline-flex flex-wrap gap-2">
          {inactiveLinks.map(link => (
            <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">
              <span aria-hidden="true" class={`${link.icon} op75`} />
              {' '}
              {link.label}
            </a>
          ))}
        </span>
        {' '}
        <span class="op50">)</span>
      </p>

      <hr />

      <HomeSponsorButtons locale={locale} />
    </>
  )
}

function renderRussianHome(locale: SupportedLocale): JSXOutput {
  return (
    <>
      <p>Привет! Я Anthony Fu, фанатичный open source разработчик и дизайнер-инженер.</p>

      <p>
        Работаю в
        {' '}
        {MagicLink({ text: 'NuxtLabs' })}
        {' '}
        /
        {' '}
        {MagicLink({ text: 'Vercel' })}
        <br />
        Создатель
        {' '}
        {MagicLink({ text: 'Vitest' })}
        {' '}
        {MagicLink({ text: 'Slidev' })}
        {' '}
        {MagicLink({ text: 'VueUse' })}
        {' '}
        {MagicLink({ text: 'UnoCSS' })}
        {' '}
        {MagicLink({ text: 'Elk' })}
        {' '}
        {MagicLink({ text: 'Type Challenges' })}
        <br />
        Участник Core team
        {' '}
        {MagicLink({ text: 'Vue' })}
        {' '}
        {MagicLink({ text: 'Nuxt' })}
        {' '}
        {MagicLink({ text: 'Vite' })}
        <br />
        Поддерживаю
        {' '}
        {MagicLink({ text: 'Shiki' })}
        {' '}
        {MagicLink({ text: 'Twoslash' })}
        {' '}
        {MagicLink({ text: 'ESLint Stylistic' })}
      </p>

      <p>
        Моя страсть — придумывать крутые идеи и воплощать их в жизнь. Я с
        энтузиазмом создаю инструменты, которые помогают мне и другим быть
        продуктивнее и получать удовольствие от процесса разработки. Мой
        {' '}
        <Link href={`/${locale}/projects`}>полный список проектов можно найти здесь</Link>
        .
      </p>

      <p>
        Я пишу
        {' '}
        <Link href={`/${locale}/articles`}>посты в блоге</Link>
        {' '}
        об открытом коде, программировании и не только.
      </p>

      <p>
        Время от времени я создаю генеративное искусство и интерактивные
        эксперименты на
        {' '}
        <a href="https://100.antfu.me/" target="_blank" rel="noopener noreferrer">
          100.antfu.me
        </a>
        .
      </p>

      <p>
        Вне программирования я увлекаюсь фотографией и путешествиями. Я публикую
        {' '}
        <Link href={`/${locale}/photos`}>фотографии на этой странице</Link>
        . Также я люблю аниме, кино и сериалы, и веду список того, что
        {' '}
        <Link href={`/${locale}/media`}>посмотрел или прочитал</Link>
        . Если вам интересно, вот список
        {' '}
        <Link href={`/${locale}/use`}>железа и софта, который я использую</Link>
        .
      </p>

      <p>
        Недавно я
        {' '}
        <a href="/en/articles/hello-tokyo">
          переехал в
          {' '}
          <span lang="ja">東京</span>
          {' '}
          (Токио)
        </a>
        . Если вы где-то рядом, пишите — выпьем кофе или поработаем вместе.
      </p>

      <div class="flex-auto" />

      <hr />

      <p>Меня можно найти здесь:</p>

      <p class="mt-[-0.5rem]! flex flex-wrap gap-2">
        {socialLinks.map(link => (
          <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">
            <span aria-hidden="true" class={`${link.icon} op75`} />
            {' '}
            {link.label}
          </a>
        ))}
      </p>

      <p>
        Или пишите на почту:
        {' '}
        <span class="font-mono">
          hi
          <span aria-hidden="true" class="i-carbon-at" />
          antfu.me
        </span>
      </p>

      <p>
        <span class="op50">(</span>
        {' '}
        Неактивен в
        {' '}
        <span class="inline-flex flex-wrap gap-2">
          {inactiveLinks.map(link => (
            <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">
              <span aria-hidden="true" class={`${link.icon} op75`} />
              {' '}
              {link.label}
            </a>
          ))}
        </span>
        {' '}
        <span class="op50">)</span>
      </p>

      <hr />

      <HomeSponsorButtons locale={locale} />
    </>
  )
}

function renderSpanishHome(locale: SupportedLocale): JSXOutput {
  return (
    <>
      <p>Hola! Soy Anthony Fu, un apasionado del código abierto y diseñador-ingeniero.</p>

      <p>
        Trabajando en
        {' '}
        {MagicLink({ text: 'NuxtLabs' })}
        {' '}
        /
        {' '}
        {MagicLink({ text: 'Vercel' })}
        <br />
        Creador de
        {' '}
        {MagicLink({ text: 'Vitest' })}
        {' '}
        {MagicLink({ text: 'Slidev' })}
        {' '}
        {MagicLink({ text: 'VueUse' })}
        {' '}
        {MagicLink({ text: 'UnoCSS' })}
        {' '}
        {MagicLink({ text: 'Elk' })}
        {' '}
        {MagicLink({ text: 'Type Challenges' })}
        <br />
        Equipo principal de
        {' '}
        {MagicLink({ text: 'Vue' })}
        {' '}
        {MagicLink({ text: 'Nuxt' })}
        {' '}
        {MagicLink({ text: 'Vite' })}
        <br />
        Manteniendo
        {' '}
        {MagicLink({ text: 'Shiki' })}
        {' '}
        {MagicLink({ text: 'Twoslash' })}
        {' '}
        {MagicLink({ text: 'ESLint Stylistic' })}
      </p>

      <div class="flex-auto" />

      <hr />

      <HomeSponsorButtons locale={locale} />
    </>
  )
}

export default component$(() => {
  const location = useLocation()

  if (!isSupportedLocale(location.params.lang)) {
    return (
      <section class="prose mx-auto max-w-3xl">
        <h1>Locale not found</h1>
        <p>Use one of the supported locales: en, ru, es.</p>
      </section>
    )
  }

  const locale = location.params.lang as SupportedLocale
  const content = locale === 'ru'
    ? renderRussianHome(locale)
    : locale === 'es'
      ? renderSpanishHome(locale)
      : renderEnglishHome(locale)

  return (
    <section class="prose m-auto">
      <h1 class="mb-0 slide-enter-50">Anthony Fu</h1>
      <div class="slide-enter-content">
        {content}
      </div>
    </section>
  )
})

export const head: DocumentHead = ({ params }) => {
  const locale = isSupportedLocale(params.lang)
    ? (params.lang as SupportedLocale)
    : 'en'

  return {
    title: 'Anthony Fu',
    meta: [
      {
        name: 'description',
        content: descriptions[locale],
      },
    ],
  }
}
