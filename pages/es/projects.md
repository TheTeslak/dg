---
title: Proyectos - Anthony Fu
display: Proyectos
description: Lista de proyectos
wrapperClass: 'text-center'
art: dots
---

<script setup lang="ts">
import { projects } from '~/data/projects'
</script>

<!-- @layout-full-width -->
<ListProjects :projects="projects" />
