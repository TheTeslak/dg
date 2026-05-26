import type { ComputedRef } from 'vue'
import type { SupportedLocale } from './i18n-path'
import { useHead } from '@unhead/vue'
import { computed, toValue } from 'vue'
import { useRoute } from 'vue-router'
import { getLocaleFromPath, isSupportedLocale, setPathLocale, supportedLocales } from './i18n-path'
import { isDraftPost, isPostIndexable } from './post-visibility'
import { getCanonicalUrl, siteOrigin } from './site'

type Frontmatter = Record<string, any>

const siteName = 'Teslak'
const defaultImage = `${siteOrigin}/og.png`
const person = {
  '@type': 'Person',
  'name': siteName,
  'url': siteOrigin,
  'image': `${siteOrigin}/avatar.avif`,
  'sameAs': [
    'https://github.com/theTeslak',
    'https://t.me/Teslak',
    'https://t.me/TesNot',
    'https://t.me/Tes404',
  ],
}

const localeMeta: Record<SupportedLocale, { description: string, ogLocale: string }> = {
  en: { description: `${siteName}'s Blog`, ogLocale: 'en_US' },
  ru: { description: `Блог ${siteName}`, ogLocale: 'ru_RU' },
  es: { description: `Blog de ${siteName}`, ogLocale: 'es_ES' },
}

function optionalString(value: unknown) {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : undefined
}

function absoluteUrl(value: string | undefined) {
  if (!value)
    return undefined
  return new URL(value, siteOrigin).toString()
}

