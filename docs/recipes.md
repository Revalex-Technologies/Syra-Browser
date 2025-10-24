# Recipes & Tutorials

This section provides step‑by‑step guides.

## Change inactive tab colors

1. Open `src/renderer/constants/themes.ts`.
2. Edit these keys:  
   - `tab.inactive.background`  
   - `tab.inactive.hover.background`  
   - `tab.textColor`
3. Save and reload the app. No component code changes required.

## Make the Address Bar taller

1. Open `src/renderer/views/app/components/AddressBar/style.ts`.
2. Increase `height` and `line-height` in `StyledAddressBar`.
3. If you want this to be theme‑driven, add `searchBoxHeight` to `ITheme` and use `theme.searchBoxHeight` instead of hard‑coding.

## Add a Toolbar button

1. Create a new component under `src/renderer/views/app/components/ToolbarButton/`.
2. Import and render it in `src/renderer/views/app/components/Toolbar/index.tsx`.
3. Add an SVG icon under `src/renderer/resources/icons/` and reference it in your button.

## Toggle a dynamic security button

1. Ensure `showDynamicSecurityButton` exists in `ISettings` and has a default in `constants/settings.ts`.
2. Add a switch in Settings → Address Bar.
3. In `SecurityChipDialog`/`SiteButtons`, read from the settings store to show/hide.
