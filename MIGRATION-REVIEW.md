# Ревью переноса `dg` → `dg-astro`

Дата среза: 12 июля 2026 года. Легаси-проект `/home/teslak/Sites/dg/` использован только для чтения. Это не декларация полной эквивалентности, а рабочий аудит и упорядоченный план доведения переноса.

## 1. Общие проблемы переноса

### 1.1. Перенос объявлен законченным раньше, чем появился критерий готовности

`README-MIGRATION.md` несколько раз говорит о «full port», «ported verbatim» и закрытии всех замечаний, но до этого ревью проект всё ещё содержал Vue runtime, три `.vue`-острова, отсутствующий `resolve-sources`, неработающий `wide` у Markdown-картинок и ошибки `astro check`. Документ описывал намерение, а не проверенный результат.

Для дальнейшей работы нужен проверяемый definition of done:

- в production-графе нет Vue и `@astrojs/vue`;
- `pnpm check` и `pnpm build` проходят без ошибок;
- для кастомного Markdown есть fixture-тесты «исходник → ожидаемый HTML»;
- ключевые страницы сравнены с легаси на desktop/mobile и в light/dark;
- интеракции проверены клавиатурой и с `prefers-reduced-motion`;
- статическая сборка не зависит от обязательного доступа к сети.

### 1.2. Скопированный Vue в Astro — неправильная граница архитектуры

До исправлений `ArticleAudio.vue`, `SearchSubNav.vue` и `ScrollProgressToc.vue` были почти прямыми копиями Vue-компонентов и загружали отдельный runtime. Это увеличивало JS, усложняло Astro View Transitions и оставляло две модели жизненного цикла. Для этих компонентов не нужен virtual DOM: серверная разметка Astro плюс небольшие TypeScript-контроллеры/custom elements покрывают их состояние.

В этой итерации компоненты переписаны на Astro + browser-native TypeScript, Vue integration и зависимости удалены. Следующий обязательный шаг — браузерные тесты повторной инициализации после `astro:page-load`/View Transition, чтобы не получить дублирующиеся listeners.

### 1.3. Нет единого источника истины для Markdown

HTML страниц строится цепочкой remark/rehype, а RSS — отдельным `markdown-it`-пайплайном с собственными pre-transform. Это две реализации одного языка публикаций. Любая новая конструкция — изображения, muted, spoiler, glossary, sources — может выглядеть по-разному на сайте и в фиде.

Нужно либо собирать RSS через тот же unified processor, либо вынести синтаксис и его тестовые примеры в общий пакет/модуль и прогонять одинаковые fixtures через оба renderer-а. Пока этого нет, изменения Markdown считаются повышенного риска.

### 1.4. Отсутствуют регрессионные тесты переноса

Сейчас сложные правила проверяются главным образом сборкой и комментариями «ported». Этого недостаточно. Минимальный набор:

- unit/fixture-тесты для slugify, heading ids, fallback locale, inline attrs, spoiler, sources и картинок;
- snapshot HTML для `template.md`;
- Playwright-сценарии: главная, статья, поиск, TOC, аудио, spoiler, glossary, lightbox;
- screenshot diff с эталонными viewport-ами 390, 768, 1280 и 1440 px;
- axe-проверка критических страниц.

### 1.5. Контент и представление местами склеены

Главная и Now перенесены из Markdown в `src/data/home.ts`. Это ручная копия контента, которая будет расходиться с легаси/редакторским workflow. Лучше хранить эти страницы в content collections с типизированной схемой и рендерить общим layout. Аналогично, дубли `src/locales/*.ts` и `src/locales/messages/*.ts` требуют консолидации.

### 1.6. Слишком глобальный CSS и хрупкая специфичность

После снятия Vue scoped styles правила стали глобальными. Конкретный дефект: `.prose img { width: 100% }` оказался специфичнее `.title-pic`, поэтому аватар в заголовке растягивался на всю ширину. Похожие конфликты вероятны у карточек, галерей, raw HTML и MDX-компонентов.

Нужно постепенно вводить component roots (`.post-header`, `.article-audio`, `.search-subnav`) и ограничивать селекторы ими. `!important`, отрицательные utility-классы и комментарии «scoped styles flattened» считать сигналом для проверки, а не нормой.

