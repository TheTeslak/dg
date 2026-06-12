import type { SupportedLocale } from '../src/locales/config'
import { basename, resolve } from 'node:path'
import process from 'node:process'
import fg from 'fast-glob'
import fs from 'fs-extra'
import matter from 'gray-matter'
import {
  getArticleFallbackSource,
  getArticleInfo,
  getArticleLocaleStates,
  getArticleServedLocales,
} from '../build/article'
import localeRedirect, { config as localeRedirectConfig } from '../netlify/edge-functions/locale-redirect'
import {
  defaultLocale,
  isSupportedLocale,
  localeConfig,
  supportedLocales,
} from '../src/locales/config'
import { getPreferredLocale, negotiateLocale } from '../src/locales/negotiation'
import { getArticlePath, getArticleSearchPath } from '../src/logics/article-path'
import { isPostIndexable, isPostRoutable } from '../src/logics/post-visibility'

// These pages define the localized site shell, so silently falling back would hide incomplete locales.
const requiredPages = [
  '[...404].md',
  'articles/index.md',
  'index.md',
  'notes.md',
  'now.md',
  'photos.md',
  'projects.md',
] as const

function getFluentKeys(source: string) {
  return new Set(
    source
      .split('\n')
      .map(line => line.match(/^(-?[a-z][a-z0-9-]*)\s*=/)?.[1])
      .filter((key): key is string => !!key),
  )
}

function difference(left: Set<string>, right: Set<string>) {
  return [...left].filter(value => !right.has(value)).sort()
}

