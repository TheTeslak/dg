# SEO Implementation Status

Цель: держать SEO-метаданные, канонические URL, hreflang, sitemap и robots.txt синхронизированными с текущей моделью сайта:

- UI locale берётся из URL (`/en`, `/ru`, `/es`).
- Язык контента статьи берётся из `frontmatter.lang`.
- Непереведённые статьи доступны через fallback aliases для UX, но не считаются отдельными индексируемыми локализациями.
- Draft-материалы могут быть видимы в UI, но не должны попадать в индекс, sitemap или feeds.

## 1. Central SEO Logic

Статус: реализовано.

- Runtime SEO живёт в `src/logics/seo.ts`.
- `src/App.vue` вызывает `useSEO()` от route frontmatter, поэтому метаданные работают для markdown-страниц, статей, списков, homepage и fallback aliases.
- `WrapperPost.vue` больше не управляет head-тегами локально.
- `x-default` в runtime и sitemap совпадает: homepage указывает на `/`, остальные группы — на English route, если он физически существует.

## 2. Metadata and Social Cards

Статус: реализовано.

- Добавлены `description`, Open Graph, Twitter Card, canonical, article tags.
- `og:image` всегда абсолютный; для статей используется frontmatter image или `/og/<slug>.png`, для остальных страниц fallback `/og.png`.
- Для статей добавляются `article:published_time`, `article:modified_time`, `article:author`, `article:tag`.
- Draft и fallback alias получают robots meta.
- `robots: noindex` в frontmatter исключает страницу из sitemap; для статей также исключает материал из feeds.

## 3. Canonical URLs

Статус: реализовано.

- Физические локализованные статьи self-canonical.
- Fallback alias непереведённой статьи canonical указывает на физический original locale.
- Все canonical URL абсолютные.

## 4. Structured Data

Статус: реализовано.

- Homepage получает `WebSite` и `Person`.
- Статьи получают `BlogPosting` с `headline`, `description`, `image`, `datePublished`, `dateModified`, `author`, `publisher`, `inLanguage`, `mainEntityOfPage`.

## 5. Images and Core Web Vitals

Статус: реализовано.

- Markdown images получают `width` и `height` из физических файлов, когда файл локальный и доступен во время build.
- Все markdown images получают `decoding="async"`.
- Lazy loading ставится начиная со второго markdown image в документе, чтобы не сделать потенциальный LCP image ленивым.

## 6. XML Sitemap

Статус: реализовано кастомным генератором.

- `build/seo.ts` генерирует `dist/sitemap.xml`.
- В sitemap попадают только физические indexable routes.
- Fallback aliases непереведённых статей не попадают в sitemap.
- Draft articles не попадают в sitemap.
- Страницы с `robots: noindex` не попадают в sitemap.
- `xhtml:link hreflang` строится по физически существующим локализованным файлам.
- `x-default` у homepage указывает на `/`, у остальных групп — на English route, если он есть.

Почему не `vite-ssg-sitemap`: его встроенный `i18n.strategy: "prefix"` не подходит для уже префиксованных маршрутов этого проекта и создаёт неправильные URL вида `/ru/ru/...`.

## 7. robots.txt

Статус: реализовано генерацией.

- `build/seo.ts` генерирует `dist/robots.txt`.
- Статический `public/robots.txt` удалён, чтобы не было двух источников правды.
- Training/scraping crawlers (GPTBot, Google-Extended, ClaudeBot, Applebot-Extended, CCBot, meta-externalagent, Amazonbot, Bytespider, FacebookBot) заблокированы только от контентных секций (`/*/articles/`, `/*/notes`, `/*/photos`, `/*/now`), остальное доступно.
- Search/answer-engine crawlers и social preview bots получают полный доступ (`Allow: /`).
- Неизвестные user-agent (`*`) заблокированы по умолчанию (`Disallow: /`).
- В конце файла генерируется комментарий `# I'm fond of robots; after all, I too am one.`

Важно: draft-страницы закрываются от индексации через robots meta `noindex` и исключение из sitemap/feeds. Не через `robots.txt`, потому что для HTML-страниц robots.txt может запретить crawler увидеть `noindex`.
