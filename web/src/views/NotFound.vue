<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <main>
    <p class="eyebrow">Frontend client-side 404</p>
    <h1>Page not found</h1>
    <p>The Vue SPA handled this unknown non-API route.</p>
    <nav>
      <RouterLink class="button" to="/">Return home</RouterLink>
    </nav>
  </main>
</template>
