<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { finds } from '~/data/finds'
import { extractDomain, formatDate } from '~/logics'
import { getFindPath } from '~/logics/find-path'
import { getLocaleFromPath } from '~/logics/i18n-path'
import { isPostVisible } from '~/logics/post-visibility'

const route = useRoute()
const router = useRouter()
const locale = computed(() => getLocaleFromPath(route.path))

interface InternalFindItem {
  ai: boolean
  date: string
  desc?: string
  duration?: number
  id: string
  kind: 'internal'
  title: string
}

const internalFinds = computed<InternalFindItem[]>(() => {
  const seen = new Set<string>()
  return router.getRoutes().flatMap((findRoute) => {
    const slug = findRoute.meta.findSlug
    const frontmatter = findRoute.meta.frontmatter
    if (findRoute.meta.isFind !== true || typeof slug !== 'string' || seen.has(slug) || !isPostVisible(frontmatter || {}))
      return []
    seen.add(slug)
    return [{
      ai: frontmatter.ai === true,
      date: String(frontmatter.date),
      desc: frontmatter.description || frontmatter.excerpt,
      duration: typeof frontmatter.duration === 'number' ? frontmatter.duration : undefined,
      id: slug,
      kind: 'internal' as const,
      title: frontmatter.title || slug,
    }]
  })
})

const externalFinds = computed(() => finds.map(item => ({ ...item, kind: 'external' as const })))
const allFinds = computed(() => [...externalFinds.value, ...internalFinds.value])

const activeFinds = computed(() => {
  return allFinds.value
    .filter(item => !!item.date)
    .sort((a, b) => +new Date(b.date!) - +new Date(a.date!))
})

const archivedFinds = computed(() => {
  return externalFinds.value.filter(item => !item.date)
})
</script>

<template>
  <div class="prose m-auto" style="contain: layout;">
    <div v-if="!allFinds.length" py2 op50 slide-enter>
      {{ $t('blog-nothing-here') }}
    </div>

    <template v-else>
      <!-- Telegram Promo -->
      <div
        class="text-base opacity-35 mt-0 mb-10 leading-relaxed max-w-xl slide-enter"
        :style="{
          '--enter-stage': 0,
          '--enter-step': '60ms',
        }"
        v-html="$t('finds-telegram-promo')"
      />

      <!-- Active Finds -->
      <div v-if="activeFinds.length" class="mb-10">
        <div
          v-for="item, idx in activeFinds"
          :key="`${item.kind}:${item.id}`"
          class="slide-enter"
          :style="{
            '--enter-stage': idx + 1,
            '--enter-step': '60ms',
          }"
        >
          <component
            :is="item.kind === 'external' ? 'a' : 'RouterLink'"
            v-bind="item.kind === 'external'
              ? { href: item.url, target: '_blank', rel: 'noopener noreferrer' }
              : { to: getFindPath(locale, item.id) }"
            class="item block font-normal mb-6 mt-2 no-underline"
          >
            <div class="no-underline" flex="~ col gap-1">
              <div class="title text-xl leading-1.2em" flex="~ gap-1.5 wrap items-center">
                <span align-middle>{{ item.title }}</span>
                <span
                  v-if="item.kind === 'external'"
                  class="op45 flex-none self-center text-base"
                  i-carbon-arrow-up-right
                  :title="$t('label-external')"
                  aria-hidden="true"
                />
              </div>
              <div v-if="item.desc" class="desc text-xl opacity-75 font-normal mt-1">
                {{ item.desc }}
              </div>
              <div flex="~ gap-2 items-center" class="text-base op60 mt-0.5">
                <span v-if="item.date">{{ formatDate(item.date, true, locale) }}</span>
                <template v-if="item.kind === 'external'">
                  <span v-if="item.date && extractDomain(item.url)">·</span>
                  <span>{{ extractDomain(item.url) }}</span>
                </template>
                <template v-else>
                  <span>·</span>
                  <span>{{ item.ai ? 'synthetic' : 'synthesis' }}</span>
                </template>
              </div>
            </div>
          </component>
        </div>
      </div>

      <!-- Archived Finds -->
      <div v-if="archivedFinds.length" class="mt-12">
        <div
          select-none mt-10 mb-6 slide-enter
          :style="{
            '--enter-stage': activeFinds.length + 1,
            '--enter-step': '60ms',
          }"
          class="text-base font-bold opacity-35"
        >
          {{ $t('finds-earlier') }}
        </div>

        <div
          v-for="item, idx in archivedFinds"
          :key="item.url"
          class="slide-enter"
          :style="{
            '--enter-stage': activeFinds.length + idx + 2,
            '--enter-step': '60ms',
          }"
        >
          <a
            :href="item.url"
            target="_blank"
            rel="noopener noreferrer"
            class="item block font-normal mb-6 mt-2 no-underline"
          >
            <div class="no-underline" flex="~ col gap-1">
              <div class="title text-xl leading-1.2em" flex="~ gap-1.5 wrap items-center">
                <span align-middle>{{ item.title }}</span>
                <span
                  class="op45 flex-none self-center text-base"
                  i-carbon-arrow-up-right
                  :title="$t('label-external')"
                  aria-hidden="true"
                />
              </div>
              <div v-if="item.desc" class="desc text-xl opacity-75 font-normal mt-1">
                {{ item.desc }}
              </div>
              <div flex="~ gap-2 items-center" class="text-base op60 mt-0.5">
                <span>{{ extractDomain(item.url) }}</span>
              </div>
            </div>
          </a>
        </div>
      </div>
    </template>
  </div>
</template>
