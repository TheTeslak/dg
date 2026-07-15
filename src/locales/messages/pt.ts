import type { MessageDictionary } from './types.ts'

export default {
  'meta-description': 'Blog do Teslak',

  'nav-blog': 'Blog',
  'nav-articles': 'Artigos',
  'nav-projects': 'Projetos',
  'nav-notes': 'Notas',
  'nav-photos': 'Fotos',
  'nav-now': 'Agora',
  'nav-menu': 'Menu',
  'nav-close': 'Fechar',
  'nav-methodology': 'Metodologia',
  'nav-finds': 'Achados',

  'finds-earlier': 'Antes',
  'finds-telegram-promo': 'O que me chamou a atenção, embora minha postura possa ser diferente<br>Mais achados semanais no Telegram: <a href="https://t.me/Tes404" target="_blank" rel="noopener noreferrer" class="underline hover:opacity-80">@Tes404</a>, em russo',

  'a11y-skip-to-content': 'Ir para o conteúdo',
  'a11y-home': 'Início',
  'a11y-main-navigation': 'Navegação principal',
  'a11y-site-logo': 'Logotipo do site',

  'action-toggle-theme': 'Alternar esquema de cores',
  'action-to-top': 'Voltar ao topo',
  'action-back-to-all': 'Voltar para todos',
  'action-change-language': 'Alterar idioma',
  'action-go-home': 'Ir para o início',
  'lightbox-close': 'Fechar visualização da imagem',

  'page-not-translated': ({ lang, type }) => type === 'note'
    ? `Ainda não traduzida; exibindo a versão em ${lang}`
    : `Ainda não traduzido; exibindo a versão em ${lang}`,
  'page-not-found': 'Página não encontrada',

  'blog-only-lang': 'Apenas {lang}',
  'blog-nothing-here': '{ ainda não há nada aqui }',
  'blog-upcoming': 'Em breve',
  'blog-draft': 'Este é um rascunho — o conteúdo pode estar incompleto. Volte mais tarde.',
  'projects-nothing-here': '{ projetos a caminho }',

  'search-placeholder': 'Pesquisar artigos e notas',
  'search-start-typing': 'Digite sua pesquisa',
  'search-no-results': 'Nenhum resultado encontrado',
  'search-close': 'Fechar pesquisa',
  'search-loading': 'Carregando índice de pesquisa...',
  'search-open': 'Pesquisar',

  'footer-copyright': '2026 © Teslak',

  'post-comment-on': 'comentar no',
  'post-link-telegram': 'Telegram',
  'post-link-twitter': 'X',
  'post-link-mastodon': 'Mastodon',
  'post-referenced-by': 'Mais conteúdo meu sobre isto',
  'post-updated': 'atualizado',
  'post-draft-notice': 'Rascunho',
  'post-copy-link': 'link',
  'post-link-copied': 'copiado',
  'post-place-at': 'em',
  'label-external': 'Link externo',

  'article-audio-label': 'Áudio do artigo',
  'article-audio-play': 'Reproduzir áudio',
  'article-audio-pause': 'Pausar áudio',
  'article-audio-rewind': 'Voltar 15 segundos',
  'article-audio-forward': 'Avançar 15 segundos',
  'article-audio-speed': 'Alterar velocidade de reprodução',
  'article-audio-download': 'Baixar áudio',
  'article-audio-close': 'Fechar miniplayer',
  'article-audio-progress': 'Progresso do áudio',
  'article-audio-error': 'Não foi possível carregar o áudio.',
  'article-audio-outdated': 'O texto foi atualizado depois que este áudio foi gravado',

  'heading-link': 'link',
  'heading-copied': 'copiado',

  'photos-view-cover': 'Recortar para preencher',
  'photos-view-contain': 'Não recortar',

  'sources-title': 'Fontes',

  'days-left': ({ days }) => Number(days) === 1 ? `em ${days} dia` : `em ${days} dias`,
} satisfies MessageDictionary as MessageDictionary
