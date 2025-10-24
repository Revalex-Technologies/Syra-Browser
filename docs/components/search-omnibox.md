# Search Omnibox

**Files**

- `src/renderer/views/app/components/Search/`

**What to change**

- Vertical position / height → see container styles (top/bottom offsets)
- Item highlight/hover → styles within the Search component's `style.ts` (if present) or the styled list elements
- Data source → logic for suggestions under `src/renderer/views/app/store/` and `src/interfaces/suggestion.ts`

**Tip**: Keep consistent spacing with the Address Bar and Toolbar for pixel‑perfect alignment.
