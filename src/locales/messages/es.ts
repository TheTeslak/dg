import type { MessageDictionary } from './types'

export default {
  'meta-description': 'Blog de Teslak',

  'nav-blog': 'Blog',
  'nav-articles': 'Artículos',
  'nav-projects': 'Proyectos',
  'nav-notes': 'Notas',
  'nav-photos': 'Fotos',
  'nav-now': 'Ahora',
  'nav-menu': 'Menú',
  'nav-close': 'Cerrar',
  'nav-methodology': 'Metodología',
  'nav-finds': 'Hallazgos',

  'finds-earlier': 'Antes',
  'finds-telegram-promo': 'Lo que me llamó la atención, aunque mi postura pueda ser diferente<br>Más hallazgos semanales en Telegram: <a href="https://t.me/Tes404" target="_blank" rel="noopener noreferrer" class="underline hover:opacity-80">@Tes404</a>, en ruso',

  'a11y-skip-to-content': 'Ir al contenido',
  'a11y-home': 'Inicio',
  'a11y-main-navigation': 'Navegación principal',
  'a11y-site-logo': 'Logotipo del sitio',

  'action-toggle-theme': 'Alternar tema',
  'action-to-top': 'Ir arriba',
  'action-back-to-all': 'Volver',
  'action-change-language': 'Cambiar idioma',
  'action-go-home': 'Ir al inicio',

  'page-not-translated': ({ lang, type }) => type === 'note'
    ? `Aún no traducida, mostrando la versión en ${lang}`
    : `Aún no traducido, mostrando la versión en ${lang}`,
  'page-not-found': 'Página no encontrada',

  'blog-only-lang': 'Solo {lang}',
  'blog-nothing-here': '{ nada por aquí aún }',
  'blog-upcoming': 'Próximamente',
  'blog-draft': 'Este es un borrador: el contenido puede estar incompleto. Vuelve más tarde.',
  'projects-nothing-here': '{ proyectos en camino }',

  'search-placeholder': 'Buscar artículos y notas',
  'search-start-typing': 'Introduzca su búsqueda',
  'search-no-results': 'No se encontraron resultados',
  'search-close': 'Cerrar búsqueda',
  'search-loading': 'Cargando índice de búsqueda...',
  'search-open': 'Buscar',

  'footer-copyright': '2026 © Teslak',

  'post-comment-on': 'comentar en',
  'post-link-telegram': 'Telegram',
  'post-link-twitter': 'X',
  'post-link-mastodon': 'Mastodon',
  'post-referenced-by': 'Mis notas sobre el tema',
  'post-updated': 'actualizado',
  'post-draft-notice': 'Borrador',
  'post-copy-link': 'enlace',
  'post-link-copied': 'copiado',
  'post-place-at': 'en',
  'label-external': 'Enlace externo',

  'article-audio-label': 'Audio del artículo',
  'article-audio-play': 'Reproducir audio',
  'article-audio-pause': 'Pausar audio',
  'article-audio-rewind': 'Retroceder 15 segundos',
  'article-audio-forward': 'Avanzar 15 segundos',
  'article-audio-speed': 'Cambiar velocidad de reproducción',
  'article-audio-download': 'Descargar audio',
  'article-audio-close': 'Cerrar mini reproductor',
  'article-audio-progress': 'Progreso del audio',
  'article-audio-error': 'No se pudo cargar el audio.',
  'article-audio-outdated': 'El texto se actualizó después de grabar este audio',

  'heading-link': 'enlace',
  'heading-copied': 'copiado',

  'photos-view-cover': 'Recortar',
  'photos-view-contain': 'No recortar',

  'sources-title': 'Fuentes',

  'days-left': ({ days }) => Number(days) === 1 ? `en ${days} día` : `en ${days} días`,
} satisfies MessageDictionary as MessageDictionary
