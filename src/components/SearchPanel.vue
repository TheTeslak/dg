<script setup lang="ts">
import { useFluent } from 'fluent-vue'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { formatDate, formatReadingDuration } from '~/logics'
import { getLocaleFromPath } from '~/logics/i18n-path'
import { isLoading, searchQuery, searchResults } from '~/logics/search'

const route = useRoute()
const fluent = useFluent()

const currentLocale = computed(() => getLocaleFromPath(route.path))

const hasQuery = computed(() => searchQuery.value.trim().length > 0)

function getPostLangTag(lang: string) {
  if (lang && lang !== currentLocale.value)
    return lang.toUpperCase()
  return null
}

function getTypeLabel(type: string) {
  if (type === 'note')
    return fluent.format('nav-notes')
  return null
}

function getDurationLabel(duration: number | null) {
  if (duration == null)
    return null
  return formatReadingDuration(duration, currentLocale.value)
}
</script>

<template>
  <div class="search-panel prose m-auto">
    <!-- Empty state: before typing -->
    <div v-if="isLoading" class="search-status" op50>
      {{ $t('search-loading') }}
    </div>
    <div v-else-if="!hasQuery" class="search-status" op50>
      {{ $t('search-start-typing') }}
    </div>
    <!-- No results -->
    <div v-else-if="hasQuery && searchResults.length === 0" class="search-status" op50>
      {{ $t('search-no-results') }}
    </div>

    <!-- Results list -->
    <div v-if="searchResults.length > 0" class="search-results">
      <RouterLink
        v-for="result in searchResults"
        :key="result.path"
        :to="result.path"
        class="search-result-card"
      >
        <div class="search-result-header">
          <span class="search-result-title">
            <span
              v-if="getPostLangTag(result.lang)"
              class="search-result-lang-tag"
            >{{ getPostLangTag(result.lang) }}</span>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <span v-html="result.highlightedTitle" />
          </span>
          <span v-if="getTypeLabel(result.type)" class="search-result-type">
            {{ getTypeLabel(result.type) }}
          </span>
        </div>
        <div class="search-result-snippets">
          <template v-for="(snippet, idx) in result.snippets" :key="idx">
            <div v-if="idx > 0" class="search-snippet-divider" />
            <!-- eslint-disable-next-line vue/no-v-html -->
            <span
              class="search-result-snippet"
              :class="{ 'is-last': idx === result.snippets.length - 1 }"
              v-html="snippet"
            />
          </template>
        </div>
        <div class="search-result-meta">
          <span v-if="result.date" op45>{{ formatDate(result.date, true) }}</span>
          <span v-if="getDurationLabel(result.duration)" op45>· {{ getDurationLabel(result.duration) }}</span>
        </div>
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.search-panel {
  width: 100%;
}

.search-status {
  text-align: center;
  padding: 2rem 0;
  font-size: 1.1rem;
}

.search-results {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin: 0;
}

.search-result-card {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 1rem 1.15rem 0;
  border: 1px solid rgba(125, 125, 125, 0.25);
  border-radius: 0.5rem;
  text-decoration: none !important;
  transition: all 0.25s ease;
  opacity: 0.65;
  overflow: hidden;
}

.search-result-card:hover {
  opacity: 1;
  border-color: rgba(125, 125, 125, 0.35);
  background: rgba(125, 125, 125, 0.06);
}

.search-result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.search-result-title {
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.4;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.search-result-title :deep(mark) {
  background: rgba(30, 30, 30, 0.88);
  color: #fff;
  border-radius: 0.15em;
  padding: 0.05em 0.25em;
  margin: 0 0.02em;
}

.dark .search-result-title :deep(mark) {
  background: rgba(235, 235, 235, 0.9);
  color: #111;
}

.search-result-lang-tag {
  font-size: 0.75rem;
  background: rgba(125, 125, 125, 0.25);
  color: rgba(125, 125, 125, 1);
  border-radius: 0.25rem;
  padding: 0.15rem 0.3rem;
  line-height: 1.2;
  flex-shrink: 0;
}

.search-result-type {
  font-size: 0.75rem;
  opacity: 0.4;
  flex-shrink: 0;
  text-transform: lowercase;
}

.search-result-snippets {
  display: flex;
  flex-direction: column;
}

.search-result-snippet {
  font-size: 1rem;
  line-height: 1.55;
  opacity: 0.9;
  padding: 0.2rem 0;
}

.search-result-snippet.is-last {
  -webkit-mask-image: linear-gradient(to bottom, black 30%, rgba(0, 0, 0, 0.12) 100%);
  mask-image: linear-gradient(to bottom, black 30%, rgba(0, 0, 0, 0.12) 100%);
  max-height: 3.5em;
  overflow: hidden;
}

.search-snippet-divider {
  border-top: 1px dashed rgba(125, 125, 125, 0.2);
  margin: 0.15rem 0;
}

.search-result-snippet :deep(mark) {
  background: rgba(30, 30, 30, 0.88);
  color: #fff;
  border-radius: 0.15em;
  padding: 0.05em 0.25em;
  margin: 0 0.02em;
  line-height: inherit;
  font-size: inherit;
}

.dark .search-result-snippet :deep(mark) {
  background: rgba(235, 235, 235, 0.9);
  color: #111;
}

.search-result-meta {
  display: flex;
  gap: 0.35rem;
  font-size: 1rem;
  padding-bottom: 0.75rem;
}

.dark .search-result-card {
  border-color: rgba(125, 125, 125, 0.4);
}

.dark .search-result-card:hover {
  border-color: rgba(125, 125, 125, 0.5);
  background: rgba(125, 125, 125, 0.08);
}

.dark .search-snippet-divider {
  border-color: rgba(125, 125, 125, 0.3);
}
</style>
