import type {
  ProjectItem,
  ProjectSection,
} from '../../../src/data/projects'
import type { SupportedLocale } from '../lib/locales'
import { component$ } from '@qwik.dev/core'

interface ProjectListProps {
  locale: SupportedLocale
  projects: ProjectSection[]
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[\s\\/]+/g, '-')
}

function getSectionTitle(
  locale: SupportedLocale,
  section: ProjectSection,
): string {
  if (locale === 'ru')
    return section.title_ru || section.title
  if (locale === 'es')
    return section.title_es || section.title
  return section.title
}

function getItemName(locale: SupportedLocale, item: ProjectItem): string {
  if (locale === 'ru')
    return item.name_ru || item.name
  if (locale === 'es')
    return item.name_es || item.name
  return item.name
}

function getItemDesc(locale: SupportedLocale, item: ProjectItem): string {
  if (locale === 'ru')
    return item.desc_ru || item.desc
  if (locale === 'es')
    return item.desc_es || item.desc
  return item.desc
}

export const ProjectList = component$<ProjectListProps>(
  ({ locale, projects }) => {
    return (
      <div class="mx-auto grid max-w-6xl gap-10 xl:grid-cols-[minmax(0,1fr)_14rem]">
        <div class="prose max-w-none">
          {projects.map((section) => {
            const title = getSectionTitle(locale, section)
            return (
              <section key={section.title} id={slug(section.title)} class="pb-8">
                <div class="pointer-events-none relative mt-5 h-18 select-none">
                  <span class="absolute left-[-1rem] top-0 text-[4.5rem] font-bold leading-none color-transparent op35 text-stroke-1.5 text-stroke-hex-aaa dark:op20">
                    {title}
                  </span>
                </div>

                <div class="grid gap-2 py-2">
                  {section.projects.map(item => (
                    <a
                      key={item.link}
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={getItemName(locale, item)}
                      class="group block rounded-2xl p-4 no-underline transition-colors hover:bg-black/3 dark:hover:bg-white/4"
                    >
                      <div class="flex gap-3">
                        {item.icon
                          ? (
                              <span
                                aria-hidden="true"
                                class={`${item.icon} mt-1 shrink-0 text-xl op70 transition-opacity group-hover:op100`}
                              />
                            )
                          : null}
                        <div>
                          <div class="text-xl leading-tight color-base">
                            {getItemName(locale, item)}
                          </div>
                          <div
                            class="mt-1 text-base op75"
                            dangerouslySetInnerHTML={getItemDesc(locale, item)}
                          />
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )
          })}
        </div>

        <aside class="xl:sticky xl:top-24 xl:self-start">
          <nav
            aria-label="Project sections"
            class="rounded-2xl border border-base p-4 text-sm"
          >
            <div class="mb-3 font-medium op70">Sections</div>
            <ul class="flex flex-col gap-2">
              {projects.map(section => (
                <li key={section.title}>
                  <a
                    href={`#${slug(section.title)}`}
                    class="no-underline op70 hover:op100"
                  >
                    {getSectionTitle(locale, section)}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      </div>
    )
  },
)
