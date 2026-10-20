export interface Talk {
  title: string
  lang?: string
  series?: string
  description?: string
  presentations: Presentation[]
}

export interface Presentation {
  conference: string
  conferenceUrl: string
  date: string
  location: string
  lang?: string
  recording?: string
  transcript?: string
  spa?: string // Slides
  pdf?: string
}

export const talks: Talk[] = [
  {
    title: 'The New ESLint Config with Type Safety',
    presentations: [
      {
        date: '2025-05-23',
        conference: 'TSKaigi',
        conferenceUrl: 'https://2025.tskaigi.org/',
        location: 'Tokyo',
        lang: 'en',
      },
    ],
  },
  {
    title: 'VueとWebComponentsで作るAgnostic UI',
    lang: 'ja',
    presentations: [
      {
        date: '2025-06-13',
        conference: 'v-tokyo',
        conferenceUrl: 'https://vuejs-meetup.connpass.com/',
        location: 'Tokyo',
        lang: 'ja',
      },
    ],
  },
  {
    title: 'Vite DevTools 前瞻介绍',
    lang: 'zh',
    presentations: [
      {
        date: '2025-07-12',
        conference: 'VueConf China',
        conferenceUrl: 'https://vueconf.cn/',
        location: 'Shenzhen',
        lang: 'zh',
      },
    ],
  },
  {
    title: 'Yak Shaving',
    lang: 'zh',
    presentations: [
      {
        date: '2025-08-10',
        conference: 'COSCUP',
        conferenceUrl: 'https://coscup.org/2025/',
        location: 'Taipei',
        lang: 'zh',
      },
      {
        date: '2024-07-06',
        conference: 'VueConf Shenzhen',
        conferenceUrl: 'https://vue.w3ctech.com/',
        location: 'Shenzhen',
        lang: 'zh',
      },
      {
        date: '2024-10-19',
        conference: 'Vue Fes Japan',
        conferenceUrl: 'https://vuefes.jp/',
        location: 'Tokyo',
        lang: 'ja',
      },
    ],
  },
  {
    title: 'Make Tools People Love',
    presentations: [
      {
        date: '2025-09-18',
        conference: 'SquiggleConf',
        conferenceUrl: 'https://2025.squiggleconf.com/',
        location: 'Boston',
        lang: 'en',
      },
    ],
  },
  {
    title: 'Vite DevTools',
    presentations: [
      {
        date: '2025-10-09',
        conference: 'ViteConf',
        conferenceUrl: 'https://viteconf.amsterdam/',
        location: 'Amsterdam',
        lang: 'en',
      },
      {
        date: '2025-10-25',
        conference: 'VueFes',
        conferenceUrl: 'https://vuefes.jp/2025/',
        location: 'Tokyo',
        lang: 'ja',
      },
    ],
  },
  {
    title: 'The Progressive Path',
    presentations: [
      {
        date: '2024-02-27',
        conference: 'The Vue-niverse meetup',
        conferenceUrl: 'https://www.meetup.com/nl-NL/coven-of-wisdom-utrecht/events/298711260/',
        location: 'Utrecht, Netherlands',
      },
      {
        date: '2024-02-29',
        conference: 'Vue Amsterdam',
        conferenceUrl: 'https://vuejs.amsterdam/',
        location: 'Amsterdam',
      },
      {
        date: '2024-06-01',
        conference: 'Frontend Nation',
        conferenceUrl: 'https://frontendnation.com/',
        location: 'Online',
      },
      {
        date: '2024-10-03',
        conference: 'ViteConf',
        conferenceUrl: 'https://viteconf.org/',
        location: 'Online',
      },
    ],
  },
  {
    title: 'ESLint One for All Made Easy',
    presentations: [
      {
        date: '2024-06-08',
        conference: 'CityJS Athens',
        conferenceUrl: 'https://greece.cityjsconf.org/',
        location: 'Athens',
      },
      {
        date: '2024-06-13',
        conference: 'JS Nation',
        conferenceUrl: 'https://jsnation.com/',
        location: 'Amsterdam',
      },
      {
        date: '2024-12-07',
        conference: 'FEDAY',
        conferenceUrl: 'https://fequan.com/2024/',
        location: 'Xiamen',
        lang: 'zh',
      },
      {
        date: '2024-12-13',
        conference: 'React Day Berlin',
        conferenceUrl: 'https://reactday.berlin/',
        location: 'Berlin (Remote)',
      },
      {
        date: '2024-12-27',
        conference: 'WebConf Taiwan',
        conferenceUrl: 'https://webconf.tw/',
        location: 'Taipei',
        lang: 'zh',
      },
    ],
  },
  {
    title: 'The Set Theory',
    presentations: [
      {
        date: '2024-06-14',
        conference: 'React Summit',
        conferenceUrl: 'https://reactsummit.com/',
        location: 'Amsterdam',
      },
      {
        date: '2024-03-22',
        conference: 'React Paris',
        conferenceUrl: 'https://react.paris/',
        location: 'Paris',
      },
    ],
  },
  {
    title: 'Panel Discussions',
    presentations: [
      {
        date: '2024-03-01',
        conference: 'Devworld',
        conferenceUrl: 'https://devworldconference.com/',
        location: 'Amsterdam',
      },
      {
        date: '2024-04-03',
        conference: 'Vue.js Paris',
        conferenceUrl: 'https://www.meetup.com/fr-FR/vuejs-paris/',
        location: 'Paris',
      },
    ],
  },
  {
    title: 'Journey to Nuxt Icon',
    presentations: [
      {
        date: '2024-11-12',
        conference: 'Nuxt Nation',
        conferenceUrl: 'https://nuxtnation.com/',
        location: 'Online',
      },
    ],
  },
]
