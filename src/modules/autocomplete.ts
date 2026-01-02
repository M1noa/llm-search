import { AutocompleteOptions, AutocompleteResult, SearchError } from "../types";
import { fetchWithDetection } from "./common";

type Provider = "google" | "duckduckgo" | "yahoo" | "brave" | "yandex" | "ecosia" | "startpage" | "qwant" | "swisscows";

// Response Interfaces
type GoogleResponse = [string, string[], ...unknown[]];

interface DuckDuckGoItem {
  phrase: string;
}
type DuckDuckGoResponse = DuckDuckGoItem[];

interface YahooResponse {
  gossip?: {
    results?: Array<{ key: string }>;
  };
}

// Brave follows OpenSearch-like format: [query, suggestions[]]
type BraveResponse = [string, string[], ...unknown[]];

// Yandex follows similar format: [query, suggestions[]]
type YandexResponse = [string, string[], ...unknown[]];

interface EcosiaResponse {
  suggestions?: string[];
}

interface StartpageItem {
  text: string;
}
interface StartpageResponse {
  suggestions?: StartpageItem[];
}

interface QwantItem {
  value: string;
}
interface QwantResponse {
  data?: {
    items?: QwantItem[];
  };
}

type SwisscowsResponse = string[];

/**
 * Get autocomplete suggestions for a query
 * @param query The search query
 * @param provider The search provider to use (default: duckduckgo)
 * @param options Options for the request
 * @returns Promise<AutocompleteResult>
 */
export async function getSuggestions(
  query: string,
  provider: Provider = "duckduckgo",
  options: AutocompleteOptions = {},
): Promise<AutocompleteResult> {
  try {
    switch (provider) {
      case "google":
        return await getGoogleSuggestions(query, options);
      case "duckduckgo":
        return await getDuckDuckGoSuggestions(query, options);
      case "yahoo":
        return await getYahooSuggestions(query, options);
      case "brave":
        return await getBraveSuggestions(query, options);
      case "yandex":
        return await getYandexSuggestions(query, options);
      case "ecosia":
        return await getEcosiaSuggestions(query, options);
      case "startpage":
        return await getStartpageSuggestions(query, options);
      case "qwant":
        return await getQwantSuggestions(query, options);
      case "swisscows":
        return await getSwisscowsSuggestions(query, options);
      default:
        return await getDuckDuckGoSuggestions(query, options);
    }
  } catch (error) {
    throw {
      message: `Failed to get suggestions from ${provider}: ${(error as Error).message}`,
      code: "AUTOCOMPLETE_ERROR",
      originalError: error,
    } as SearchError;
  }
}

async function fetchJson<T>(url: string, options: AutocompleteOptions): Promise<T> {
  // Use fetchWithDetection to handle proxies and headers
  const { body } = await fetchWithDetection(url, {
    timeout: options.timeout,
    proxy: options.proxy,
  });
  return JSON.parse(body) as T;
}

// Google
async function getGoogleSuggestions(query: string, options: AutocompleteOptions): Promise<AutocompleteResult> {
  const url = `http://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`;
  const data = await fetchJson<GoogleResponse>(url, options);
  // Format: ["query", ["sugg1", "sugg2", ...]]
  return {
    query,
    suggestions: (data[1] || []).slice(0, options.limit),
    source: "google",
  };
}

// DuckDuckGo
async function getDuckDuckGoSuggestions(query: string, options: AutocompleteOptions): Promise<AutocompleteResult> {
  const url = `https://duckduckgo.com/ac/?kl=wt-wt&q=${encodeURIComponent(query)}`;
  const data = await fetchJson<DuckDuckGoResponse>(url, options);
  // Format: [{"phrase": "sugg1"}, {"phrase": "sugg2"}, ...]
  const suggestions = data.map((item) => item.phrase).slice(0, options.limit);
  return {
    query,
    suggestions,
    source: "duckduckgo",
  };
}

