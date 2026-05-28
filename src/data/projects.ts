export interface ProjectItem {
  name: string
  name_ru?: string
  name_es?: string
  link: string
  desc: string
  desc_ru?: string
  desc_es?: string
  icon?: string
}

export interface ProjectSection {
  title: string
  title_ru?: string
  title_es?: string
  projects: ProjectItem[]
}

export const projects: ProjectSection[] = [
  /*
  {
    title: 'Development Tools',
    title_ru: 'Инструменты разработки',
    title_es: 'Herramientas de desarrollo',
    projects: [
      {
        name: 'Project Name',
        name_ru: 'Название проекта',
        name_es: 'Nombre del proyecto',
        link: 'https://github.com/example/project',
        desc: 'A brief English description of the project and its goals.',
        desc_ru: 'Краткое описание проекта и его целей на русском языке.',
        desc_es: 'Una breve descripción del proyecto y sus objetivos en español.',
        icon: 'i-carbon-star',
      },
    ],
  },
  */
]
