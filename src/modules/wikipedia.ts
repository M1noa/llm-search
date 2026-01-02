// wikipedia.ts - wikipedia stuff, pretty self explanatory tbh

import wiki from "wikipedia";
import { WikipediaResult, SearchError } from "../types";

export async function wikiSearch(query: string, limit: number = 10): Promise<WikipediaResult[]> {
  try {
    // search wikipedia
    const results = await wiki.search(query, { limit });

    // convert results to our format
    return Promise.all(
      results.results.map(async (r) => {
        try {
          // get page summary for each result
          const summary = await wiki.summary(r.title);
          return {
            title: r.title,
            url: `https://wikipedia.org/wiki/${encodeURIComponent(r.title)}`,
            snippet: summary.extract,
            source: "wikipedia" as const,
            extract: summary.extract,
            thumbnail: summary.thumbnail?.source,
          };
        } catch {
          // fallback if summary fails
          return {
            title: r.title,
            url: `https://wikipedia.org/wiki/${encodeURIComponent(r.title)}`,
            source: "wikipedia" as const,
          };
        }
      }),
    );
  } catch (err) {
    throw {
      message: "wikipedia search failed :/",
      code: "WIKI_SEARCH_ERROR",
      originalError: err,
    } as SearchError;
  }
}

export async function wikiGetContent(title: string): Promise<string> {
  try {
    const page = await wiki.page(title);
    const content = await page.content();
    return content;
  } catch (err) {
    throw {
      message: "failed to get wikipedia content :(",
      code: "WIKI_CONTENT_ERROR",
      originalError: err,
    } as SearchError;
  }
}

export async function wikiGetSummary(title: string): Promise<WikipediaResult> {
  try {
    const summary = await wiki.summary(title);
    return {
      title: summary.title,
      url: `https://wikipedia.org/wiki/${encodeURIComponent(summary.title)}`,
      snippet: summary.extract,
      source: "wikipedia",
      extract: summary.extract,
      thumbnail: summary.thumbnail?.source,
    };
  } catch (err) {
    throw {
      message: "failed to get wikipedia summary :/",
      code: "WIKI_SUMMARY_ERROR",
      originalError: err,
    } as SearchError;
  }
}

// set language for wikipedia api
export function setWikiLang(language: string): void {
  wiki.setLang(language);
}
