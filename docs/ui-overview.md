# UI overview

This page explains where each visible part of the Syra UI lives in the source tree and how it is connected.

- Main UI renderer: `src/renderer/views/app/components/App/`
- Global store (MobX): `src/renderer/views/app/store/`
- Theme constants (light/dark, sizes): `src/renderer/constants/themes.ts`
- Per‑component styles: `src/renderer/views/app/components/**/style.ts`
- Per‑component logic (React): `src/renderer/views/app/components/**/index.tsx`
- Settings view (for toggles such as compact mode): `src/renderer/views/settings/**`

Common patterns:

- Styled Components v6 is used for CSS‑in‑JS. Styles live next to components in `style.ts` files.
- Visual state is driven by theme keys (see **Theme and styling**).
- Runtime flags are driven by MobX stores (see **Settings**).

## Quick map of key UI areas

- **Titlebar**: `src/renderer/views/app/components/Titlebar/`
- **Tabbar**: `src/renderer/views/app/components/Tabbar/` and `components/Tab/`
- **Address Bar**: `src/renderer/views/app/components/AddressBar/`
- **Toolbar** (back/forward/reload etc.): `src/renderer/views/app/components/Toolbar/` and `ToolbarButton/`
- **Search Omnibox**: `src/renderer/views/app/components/Search/`
- **Security Chip/Dialog**: `src/renderer/views/app/components/SecurityChipDialog/`
- **Bookmark Bar**: `src/renderer/views/app/components/BookmarkBar/`
- **Settings UI**: `src/renderer/views/settings/`
