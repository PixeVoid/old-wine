# Emberworks — Interactive Studio Demo

An original, single-page interactive studio site inspired by the *craft* of
modern WebGL storytelling sites (kinetic type, particle creatures, custom
cursors). All copy, colours, and the particle "phoenix" are original — this is
**not** a copy of any existing site's assets or content.

## What's inside

- 🔥 **WebGL particle phoenix** (`assets/js/phoenix.js`) — ~14k GPU points shaped
  into a bird via a parametric body + feathered wings, with a shader-driven wing
  flap, rising embers, twinkle, pointer parallax, and scroll reaction.
- 🖱️ **Custom cursor** (`assets/js/cursor.js`) — instant dot + lagging ring that
  grows over interactive targets, plus magnetic pull on buttons and 3D tilt on
  work cards.
- ✨ **Experience layer** (`assets/js/main.js`) — animated percentage preloader,
  scroll-triggered reveals, word-by-word text lighting, marquee, auto-hiding nav.

## Run it

No build step. Serve the folder and open `index.html`:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

Three.js is loaded from CDN. Everything else is vanilla HTML/CSS/JS.

## Notes

- Respects `prefers-reduced-motion`.
- Degrades on touch devices (custom cursor disabled).
- Tested against modern Chromium/Firefox/Safari.
