export interface Post {
  path: string
  title: string
  backlink?: string | string[]
  place?: string
  date: string
  updated?: string
  lang?: string
  desc?: string
  duration?: number | string
  redirect?: string
  type?: string
  audio?: ArticleAudio
}

export interface ArticleAudio {
  url: string
  sourceTextUpdatedAt?: string
  duration?: string
  title?: string
  artist?: string
  downloadUrl?: string
}

export interface Talk {
  title: string
  description?: string
  series?: string
  lang?: string
  presentations: TalkPresentation[]
}

export interface TalkPresentation {
  lang?: string
  date: string
  location?: string
  conference: string
  conferenceUrl: string
  recording?: string
  transcript?: string
  pdf?: string
  spa?: string
}

export interface UpcomingTalk {
  title: string
  date: string
  platform: string
  url: string
}
