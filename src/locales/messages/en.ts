import type { MessageDictionary } from './types'

export default {
  'meta-description': 'Teslak\'s Blog',

  'nav-blog': 'Blog',
  'nav-articles': 'Articles',
  'nav-projects': 'Projects',
  'nav-notes': 'Notes',
  'nav-photos': 'Photos',
  'nav-now': 'Now',
  'nav-menu': 'Menu',
  'nav-close': 'Close',
  'nav-methodology': 'Methodology',
  'nav-finds': 'Finds',

  'finds-earlier': 'Earlier',
  'finds-telegram-promo': 'What caught my eye, though my stance may differ<br>More finds weekly in Telegram: <a href="https://t.me/Tes404" target="_blank" rel="noopener noreferrer" class="underline hover:opacity-80">@Tes404</a>, in Russian',

  'a11y-skip-to-content': 'Skip to content',
  'a11y-home': 'Home',
  'a11y-main-navigation': 'Main navigation',
  'a11y-site-logo': 'Website logo',

  'action-toggle-theme': 'Toggle Color Scheme',
  'action-to-top': 'Scroll to top',
  'action-back-to-all': 'Back to all',
  'action-change-language': 'Change language',
  'action-go-home': 'Go home',

  'page-not-translated': 'Not yet translated, showing {lang} version',
  'page-not-found': 'Page not found',

  'blog-only-lang': '{lang} only',
  'blog-nothing-here': '{ nothing here yet }',
  'blog-upcoming': 'Upcoming',
  'blog-draft': 'This is a draft post, the content may be incomplete. Please check back later.',
  'projects-nothing-here': '{ projects are brewing }',

  'search-placeholder': 'Search articles and notes',
  'search-start-typing': 'Enter search query',
  'search-no-results': 'No results found',
  'search-close': 'Close search',
  'search-loading': 'Loading search index...',
  'search-open': 'Search',

  'footer-copyright': '2026 © Teslak',

  'post-comment-on': 'comment on',
  'post-link-telegram': 'Telegram',
  'post-link-twitter': 'X',
  'post-link-mastodon': 'Mastodon',
  'post-referenced-by': 'More from me on this',
  'post-updated': 'updated',
  'post-draft-notice': 'Draft',
  'post-copy-link': 'link',
  'post-link-copied': 'copied',
  'post-place-at': 'at',
  'label-external': 'External',

  'article-audio-label': 'Article audio',
  'article-audio-play': 'Play audio',
  'article-audio-pause': 'Pause audio',
  'article-audio-rewind': 'Rewind 15 seconds',
  'article-audio-forward': 'Forward 15 seconds',
  'article-audio-speed': 'Change playback speed',
  'article-audio-download': 'Download audio',
  'article-audio-close': 'Close mini player',
  'article-audio-progress': 'Audio progress',
  'article-audio-error': 'Audio could not be loaded.',
  'article-audio-outdated': 'Text has been updated since this audio was recorded',

  'heading-link': 'link',
  'heading-copied': 'copied',

  'photos-view-cover': 'Crop to fit',
  'photos-view-contain': 'Do not crop',

  'sources-title': 'Sources',

  'days-left': ({ days }) => Number(days) === 1 ? `in ${days} day` : `in ${days} days`,
} satisfies MessageDictionary as MessageDictionary
