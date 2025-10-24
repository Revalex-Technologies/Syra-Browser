# Conventions for UI code

- Keep **styles** in `style.ts` next to each component.
- Access theme through `({ theme }) => css\`...\`` blocks.
- Avoid passing non‑DOM props into DOM nodes; use `withConfig({ shouldForwardProp })` or style wrapper components.
- Prefer **MobX** observable state kept in stores under `views/app/store/`.
- Use **SVG** icons from `src/renderer/resources/icons/` for crisp rendering.
- Keep component props minimal and derive presentation from theme + settings to prevent duplication.

## Testing pixel alignment

- Use a 1px overlay grid in devtools to ensure icons and labels are aligned.
- Favor even heights/line‑heights to avoid sub‑pixel blur.
