export interface Post {
  path: string
  title: string
  backlink?: string | string[]
  place?: string
  date: string
  lang?: string
  desc?: string
  platform?: string
  duration?: number | string
  recording?: string
  radio?: boolean
  video?: boolean
  inperson?: boolean
  redirect?: string
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
