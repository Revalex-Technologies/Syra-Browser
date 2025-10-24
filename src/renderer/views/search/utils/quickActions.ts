import { ISuggestion } from '~/interfaces';

export const getQuickActionSuggestions = (filter: string): ISuggestion[] => {
  const list: ISuggestion[] = [];
  if (!filter) return list;

  const trimmed = filter.trim();

  // Simple calculator: only allow numbers, + - * / ( ) . and spaces
  if (/^[\d\s+\-*/().]+$/.test(trimmed) && /\d/.test(trimmed)) {
    try {
      // Evaluate safely by whitelisting characters and using Function in a sandboxed manner

      const result = Function(`"use strict"; return (${trimmed})`)();
      if (typeof result === 'number' && isFinite(result)) {
        list.push({
          primaryText: 'Calculate',
          secondaryText: `${trimmed} = ${result}`,
          isSearch: false,
          // Special protocol handled in the suggestions view: copy result to clipboard and keep focus
          url: `calc:${encodeURIComponent(String(result))}`,
          favicon: 'calc', // sentinel used to render a calculator icon
        });
      }
    } catch (e) {
      // ignore evaluation errors
    }
  }

  return list;
};
