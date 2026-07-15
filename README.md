# repro: `@atlaskit/top-layer@1.6.1` empty animations barrel

Minimal Webpack + React 19 app that surfaces a runtime crash caused by
`@atlaskit/top-layer@1.6.1` shipping an empty `entry-points/animations.js`
barrel while four consumer packages (`tooltip`, `select`, `popup`,
`modal-dialog`) at their latest published versions still import from it.

## Symptom

Webpack compiles the bundle without errors, but the browser crashes at load:

```
Uncaught TypeError: (0 , sv.slideAndFade) is not a function
```

(Stricter bundlers such as Vite/rolldown fail at build time with
`[MISSING_EXPORT] "slideAndFade" is not exported by …/entry-points/animations.js`.
Webpack accepts the empty barrel silently.)

## What this app does

`src/App.tsx` renders one instance of each affected `@atlaskit` component:

- `<Tooltip>` — imports `fade` and `slideAndFade`
- `<Select>` — imports `slideAndFade` (via its PopupSelect submodule)
- `<Popup>` — imports `popupMotion`
- `<ModalDialog>` — imports `dialogMotion`

## Reproduce

```bash
touch yarn.lock          # avoids Yarn detecting a parent-tree project
yarn install
yarn build               # succeeds with 2 warnings (bundle size only)
yarn verify              # exit 1 — bundle will crash at runtime
```

Or run in dev to see the crash live in the browser:

```bash
yarn dev                 # opens http://localhost:5173
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
yarn build
yarn verify              # exit 0 — bundle is safe
```

## Root cause (per the top-layer team)

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
