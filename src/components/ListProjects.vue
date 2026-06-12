<script setup lang="ts">
import type { LocalizedText, ProjectItem, ProjectSection } from '~/data/projects'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { defaultLocale } from '~/locales/config'
import { getLocaleFromPath } from '~/logics/i18n-path'

defineProps<{ projects: ProjectSection[] }>()

const route = useRoute()
const currentLocale = computed(() => getLocaleFromPath(route.path))

function getLocalizedText(value: LocalizedText) {
  if (typeof value === 'string')
    return value
  return value[currentLocale.value] || value[defaultLocale] || Object.values(value)[0] || ''
}

function getTitle(section: ProjectSection) {
  return getLocalizedText(section.title)
}

function getName(item: ProjectItem) {
  return getLocalizedText(item.name)
}

function getDesc(item: ProjectItem) {
  return getLocalizedText(item.desc)
}
</script>

<template>
  <div class="prose m-auto">
    <div v-if="!projects.length" py2 op50 slide-enter>
      {{ $t('projects-nothing-here') }}
    </div>

    <template v-else>
      <div
        v-for="section, cidx in projects" :key="section.id" slide-enter
        :style="{ '--enter-stage': cidx + 1 }"
      >
        <div
          :id="section.id"
          select-none relative h18 mt5 pointer-events-none slide-enter
          :style="{
            '--enter-stage': cidx - 2,
            '--enter-step': '60ms',
          }"
        >
          <span text-5em color-transparent absolute left--1rem top-0rem font-bold leading-1em text-stroke-1.5 text-stroke-hex-aaa op35 dark:op20>{{ getTitle(section) }}</span>
        </div>
        <div
          class="project-grid py-2"
        >
          <a
            v-for="item, idx in section.projects"
            :key="idx"
            class="item block font-normal no-underline"
            :href="item.link"
            target="_blank"
            :title="getName(item)"
          >
            <div class="title text-xl leading-1.2em">{{ getName(item) }}</div>
            <div class="desc text-xl opacity-75 font-normal mt-1" v-html="getDesc(item)" />
          </a>
        </div>
      </div>
    </template>
  </div>
  <div v-if="projects.length">
    <div class="table-of-contents">
      <div class="table-of-contents-anchor">
        <div class="i-ri-menu-2-fill" />
      </div>
      <ul>
        <li v-for="section in projects" :key="section.id">
          <a :href="`#${section.id}`">{{ getTitle(section) }}</a>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.project-grid a.item {
  margin-bottom: 0.8rem;
  padding: 0.4rem 0;
}
</style>