### 1.7. Toolchain уже сообщает о долге

Исходный `pnpm check` падал на типах `remark-sources`, `resvg`, sitemap hreflang и декларации `markdown-it-link-attributes`; Astro 7 также сообщает о deprecated markdown config и deprecated `z` import. Даже если runtime визуально работает, такой baseline нельзя считать завершённым переносом.

## 2. Кастомный Markdown-парсер: детальное сравнение

### 2.1. Что перенесено в целом корректно

- `breaks: true` представлен `remark-breaks`;
- spoiler-блок `::: spoiler` и inline `==mark==` поддержаны;
- собственный slugify используется и для заголовков, и для TOC;
- `[text]{.muted}` и glossary syntax распознаются без уплощения вложенного inline Markdown;
- GitHub alerts, внешние ссылки, Shiki transformers и raw HTML включены;
- `<!-- sources -->` превращается в spoiler со ссылками назад.

### 2.2. `muted`: синтаксис был, визуального поведения не было

`remark-inline-attrs.ts` создавал `<span class="muted">`, но правило `.prose .muted { opacity: 0.7 }` исчезло при переносе CSS. Это типичный пример ложной parser parity: AST правильный, итоговая функция для пользователя потеряна. Стиль восстановлен в этой итерации.

Нужно добавить fixture, который проверяет и HTML-класс, и наличие визуального контракта через screenshot/component test.

### 2.3. Изображения: старый и новый контракт были смешаны

В легаси alt делился через `|`: `wide` менял layout, а alt одновременно использовался как caption. Затем появился `no-caption`, который инвертировал поведение. В Astro-плагине разбор `| wide` вообще потерялся: любой Markdown image становился обычным `<figure>`, а полный alt, включая `|wide`, мог попасть в подпись.

Новый контракт в этой итерации:

```md
![Подробное описание для screen reader](/image.avif)
![Подробное описание для screen reader](/image.avif "Короткая видимая подпись")
![Подробное описание для screen reader | wide](/image.avif "Короткая видимая подпись")
```

- `[]` — только alt/описание изображения;
- стандартный Markdown title в кавычках — только видимый `<figcaption>`;
- нет title — нет caption;
- `| wide` — единственный дополнительный layout-модификатор;
- `no-caption` удалён из контента и документации.

Это понятнее авторами, ближе к стандартному Markdown и не заставляет скрывать уже созданный caption отрицательным флагом.

### 2.4. Что ещё не доведено в изображениях

- unified-плагин пока не добавляет физические `width`/`height`, как legacy `imageAttributesPlugin`; это риск CLS;
- нет обязательной build-time диагностики пустого alt для реальных статей;
- нет responsive `srcset`/Astro image optimization для Markdown assets;
- remote images не имеют явной политики доменов и размеров;
- raw `<img>` обходит figure/caption-контракт;
- lightbox должен отдельно использовать alt как доступное имя, а caption — как зрительную подпись;
- требуется fixture для standard, wide, caption/no-caption, linked image, raw image, empty alt и тёмного SVG-фильтра.

### 2.5. Две ширины изображения

Обычное изображение остаётся в колонке текста. `wide` на desktop имеет ширину 120% и отрицательные поля по 10%, как legacy shortcut; на узком экране обе версии остаются 100%. Скругление `0.75rem` теперь задаётся явно, а не полагается только на Uno directive. Нужно проверить широкий figure с очень узкими и очень высокими изображениями, caption и lightbox.

### 2.6. Потери относительно legacy markdown-it

Нужно отдельно принять решение по функциям, которые были в legacy-конфигурации, но не имеют доказанной эквивалентности:

- `markdown-it-magic-link` и его GitHub/package shortcuts;
- Twoslash и его popup-стили;
- диагностические предупреждения о malformed `[text]{...}`;
- build warning для изображения без alt;
- автоматические width/height и точное правило eager/lazy для первого изображения;
- паритет raw HTML/custom component между страницей и RSS;
- поведение вложенных spoiler, списков и blockquote внутри spoiler;
- source links внутри HTML, карточек и custom components.

## 3. Главная, отступы и визуальный ритм

### 3.1. Аватар в заголовке

Причина растянутой картинки найдена: глобальное `.prose img` перебивало `.title-pic`. Исправление усиливает локальный селектор до `.prose .title-pic` и фиксирует `width/min-width/max-width: 1.2em`. Сохранены круглая форма, vertical alignment, glint и scale hover.

