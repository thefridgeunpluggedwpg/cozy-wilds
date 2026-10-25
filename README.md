# Cozy Wilds (working title) — prototype v0.1 · Hammer & Pixel Games
Serve: `./serve.sh` → http://localhost:8095/ · Single file: `python3 build-single.py` → dist/CozyWilds.html + dist/cozywilds-itch.zip
Tests: `cd test && node run.mjs` (Playwright, 1280x720 + 844x390). Screenshots in shots/.
- js/map.js is the map boundary (wraps Dark Forest's world.js terrain). Swap maps by replacing loadMap().
- js/data.js: predators (wolf, coyote, bear, raccoon), costs, tuning. All data-driven.
- js/sprites.js: procedural pixel art; js/art.js: trees/bushes/rocks/well from Dark Forest; assets/player: Kyler's player character (blue cowboy hat, Pit Vipers), sliced 1:1 from his 188px sheet, 8 dirs, 6-frame walks.
