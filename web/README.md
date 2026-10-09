# CarShot Coach for iPhone Safari

This standalone browser application lives alongside the original Expo app. It uses the rear camera, browser-based COCO-SSD vehicle detection, composition tips for six shot types, and JPEG capture with the iOS share sheet/download fallback. Images are processed locally and never uploaded. Model weights download from TensorFlow's model host. Interior shots use manual guidance. Exact angle recognition is not implemented.

After capture, Auto Pop applies adaptive contrast, vibrance and thresholded luminance sharpening for richer color and clearer edges. Sharpening can improve slight softness but cannot reconstruct detail lost to substantial motion blur. A capped adjustment suppresses tiny noise and limits halos; rolling luminance rows keep sharpening memory proportional to image width. Exterior photos use the existing vehicle detector to emphasize the car when available; processing falls back to overall photo measurements if AI is unavailable. It does not generate or replace image content. Original/Auto Pop controls select the version used by download, share and local posting. Original preserves the selected camera look. Post-shot tips combine brightness measurements, detected framing and the selected shot guide.

The hero, front 3/4 reference and Ferrari inspiration card use `public/examples/front-three-quarter-white-v3.jpg`, edited with the built-in imagegen tool. Edit prompt: preserve the 488 GTB shape, full-car front three-quarter composition, lake/mountain backdrop and golden-hour lighting; change the body to glossy white, roof to glossy black, visible wheels to bright silver with exactly five single broad spokes, and brake calipers to yellow. No text or collage.

The home page's **The meet** is a local feed preview, not a public community backend. Users can caption captured or selected photos, filter by Exotics/JDM/Yours, and remove their posts. IndexedDB stores up to 30 resized JPEGs on this browser/device; clearing website data removes them. Example cards are clearly labeled AI-generated inspiration. There are no accounts or uploads.

After selecting a shot and opening the camera, a bundled reference expands or minimizes to a thumbnail **inside the camera view**. References mix a Ferrari 488/F8, modified Skyline R34 and GT-R R35, and a Porsche 911 GT3. They are AI-generated with the built-in ImageGen tool and saved as versioned JPEGs in `public/examples/`. Prompts requested single photographs from front 3/4, rear 3/4, exact side, straight front, straight rear, and a level R34 dashboard view, with full-car margins, natural cinematic light, no people or text overlays. Side and interior prompts explicitly exclude split layouts and collages. These are inspiration images, not verified vehicle specifications.

The camera fills the available browser viewport, with safe-area-aware controls, a collapsible inspiration card, shot tips, grid toggle and five optional looks: Original, Midnight, Golden, Street and Silver. Safari's browser bars may remain visible. Live preview uses CSS color filters; export applies the same brightness, contrast, saturation and sepia transforms to pixels on-device, without depending on Safari's canvas filter support. Minor browser color-rendering differences may occur. Capture and AI use the same centered crop as the visible camera; AI analyzes an unfiltered image with a maximum edge of 640 pixels. Actual photo resolution depends on camera constraints and the amount of cropping.

Use **Check AI with an example photo** to run real model inference without camera permission. A pass reports vehicle confidence; this checks the model, not physical camera behavior. Live scanning reports actual analyzed frames when no vehicle is recognized, and **Retry AI detection** recovers from load or inference errors. Detection calls are serialized across camera restarts and example checks.

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

For desktop camera integration checks, start the dev server and open `/tests/camera.html`, then select **Run camera checks**. This development-only fixture uses a synthetic camera stream and checks full-viewport layout, collapsed/expanded references, all filter controls, monochrome JPEG export, matching preview/export crop, retake, and camera cleanup. It is excluded from the production entry and never requests the physical camera.

The root `.github/workflows/web.yml` runs those checks on pull requests and pushes. Passing pushes to `main` deploy `web/dist` to Azure Static Web Apps using repository secret `AZURE_STATIC_WEB_APPS_API_TOKEN`. Pull requests run checks without deployment. Never put a deployment token in source control.

After making changes, review the VS Code Source Control diff, commit, and push. Wait for the GitHub Actions run to succeed, then reload the site on the iPhone. No Expo, Metro, emulator, or Apple Developer membership is required for this web app.

Only the Azure Static Web Apps **Free** plan is intended. Do not enable a paid hosting tier, Application Insights, a database, or other paid services for this app. GitHub Actions usage remains subject to your account's included allowance.

## Device acceptance check

Desktop checks cannot verify physical iPhone behavior. Check rear-camera permission, all six shot choices, framing advice on a real car, capture, Save Image in the share sheet, retake, and return from the background on your iPhone. Detection may be slower or less accurate than the native model; manual tips and capture remain available if model loading fails.
