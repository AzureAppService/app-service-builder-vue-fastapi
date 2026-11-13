<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

const controller = new AbortController()
const apiState = ref({
  status: 'loading',
  message: 'Contacting the FastAPI backend...',
})
const inspection = ref('Choose a health or version check. Results stay on this page.')
const checking = ref(false)
async function inspect(path) {
  checking.value = true
  inspection.value = `Checking ${path}...`
  const abort = new AbortController()
  const timeout = setTimeout(() => abort.abort(), 5000)
  try {
    const response = await fetch(path, { signal: abort.signal })
    const body = await response.text()
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    inspection.value = `${path} · HTTP ${response.status}\n${body}\nHealth checks show process readiness only, not Azure deployment status.`
  } catch {
    inspection.value = `${path} could not be checked. Confirm the frontend and API are reachable, then retry.`
  } finally {
    clearTimeout(timeout)
    checking.value = false
  }
}

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

    <section class="api-card" :data-state="apiState.status" aria-live="polite">
      <h2>Same-origin API status</h2>
      <p><strong>{{ apiState.status }}</strong>: {{ apiState.message }}</p>
    </section>

    <nav aria-label="Test routes">
      <RouterLink class="button" to="/products/widget-1">
        Open the frontend deep route
      </RouterLink>
      <button type="button" :disabled="checking" @click="inspect('/api/health')">Check API health</button>
      <button type="button" :disabled="checking" @click="inspect('/api/version')">Check API version</button>
      <button type="button" :disabled="checking" @click="inspect('/version.json')">Check frontend version</button>
    </nav>
    <pre class="inspection" role="status">{{ inspection }}</pre>
    <details>
      <summary>Customize this sample</summary>
      <p>Edit <code>web/src/views/Home.vue</code> in your own fork to change this page. Edit <code>api/main.py</code> to change the API response. Rebuild, test, commit and redeploy your fork; this page does not edit GitHub.</p>
    </details>
    <p><a href="https://builder.appservice.azure.com/docs/">App Service Builder documentation</a> · <a href="https://vuejs.org/guide/introduction.html">Vue documentation</a></p>
  </main>
</template>
