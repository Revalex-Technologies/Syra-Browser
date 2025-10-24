# Security Chip

**Files**

- Dialog and chip: `src/renderer/views/app/components/SecurityChipDialog/`
- Site buttons container: `src/renderer/views/app/components/SiteButtons/`

**Related setting**

- `showDynamicSecurityButton` in `src/interfaces/settings.ts`, controlled by the Settings UI (Appearance/Address Bar sections).

**Customization**

- Icons and color come from theme and SVGs under `src/renderer/resources/icons/`.
- Expand/collapse behavior is handled in the React component; tweak the animation or positioning there.
