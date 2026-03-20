import type { Talk } from '~/types'

// Talks data cleared — add entries in this format:
// {
//   title: 'Talk Title',
//   description: 'Description of the talk',
//   lang: 'en', // optional
//   presentations: [
//     {
//       date: '2025-01-01',
//       location: 'City, Country',
//       conference: 'Conference Name',
//       conferenceUrl: 'https://...',
//       recording: 'https://...', // optional
//       transcript: '/posts/...', // optional
//       pdf: 'https://...', // optional
//       spa: 'https://...', // optional
//     },
//   ],
// },

export const talks: Talk[] = []

talks.forEach((talk) => {
  talk.presentations.sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })
})

talks.sort((a, b) => {
  if (!a.presentations.length || !b.presentations.length)
    return 0
  return new Date(b.presentations[0].date).getTime() - new Date(a.presentations[0].date).getTime()
})
