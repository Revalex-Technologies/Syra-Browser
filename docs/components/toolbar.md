# Toolbar & Buttons

**Files**

- Toolbar: `src/renderer/views/app/components/Toolbar/` (layout, separators)
- Buttons: `src/renderer/views/app/components/ToolbarButton/` (icon + behavior)

**Theme keys**

- `toolbar.backgroundColor`
- `toolbar.bottomLine.backgroundColor`
- `toolbar.separator.color`
- `toolbar.lightForeground` (switches light/dark icon treatment)

**Tips**

- Add new buttons by creating a sub‑component under `ToolbarButton/` and wiring into `Toolbar/index.tsx`.
- All icons live under `src/renderer/resources/icons/`.
