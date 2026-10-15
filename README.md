# BoardNotes — Video-to-PDF AI Study Notes MVP

A free, mobile-first browser prototype. It extracts frames from a **local video file**, optionally tries OCR, and exports typed notes plus board snapshots to a PDF.

## Run it on your phone

### Fastest option
1. Download and extract `BoardNotes_MVP.zip`.
2. Upload the extracted folder to a static host such as GitHub Pages (steps below), or open `index.html` locally if your browser permits scripts and local video access.
3. Open the site in Chrome. Internet is needed to load jsPDF and Tesseract.js from their CDNs.
4. Choose a video file → set an interval (15 or 30 seconds is a good first test) → Extract board frames.
5. Edit/check typed notes → Download PDF.

### Publish free with GitHub Pages
1. Sign in to GitHub and create a new **public** repository named `boardnotes-mvp`.
2. Upload the files from this folder (`index.html`, `styles.css`, `app.js`, `manifest.webmanifest`, `README.md`) into the repository root.
3. Open repository **Settings → Pages**.
4. Under “Build and deployment”, choose **Deploy from a branch**; select `main` and `/ (root)`, then Save.
5. Wait for GitHub Pages to publish. Your site URL will look like `https://YOUR-USERNAME.github.io/boardnotes-mvp/` (replace `YOUR-USERNAME`; this is a pattern, not a verified live link).

## What works
- Local video input supported by the browser.
- Extracts frames at selectable 5 / 10 / 15 / 30 second intervals.
- Removes unwanted frames.
- Optional English OCR draft via Tesseract.js.
- Editable notes area.
- PDF export with typed notes and board snapshots.
- Video processing stays in the browser; no upload backend.

## Current limits (important)
- **YouTube URL only is not enough.** A normal webpage cannot directly inspect/capture a YouTube player because of cross-origin restrictions. This MVP records the link as a reminder but requires a local video file for extraction. Use content you own or have permission to process and follow YouTube's terms.
- OCR is English-only in this prototype and is experimental. It may misread handwriting, Hindi, diagrams, and mathematical notation. Check every equation against the board image.
- This is a frame sampler, not a true AI lecture-understanding model. It does not yet detect when the teacher writes or changes the board; it samples at a fixed interval.
- Mobile memory varies. Start with a short clip and a 15–30 second interval. A maximum of 60 frames is sampled; the image width is limited to 1280 px.
- CDN libraries need internet. PDF creation and video-frame extraction happen locally once the page and libraries are loaded.
- For privacy, avoid processing videos containing personal information on shared devices.

## Next upgrades
1. Scene-change / board-change detection to avoid duplicate frames.
2. Hindi OCR and formula-aware OCR.
3. Optional server-side YouTube ingestion only if legally and technically appropriate.
4. Better pagination, selectable frame resolution, and offline PWA caching.
