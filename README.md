# BLACK BULL PRISON

A voxel "do your time" webapp. Build a blocky inmate, connect a Solana wallet,
and step into the **Black Bull penitentiary** — a prison filled with paper hands who
took profit on **The Black Bull** token too early. Talk your way out by **voice or text**,
walk with **WASD**, **jump**, and **sit** while the Black Bull watches.

> Lore: every cell in here holds someone who sold The Black Bull before the run.
> The Black Bull keeps them locked up while the chart prints green without them.
> Diamond hands are the only ones who ever leave.

```
            ┌──────────────┐
            │  LANDING PAGE │  rotating voxel BULL HEAD + lore
            └──────┬───────┘
                   │  ENTER THE PRISON
            ┌──────▼───────┐
            │     GATE      │  choose 1 of 2 cells
            └──┬────────┬──┘
   LIQUIDATION ROOM     GREEN CANDLE YARD
   (dark, on record)    (open pen, the chart you sold)
            │                │
            └──────┬─────────┘
            ┌──────▼───────┐
            │   CREATOR     │  detailed body: hands, feet, hair, costume
            └──────┬───────┘
            ┌──────▼───────┐
            │   IN-GAME 3D  │  WASD · Space jump · F sit · T chat · MIC voice
            └──────────────┘
```

## Run it

ES modules must be served over HTTP (not `file://`):

```bash
node serve.js          # → http://localhost:8080
# or:  python3 -m http.server 8080
```

Open http://localhost:8080.

## Controls (in a cell)

| Action | Key |
|--------|-----|
| Move   | W A S D / arrows |
| Jump   | Space |
| Sit / stand | F |
| Look around | drag mouse (or touch) |
| Zoom   | mouse wheel |
| Focus chat | T |
| Voice  | tap **MIC** (Chrome/Edge: Web Speech API) |

## The cells

- **THE LIQUIDATION ROOM** — one bulb, one steel table, and **THE BLACK BULL**
  asking exactly when and why you sold The Black Bull. Everything you say prints on-chain.
- **THE GREEN CANDLE YARD** — an open pen under **GUARD MARGIN**, with a jumbotron
  looping the green run you exited too early. Cope on the bench, mind the wire.

## Files

```
index.html              shell: landing, gate, creator, game, HUD
css/style.css           slate / black-hide / gold-ring visual identity
js/main.js              orchestrator + state machine + game loop + bull-head hero
js/character.js         detailed voxel inmate (hands/feet/hair/costume)
js/player.js            third-person controller (WASD/jump/sit/look)
js/chat.js              text + voice NPC interaction per cell (the Bull / Guard Margin)
js/wallet.js            Solana / Phantom connect (+ anonymous Paper Hand fallback)
js/rooms/interrogation.js   THE LIQUIDATION ROOM (dark single-bulb interrogation)
js/rooms/greenfield.js      THE GREEN CANDLE YARD (bright pen + candle jumbotron)
assets/logo.svg         the Black Bull mark (brand + favicon)
serve.js                zero-dependency static server
```

## Notes

- **Logo:** `assets/logo.svg` is a low-poly recreation of the Black Bull mark
  (brown horns, gold nose ring, dark hide, red **S**). Drop a raster at
  `assets/logo.png` and point the `<img>`/favicon back to it if you prefer.
- **Wallet:** uses an injected Solana provider (e.g. Phantom). With no wallet
  present you walk in as an anonymous **Paper Hand** with a demo inmate number.
- **Voice:** input uses the browser SpeechRecognition API (best in Chrome/Edge);
  output uses speechSynthesis. Both degrade gracefully to text-only.
- **Three.js** is loaded from a CDN via import-map — needs internet on first load.
- No build step. No framework. Plain ES modules.