Нужно визуально проверить все шесть языков: имя находится в разных местах длинного заголовка, поэтому перенос строки рядом с inline image может отличаться.

### 3.2. Отступы

Потенциально проблемные места:

- `main` одновременно задаёт `px-7 py-10`, а компоненты добавляют собственные отрицательные margins;
- subtitle использует `!-mt-6`, place — `mt--4!`, что зависит от генерации конкретных Uno utilities;
- `figure` получает margin из `prose.css`, а image rules — ещё один исторический margin;
- spoiler, alerts, MediaCard и sources имеют собственные вертикальные ритмы;
- mobile action bar перекрывает нижний контент без общего safe-area padding страницы;
- при открытии glossary/TOC sheet body scroll lock должен возвращаться после View Transition.

Нужна отдельная визуальная матрица «соседние элементы»: heading→paragraph, paragraph→list, paragraph→figure, caption→paragraph, spoiler→heading, audio→article, article→post navigation.

## 4. Motion и микроинтеракции

Легаси уделяет много внимания staged `slide-enter`, glint заголовка, hover opacity, spoiler height animation, glossary pin wiggle, TOC reveal, bottom sheets, photo hover и source back-reference highlight. Часть перенесена, но сравнение по именам классов не доказывает совпадение easing/duration/state transitions.

План:

1. Составить inventory интеракций с состояниями idle/hover/focus/active/open/close/error.
2. Сверить duration/easing с legacy и унифицировать tokens (`--motion-fast`, `--motion-base`, `--ease-out-expo`).
3. Добавить `:focus-visible` как равноправное состояние hover.
4. Для `prefers-reduced-motion` отключать перемещение/параллакс, но сохранять понятную смену состояния.
5. Проверить повторный вход через Astro View Transitions: анимации не должны запускаться дважды или оставлять старые listeners.

В этой итерации нативные Search/TOC/Audio получили короткие transitions и reduced-motion fallbacks, но их ещё нужно сравнить визуально с оригиналом.

### 4.1. Фоны, тема и клавиатурная навигация

У фонов была не проблема canvas-рендереров, а проблема слоёв: Astro задавал непрозрачный `background` и для `html`, и для `body`, тогда как фиксированный `[data-art]` находится на `z-index: -1`. `body` закрывал фон целиком. Как в `dg`, цвет страницы теперь рисует только `html`, а `body` остаётся прозрачным.

Логика выбора восстановлена по `dg`:

- `art: random` выбирает только `plum`, `dots`, `cellular` с весами `3/2/2`;
- последний случайный вариант хранится в `dg-last-art` и исключается из следующего случайного пула, поэтому два random-page подряд не повторяют фон;
- `topography` и `interference` намеренно не попадают в random, но доступны при явном `art` и ручной прокрутке;
- `↓` начинает ручную последовательность с `plum`, `↑` — с `topography`, затем обе клавиши циклически обходят все пять фонов в порядке `plum → dots → cellular → topography → interference`;
- ручной выбор хранится в `dg-art-override`, имеет приоритет над frontmatter и переживает переходы между страницами с фоном;
- `F5` на странице с фоном сбрасывает override к её frontmatter-значению; на странице без фона клавиши не перехватываются;
- `←/→` продолжают циклически переключать верхнеуровневые страницы legacy-набора: главная, blog/notes, projects, photos.

Ранний theme-script теперь понимает оставшееся от VueUse значение `auto`: оно следует системной теме, в том числе при её изменении во время открытой вкладки. Только явные `light`/`dark` перекрывают системное предпочтение.

Blog tabs возвращены к opacity-only interaction: без вертикального `transform` и без underline. На мобильных вкладки снова горизонтально прокручиваются, а градиенты по краям показывают скрытое продолжение списка.

## 5. Sources: генерация и runtime

До ревью runtime renderer существовал, но:

- `package.json` и `scripts/` не содержали обещанного `resolve-sources`;
- инструкция в `template.md` ссылалась на несуществующую команду;
- заголовки sources были только для en/ru/es;
- TypeScript-код плагина не проходил проверку;
- не было понятной incremental-стратегии.

Добавлен `scripts/resolve-sources.ts` и команда:

