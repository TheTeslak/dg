<script setup lang="ts">
import type { ProjectItem, ProjectSection } from '~/data/projects'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { getLocaleFromPath } from '~/logics/i18n-path'

defineProps<{ projects: ProjectSection[] }>()

const route = useRoute()
const currentLocale = computed(() => getLocaleFromPath(route.path))

function slug(name: string) {
  return name.toLowerCase().replace(/[\s\\/]+/g, '-')
}

function getTitle(section: ProjectSection) {
  if (currentLocale.value === 'ru')
    return section.title_ru || section.title
  if (currentLocale.value === 'es')
    return section.title_es || section.title
  return section.title
}

function getName(item: ProjectItem) {
  if (currentLocale.value === 'ru')
    return item.name_ru || item.name
  if (currentLocale.value === 'es')
    return item.name_es || item.name
  return item.name
}

function getDesc(item: ProjectItem) {
  if (currentLocale.value === 'ru')
    return item.desc_ru || item.desc
  if (currentLocale.value === 'es')
    return item.desc_es || item.desc
  return item.desc
}
</script>

<template>
  <div class="prose m-auto">
    <div
      v-for="section, cidx in projects" :key="section.title" slide-enter
      :style="{ '--enter-stage': cidx + 1 }"
    >
      <div
        :id="slug(section.title)"
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
  </div>
  <div>
    <div class="table-of-contents">
      <div class="table-of-contents-anchor">
        <div class="i-ri-menu-2-fill" />
      </div>
      <ul>
        <li v-for="section in projects" :key="section.title">
          <a :href="`#${slug(section.title)}`">{{ getTitle(section) }}</a>
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
