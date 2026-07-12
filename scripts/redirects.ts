/**
 * Netlify `_redirects`, ported 1:1 from dg (all six locale feeds and every
 * legacy shortcut). Article URLs did NOT change in this migration
 * (`/{locale}/{slug}`), so no per-article rules are needed.
 */
import { resolve } from 'node:path'
import fs from 'fs-extra'

const REDIRECTS = `https://www.teslak.me/* https://teslak.me/:splat 301!
http://www.teslak.me/* https://teslak.me/:splat 301!
http://teslak.me/* https://teslak.me/:splat 301!

/rss /feed.xml 301
/rss.xml /feed.xml 301
/feed /feed.xml 301
/atom /feed.atom 301
/atom.xml /feed.atom 301
/jsonfeed /feed.json 301
/json-feed /feed.json 301

/en/rss /feed.xml 301
/en/feed /feed.xml 301
/ru/rss /feed-ru.xml 301
/ru/feed /feed-ru.xml 301
/es/rss /feed-es.xml 301
/es/feed /feed-es.xml 301
/pt/rss /feed-pt.xml 301
/pt/feed /feed-pt.xml 301
/de/rss /feed-de.xml 301
/de/feed /feed-de.xml 301
/fr/rss /feed-fr.xml 301
/fr/feed /feed-fr.xml 301

/articles /en/articles 301
/blog /en/articles 301
/posts /en/articles 301

/notes /en/notes 301
/now /en/now 301
/projects /en/projects 301
/photos /en/photos 301
/demos /en/demos 301
/talks /en/talks 301
/streams /en/streams 301
/podcasts /en/podcasts 301
/media /en/media 301
/bookmarks /en/bookmarks 301
/use /en/use 301
/finds /en/finds 301

/github https://github.com/theteslak 301
/gh https://github.com/theteslak 301
/x https://x.com/theteslak 301
/twitter https://x.com/theteslak 301
/instagram https://instagram.com/theteslak 301
/ig https://instagram.com/theteslak 301

/sitemap /sitemap.xml 301
/sitemap/ /sitemap.xml 301
`

async function run() {
  await fs.ensureDir(resolve('dist'))
  await fs.writeFile(resolve('dist/_redirects'), REDIRECTS, 'utf-8')
  console.log('[Redirects] Wrote dist/_redirects')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
