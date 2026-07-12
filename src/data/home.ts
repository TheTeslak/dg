import type { SupportedLocale } from '~/locales/config'

/**
 * Home page content, ported 1:1 from dg `pages/<locale>/index.md`.
 * Paragraph strings may contain inline HTML (links), exactly like the
 * markdown source rendered.
 */
export interface HomeContent {
  title: string
  description: string
  display: string
  avatarText: string
  paragraphs: string[]
  emailIntro: string
}

export const homeContent: Record<SupportedLocale, HomeContent> = {
  en: {
    title: 'Teslak Realm · personal blog',
    description: 'Advice, analytics, AI, and value',
    display: 'Teslak is interested in IT, AI, UX design, philosophy, economics, biology ✦ and more',
    avatarText: 'Teslak',
    paragraphs: [
      'Working on AI agents, automation, and still on design, although it has changed significantly in recent years',
      'Striving for broad competencies, learning something new every day. Following an academic approach and a scientific worldview',
      'Writing 🪶 <a href="/en/notes">notes</a> here and maintaining a <a href="https://t.me/Tes404" target="_blank" rel="noopener">Telegram channel with reposts of interesting content</a>',
      'Building <a href="/en/projects">pet projects</a>',
      '<a href="/en/photos">Photographed</a> all sorts of things',
      '⚡️ <a href="/en/who-is-teslak">Who is Teslak and why “Teslak”</a>',
    ],
    emailIntro: 'Or email',
  },
  ru: {
    title: 'Обитель Теслака · авторский блог',
    description: 'Советы, аналитика, нейросети и польза',
    display: 'Теслак увлекается IT, нейросетями, UX-дизайном, философией, экономикой, биологией ✦ и не только',
    avatarText: 'Теслак',
    paragraphs: [
      'Работаю над нейроагентами, автоматизацией и всё ещё дизайном, хотя последние годы он значительно меняется',
      'Развиваю междисциплинарность, изучая что-то каждый день. Следую академическому подходу и научной картине мира',
      'Пишу здесь 🪶 <a href="/ru/notes">заметки</a> и веду <a href="https://t.me/Tes404" target="_blank" rel="noopener">тгк с репостами интересностей</a>',
      'Делаю <a href="/ru/projects">пет-проекты</a>',
      '<a href="/ru/photos">Нафотографировал</a> всякого',
      '⚡️ <a href="/ru/who-is-teslak">Кто такой Теслак и почему «Теслак»</a>',
    ],
    emailIntro: 'Или почта',
  },
  es: {
    title: 'Guarida Teslak · blog de autor',
    description: 'Consejos, analítica, IA y valor',
    display: 'A Teslak le apasiona la TI, la IA, el diseño UX, la filosofía, la economía, la biología ✦ y más',
    avatarText: 'Teslak',
    paragraphs: [
      'Trabajo en agentes de IA, automatización y todavía en diseño, aunque ha cambiado significativamente en los últimos años',
      'Aspiro a competencias amplias, aprendiendo algo nuevo cada día. Sigo un enfoque académico y una visión científica del mundo',
      'Escribo 🪶 <a href="/es/notes">notas</a> aquí y mantengo un <a href="https://t.me/Tes404" target="_blank" rel="noopener">canal de Telegram con reposts de contenido interesante</a>',
      'Creo <a href="/es/projects">proyectos personales</a>',
      '<a href="/es/photos">He fotografiado</a> todo tipo de cosas',
      '⚡️ <a href="/es/who-is-teslak">Quién es Teslak y por qué es Teslak</a>',
    ],
    emailIntro: 'O por correo',
  },
  pt: {
    title: 'Reduto Teslak · blog autoral',
    description: 'Conselhos, análises, IA e conteúdo útil',
    display: 'Teslak se interessa por TI, IA, design UX, filosofia, economia, biologia ✦ e muito mais',
    avatarText: 'Teslak',
    paragraphs: [
      'Trabalho com agentes de IA, automação e ainda com design, embora ele tenha mudado bastante nos últimos anos',
      'Busco conhecimentos amplos e aprendo algo novo todos os dias. Sigo uma abordagem acadêmica e uma visão científica do mundo',
      'Escrevo 🪶 <a href="/pt/notes">notas</a> aqui e mantenho um <a href="https://t.me/Tes404" target="_blank" rel="noopener">canal no Telegram com republicações de conteúdo interessante</a>',
      'Desenvolvo <a href="/pt/projects">projetos pessoais</a>',
      '<a href="/pt/photos">Fotografei</a> todo tipo de coisa',
      '⚡️ <a href="/pt/who-is-teslak">Quem é Teslak e por que ele é Teslak</a>',
    ],
    emailIntro: 'Ou por e-mail',
  },
  de: {
    title: 'Teslak Refugium · persönlicher Blog',
    description: 'Ratschläge, Analysen, KI und nützliche Inhalte',
    display: 'Teslak interessiert sich für IT, KI, UX-Design, Philosophie, Wirtschaft, Biologie ✦ und mehr',
    avatarText: 'Teslak',
    paragraphs: [
      'Arbeite an KI-Agenten, Automatisierung und weiterhin an Design, auch wenn es sich in den letzten Jahren stark verändert hat',
      'Strebe ein breites Wissen an und lerne jeden Tag etwas Neues. Folge dabei einem akademischen Ansatz und einem wissenschaftlichen Weltbild',
      'Schreibe hier 🪶 <a href="/de/notes">Notizen</a> und betreibe einen <a href="https://t.me/Tes404" target="_blank" rel="noopener">Telegram-Kanal mit interessanten Fundstücken</a>',
      'Entwickle <a href="/de/projects">eigene Projekte</a>',
      'Habe <a href="/de/photos">alles Mögliche fotografiert</a>',
      '⚡️ <a href="/de/who-is-teslak">Wer Teslak ist und warum er Teslak heißt</a>',
    ],
    emailIntro: 'Oder per E-Mail an',
  },
  fr: {
    title: 'L\'Antre Teslak · blog d\'auteur',
    description: 'Conseils, analyses, IA et contenu utile',
    display: 'Teslak s’intéresse à l’informatique, à l’IA, au design UX, à la philosophie, à l’économie, à la biologie ✦ et à bien d’autres sujets',
    avatarText: 'Teslak',
    paragraphs: [
      'Je travaille sur des agents d’IA, l’automatisation et toujours sur le design, même si celui-ci a beaucoup évolué ces dernières années',
      'Je cherche à développer des compétences variées et j’apprends quelque chose de nouveau chaque jour. Je suis une démarche académique et une vision scientifique du monde',
      'J’écris ici des 🪶 <a href="/fr/notes">notes</a> et je tiens une <a href="https://t.me/Tes404" target="_blank" rel="noopener">chaîne Telegram où je partage du contenu intéressant</a>',
      'Je développe des <a href="/fr/projects">projets personnels</a>',
      'J’ai <a href="/fr/photos">photographié</a> toutes sortes de choses',
      '⚡️ <a href="/fr/who-is-teslak">Qui est Teslak et pourquoi s’appelle-t-il Teslak</a>',
    ],
    emailIntro: 'Ou par e-mail à',
  },
}

