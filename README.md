# PRISON OF TRENCHES

A voxel "jail life" webapp. Build a blocky inmate, connect a Solana wallet,
and step into one of two rooms — talk to the room by **voice or text**,
walk with **WASD**, **jump**, and **sit**.

```
            ┌──────────────┐
            │  LANDING PAGE │  rotating voxel logo-cube + lore
            └──────┬───────┘
                   │  ENTER THE YARD
            ┌──────▼───────┐
            │     GATE      │  choose 1 of 2 rooms
            └──┬────────┬──┘
   INTERROGATION       GREENFIELD
   (dark, small)       (bright morning yard)
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
cd prison-of-trenches
node serve.js          # → http://localhost:8080
# or:  python3 -m http.server 8080
```

Open http://localhost:8080.

## Controls (in a room)

| Action | Key |
|--------|-----|
| Move   | W A S D / arrows |
| Jump   | Space |
| Sit / stand | F |
| Look around | drag mouse (or touch) |
| Zoom   | mouse wheel |
| Focus chat | T |
| Voice  | tap **MIC** (Chrome/Edge: Web Speech API) |

## Files

```
index.html              shell: landing, gate, creator, game, HUD
css/style.css           full voxel/prison visual identity
js/main.js              orchestrator + state machine + game loop
js/character.js         detailed voxel inmate (hands/feet/hair/costume)
js/player.js            third-person controller (WASD/jump/sit/look)
js/chat.js              text + voice NPC interaction per room
js/wallet.js            Solana / Phantom connect (+ John-Doe fallback)
js/rooms/interrogation.js   dark single-bulb interrogation room
js/rooms/greenfield.js      bright morning prison-yard greenfield
assets/logo.png         the cube logo
serve.js                zero-dependency static server
```

## Notes

- **Wallet:** uses an injected Solana provider (e.g. Phantom). With no wallet
  present you walk in as an anonymous **John Doe** with a demo inmate number.
- **Voice:** input uses the browser SpeechRecognition API (best in Chrome/Edge);
  output uses speechSynthesis. Both degrade gracefully to text-only.
- **Three.js** is loaded from a CDN via import-map — needs internet on first load.
- No build step. No framework. Plain ES modules.
