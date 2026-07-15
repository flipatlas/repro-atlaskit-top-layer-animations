# repro: `@atlaskit/top-layer@1.6.1` empty animations barrel

Minimal Vite + React 19 app that surfaces the runtime crash caused by
`@atlaskit/top-layer@1.6.1` shipping an empty `entry-points/animations.js`
barrel while four consumer packages (`tooltip`, `select`, `popup`,
`modal-dialog`) at their latest published versions still import from it.

## Symptom

The bundler (Vite / rolldown) fails the build with:

```
[MISSING_EXPORT] "fade" is not exported by "node_modules/@atlaskit/top-layer/dist/esm/entry-points/animations.js"
[MISSING_EXPORT] "slideAndFade" is not exported by "node_modules/@atlaskit/top-layer/dist/esm/entry-points/animations.js"
[MISSING_EXPORT] "popupMotion" is not exported by "node_modules/@atlaskit/top-layer/dist/esm/entry-points/animations.js"
[MISSING_EXPORT] "dialogMotion" is not exported by "node_modules/@atlaskit/top-layer/dist/esm/entry-points/animations.js"
```

Less-strict bundlers (Webpack / Rspack, as used in `atlassian-embedded-crowd`)
compile the bundle successfully but the browser crashes at load:

```
Uncaught TypeError: (0 , sv.slideAndFade) is not a function
```

## What this app does

`src/App.tsx` renders one instance of each affected `@atlaskit` component:

- `<Tooltip>` — imports `fade` and `slideAndFade`
- `<Select>` — imports `slideAndFade` (from its PopupSelect submodule)
- `<Popup>` — imports `popupMotion`
- `<ModalDialog>` — imports `dialogMotion`

## Reproduce

```bash
cd /Users/fnowakowski/Workspace/repro-atlaskit-top-layer-animations
touch yarn.lock          # avoids Yarn detecting a parent-tree project
yarn install
yarn build               # fails with 4 MISSING_EXPORT errors
```

Or run in dev to see the crash in the browser:

```bash
yarn dev                 # then open http://localhost:5173
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
yarn build               # exit 0, bundle written to dist/
yarn preview             # serve the built bundle, no crash
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
