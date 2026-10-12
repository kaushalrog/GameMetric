# GameMetric

GameMetric is a browser-local FPS utility for sensitivity math, display measurements, workload context, aim practice, and setup learning. It does not require an account or send calculator inputs to a server.

## Current features

- Sensitivity conversion for CS2 and VALORANT, with 360-distance and monitor-distance/custom matching modes.
- eDPI, DPI scaling, rectilinear FOV, monitor PPI/pixel pitch, display comparison, refresh interval, and mouse polling interval calculations.
- A qualitative CPU/GPU workload estimator. It does not predict FPS or output a bottleneck percentage.
- Browser aim practice with reaction timing, target and flick modes, a 3-2-1-GO countdown, pause, saved sessions, and local history.
- 13 concise learning guides, including interactive eDPI and diagrams for selected topics.
- Search, local favorites, recent calculations, saved setups, theme persistence, share URLs, copy formats, and PNG sensitivity result-card export.

## Data trust

`src/lib/games.ts` is the game catalog. Every profile has an overall status and separate sensitivity/FOV statuses. Product/store URLs are labeled as official references for game identity only; they do not prove undocumented internal constants.

CS2 (`yaw = 0.022`) and VALORANT (`yaw = 0.07`) have sensitivity conversion enabled as **partially verified** project assumptions. Their linked product pages do not directly document those constants. The UI identifies this status and the calculation source precisely. Other game profiles have no usable yaw, and conversion is refused. Game-specific FOV data and viewspeed camera parameters are unsupported; the standalone FOV calculator only performs the stated rectilinear projection conversion.

The performance estimator is a qualitative heuristic, not measured benchmark data. The aim trainer is a browser practice tool, not a standardized ability assessment.

## Calculation definitions

- eDPI: `DPI × sensitivity`; output unit is effective counts-per-inch-like scale, meaningful only within compatible game input models.
- DPI scaling: `newSensitivity = currentSensitivity × currentDPI ÷ targetDPI`; preserves the product of DPI and sensitivity.
- 360 distance: `counts/360 = 360 ÷ (sensitivity × yaw)`; `in/360 = counts/360 ÷ DPI`; `cm/360 = in/360 × 2.54`.
- 360 conversion: `targetSensitivity = sourceSensitivity × sourceYaw ÷ targetYaw`. Internal values remain unrounded; display precision controls only formatting.
- Monitor-distance conversion uses the rectilinear angular offset `atan(p × tan(FOV/2))`, where `p` is the selected screen-width fraction. It preserves angular rate at the chosen fraction given manually entered horizontal FOVs. It depends on FOV and projection assumptions and is not a universal cross-game equivalent.
- FOV conversion assumes rectilinear projection: vertical FOV is derived from horizontal FOV and aspect ratio. Games can define or scale FOV differently.
- Monitor PPI is `sqrt(widthPixels² + heightPixels²) ÷ diagonalInches`; pixel pitch is `25.4 ÷ PPI` millimeters. Frame interval is `1000 ÷ FPS` milliseconds; polling interval is `1000 ÷ Hz` milliseconds.

## Development and checks

```sh
npm install
npm run dev
npm test -- --run
npm run test:e2e
npm run build
npm run lint
```

The E2E suite runs Chromium against a local Vite server and checks direct routes, search/navigation, calculator URL state and match modes, favorites, recents, setups, aim training, monitor comparison, storage failure, PNG download, accessible input/button names, and browser console/page/request errors. Install Chromium once with `npx playwright install chromium`. CI separates the quality checks from the E2E job in `.github/workflows/ci.yml`.

CI-compatible local sequence:

```sh
npm ci
npm test -- --run
npm run test:e2e
npm run build
npm run lint
```

Pure calculation functions and focused tests live in `src/lib/calculators/`. Game provenance is centralized in `src/lib/games.ts`; tool metadata lives in `src/lib/registry.ts`; learning content is separated from UI in `src/pages/LearnContent.ts`.

## Local storage

`gamemetric.app-state` is a versioned envelope. Schema version 2 contains theme, favorites, up to 20 recent calculations, saved setups, up to 50 aim sessions, and aim preferences. Version 1 is migrated by adding missing preferences; malformed/future-version state falls back to defaults. Invalid records are filtered. `gamemetric-theme` is read for the legacy theme migration. Reads/writes are guarded, so unavailable or quota-limited storage leaves the current in-memory session usable.

Game evidence types are `official`, `developer-documented`, `reverse-engineered`, `independently-tested`, `community-reference`, and `project-assumption`. A URL does not prove every constant: each source separately lists the claims it supports. Only CS2 and VALORANT currently have yaw values, both explicitly partial/project assumptions.

## Add or update game data

1. Add the profile to `src/lib/games.ts` with references that state exactly which claim each source supports.
2. Do not label community material, reverse engineering, independent testing, or a project assumption as official documentation.
3. Set sensitivity status to `verified` only when a cited source directly supports the value and its interpretation. Otherwise use `partially-verified`, `unverified`, or `unsupported`.
4. Add an inspectable golden calculation fixture and a provenance/status test before enabling that calculation in the UI.
5. Record an actual review date; never derive it from the current system date.