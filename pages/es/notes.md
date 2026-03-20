---
title: Notas - Anthony Fu
art: plum
display: ''
---

<SubNav />

<script setup>
import { isSearchOpen } from '~/logics/search'
</script>

<SearchPanel v-if="isSearchOpen" />
<ListPosts v-else only-date type="note" />
