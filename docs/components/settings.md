# Settings (Appearance & Toggles)

**Files**

- Settings UI: `src/renderer/views/settings/**`
- Settings store: `src/renderer/views/settings/store/`
- App settings interface: `src/interfaces/settings.ts`
- Default settings: `src/constants/settings.ts`
- Main process model: `src/main/models/settings.ts`

**Key toggles**

- `topBarVariant: 'default' | 'compact'`
- `leftDockTabs: boolean`
- `showDynamicSecurityButton: boolean`
- Downloads path and dialog visibility
- Do‑Not‑Track and privacy options

**Adding a new toggle**

1. Add a field to `ISettings` in `src/interfaces/settings.ts`.
2. Provide default value in `src/constants/settings.ts`.
3. Render a control in the appropriate settings section (e.g., `views/settings/components/Appearance/`).
4. Persist and propagate via the settings store and `ipcRenderer` channel (listen for `update-settings`).

**Wiring to theme**

Update `getTheme` (if needed) and pass the value into `ITheme` (e.g., `isCompact`) so components can react in styles.
