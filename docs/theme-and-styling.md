# Theme and styling

Syra ships two themes defined in `src/renderer/constants/themes.ts` implementing the `ITheme` interface from `src/interfaces/theme.ts`. You can add keys or adjust values here to change colors, spacing, and sizes across the UI.

## Where to edit

- **Theme interface**: `src/interfaces/theme.ts` (add new keys here)
- **Light/Dark theme values**: `src/renderer/constants/themes.ts`
- **Usage in components**: `style.ts` files access values like `theme['addressbar.backgroundColor']`

Example (excerpt) from the Address Bar styles:

```ts
// src/renderer/views/app/components/AddressBar/style.ts
export const StyledAddressBar = styled.div.withConfig({
  shouldForwardProp: (p) => p !== 'focus',
})<{ focus?: boolean }>`
  border-radius: 4px;
  ${({ theme, focus }) => css`
    background-color: ${theme['addressbar.backgroundColor']};
    color: ${theme['addressbar.textColor']};
    box-shadow: ${focus && !theme.isCompact ? `0 0 0 1px ${BLUE_300}` : `0px 0px 5px 0px rgba(0,0,0,0.1)`};
  `}
`;
```

## Adding new theme keys

1. Add the key in `src/interfaces/theme.ts` on the `ITheme` interface.
2. Provide values for **both** `lightTheme` and `darkTheme` in `src/renderer/constants/themes.ts`.
3. Use the new key inside component styles via `theme['your.key']`.

## Compact vs default layout

The flag `theme.isCompact` is respected in several components to adjust margins and borders. You can wire this from settings (see **Settings**), or set per‑theme values (`tabHeight`, `titlebarHeight`, etc.).

## Styled Components v6 notes

- Use `withConfig({ shouldForwardProp })` to avoid passing non‑DOM props to DOM nodes.
- For SSR/custom sheet setups, wrap with `StyleSheetManager` if needed.
- Prefer functional style blocks: ``${({ theme }) => css\`...\`}`` for theme access.
