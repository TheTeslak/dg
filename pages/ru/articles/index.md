---
title: Блог - Anthony Fu
display: ''
art: plum
---

<SubNav />

<script setup>
import { isSearchOpen } from '~/logics/search'
</script>

<SearchPanel v-if="isSearchOpen" />
<ListPosts v-else only-date type="blog" />
