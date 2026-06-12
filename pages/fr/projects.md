---
title: Projets de Teslak
display: De l’idée à la réalité
description: Liste des projets dont je suis fier
art: dots
---

<script setup lang="ts">
import { projects } from '~/data/projects'
</script>

<ListProjects :projects="projects" />
