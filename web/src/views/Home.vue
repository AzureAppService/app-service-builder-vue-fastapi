<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

const controller = new AbortController()
const apiState = ref({
  status: 'loading',
  message: 'Contacting the FastAPI backend...',
})

onMounted(async () => {
  try {
    const response = await fetch('/api/status', {
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`)
    }

    apiState.value = await response.json()
  } catch (error) {
    if (error.name !== 'AbortError') {
      apiState.value = {
        status: 'error',
        message: error.message,
      }
    }
  }
})

onBeforeUnmount(() => controller.abort())
</script>

<template>
  <main>
    <p class="eyebrow">App Service Builder / Vue + FastAPI</p>
    <h1>Vue and FastAPI are running</h1>
    <p>The static Vue frontend and FastAPI backend share one public hostname.</p>

    <section class="api-card" :data-state="apiState.status">
      <h2>Same-origin API status</h2>
      <p><strong>{{ apiState.status }}</strong>: {{ apiState.message }}</p>
    </section>

    <nav aria-label="Test routes">
      <RouterLink class="button" to="/products/widget-1">
        Open the frontend deep route
      </RouterLink>
      <a href="/api/health">View API health</a>
      <a href="/api/version">View API version</a>
      <a href="/version.json">View frontend version</a>
    </nav>
  </main>
</template>
