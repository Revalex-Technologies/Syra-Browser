# Tabs & Tabbar

**Files**

- Tabbar: `src/renderer/views/app/components/Tabbar/`
- Individual Tab: `src/renderer/views/app/components/Tab/`
- Tab Grouping: `src/renderer/views/app/components/TabGroup/`
- Theme keys: `tab.textColor`, `tab.inactive.background`, `tab.inactive.hover.background`, `tab.selected.hover.background`, `tab.selected.textColor`

**Common modifications**

- Change inactive/hover colors in `themes.ts`
- Adjust height/spacing: check `ITheme` keys `tabHeight`, `tabMarginTop`
- Compact layout: condition based on `theme.isCompact`
- Spinner, favicon, close button alignment: edit `Tab/style.ts`

**Example: adjust tab height globally**

```ts
// src/interfaces/theme.ts
export interface ITheme { /* ... */ tabHeight?: number; }

// src/renderer/constants/themes.ts
export const lightTheme = { /* ... */ tabHeight: 34 };
export const darkTheme  = { /* ... */ tabHeight: 34 };
```

Then in `Tab/style.ts`, use `theme.tabHeight` to set `height`/`line-height`.
