import type { DocumentHead } from '@qwik.dev/router'
import type { SupportedLocale } from '../../../lib/locales'
import { component$ } from '@qwik.dev/core'
import { routeLoader$ } from '@qwik.dev/router'
import { projects } from '../../../../../src/data/projects'
import { ProjectList } from '../../../components/project-list'
import { isSupportedLocale } from '../../../lib/locales'

const copy: Record<
  SupportedLocale,
  {
    title: string
    display: string
    description: string
  }
> = {
  en: {
    title: 'Projects',
    display: 'From vision to reality',
    description: 'List of projects that Anthony Fu is proud of.',
  },
  ru: {
    title: 'Проекты',
    display: 'От замысла до воплощения',
    description: 'Список проектов, которыми гордится Anthony Fu.',
  },
  es: {
    title: 'Proyectos',
    display: 'De la visión a la realidad',
    description: 'Lista de proyectos de los que Anthony Fu se siente orgulloso.',
  },
}

export const useProjectsPage = routeLoader$(({ params }) => {
  if (!isSupportedLocale(params.lang))
    return null

  return {
    locale: params.lang,
    projects,
  }
})

export default component$(() => {
  const data = useProjectsPage().value

  if (!data) {
    return (
      <section class="prose mx-auto max-w-3xl">
        <h1>Projects</h1>
        <p>Unsupported locale.</p>
      </section>
    )
  }

  const page = copy[data.locale]

  return (
    <section class="mx-auto max-w-6xl">
      <div class="prose mb-8 max-w-none">
        <h1>{page.title}</h1>
        <p>{page.display}</p>
      </div>
      <ProjectList locale={data.locale} projects={data.projects} />
    </section>
  )
})

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(useProjectsPage)
  const locale = data?.locale || 'en'
  const page = copy[locale]

  return {
    title: `${page.title} - Anthony Fu`,
    meta: [
      {
        name: 'description',
        content: page.description,
      },
    ],
  }
}