/** Now page content, ported from dg `pages/<locale>/now.md`. */
export interface NowContent {
  title: string
  display: string
  description: string
  entries: { date: string, html: string }[]
}

export const nowContent: Record<SupportedLocale, NowContent> = {
  en: {
    title: 'Teslak Now',
    display: 'Current focus',
    description: 'What I am focused on now',
    entries: [{ date: '2026-06-01', html: 'Hello, world!' }],
  },
  ru: {
    title: 'Teslak Now',
    display: 'Текущие дела',
    description: 'Чем я сейчас занимаюсь',
    entries: [{ date: '2026-06-01', html: 'Привет, мир!' }],
  },
  es: {
    title: 'Teslak Now',
    display: 'Enfoque actual',
    description: 'En qué estoy enfocado ahora',
    entries: [{ date: '2026-06-01', html: '¡Hola, mundo!' }],
  },
  de: {
    title: 'Teslak Jetzt',
    display: 'Aktueller Fokus',
    description: 'Womit ich mich gerade beschäftige',
    entries: [{ date: '2026-06-01', html: 'Hallo, Welt!' }],
  },
  fr: {
    title: 'Teslak Maintenant',
    display: 'Priorités actuelles',
    description: 'Ce sur quoi je me concentre actuellement',
    entries: [{ date: '2026-06-01', html: 'Bonjour le monde !' }],
  },
  pt: {
    title: 'Teslak Agora',
    display: 'Foco atual',
    description: 'No que estou focado agora',
    entries: [{ date: '2026-06-01', html: 'Olá, mundo!' }],
  },
}

/** Photos page meta, ported from dg `pages/<locale>/photos.md`. */
export const photosMeta: Record<SupportedLocale, { title: string, description: string, credit?: string }> = {
  en: {
    title: 'Teslak Photos',
    description: 'Photos',
    credit: 'Thank you for being interested in my photos. You can find the tools I use <a href="https://teslak.me/use" target="_blank">here</a>.',
  },
  ru: {
    title: 'Teslak Photos',
    description: 'Фотографии',
    credit: 'Спасибо за интерес к моим фотографиям. Список техники, которую я использую, можно найти <a href="https://teslak.me/ru/use" target="_blank">здесь</a>.',
  },
  es: { title: 'Teslak Photos', description: 'Fotos' },
  de: { title: 'Teslaks Fotos', description: 'Fotografien' },
  fr: { title: 'Photos de Teslak', description: 'Photographies' },
  pt: { title: 'Fotos do Teslak', description: 'Fotografias' },
}

/** Projects page meta, ported from dg `pages/<locale>/projects.md`. */
export const projectsMeta: Record<SupportedLocale, { display: string, description?: string }> = {
  en: { display: 'From vision to reality', description: 'List of projects that I am proud of' },
  ru: { display: 'От замысла до воплощения' },
  es: { display: 'De la visión a la realidad', description: 'Lista de proyectos' },
  de: { display: 'Von der Idee zur Wirklichkeit', description: 'Eine Liste der Projekte, auf die ich stolz bin' },
  fr: { display: 'De l’idée à la réalité', description: 'Liste des projets dont je suis fier' },
  pt: { display: 'Da ideia à realidade', description: 'Lista de projetos dos quais me orgulho' },
}
