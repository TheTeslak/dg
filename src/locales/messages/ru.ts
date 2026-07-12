import type { MessageDictionary } from './types'
import { plural } from './types'

export default {
  'meta-description': 'Блог Teslak',

  'nav-blog': 'Блог',
  'nav-articles': 'Статьи',
  'nav-projects': 'Проекты',
  'nav-notes': 'Заметки',
  'nav-photos': 'Фото',
  'nav-now': 'Сейчас',
  'nav-menu': 'Меню',
  'nav-close': 'Закрыть',
  'nav-methodology': 'Методология',
  'nav-finds': 'Находки',

  'finds-earlier': 'Раньше',
  'finds-telegram-promo': 'Что зацепило внимание, хотя моя позиция может отличаться<br>Масса ежедневных находок в тгк <a href="https://t.me/Tes404" target="_blank" rel="noopener noreferrer" class="underline hover:opacity-80">@Tes404</a>',

  'a11y-skip-to-content': 'Перейти к содержимому',
  'a11y-home': 'Главная',
  'a11y-main-navigation': 'Основная навигация',
  'a11y-site-logo': 'Логотип сайта',

  'action-toggle-theme': 'Сменить тему',
  'action-to-top': 'Наверх',
  'action-back-to-all': 'Ко всему',
  'action-change-language': 'Сменить язык',
  'action-go-home': 'На главную',

  'page-not-translated': 'Ещё не переведена, показана {lang} версия',
  'page-not-found': 'Страница не найдена',

  'blog-only-lang': 'Только {lang}',
  'blog-nothing-here': '{ пока пусто }',
  'blog-upcoming': 'Скоро',
  'blog-draft': 'Это черновик — содержимое может быть неполным. Загляните позже.',
  'projects-nothing-here': '{ проекты в работе }',

  'search-placeholder': 'Поиск по статьям и заметкам',
  'search-start-typing': 'Введите запрос',
  'search-no-results': 'Ничего не найдено',
  'search-close': 'Закрыть поиск',
  'search-loading': 'Загрузка индекса...',
  'search-open': 'Поиск',

  'footer-copyright': '2026 © Teslak',

  'post-comment-on': 'комментировать в',
  'post-link-telegram': 'Телеграм',
  'post-link-twitter': 'X',
  'post-link-mastodon': 'Мастодон',
  'post-referenced-by': 'Моё по теме',
  'post-updated': 'обновлена',
  'post-draft-notice': 'Черновик',
  'post-copy-link': 'ссылка',
  'post-link-copied': 'скопировано',
  'post-place-at': 'в',
  'label-external': 'Внешняя ссылка',

  'article-audio-label': 'Аудио статьи',
  'article-audio-play': 'Воспроизвести аудио',
  'article-audio-pause': 'Поставить аудио на паузу',
  'article-audio-rewind': 'Назад на 15 секунд',
  'article-audio-forward': 'Вперёд на 15 секунд',
  'article-audio-speed': 'Изменить скорость воспроизведения',
  'article-audio-download': 'Скачать аудио',
  'article-audio-close': 'Закрыть мини-плеер',
  'article-audio-progress': 'Прогресс аудио',
  'article-audio-error': 'Аудио не удалось загрузить.',
  'article-audio-outdated': 'Текст был обновлён после записи этого аудио',

  'heading-link': 'ссылка',
  'heading-copied': 'скопировано',

  'photos-view-cover': 'Обрезать',
  'photos-view-contain': 'Не обрезать',

  'sources-title': 'Источники',

  'days-left': ({ days }) => {
    const n = Number(days)
    switch (plural('ru', n)) {
      case 'one': return `через ${days} день`
      case 'few': return `через ${days} дня`
      default: return `через ${days} дней`
    }
  },
} satisfies MessageDictionary as MessageDictionary
