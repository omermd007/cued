# Cued — Personal Movie & Series Decider (iPhone PWA)

**Stop scrolling. Start watching.**

## Install on Your iPhone (No Mac / No Xcode Needed)

### Option A — Free Private Link (Fastest, works anywhere)
1. Upload this `cued` folder to **GitHub Pages** (free) or drag-and-drop it onto **Netlify Drop** (`app.netlify.com/drop`).
2. Open the HTTPS link in **Safari** on your iPhone.
3. Tap the **Share** button (square with arrow) → **Add to Home Screen**.
4. Launch **Cued** from your Home Screen — it runs full-screen and offline like a native iOS app.

### Option B — Local Home Wi-Fi Server
1. From this folder on your computer, run:
   ```bash
   python3 -m http.server 8080
   ```
2. On your iPhone (same Wi-Fi), open Safari to `http://<your-computer-local-ip>:8080`.
3. Tap **Share → Add to Home Screen**.

## Optional: Real Live Movie Posters
By default, Cued works 100% offline with bespoke editorial cinema posters. If you ever want live photographic backdrops/posters, grab a free API key from [themoviedb.org](https://www.themoviedb.org/settings/api) and paste it into **Settings → TMDB API Key** inside the app.
