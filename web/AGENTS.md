# Browser app

This folder is a standalone Vite/JavaScript application deployed to Azure Static Web Apps Free, alongside the original Expo application. For changes inside `web/`, use browser APIs and npm dependencies rather than Expo APIs or `expo install`; do not change native Expo screens unless requested. Native camera/TFLite modules cannot run in Safari.

Run `npm run lint`, `npm run check`, `npm test`, and `npm run build` from this folder before publishing web changes. Preserve camera cleanup on backgrounding, navigation, capture, and asynchronous cancellation. Keep camera frames and photos on-device. Do not upload photos or add paid cloud services without an explicit request. Keep deployment credentials in encrypted GitHub Actions secrets, never source files or logs.

The deployment workflow is `../.github/workflows/web.yml`. A passing push affecting web files on `main` deploys automatically. Verify the GitHub run and the deployed site; distinguish desktop verification from real iPhone camera and share-sheet testing. This version requires internet; do not claim offline support.
