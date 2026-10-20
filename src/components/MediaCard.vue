<script setup lang="ts">
defineProps<{
  variant?: 'float' | 'aside'
  image: string
  title: string
  subtitle?: string
  description?: string
  ratio?: string
}>()
</script>

<template>
  <div v-if="variant === 'float'" class="media-card media-card--float">
    <div class="media-card-float-block">
      <div
        class="media-card-figure"
        :class="{ 'has-ratio': ratio }"
        :style="ratio ? { aspectRatio: ratio } : undefined"
      >
        <img :src="image" :alt="title">
      </div>
      <div class="media-card-meta">
        <div class="media-card-title">
          {{ title }}
        </div>
        <div v-if="subtitle" class="media-card-subtitle">
          {{ subtitle }}
        </div>
      </div>
    </div>
    <slot />
  </div>

  <div v-else class="media-card media-card--aside">
    <div
      class="media-card-figure"
      :class="{ 'has-ratio': ratio }"
      :style="ratio ? { aspectRatio: ratio } : undefined"
    >
      <img :src="image" :alt="title">
    </div>
    <div class="media-card-info">
      <div class="media-card-title">
        {{ title }}
      </div>
      <div v-if="subtitle" class="media-card-subtitle">
        {{ subtitle }}
      </div>
      <div v-if="description" class="media-card-desc">
        {{ description }}
      </div>
      <slot />
    </div>
  </div>
</template>

<style scoped>
.media-card-figure {
  overflow: hidden;
  border-radius: 6px;
  box-shadow: 2px 4px 12px rgba(0, 0, 0, 0.12);
}

html.dark .media-card-figure {
  box-shadow: 2px 4px 16px rgba(0, 0, 0, 0.45);
}

.media-card-figure img {
  width: 100%;
  height: auto;
  display: block;
}

.media-card-figure.has-ratio img {
  height: 100%;
  object-fit: cover;
}

.media-card-title {
  font-weight: 600;
  color: var(--fg-deep);
  line-height: 1.3;
}

.media-card-subtitle {
  color: var(--fg-light);
  line-height: 1.4;
  margin-top: 0.1em;
}

.media-card-desc {
  line-height: 1.6;
  margin-top: 0.35em;
}

/* Float */

.media-card--float {
  display: flow-root;
}

.media-card-float-block {
  float: left;
  width: 140px;
  margin: 0.35em 1.5em 0.75em 0;
}

.media-card--float .media-card-meta {
  margin-top: 0.5em;
}

.media-card--float .media-card-title {
  font-size: 0.95rem;
}

.media-card--float .media-card-subtitle {
  font-size: 0.95rem;
}

.media-card--float > :deep(p:first-of-type) {
  margin-top: 0;
}

/* Aside */

.media-card--aside {
  display: flex;
  gap: 1.5em;
  align-items: flex-start;
  margin: 0.75em 0 1.5em;
}

.media-card--aside .media-card-figure {
  width: 140px;
  flex-shrink: 0;
}

.media-card-info {
  flex: 1;
  margin-block: auto;
}

.media-card--aside .media-card-subtitle {
  font-size: 0.95rem;
}

.media-card--aside .media-card-desc {
  font-size: 0.95rem;
}

/* Mobile */

@media (max-width: 640px) {
  .media-card-float-block {
    float: none;
    display: flex;
    gap: 0.85em;
    width: 100%;
    align-items: center;
    margin: 0 0 0.5em;
  }

  .media-card-float-block .media-card-figure {
    width: 96px;
    flex-shrink: 0;
  }

  .media-card-float-block .media-card-meta {
    margin-top: 0;
  }

  .media-card--aside {
    gap: 1em;
  }

  .media-card--aside .media-card-figure {
    width: 96px;
  }
}
</style>
