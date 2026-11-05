<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <main>
    <p class="eyebrow">Frontend deep-link test</p>
    <h1>Widget 1</h1>
    <p>
      This Vue Router route proves that frontend navigation remains separate
      from the API prefix.
    </p>
    <nav>
      <RouterLink class="button" to="/">Return home</RouterLink>
    </nav>
  </main>
</template>
