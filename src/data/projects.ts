import type { SupportedLocale } from '~/locales/config'

export type LocalizedText = string | Partial<Record<SupportedLocale, string>>

export interface ProjectItem {
  name: LocalizedText
  link: string
  desc: LocalizedText
  icon?: string
}

export interface ProjectSection {
  id: string
  title: LocalizedText
  projects: ProjectItem[]
}

export const projects: ProjectSection[] = [
  /*
  {
    id: 'development-tools',
    title: {
      en: 'Development Tools',
      ru: 'Инструменты разработки',
      es: 'Herramientas de desarrollo',
    },
    projects: [
      {
        name: {
          en: 'Project Name',
          ru: 'Название проекта',
          es: 'Nombre del proyecto',
        },
        link: 'https://github.com/example/project',
        desc: {
          en: 'A brief English description of the project and its goals.',
          ru: 'Краткое описание проекта и его целей на русском языке.',
          es: 'Una breve descripción del proyecto y sus objetivos en español.',
        },
        icon: 'i-carbon-star',
      },
    ],
  },
  */
]