async function run() {
  const failures: string[] = []
  const configuredLocales = new Set(supportedLocales)
  const localeDirectories = await fg('*', { cwd: 'pages', onlyDirectories: true })
  const languageTags = new Set<string>()

  for (const locale of supportedLocales) {
    const config = localeConfig[locale]
    if (!config.ogLocale)
      failures.push(`${locale}: missing Open Graph locale metadata.`)
    if (!config.languageTag) {
      failures.push(`${locale}: missing BCP 47 language tag.`)
    }
    else {
      try {
        const normalizedTag = new Intl.Locale(config.languageTag).toString().toLowerCase()
        if (languageTags.has(normalizedTag))
          failures.push(`${locale}: duplicate language tag "${config.languageTag}".`)
        languageTags.add(normalizedTag)
      }
      catch {
        failures.push(`${locale}: invalid language tag "${config.languageTag}".`)
      }
    }

    const fallbacks = [...config.messageFallbackLocales] as string[]
    for (const [index, fallback] of fallbacks.entries()) {
      if (!isSupportedLocale(fallback))
        failures.push(`${locale}: unsupported fallback locale "${fallback}".`)
      if (fallback === locale)
        failures.push(`${locale}: locale cannot fall back to itself.`)
      if (fallbacks.indexOf(fallback) !== index)
        failures.push(`${locale}: duplicate fallback locale "${fallback}".`)
    }

    const fluentPath = resolve(`src/locales/${locale}.ftl`)
    if (!await fs.pathExists(fluentPath))
      failures.push(`${locale}: missing ${fluentPath}.`)

    for (const page of requiredPages) {
      const pagePath = resolve(`pages/${locale}/${page}`)
      if (!await fs.pathExists(pagePath))
        failures.push(`${locale}: missing pages/${locale}/${page}.`)
    }
  }

  for (const locale of localeDirectories) {
    if (!configuredLocales.has(locale as SupportedLocale))
      failures.push(`pages/${locale}: locale directory is not registered.`)
  }

  const fluentLocales = (await fg('*.ftl', { cwd: 'src/locales' }))
    .map(file => file.slice(0, -'.ftl'.length))
  for (const locale of fluentLocales) {
    if (!configuredLocales.has(locale as SupportedLocale))
      failures.push(`src/locales/${locale}.ftl: locale file is not registered.`)
  }

  const negotiationCases: Array<{
    acceptLanguage?: string
    cookie?: unknown
    expected: SupportedLocale
    name: string
  }> = [
    {
      name: 'explicit cookie',
      cookie: 'fr',
      acceptLanguage: 'ru;q=1',
      expected: 'fr',
    },
    {
      name: 'regional locale',
      acceptLanguage: 'pt-BR,pt;q=0.9',
      expected: 'pt',
    },
    {
      name: 'quality ordering',
      acceptLanguage: 'en;q=0.5,de;q=0.9',
      expected: 'de',
    },
    {
      name: 'zero quality',
      acceptLanguage: 'ru;q=0,en;q=0.5',
      expected: 'en',
    },
    {
      name: 'invalid quality',
      acceptLanguage: 'fr;q=bogus,de;q=0.5',
      expected: 'de',
    },
    {
      name: 'invalid parameter',
      acceptLanguage: 'de;level=1,es;q=0.8',
      expected: 'es',
    },
    {
      name: 'equal quality order',
      acceptLanguage: 'fr;q=0.8,de;q=0.8',
      expected: 'fr',
    },
    {
      name: 'underscore normalization',
      acceptLanguage: 'pt_BR',
      expected: 'pt',
    },
    {
      name: 'wildcard and rejected locale',
      acceptLanguage: '*,ru;q=0',
      expected: defaultLocale,
    },
    {
      name: 'malformed cookie',
      cookie: '%',
      acceptLanguage: 'ru',
      expected: 'ru',
    },
  ]

  for (const testCase of negotiationCases) {
    const actual = negotiateLocale(testCase.cookie, testCase.acceptLanguage)
    if (actual !== testCase.expected) {
      failures.push(
        `locale negotiation: "${testCase.name}" resolved to "${actual}", `
        + `expected "${testCase.expected}".`,
      )
    }
  }

  if (getPreferredLocale(null) !== defaultLocale)
    failures.push('locale negotiation: missing Accept-Language must use the default locale.')

  const edgePaths = new Set(localeRedirectConfig.path)
  if (!edgePaths.has('/') || !edgePaths.has('/index.html'))
    failures.push('Netlify locale redirect must cover both "/" and "/index.html".')
  if (await fs.pathExists('middleware.ts'))
    failures.push('Locale negotiation must use Netlify Edge instead of root middleware.ts.')

  const edgeCases = [
    {
      url: 'https://example.com/?utm_source=test',
      cookie: 'ru',
      acceptLanguage: 'de',
      expected: 'https://example.com/ru?utm_source=test',
    },
    {
      url: 'https://example.com/index.html?ref=test',
      cookie: undefined,
      acceptLanguage: 'fr-CA,fr;q=0.9',
      expected: 'https://example.com/fr?ref=test',
    },
  ] as const

  for (const testCase of edgeCases) {
    const request = new Request(testCase.url, {
      headers: { 'accept-language': testCase.acceptLanguage },
    })
    const response = localeRedirect(request, {
      cookies: { get: () => testCase.cookie },
    })
    if (response.status !== 307 || response.headers.get('location') !== testCase.expected) {
      failures.push(
        `Netlify locale redirect: "${testCase.url}" resolved to `
        + `"${response.headers.get('location')}" (${response.status}), `
        + `expected "${testCase.expected}" (307).`,
      )
    }
  }

  const defaultFluentPath = resolve(`src/locales/${defaultLocale}.ftl`)
  if (await fs.pathExists(defaultFluentPath)) {
    const defaultKeys = getFluentKeys(await fs.readFile(defaultFluentPath, 'utf-8'))

    for (const locale of supportedLocales) {
      const fluentPath = resolve(`src/locales/${locale}.ftl`)
      if (!await fs.pathExists(fluentPath))
        continue

      const keys = getFluentKeys(await fs.readFile(fluentPath, 'utf-8'))
      const missing = difference(defaultKeys, keys)
      const extra = difference(keys, defaultKeys)
      if (missing.length)
        failures.push(`${locale}: missing Fluent keys: ${missing.join(', ')}.`)
      if (extra.length)
        failures.push(`${locale}: extra Fluent keys: ${extra.join(', ')}.`)
    }
  }

  const articleFiles = await fg('pages/*/articles/*.md')
  const localesBySlug = new Map<string, Set<SupportedLocale>>()

  for (const file of articleFiles) {
    const article = getArticleInfo(file)
    if (!article || article.slug === 'index' || article.slug.startsWith('['))
      continue

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug)) {
      failures.push(
        `${file}: article slug "${article.slug}" must be a lowercase kebab-case filename.`,
      )
    }

    const { data } = matter(await fs.readFile(file, 'utf-8'))
    if (data.lang !== article.sourceLocale) {
      failures.push(
        `${file}: "lang" must be "${article.sourceLocale}" to match its locale folder.`,
      )
    }

    const locales = localesBySlug.get(article.slug) || new Set<SupportedLocale>()
    locales.add(article.sourceLocale)
    localesBySlug.set(article.slug, locales)
  }

  const fallbackCases: Array<{
    target: SupportedLocale
    available: SupportedLocale[]
    expected?: SupportedLocale
  }> = [
    { target: 'pt', available: ['en', 'ru'], expected: 'en' },
    { target: 'pt', available: ['ru'], expected: 'ru' },
    { target: 'pt', available: ['es'], expected: 'es' },
    { target: 'pt', available: ['pt', 'en'], expected: 'pt' },
    { target: 'en', available: ['ru'], expected: 'ru' },
  ]

  for (const testCase of fallbackCases) {
    const actual = getArticleFallbackSource(testCase.target, testCase.available)
    if (actual !== testCase.expected) {
      failures.push(
        `fallback policy: ${testCase.target} with [${testCase.available.join(', ')}] `
        + `resolved to "${actual || 'none'}", expected "${testCase.expected || 'none'}".`,
      )
    }
  }

  try {
    getArticleFallbackSource('pt', ['ru', 'es'])
    failures.push('fallback policy: multiple non-English fallbacks must be rejected as ambiguous.')
  }
  catch {
    // Ambiguity is a content error because array order must not choose the displayed language.
  }

  const visibilityCases: Array<{
    expected: boolean
    frontmatter: Parameters<typeof isPostIndexable>[0]
    name: string
  }> = [
    { name: 'published', frontmatter: { date: '2000-01-01', type: 'note' }, expected: true },
    { name: 'draft', frontmatter: { date: '2000-01-01', type: 'draft' }, expected: false },
    { name: 'combined draft', frontmatter: { date: '2000-01-01', type: 'note+draft' }, expected: false },
    { name: 'noindex', frontmatter: { date: '2000-01-01', robots: 'noindex, follow' }, expected: false },
    { name: 'future', frontmatter: { date: '2999-01-01', type: 'note' }, expected: true },
  ]

  for (const testCase of visibilityCases) {
    const actual = isPostIndexable(testCase.frontmatter)
    if (actual !== testCase.expected) {
      failures.push(
        `article visibility: "${testCase.name}" resolved to ${actual}, expected ${testCase.expected}.`,
      )
    }
  }

  const routabilityCases: Array<{
    expected: boolean
    frontmatter: Parameters<typeof isPostRoutable>[0]
    name: string
  }> = [
    { name: 'published', frontmatter: { date: '2000-01-01', type: 'note' }, expected: true },
    { name: 'combined draft', frontmatter: { date: '2000-01-01', type: 'note+draft' }, expected: true },
    { name: 'hidden draft', frontmatter: { date: '2000-01-01', type: 'draft' }, expected: false },
    { name: 'draft flag', frontmatter: { date: '2000-01-01', draft: true }, expected: false },
  ]

  for (const testCase of routabilityCases) {
    const actual = isPostRoutable(testCase.frontmatter)
    if (actual !== testCase.expected) {
      failures.push(
        `article routability: "${testCase.name}" resolved to ${actual}, expected ${testCase.expected}.`,
      )
    }
  }

  for (const [slug, localeSet] of localesBySlug) {
    const states = getArticleLocaleStates(slug)
    const routableLocales = states.filter(state => state.routable).map(state => state.locale)

    for (const targetLocale of supportedLocales) {
      if (localeSet.has(targetLocale))
        continue

      try {
        const sourceLocale = getArticleFallbackSource(targetLocale, routableLocales)
        if (sourceLocale && !routableLocales.includes(sourceLocale))
          failures.push(`${targetLocale}/${slug}: fallback source "${sourceLocale}" is not routable.`)
      }
      catch (error) {
        failures.push(`${targetLocale}/${slug}: ${(error as Error).message}`)
      }
    }
  }

  const searchPathCases: Array<{
    currentLocale: SupportedLocale
    expected: string
    physicalPath: string
    servedLocales: SupportedLocale[]
  }> = [
    {
      currentLocale: 'fr',
      physicalPath: '/ru/example',
      servedLocales: ['ru', 'fr'],
      expected: '/fr/example',
    },
    {
      currentLocale: 'fr',
      physicalPath: '/ru/example',
      servedLocales: ['ru'],
      expected: '/ru/example',
    },
  ]

  for (const testCase of searchPathCases) {
    const actual = getArticleSearchPath(
      testCase.physicalPath,
      testCase.servedLocales,
      testCase.currentLocale,
    )
    if (actual !== testCase.expected) {
      failures.push(
        `search path: "${testCase.physicalPath}" resolved to "${actual}", `
        + `expected "${testCase.expected}".`,
      )
    }
  }

  for (const [slug, localeSet] of localesBySlug) {
    for (const sourceLocale of localeSet) {
      const servedLocales = getArticleServedLocales(sourceLocale, slug)
      for (const targetLocale of servedLocales) {
        const path = getArticleSearchPath(
          getArticlePath(sourceLocale, slug),
          servedLocales,
          targetLocale,
        )
        if (path !== getArticlePath(targetLocale, slug))
          failures.push(`${sourceLocale}/${slug}: search path is wrong for "${targetLocale}".`)
      }
    }
  }

  if (failures.length) {
    console.error(`i18n check failed with ${failures.length} error(s):`)
    for (const failure of failures)
      console.error(`- ${failure}`)
    process.exitCode = 1
    return
  }

  console.log(
    `i18n check passed: ${supportedLocales.length} locales, `
    + `${basename(defaultFluentPath)} key parity, ${localesBySlug.size} article slug(s).`,
  )
}

run()
