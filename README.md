# repro: `@atlaskit/top-layer@1.6.1` empty animations barrel

Minimal reproduction of a runtime crash caused by
`@atlaskit/top-layer@1.6.1` shipping an empty `entry-points/animations.js`
barrel while four consumer packages (`tooltip`, `select`, `popup`,
`modal-dialog`) at their latest published versions still import from it.

## Symptom

In the browser, the bundle throws at load:

```
TypeError: (0 , sv.slideAndFade) is not a function
```

## What this repro shows

- The published tarball of `@atlaskit/top-layer@1.6.1` has an empty ESM barrel at `dist/esm/entry-points/animations.js` (0 bytes) and empty types (`.d.ts`).
- Four `@atlaskit` packages at their latest published versions (as of 2026-07-15) still `import { … } from '@atlaskit/top-layer/animations'`:
  - `@atlaskit/tooltip@23.1.0` → `fade`, `slideAndFade`
  - `@atlaskit/select@22.5.0` → `slideAndFade`
  - `@atlaskit/popup@5.1.1` → `popupMotion`
  - `@atlaskit/modal-dialog@16.1.2` → `dialogMotion`
- Attempting to call any of those symbols throws `TypeError`.

## Reproduce

```bash
cd /Users/fnowakowski/Workspace/repro-atlaskit-top-layer-animations
touch yarn.lock          # avoids Yarn discovering a parent-tree project
yarn install
yarn repro
```

Expected output (broken state):

```
=== @atlaskit/top-layer installed metadata ===
  version:              1.6.1
  esm:                  0 bytes  (…/dist/esm/entry-points/animations.js)
  cjs:                  13 bytes (…/dist/cjs/entry-points/animations.js)
  types:                0 bytes  (…/dist/types/entry-points/animations.d.ts)

=== Consumers that import from top-layer/animations ===
  @atlaskit/tooltip         v23.1.0  imports: fade, slideAndFade
  @atlaskit/select          v22.5.0  imports: slideAndFade
  @atlaskit/popup           v5.1.1   imports: popupMotion
  @atlaskit/modal-dialog    v16.1.2  imports: dialogMotion

=== Runtime import attempt of @atlaskit/top-layer/animations ===
  loaded module, exported symbols: [(none)]
  ❌ @atlaskit/tooltip → fade                               undefined
  ❌ @atlaskit/tooltip → slideAndFade                       undefined
  …

RESULT: broken — pin @atlaskit/top-layer to a version whose animations barrel is populated (1.6.0 works).
```

## Verify the pin fixes it

Add the following to `package.json` and re-install:

```json
"resolutions": {
  "@atlaskit/top-layer": "1.6.0"
}
```

Then:

```bash
yarn install
yarn repro
```

Expected output (fixed state):

```
=== @atlaskit/top-layer installed metadata ===
  version:              1.6.0
  esm:                  173 bytes
  cjs:                  2247 bytes
  types:                405 bytes

  loaded module, exported symbols: [fade, slideAndFade, popupMotion, scaleAndFade, dialogMotion, dialogSlideUpAndFade, dialogFade]
  ✅ @atlaskit/tooltip → fade                               function
  ✅ @atlaskit/tooltip → slideAndFade                       function
  …

RESULT: barrel is populated. All consumer symbols are defined and callable.
```

## Root cause (per Atlassian's top-layer team)

The empty barrel in 1.6.1 is **intentional** — the animation-preset public
surface was removed during the Compiled CSS migration (1.4.0) and refactored
further in 1.6.0. Animations now live as component-local `cssMap` styles
inside Popover/Dialog plus placement-driven CSS variables from an internal
helper. The empty entry file is kept so the `./animations` subpath in
`package.json`'s `exports` isn't a breaking removal.

However, four consumer packages (`tooltip`, `select`, `popup`, `modal-dialog`)
at their latest published versions haven't been re-published with the
component-local pattern yet, so they still import from the now-empty barrel.

The pin should be dropped once those four consumers ship versions that no
longer import from `top-layer/animations`.
