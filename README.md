# CarShot Coach

A mobile-first car photography prototype built by Dominic Frederick, with AI-assisted development. The browser app combines camera capture, on-device vehicle detection and practical composition guidance.

**[Try the live app](https://white-grass-027924510.2.azurestaticapps.net/)** · **[My portfolio](https://domfrederick.com)**

![CarShot Coach photography inspiration](web/public/examples/front-three-quarter-white-v3.jpg)
*AI-generated inspiration image used in the app; not a photograph captured by the application.*

## Why I built it

CarShot Coach explores a practical problem: helping people take better car photos from their phones. It also gives me a hands-on project for Azure hosting, Git-based delivery, troubleshooting and documenting technical limitations alongside my Windows infrastructure experience.

## What it does

- Offers six shot guides, an optional composition grid and rear-camera capture.
- Runs TensorFlow.js COCO-SSD vehicle detection in the browser, with manual guidance when detection is unavailable.
- Provides five camera looks and an Auto Pop adjustment for contrast, color and sharpening.
- Saves or shares JPEGs through the browser and supported device share sheets.
- Keeps a local photo-feed preview in IndexedDB, capped at 30 resized images.

## Architecture and deployment

```text
Phone browser (HTTPS)
  ├── Camera → framing guidance → JPEG capture → share/download
  ├── TensorFlow.js + COCO-SSD → vehicle detection
  └── IndexedDB → local feed preview

GitHub → Actions: lint / typecheck / tests / build
       → Azure Static Web Apps (Free)
```

The deployed application is in `web/`: JavaScript, CSS, Vite and TensorFlow.js. The root `src/` contains an earlier, separate Expo/React Native prototype. Azure serves the static browser build; there is no application server or database. The deployment token is stored as a GitHub Actions secret, not in the repository.

## Run the browser app

Use Node.js 22, matching the CI configuration:

```sh
cd web
npm ci
npm run dev
```

To verify and build:

```sh
npm run lint
npm run check
npm test
npm run build
```

Pushes affecting `web/` on `main` run checks and deploy through [GitHub Actions](.github/workflows/web.yml). Pull requests run checks without deploying. See the [browser application documentation](web/README.md) for camera fixtures, processing details and device acceptance checks.

## Privacy and limitations

Photos are processed locally and are not uploaded. Model files download from TensorFlow's hosting service. Local feed data belongs to the current browser/device and is removed when site data is cleared. There are no accounts or public community features.

This is a prototype: vehicle detection does not recognize exact camera angles, interior shots use manual guidance, and sharpening cannot recover substantial motion blur. Camera access requires HTTPS or localhost. Physical iPhone behavior still needs device acceptance testing. Reference images are labeled AI-generated inspiration.

## About the author

I'm a systems and infrastructure administrator focused on Windows Server, VMware, Active Directory, Veeam backups and recovery. This personal project complements that work with Azure static hosting and automated delivery. Development used AI assistance; the repository documents the implementation and its current limits.

[LinkedIn](https://www.linkedin.com/in/dominicfrederick/) · [Portfolio](https://domfrederick.com)

## License

[MIT](LICENSE).
