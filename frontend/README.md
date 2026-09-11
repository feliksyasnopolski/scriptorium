# Vue 3 + TypeScript + Vite

This template should help get you started developing with Vue 3 and TypeScript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about the recommended Project Setup and IDE Support in the [Vue Docs TypeScript Guide](https://vuejs.org/guide/typescript/overview.html#project-setup).

## Browser acceptance tests

From `frontend/`, install Chromium once with `npx playwright install chromium`, then run `npm run test:e2e`. Use `npm run test:e2e:ui` for the interactive runner. The Playwright configuration starts Rails on port 3000 and Vite on port 5173 automatically; it reuses already-running local servers outside CI.
