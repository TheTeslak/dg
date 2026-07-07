export interface FindItem {
  url: string
  title: string
  desc?: string
  date?: string // YYYY-MM-DD
}

export const finds: FindItem[] = [
  {
    url: 'https://example.com/some/article?ref=123',
    title: 'Отличная статья про X',
    desc: 'Краткий комментарий, почему стоит прочитать',
    date: '2026-07-05',
  },
  {
    url: 'https://www.lesswrong.com/posts/nhb8AyEcQGjQetgi5/the-llm-shoggoth-meme-is-weirder-than-you-think',
    title: 'The LLM shoggoth meme is weirder than you think',
    desc: '“In 1931, Claude Mythos visited Lovecraft in a dream”',
  },
  {
    url: 'https://media.cellsignal.com/www/html/science/landscapes/mitochondria/mitochondria.html',
    title: 'Visualizing mitochondria and cellular components',
  },
  {
    url: 'https://bostonreview.net/articles/knowledge-collapse/',
    title: '⭐️ Knowledge Collapse',
    desc: 'AI companies are racing to mechanize mathematics. Where does that leave human understanding?',
  },
  {
    url: 'https://www.anthropic.com/economic-index',
    title: 'Anthropic Economic Index',
    desc: 'Interactive data on global AI adoption and its effects on the economy',
  },
  {
    url: 'https://www.internethalloffame.org/',
    title: 'Internet Hall of Fame',
    desc: 'A collection of profiles recognizing people who contributed to the development and growth of the Internet',
  },
  {
    url: 'https://cloudhiker.net/',
    title: 'Cloudhiker',
    desc: 'A way to stumble through strange, useful, and memorable websites',
  },
  {
    url: 'https://www.denizcemonduygu.com/portfolio/the-history-of-philosophy/',
    title: '⭐️ History of Philosophy',
    desc: 'An ever-growing interactive graph of Western philosophy showing positive and negative connections between key ideas, arguments, and philosophers',
  },
  {
    url: 'https://scaleofuniverse.com/',
    title: 'Interactive scale of everything',
  },
  {
    url: 'https://www.apollojournals.org/',
    title: 'Apollo Journals',
    desc: 'A portal to the Apollo Lunar Surface Journal and Apollo Flight Journal, with transcripts, commentary, photos, and documentation for Apollo missions',
  },
  {
    url: 'https://youtu.be/Eu5mYMavctM',
    title: 'Introducing Figure 03',
    desc: 'A glossy but compelling glimpse of where humanoid robotics is heading',
  },
  {
    url: 'https://spacetelescopelive.org/hubble',
    title: 'What is Hubble observing?',
  },
  {
    url: 'https://meshtastic.org/',
    title: 'Meshtastic',
    desc: 'Open-source off-grid communication over LoRa mesh',
  },
  {
    url: 'https://openai.com/index/how-people-are-using-chatgpt/',
    title: 'How people are using ChatGPT',
    desc: 'Analysis of 1.5 million conversations on everyday and work uses',
  },
  {
    url: 'https://youtu.be/DvCv2SuKCE8',
    title: 'Inside a Single-Engine Aircraft',
    desc: 'How a Cessna 172 is built and how its main systems work',
  },
  {
    url: 'https://trends.google.com/trends/',
    title: 'Google Trends',
  },
  {
    url: 'https://neal.fun/',
    title: 'Playful web experiments',
  },
]
