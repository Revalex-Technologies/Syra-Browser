# Address Bar

**Files**

- Logic: `src/renderer/views/app/components/AddressBar/index.tsx`
- Styles: `src/renderer/views/app/components/AddressBar/style.ts`

**Common modifications**

- Background/text colors → `themes.ts` keys: `addressbar.backgroundColor`, `addressbar.textColor`
- Focus ring & hover → Edit in `style.ts` where `focus` and `theme.isCompact` are used
- Heights & radii → `StyledAddressBar` base styles (`height`, `line-height`, `border-radius`)
- Buttons (back/forward, site buttons) → `components/ToolbarButton/` and `components/SiteButtons/`

**Example: make the focus outline thinner**

```ts
// AddressBar/style.ts
box-shadow: ${focus && !theme.isCompact ? `0 0 0 1px ${BLUE_300}` : `0px 0px 5px 0px rgba(0,0,0,0.1)`};
// change 1px to 0.5px or remove entirely
```

**Context Menu**

Right‑click menu items are built in `index.tsx` using Electron's `Menu`. Update labels & accelerators there.