```sh
pnpm sources
pnpm sources -- --refresh
pnpm sources -- src/content/articles/en/article.md
```

`prebuild` автоматически запускает обычный incremental-режим. Он:

- рассматривает только статьи с `sources: true`;
- хеширует тело до sources-блока и полностью пропускает неизменённые статьи;
- дедуплицирует внешние ссылки и исключает внутренние ссылки/картинки/code fences;
- хранит URL titles и article hashes в `data/sources-cache.json`;
- повторно использует кэш без сети;
- с `--refresh` обновляет записи старше 30 дней;
- после прерывания сохраняет прогресс по каждой статье.

Runtime-заголовки добавлены для pt/de/fr. Ещё нужны тесты URL normalization (fragments, query, redirect/canonical), HTML links, скобки в URL, 429/backoff и детерминированный offline build. Для CI разумно позже разделить `sources:check` (ничего не пишет и не ходит в сеть) и ручной `sources:update`.

## 6. Компоненты и функциональные хвосты

После этой итерации `.vue` и Vue-зависимостей в `dg-astro` нет. Однако нужно проверить не только расширения файлов, но и полноту функций:

- Audio: восстановление позиции, Media Session, sticky mode, error/waiting, скорость, mobile layout;
- Search: locale ranking, `servedLocales`, snippets, keyboard shortcut, only-language event и View Transitions;
- TOC: active heading, длинные статьи, scrollable list, edge reveal, mobile sheet, copy link;
- Lightbox: focus trap, возврат фокуса, подпись отдельно от alt, навигация галереи;
- Glossary: hover delay, pin/fly-away, viewport clamping, mobile sheet;
- sources backrefs: подсветка исходной ссылки и несколько упоминаний одного URL;
- PhotoShowcase: slide/grid, скругления, hover, lazy loading и отсутствие локальной фототеки.

Legacy-компоненты для старых demo/QR/slides не надо механически тащить в production, если соответствующего контента больше нет. Для каждого нужен явный статус: «используется и переносим», «заменён native/Astro», «контент удалён осознанно».

## 7. Приоритеты

### P0 — блокирует утверждение «перенос завершён»

- [x] Удалить Vue runtime, integration и `.vue`-острова.
- [x] Исправить растянутый title avatar.
- [x] Восстановить `.muted`, wide image и скругления.
- [x] Развести alt и caption, убрать `no-caption`.
- [x] Вернуть запускаемый incremental sources workflow.
- [x] Добиться чистого `pnpm check`.
- [x] Добиться успешного `pnpm build` без обязательной сети.
- [x] Добавить parser fixtures для критического кастомного синтаксиса.

### P1 — заметные пользователю регрессии

- [x] Восстановить слои, random/override-логику фонов, системную тему и blog tabs.
- [ ] Визуальная сверка главной и статьи на 390/768/1280/1440 px.
- [ ] Width/height и responsive images без CLS.
- [ ] Полный проход отступов и вертикального ритма.
- [ ] Motion inventory и точная сверка hover/focus/open/close.
- [ ] Браузерные тесты Search/TOC/Audio/Glossary/Lightbox после View Transitions.
- [ ] Паритет sources/backrefs для всех типов ссылок и локалей.

### P2 — устойчивость и поддерживаемость

- [ ] Один Markdown processor/контракт для HTML и feeds.
- [ ] Перенести home/now обратно в типизированный content layer.
- [ ] Убрать дубли i18n dictionaries.
- [ ] Устранить deprecated Astro 7 API.
- [ ] Ввести visual regression и axe в CI.
- [ ] Задокументировать судьбу legacy demo/QR/slides компонентов.

## 8. Порядок следующих итераций

1. Починить оставшиеся type/build errors и зафиксировать чистый baseline.
2. Добавить fixtures Markdown, прежде чем дальше менять parser.
3. Довести image pipeline: dimensions, alt diagnostics, raw/linked images, lightbox semantics.
4. Пройти главную и статью screenshot-сравнением, исправляя spacing от внешнего layout к внутренним компонентам.
5. Протестировать нативные Search/TOC/Audio и View Transitions.
6. Сделать отдельный motion/focus polish pass.
7. Консолидировать content/i18n/feeds, когда пользовательская parity уже защищена тестами.
