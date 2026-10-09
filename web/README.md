# CarShot Coach for iPhone Safari

This standalone browser application lives alongside the original Expo app. It uses the rear camera, browser-based COCO-SSD vehicle detection, composition tips for six shot types, and JPEG capture with the iOS share sheet/download fallback. Images are processed locally and never uploaded. Model weights download from TensorFlow's model host. Interior shots use manual guidance. Angle recognition and lighting analysis are not implemented.

Azure app: `carshot-coach`, resource group: `rg-carshot-coach`, hosting plan: **Free**. Site URL: https://white-grass-027924510.2.azurestaticapps.net (available after the first successful deployment).

## Develop in VS Code

Run these commands from `C:\Dev\CarShot-Coach\web`:

```powershell
npm ci
npm run dev
```

Open the printed localhost link on this computer. iPhone camera access needs the deployed HTTPS URL; a plain HTTP LAN address will not work. On iPhone, open the deployed link in Safari, allow the camera, and optionally use Share > Add to Home Screen. This version requires internet and does not offer offline installation.

In VS Code, use **Terminal > Run Task > CarShot: start web preview** to start the preview, or **CarShot: verify web** to run all checks. **Ctrl+Shift+B** builds the browser app. Edit files in `web/src` for this version; the native Expo screens in root `src` are a separate application.

## Checks and deployment

```powershell
npm run lint
npm run check
npm test
npm run build
```

The root `.github/workflows/web.yml` runs those checks on pull requests and pushes. Passing pushes to `main` deploy `web/dist` to Azure Static Web Apps using repository secret `AZURE_STATIC_WEB_APPS_API_TOKEN`. Pull requests run checks without deployment. Never put a deployment token in source control.

After making changes, review the VS Code Source Control diff, commit, and push. Wait for the GitHub Actions run to succeed, then reload the site on the iPhone. No Expo, Metro, emulator, or Apple Developer membership is required for this web app.

Only the Azure Static Web Apps **Free** plan is intended. Do not enable a paid hosting tier, Application Insights, a database, or other paid services for this app. GitHub Actions usage remains subject to your account's included allowance.

## Device acceptance check

Desktop checks cannot verify physical iPhone behavior. Check rear-camera permission, all six shot choices, framing advice on a real car, capture, Save Image in the share sheet, retake, and return from the background on your iPhone. Detection may be slower or less accurate than the native model; manual tips and capture remain available if model loading fails.
