# Vue frontend

This is the static Vue 3 and Vite 8 component of the
[App Service Builder Vue + FastAPI sample](../README.md).

From the repository root:

```sh
npm --prefix web ci --ignore-scripts
npm --prefix web run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Start the API separately as described in the root guide. Vite proxies `/api`
to `http://127.0.0.1:18091`; `API_PROXY_TARGET` overrides that local target
for development and preview. The browser always calls relative `/api` URLs.

Build and preview the production frontend:

```sh
npm --prefix web run build
npm --prefix web run preview -- --host 127.0.0.1 --port 8080 --strictPort
```

The output is `web/dist/`. The deployed static host must support SPA fallback
for frontend routes without intercepting the separate `/api` component.
See the root guide for integration tests, deployment, and contributions.
