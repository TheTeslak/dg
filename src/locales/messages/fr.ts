import type { MessageDictionary } from './types.ts'

export default {
  'meta-description': 'Blog de Teslak',

  'nav-blog': 'Blog',
  'nav-articles': 'Articles',
  'nav-projects': 'Projets',
  'nav-notes': 'Notes',
  'nav-photos': 'Photos',
  'nav-now': 'Maintenant',
  'nav-menu': 'Menu',
  'nav-close': 'Fermer',
  'nav-methodology': 'Méthodologie',
  'nav-finds': 'Trouvailles',

  'finds-earlier': 'Plus tôt',
  'finds-telegram-promo': 'Ce qui a attiré mon attention, bien que ma position puisse différer<br>Plus de trouvailles sur Telegram : <a href="https://t.me/Tes404" target="_blank" rel="noopener noreferrer" class="underline hover:opacity-80">@Tes404</a>, en russe',

  'a11y-skip-to-content': 'Aller au contenu',
  'a11y-home': 'Accueil',
  'a11y-main-navigation': 'Navigation principale',
  'a11y-site-logo': 'Logo du site',

  'action-toggle-theme': 'Changer le thème',
  'action-to-top': 'Revenir en haut',
  'action-back-to-all': 'Revenir à la liste',
  'action-change-language': 'Changer de langue',
  'action-go-home': 'Retour à l’accueil',
  'lightbox-close': 'Fermer l’aperçu de l’image',

  'page-not-translated': ({ lang, type }) => type === 'note'
    ? `Pas encore traduite ; affichage de la version en ${lang}`
    : `Pas encore traduit ; affichage de la version en ${lang}`,
  'page-not-found': 'Page introuvable',

  'blog-only-lang': 'Uniquement en {lang}',
  'blog-nothing-here': '{ rien ici pour le moment }',
  'blog-upcoming': 'À venir',
  'blog-draft': 'Ceci est un brouillon — le contenu peut être incomplet. Revenez plus tard.',
  'projects-nothing-here': '{ projets en préparation }',

  'search-placeholder': 'Rechercher dans les articles et les notes',
  'search-start-typing': 'Saisissez votre recherche',
  'search-no-results': 'Aucun résultat trouvé',
  'search-close': 'Fermer la recherche',
  'search-loading': 'Chargement de l’index de recherche...',
  'search-open': 'Recherche',

  'footer-copyright': '2026 © Teslak',

  'post-comment-on': 'commenter sur',
  'post-link-telegram': 'Telegram',
  'post-link-twitter': 'X',
  'post-link-mastodon': 'Mastodon',
  'post-referenced-by': 'Plus de contenu de ma part sur ce sujet',
  'post-updated': 'mis à jour',
  'post-draft-notice': 'Brouillon',
  'post-copy-link': 'lien',
  'post-link-copied': 'copié',
  'post-place-at': 'à',
  'label-external': 'Lien externe',

  'article-audio-label': 'Audio de l’article',
  'article-audio-play': 'Lire l’audio',
  'article-audio-pause': 'Mettre l’audio en pause',
  'article-audio-rewind': 'Reculer de 15 secondes',
  'article-audio-forward': 'Avancer de 15 secondes',
  'article-audio-speed': 'Modifier la vitesse de lecture',
  'article-audio-download': 'Télécharger l’audio',
  'article-audio-close': 'Fermer le mini-lecteur',
  'article-audio-progress': 'Progression de l’audio',
  'article-audio-error': 'Impossible de charger l’audio.',
  'article-audio-outdated': 'Le texte a été mis à jour après l’enregistrement de cet audio',

  'heading-link': 'lien',
  'heading-copied': 'copié',

  'photos-view-cover': 'Recadrer pour remplir',
  'photos-view-contain': 'Ne pas recadrer',

  'sources-title': 'Sources',

  'days-left': ({ days }) => Number(days) === 1 ? `dans ${days} jour` : `dans ${days} jours`,
} satisfies MessageDictionary as MessageDictionary