function toIsoDate(value: unknown) {
  if (!value)
    return undefined
  const date = new Date(value as string | Date)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

function getRouteSlug(path: string) {
  return path.split('/').filter(Boolean).at(-1)
}

function getDefaultXDefaultPath(path: string) {
  return path === '/' || /^\/(?:en|ru|es)\/?$/.test(path)
    ? '/'
    : setPathLocale(path, 'en')
}

export function useSEO(frontmatterRef: ComputedRef<Frontmatter> | Frontmatter = {}) {
  const route = useRoute()
  const frontmatter = computed(() => toValue(frontmatterRef) || {})
  const currentLocale = computed(() => getLocaleFromPath(route.path))
  const contentLocale = computed(() => {
    return isSupportedLocale(frontmatter.value.lang)
      ? frontmatter.value.lang
      : currentLocale.value
  })

  const title = computed(() => {
    const rawTitle = optionalString(frontmatter.value.title) || siteName
    return rawTitle === siteName || rawTitle.includes(siteName)
      ? rawTitle
      : `${rawTitle} · ${siteName}`
  })

  const description = computed(() => {
    return optionalString(frontmatter.value.description)
      || optionalString(frontmatter.value.excerpt)
      || localeMeta[currentLocale.value].description
  })

  const isArticle = computed(() => {
    return /^\/(?:en|ru|es)\/articles\/[^/]+\/?$/.test(route.path) && !!frontmatter.value.date
  })

  const originalLocale = computed<SupportedLocale | undefined>(() => {
    return isSupportedLocale(frontmatter.value.originalLocale)
      ? frontmatter.value.originalLocale
      : undefined
  })

  const articleLocales = computed<SupportedLocale[]>(() => {
    if (!Array.isArray(frontmatter.value.availableLocales))
      return []
    return frontmatter.value.availableLocales.filter(isSupportedLocale)
  })

  const isFallbackArticleAlias = computed(() => {
    return isArticle.value
      && !!originalLocale.value
      && !articleLocales.value.includes(currentLocale.value)
  })

  const canonicalPath = computed(() => {
    if (isFallbackArticleAlias.value && originalLocale.value)
      return setPathLocale(route.path, originalLocale.value)
    return route.path || '/'
  })

  const canonicalUrl = computed(() => getCanonicalUrl(canonicalPath.value))

  const image = computed(() => {
    const frontmatterImage = absoluteUrl(optionalString(frontmatter.value.image))
    if (frontmatterImage)
      return frontmatterImage

    if (!isArticle.value)
      return defaultImage

    const slug = getRouteSlug(canonicalPath.value)
    return slug ? `${siteOrigin}/og/${slug}.png` : defaultImage
  })

  const hreflangLocales = computed<SupportedLocale[]>(() => {
    if (isArticle.value && articleLocales.value.length > 0)
      return articleLocales.value
    return [...supportedLocales]
  })

  const hreflangLinks = computed(() => {
    const links: { key: string, rel: 'alternate', type: 'text/html', hreflang: string, href: string }[] = hreflangLocales.value.map(locale => ({
      key: `hreflang:${locale}`,
      rel: 'alternate',
      type: 'text/html',
      hreflang: locale,
      href: `${siteOrigin}${setPathLocale(route.path, locale)}`,
    }))

    let xDefaultPath = getDefaultXDefaultPath(route.path)
    if (isArticle.value && articleLocales.value.includes('en'))
      xDefaultPath = setPathLocale(route.path, 'en')
    else if (originalLocale.value)
      xDefaultPath = setPathLocale(route.path, originalLocale.value)

    links.push({
      key: 'hreflang:x-default',
      rel: 'alternate',
      type: 'text/html',
      hreflang: 'x-default',
      href: `${siteOrigin}${xDefaultPath}`,
    })

    return links
  })

  const robots = computed(() => {
    const explicitRobots = optionalString(frontmatter.value.robots)

    if (frontmatter.value.draft || isDraftPost(frontmatter.value.type))
      return 'noindex, nofollow'

    if (isFallbackArticleAlias.value)
      return 'noindex, follow'

    if (isArticle.value && !isPostIndexable(frontmatter.value))
      return explicitRobots || 'noindex, nofollow'

    return explicitRobots
  })

  const isProfilePage = computed(() => {
    if (!isArticle.value)
      return false
    const slug = getRouteSlug(canonicalPath.value)
    return (
      slug === 'who-is-teslak'
      || frontmatter.value.type === 'profile'
      || frontmatter.value.profile === true
    )
  })

  const schemaOrg = computed(() => {
    if (route.path === '/' || /^\/(?:en|ru|es)\/?$/.test(route.path)) {
      return [
        {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          'url': siteOrigin,
          'name': siteName,
          'inLanguage': currentLocale.value,
          'publisher': person,
        },
        {
          '@context': 'https://schema.org',
          ...person,
        },
      ]
    }

    if (!isArticle.value)
      return undefined

    const datePublished = toIsoDate(frontmatter.value.date)
    const dateModified = toIsoDate(frontmatter.value.updated) || datePublished

    if (isProfilePage.value) {
      return {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        'mainEntity': {
          ...person,
          description: description.value,
        },
        'inLanguage': optionalString(frontmatter.value.lang) || currentLocale.value,
        'datePublished': datePublished,
        'dateModified': dateModified,
      }
    }

    return {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      'mainEntityOfPage': {
        '@type': 'WebPage',
        '@id': canonicalUrl.value,
      },
      'headline': optionalString(frontmatter.value.title),
      'description': description.value,
      'image': [image.value],
      'datePublished': datePublished,
      'dateModified': dateModified,
      'author': person,
      'publisher': person,
      'inLanguage': optionalString(frontmatter.value.lang) || currentLocale.value,
    }
  })

  useHead(() => {
    const meta: any[] = [
      { key: 'description', name: 'description', content: description.value },
      { key: 'og:site_name', property: 'og:site_name', content: siteName },
      { key: 'og:title', property: 'og:title', content: title.value },
      { key: 'og:description', property: 'og:description', content: description.value },
      { key: 'og:url', property: 'og:url', content: canonicalUrl.value },
      { key: 'og:type', property: 'og:type', content: isArticle.value ? 'article' : 'website' },
      { key: 'og:image', property: 'og:image', content: image.value },
      { key: 'og:locale', property: 'og:locale', content: localeMeta[isArticle.value ? contentLocale.value : currentLocale.value].ogLocale },
      { key: 'twitter:card', name: 'twitter:card', content: 'summary_large_image' },
      { key: 'twitter:title', name: 'twitter:title', content: title.value },
      { key: 'twitter:description', name: 'twitter:description', content: description.value },
      { key: 'twitter:image', name: 'twitter:image', content: image.value },
    ]

    for (const locale of hreflangLocales.value) {
      if (locale !== (isArticle.value ? contentLocale.value : currentLocale.value)) {
        meta.push({
          key: `og:locale:alternate:${locale}`,
          property: 'og:locale:alternate',
          content: localeMeta[locale].ogLocale,
        })
      }
    }

    if (robots.value)
      meta.push({ key: 'robots', name: 'robots', content: robots.value })

    if (isArticle.value) {
      const published = toIsoDate(frontmatter.value.date)
      const modified = toIsoDate(frontmatter.value.updated) || published

      if (published)
        meta.push({ key: 'article:published_time', property: 'article:published_time', content: published })
      if (modified)
        meta.push({ key: 'article:modified_time', property: 'article:modified_time', content: modified })

      meta.push({ key: 'article:author', property: 'article:author', content: siteName })

      if (Array.isArray(frontmatter.value.tags)) {
        for (const tag of frontmatter.value.tags) {
          if (typeof tag === 'string' && tag.trim()) {
            meta.push({
              key: `article:tag:${tag}`,
              property: 'article:tag',
              content: tag.trim(),
            })
          }
        }
      }
    }

    return {
      title: title.value,
      meta,
      link: [
        { key: 'canonical', rel: 'canonical', href: canonicalUrl.value },
        ...hreflangLinks.value,
      ],
      script: schemaOrg.value
        ? [{
            key: 'schema-org',
            type: 'application/ld+json',
            innerHTML: JSON.stringify(schemaOrg.value),
          }]
        : [],
    }
  })
}
