---
title: Hallazgos
art: topography
display: ''
---

<SubNav />

<script setup>
import { isSearchOpen } from '~/logics/search'
</script>

<SearchPanel v-if="isSearchOpen" />
<ListFinds v-else />
