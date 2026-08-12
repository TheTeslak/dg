export interface FindItem {
  id: string
  url: string
  title: string
  desc?: string
  date?: string // YYYY-MM-DD
}

export const finds: FindItem[] = [
  {
    id: 'some-article',
    url: 'https://example.com/some/article?ref=123',
    title: '1',
    desc: '2',
    date: '2026-01-01',
  },
  {
    id: 'making-of-naturalists-library',
    url: 'https://c82.net/blog/making-of-naturalists-library',
    title: 'Making of The Naturalist’s Library',
    desc: 'From fragile engravings and weathered pages emerges a vivid portrait of nature as the nineteenth century once saw it',
  },
  {
    id: 'cloudflare-drop',
    url: 'https://www.cloudflare.com/drop/',
    title: 'Fast website publishing',
  },
  {
    id: 'llm-shoggoth-meme',
    url: 'https://www.lesswrong.com/posts/nhb8AyEcQGjQetgi5/the-llm-shoggoth-meme-is-weirder-than-you-think',
    title: 'The LLM shoggoth meme is weirder than you think',
    desc: '“In 1931, Claude Mythos visited Lovecraft in a dream”',
  },
  {
    id: 'mitochondria-visualization',
    url: 'https://media.cellsignal.com/www/html/science/landscapes/mitochondria/mitochondria.html',
    title: 'Visualizing mitochondria and cellular components',
  },
  {
    id: 'knowledge-collapse',
    url: 'https://bostonreview.net/articles/knowledge-collapse/',
    title: '⭐️ Knowledge Collapse',
    desc: 'AI companies are racing to mechanize mathematics. Where does that leave human understanding?',
  },
  {
    id: 'anthropic-economic-index',
    url: 'https://www.anthropic.com/economic-index',
    title: 'Anthropic Economic Index',
    desc: 'Interactive data on global AI adoption and its effects on the economy',
  },
  {
    id: '1000-players-simulate-civilization',
    url: 'https://youtu.be/ef568d0CrRY',
    title: '1000 Players Simulate Civilization: Rich & Poor',
    desc: 'A hardcore simulation where death is permanent. Divided into two contrasting biomes, players built empires and formed alliances. But resource inequality and political ambition quickly turned a peaceful experiment into a story of espionage, framed leaders, and global war',
  },
  {
    id: 'internet-hall-of-fame',
    url: 'https://www.internethalloffame.org/',
    title: 'Internet Hall of Fame',
    desc: 'A collection of profiles recognizing people who contributed to the development and growth of the Internet',
  },
  {
    id: 'cloudhiker',
    url: 'https://cloudhiker.net/',
    title: 'Cloudhiker',
    desc: 'A way to stumble through strange, useful, and memorable websites',
  },
  {
    id: 'history-of-philosophy',
    url: 'https://www.denizcemonduygu.com/portfolio/the-history-of-philosophy/',
    title: '⭐️ History of Philosophy',
    desc: 'An ever-growing interactive graph of Western philosophy showing positive and negative connections between key ideas, arguments, and philosophers',
  },
  {
    id: 'scale-of-universe',
    url: 'https://scaleofuniverse.com/',
    title: 'Interactive scale of everything',
  },
  {
    id: 'apollo-journals',
    url: 'https://www.apollojournals.org/',
    title: 'Apollo Journals',
    desc: 'A portal to the Apollo Lunar Surface Journal and Apollo Flight Journal, with transcripts, commentary, photos, and documentation for Apollo missions',
  },
  {
    id: 'figure-03',
    url: 'https://youtu.be/Eu5mYMavctM',
    title: 'Introducing Figure 03',
    desc: 'A glossy but compelling glimpse of where humanoid robotics is heading',
  },
  {
    id: 'hubble-observing',
    url: 'https://spacetelescopelive.org/hubble',
    title: 'What is Hubble observing?',
  },
  {
    id: 'meshtastic',
    url: 'https://meshtastic.org/',
    title: 'Meshtastic',
    desc: 'Open-source off-grid communication over LoRa mesh',
  },
  {
    id: 'chatgpt-usage-study',
    url: 'https://openai.com/index/how-people-are-using-chatgpt/',
    title: 'How people are using ChatGPT',
    desc: 'Analysis of 1.5 million conversations on everyday and work uses',
  },
  {
    id: 'cessna-172-systems',
    url: 'https://youtu.be/DvCv2SuKCE8',
    title: 'Inside a Single-Engine Aircraft',
    desc: 'How a Cessna 172 is built and how its main systems work',
  },
  {
    id: 'greatest-solved-mysteries',
    url: 'https://www.reddit.com/r/AskReddit/comments/180ywkj/whats_the_greatest_solved_mystery/?show=original',
    title: 'Greatest solved mysteries',
  },
  {
    id: 'google-trends',
    url: 'https://trends.google.com/trends/',
    title: 'Google Trends',
  },
  {
    id: 'neal-fun',
    url: 'https://neal.fun/',
    title: 'Playful web experiments',
  },
  {
    id: 'russo-ukrainian-war',
    url: 'https://en.wikipedia.org/wiki/Russo-Ukrainian_war_(2022%E2%80%93present)',
    title: 'Russia’s war in Ukraine',
  },
  {
    id: 'humans-guide-to-words',
    url: 'https://www.lesswrong.com/w/a-humans-guide-to-words',
    title: 'A Human’s Guide to Words',
    desc: 'There’s a lot to say about LessWrong, and one day I’ll write an essay on it — including what deserves criticism. Still, this section is one of its greatest',
  },
  {
    id: 'wikipedia-vital-articles',
    url: 'https://en.wikipedia.org/wiki/Wikipedia%3AVital_articles',
    title: 'Wikipedia’s essential topics',
  },
]
