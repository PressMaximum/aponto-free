# Aponto Free source and build guide

Aponto Free ships the complete human-readable JavaScript and CSS source used to
produce its browser bundles. The public release mirror is maintained at:

https://github.com/PressMaximum/aponto-free

The private Aponto monorepo remains the only development source of truth. The
public repository is a one-way mirror of a validated Free distribution ZIP;
changes made directly in the mirror are overwritten by the next publication.
Immutable `v*` tags are created only for approved releases.

## Source map

| Distributed output | Human-readable source |
| --- | --- |
| `assets/dist/free/admin*` | `assets/src/admin/` |
| `assets/dist/free/form*` | `assets/src/form/` |
| `assets/dist/free/form-editor*` | `assets/src/form/editor.jsx` and shared `assets/src/form/` files |
| `assets/dist/free/wizard*` | `assets/src/wizard/` |
| `assets/dist/free/modules/*` | Matching entries under `assets/src/modules/` |

`webpack.config.js` defines the entry graph. `scripts/build-assets.mjs` runs the
debug and production builds and verifies that every JavaScript, CSS, RTL and
WordPress dependency-manifest output has its readable/minified pair.

## Rebuild the Free browser assets

Requirements:

- Node.js 20 or newer.
- npm 10 or newer.

From the plugin directory:

```sh
npm ci
npm run build:free
```

`npm ci` installs the exact dependency graph recorded in `package-lock.json`.
The build writes readable files such as `admin.js` and `admin.css`, plus their
production `.min.js` and `.min.css` counterparts, to `assets/dist/free/`.

## Bundled dependency source

The exact versions are pinned in `package.json` and `package-lock.json`. Source
for the direct browser dependencies is publicly maintained at:

- `@dnd-kit/*`: https://github.com/clauderic/dnd-kit
- `@event-calendar/core`: https://github.com/vkurko/calendar
- `@pressmaximum/dashboard-kit`: https://github.com/PressMaximum/dashboard-kit
- `@tanstack/react-table`: https://github.com/TanStack/table
- `preact`: https://github.com/preactjs/preact

WordPress packages declared as webpack externals are supplied by WordPress at
runtime and are not copied into Aponto's bundles.

## Edition boundary

The Free archive and this public mirror contain no Premium provider source,
Premium browser source, Premium asset directory, Premium Plan variant, license
client or Premium update implementation. The distribution builder scans both
the staging tree and the completed ZIP and fails if a Premium path or token
crosses this boundary.
