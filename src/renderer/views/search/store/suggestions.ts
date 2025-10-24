import { observable, computed, makeObservable } from 'mobx';

import {
  getHistorySuggestions,
  getSearchSuggestions,
} from '../utils/suggestions';
import { isURL } from '~/utils';
import { ISuggestion } from '~/interfaces';
import store from '.';
import type { Store as StoreType } from '.';
import { ICON_SEARCH, ICON_PAGE } from '~/renderer/constants';
import { getQuickActionSuggestions } from '../utils/quickActions';

let searchSuggestions: ISuggestion[] = [];

const MAX_SUGGESTIONS_COUNT = 8;

export class SuggestionsStore {
  private store: StoreType;

  public list: ISuggestion[] = [];

  public selected = 0;

  public height = 0;

  public get selectedSuggestion() {
    return this.list.find((x) => x.id === this.selected);
  }

  constructor(store: StoreType) {
    makeObservable(this, {
      list: observable,
      selected: observable,
      height: observable,
      selectedSuggestion: computed,
    });

    this.store = store;
  }

  public load(input: HTMLInputElement): Promise<string> {
    return new Promise(async (resolve) => {
      const filter = input.value.substring(0, input.selectionStart);
      const history = getHistorySuggestions(filter);

      const historySuggestions: ISuggestion[] = [];

      for (const item of history) {
        if (!item.isSearch) {
          historySuggestions.push({
            primaryText: item.title,
            url: item.url,
            favicon: item.favicon,
            canSuggest: item.canSuggest,
          });
        } else {
          historySuggestions.push({
            primaryText: item.url,
            favicon: ICON_SEARCH,
            canSuggest: item.canSuggest,
            isSearch: true,
          });
        }
      }

      let idx = 1;

      if ((!history[0] || !history[0].canSuggest) && filter.trim() !== '') {
        if (isURL(filter) || filter.indexOf('://') !== -1) {
          historySuggestions.unshift({
            url: filter,
            favicon: ICON_PAGE,
          });
        } else {
          idx = 0;
        }
      }

      historySuggestions.splice(idx, 0, {
        primaryText: filter,
        secondaryText: `${this.store.searchEngine.name} Search`,
        favicon: ICON_SEARCH,
        isSearch: true,
      });

      let suggestions: ISuggestion[] =
        input.value === ''
          ? []
          : historySuggestions
              .concat(searchSuggestions)
              .slice(0, MAX_SUGGESTIONS_COUNT);

      for (let i = 0; i < suggestions.length; i++) {
        suggestions[i].id = i;
      }

      // Prepend quick actions (e.g., calculator)
      const quick = getQuickActionSuggestions(store.inputText);
      if (quick.length) {
        suggestions = [...quick, ...suggestions].slice(
          0,
          MAX_SUGGESTIONS_COUNT,
        );
      }
      this.list = suggestions;

      if (historySuggestions.length > 0 && historySuggestions[0].canSuggest) {
        resolve(historySuggestions[0].url);
      }

      try {
        const searchData = await getSearchSuggestions(filter);

        if (input.value.substring(0, input.selectionStart) === filter) {
          searchSuggestions = [];
          for (const item of searchData) {
            searchSuggestions.push({
              primaryText: item,
              favicon: ICON_SEARCH,
              isSearch: true,
            });
          }

          suggestions =
            input.value === ''
              ? []
              : historySuggestions
                  .concat(searchSuggestions)
                  .slice(0, MAX_SUGGESTIONS_COUNT);

          for (let i = 0; i < suggestions.length; i++) {
            suggestions[i].id = i;
          }

          // Prepend quick actions (e.g., calculator)
          const quick = getQuickActionSuggestions(store.inputText);
          if (quick.length) {
            suggestions = [...quick, ...suggestions].slice(
              0,
              MAX_SUGGESTIONS_COUNT,
            );
          }
          this.list = suggestions;
        }
      } catch (e) {
        console.error(e);
      }
    });
  }
}
