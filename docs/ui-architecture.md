# UI architecture

Syra's renderer uses React + MobX with styled‑components v6 for styling.

- **State**: `views/app/store/**` defines the main app store and feature stores (tabs, settings, bookmarks).
- **Transport**: IPC is abstracted through RPC helpers in `src/common/rpc/**`, consumed from the renderer.
- **Views**: `views/app/components/**` contains small focused components with local styles.
- **Themes**: `src/renderer/constants/themes.ts` and `src/interfaces/theme.ts` define the theme surface.

### Data flow

1. User interacts with a UI component (e.g., clicks a ToolbarButton).
2. Component calls an action on a store (MobX), or invokes an RPC.
3. Store updates propagate to observers; components re‑render.
4. Styles react to `theme` and `settings` (e.g., `isCompact`).

### Adding a feature

- Add store state/actions, hook up the renderer component, and (if needed) main‑process handlers and RPC endpoints.
