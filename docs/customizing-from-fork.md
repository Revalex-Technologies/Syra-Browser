# Customizing from a fork

If you want to use Syra as a base for your own browser:

## App identity

- Replace app icons under `build/icons/` and Windows/macOS packaging assets.
- Update product name and identifiers in `package.json` and build configs under `.github/workflows/` if you ship CI builds.

## Branding and colors

- Start with `src/renderer/constants/themes.ts` to align brand colors.
- Update SVGs in `src/renderer/resources/icons/` for logos and toolbar glyphs.

## Top‑level UI layout

- Adjust `Titlebar`, `Toolbar`, `Tabbar`, and `AddressBar` components as needed.
- Keep behavior consistent across light/dark themes and compact/default modes.

## Security & IPC

- Follow Electron security best practices (Context Isolation ON, avoid `nodeIntegration` in renderers, expose APIs via preload/RPC).
- Use `@wexond/rpc-electron` patterns already present in the codebase for type‑safe IPC.

## Extensions

- Electron supports only a subset of Chrome Extensions APIs; test thoroughly before relying on MV2/MV3 features.

## Settings

- Keep all new toggles in `ISettings`, with defaults and a visible control in the Settings UI.