// Yahoo
async function getYahooSuggestions(query: string, options: AutocompleteOptions): Promise<AutocompleteResult> {
  const url = `https://search.yahoo.com/sugg/gossip/gossip-us-fastbreak?output=sd1&command=${encodeURIComponent(
    query,
  )}`;
  const data = await fetchJson<YahooResponse>(url, options);
  // Format: {"gossip": {"results": [{"key": "sugg1"}, ...]}}
  const suggestions = (data.gossip?.results || []).map((item) => item.key).slice(0, options.limit);
  return {
    query,
    suggestions,
    source: "yahoo",
  };
}

// Brave
async function getBraveSuggestions(query: string, options: AutocompleteOptions): Promise<AutocompleteResult> {
  const url = `https://search.brave.com/api/suggest?rich=true&source=web&country=us&q=${encodeURIComponent(query)}`;
  const data = await fetchJson<BraveResponse>(url, options);
  // Format: [ ["query", ...], ["sugg1", "sugg2", ...] ] (OpenSearch compatible-ish)
  const suggestions = (data[1] || []).slice(0, options.limit);
  return {
    query,
    suggestions,
    source: "brave",
  };
}

// Yandex
async function getYandexSuggestions(query: string, options: AutocompleteOptions): Promise<AutocompleteResult> {
  const url = `https://yandex.com/suggest/suggest-ya.cgi?srv=morda_com_desktop&wiz=TrWth&uil=en&fact=1&v=4&icon=1&part=${encodeURIComponent(
    query,
  )}`;
  const data = await fetchJson<YandexResponse>(url, options);
  // Format: ["query", ["sugg1", "sugg2", ...]]
  const suggestions = (data[1] || []).slice(0, options.limit);
  return {
    query,
    suggestions,
    source: "yandex",
  };
}

// Ecosia
async function getEcosiaSuggestions(query: string, options: AutocompleteOptions): Promise<AutocompleteResult> {
  const url = `https://ac.ecosia.org/?q=${encodeURIComponent(query)}`;
  const data = await fetchJson<EcosiaResponse>(url, options);
  // Format: {"suggestions": ["sugg1", "sugg2", ...]}
  const suggestions = (data.suggestions || []).slice(0, options.limit);
  return {
    query,
    suggestions,
    source: "ecosia",
  };
}

// Startpage
async function getStartpageSuggestions(query: string, options: AutocompleteOptions): Promise<AutocompleteResult> {
  const url = `https://www.startpage.com/suggestions?q=${encodeURIComponent(query)}`;
  const data = await fetchJson<StartpageResponse>(url, options);
  // Format: {"suggestions": [{"text": "sugg1"}, ...]}
  const suggestions = (data.suggestions || []).map((item) => item.text).slice(0, options.limit);
  return {
    query,
    suggestions,
    source: "startpage",
  };
}

// Qwant
async function getQwantSuggestions(query: string, options: AutocompleteOptions): Promise<AutocompleteResult> {
  const url = `https://api.qwant.com/v3/suggest?q=${encodeURIComponent(query)}`;
  const data = await fetchJson<QwantResponse>(url, options);
  // Format: {"data": {"items": [{"value": "sugg1"}, ...]}}
  const suggestions = (data.data?.items || []).map((item) => item.value).slice(0, options.limit);
  return {
    query,
    suggestions,
    source: "qwant",
  };
}

// Swisscows
async function getSwisscowsSuggestions(query: string, options: AutocompleteOptions): Promise<AutocompleteResult> {
  const url = `https://api.swisscows.com/suggest?locale=en-US&itemsCount=${
    options.limit || 10
  }&query=${encodeURIComponent(query)}`;
  const data = await fetchJson<SwisscowsResponse>(url, options);
  // Format: ["sugg1", "sugg2", ...]
  const suggestions = (Array.isArray(data) ? data : []).slice(0, options.limit);
  return {
    query,
    suggestions,
    source: "swisscows",
  };
}
