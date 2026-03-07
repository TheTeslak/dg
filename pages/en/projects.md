---
title: Projects - Anthony Fu
display: Projects
description: List of projects that I am proud of
wrapperClass: 'text-center'
art: dots
---

<script setup lang="ts">
import { projects } from '~/data/projects'
</script>

<!-- @layout-full-width -->
<ListProjects :projects="projects" />
