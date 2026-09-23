# ReelVault Plugin Template

A minimal, fork-able starting point for a **single** ReelVault plugin. Fork it,
rename it, build a zip, install it from the admin panel. No catalog repository
required.

> Plugins run **inside the server process** with full server access. Only
> install plugins you trust.

## Fork it

1. Create a repository for your plugin from this template.
2. Pick an `id` — your reverse-domain identifier (e.g. `com.acme.my-plugin`),
   matching `[A-Za-z0-9._-]` — and use it consistently:
   - `plugin.json` → `id`, `name`, `description`, `version`;
   - `package.json` and `ui/package.json` → `name`, `version`;
   - `catalog.json` → `homepage` (your repository URL).
3. Set `capabilities` in `plugin.json` to only what the plugin actually uses
   (using an undeclared one aborts loading).
4. Edit `ui.json` — or, for a backend-only plugin, delete the `ui/` folder **and** `ui.json`.
5. Build and publish a release (see below).

## Layout

```
plugin.json        identity + capabilities (read before your code loads)
index.ts           backend entry — definePlugin(config, { setup })
config.ts          typed configuration (defineConfig) shown in the admin panel
catalog.json       optional catalog metadata (category, homepage, changelog)
tsconfig.json      backend TypeScript config
ui.json            frontend contributions (pages, dialogs, tabs, slots)
ui/schema.ts       declarative UI (host-rendered; no JS shipped)
ui/src/            optional custom element (React here; any framework works)
ui/package.json    frontend build (Vite)
scripts/build.ts   bundles + zips the plugin
```

## Develop

The `reelvault-sdk` package is **not published to npm** — TypeScript and the UI
build resolve it to the SDK sources in a local server checkout:

- `scripts/postinstall.ts` links the SDK into `node_modules/` on `bun install`
  (found next to this checkout, in CI's `server/`, or via `REELVAULT_SDK_PATH`);
- both `tsconfig.json` files map `reelvault-sdk` via `paths`.

Adjust those relative paths if your plugin checkout does not sit next to a
server clone (`reelvault/`, previously `ReelVault.Server/`). The backend bundle
keeps `reelvault-sdk` external — at runtime the host swaps the module for its
own shim, so the server never loads your bundled copy.

```bash
bun install          # installs backend + ui dependencies (skips ui/ when absent)
bun run check-types  # type-check backend and ui
bun run build        # → dist/<id>-<version>.zip
```

`bun run build` bundles `index.ts`, builds `ui/` (schema-only plugins skip the
JS bundle automatically), compiles `ui/schema*.ts` to JSON and packs everything
into a zip.

During development you can instead point the server's `plugins/` directory at
this checkout (symlink or copy) and reload with
`POST /v1/admin/plugins/reload`. Gotchas when reloading:

- the host reads `schemaRef` schemas from `ui/dist/` and the custom element
  from `ui/dist/index.js` — run `bun run build` (or at least the vite build)
  **before** reloading, or the UI silently shows stale/missing assets;
- a backend-only plugin must delete `ui.json` **in addition to** the `ui/`
  folder — a leftover `ui.json` makes the host advertise frontend
  contributions it cannot render.

## Install

Build the zip and upload it in **Admin → Plugins → Install from upload**. The
server verifies it, unpacks it into `ROOT_DIR/plugins/` and hot-loads it — no
restart. Every release this repo's CI attaches the zip to a GitHub Release; you
can also install straight from that `.zip`.

Configuration (from `config.ts`) appears under the plugin's settings in the
admin panel; secrets are stored server-side and never shipped to the browser.

## Optional: publish a catalog

If you want one-click installs for many users, host a `reelvault-catalog.json`
(any static URL, e.g. a GitHub Release asset) listing entries with
`downloadUrl` + `checksum` (the checksum is printed by `bun run build`). Servers
add it under **Admin → Plugins → Repositories**. See the
[plugin docs](https://reelvault.org/plugins/publishing) for the manifest
format — a catalog is not required for a single plugin.

## Learn more

- Plugin authoring: <https://reelvault.org/plugins/getting-started>
- Manifest & capabilities: <https://reelvault.org/plugins/manifest>
- Host API: <https://reelvault.org/plugins/host-api>
- Frontend (`ui.json`): <https://reelvault.org/plugins/ui>
