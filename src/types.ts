// types.ts - all our shared types n stuff

export interface ProxyConfig {
  type: "http" | "https" | "socks4" | "socks5";
  host: string;
  port: number;
  auth?: {
    username: string;
    password: string;
  };
  // Alternative: proxy URL string
  url?: string;
}

export interface ScraperOptions {
  limit?: number;
  safeSearch?: boolean;
  timeout?: number;
  // Force Puppeteer usage even for simple requests
  forcePuppeteer?: boolean;
  // Proxy configuration
  proxy?: ProxyConfig | string;
  // Anti-bot detection options
  antiBot?: {
    enabled?: boolean;
    maxRetries?: number;
    retryDelay?: number;
  };
  // Specific SearxNG instance URL
  searxngInstance?: string;
  // Search category
  category?: "web" | "news" | "images" | "videos";
}

export interface SearchOptions {
  limit?: number;
  safeSearch?: boolean;
  timeout?: number;
  // Legacy support - map to scraper options
  forcePuppeteer?: boolean;
  proxy?: ProxyConfig | string;
  antiBot?: {
    enabled?: boolean;
    maxRetries?: number;
    retryDelay?: number;
  };
  searxngInstance?: string;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet?: string;
  source:
    | "google"
    | "duckduckgo"
    | "wikipedia"
    | "hackernews"
    | "searxng"
    | "google-news"
    | "duckduckgo-news"
    | "google-images"
    | "duckduckgo-images"
    | "searxng-images";
}

export interface ImageResult extends SearchResult {
  imageUrl: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  source: "google-images" | "duckduckgo-images" | "searxng-images";
}

export interface NewsResult extends SearchResult {
  sourceName?: string; // e.g. "The Verge", "CNN"
  publishedAt?: string | Date;
  imageUrl?: string;
}

export interface WikipediaResult extends SearchResult {
  extract?: string;
  thumbnail?: string;
}

export interface HackerNewsResult extends SearchResult {
  id?: number;
  points?: number;
  author?: string;
  comments?: number;
  time?: Date;
}

export interface FinanceResult {
  symbol: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketTime?: Date;
  currency?: string;
  exchange?: string;
  marketState?: string;
  source: "yahoo-finance";
}

export interface WebpageContent {
  title?: string;
  content: string;
  textContent: string;
  length: number;
  excerpt?: string;
  siteName?: string;
  favicon?: string;
  markdown?: string;
  imageUrls?: string[];
  rawHtml?: string;
}

export interface SearchError {
  message: string;
  code: string;
  originalError?: unknown;
}

export interface CrawlOptions extends ScraperOptions {
  maxPages?: number;
  maxDepth?: number;
  crawlType?: "cheerio" | "puppeteer";
  stayOnDomain?: boolean;
  ignoreRobotsTxt?: boolean;
}

export interface CrawledPage extends WebpageContent {
  url: string;
  depth: number;
}

export type CrawlResult = CrawledPage[];

export interface AutocompleteResult {
  query: string;
  suggestions: string[];
  source: string;
}

export interface AutocompleteOptions {
  limit?: number;
  proxy?: ProxyConfig | string;
  timeout?: number;
}

export interface Flight {
  airline: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  price: string;
  stops: string; // e.g. "Non-stop", "1 stop"
  origin?: string;
  destination?: string;
}

export interface FlightResult {
  flights: Flight[];
  url: string;
  source: "google-flights";
}

export interface FlightSearchOptions extends ScraperOptions {
  departureDate?: string; // YYYY-MM-DD
  returnDate?: string; // YYYY-MM-DD
  from?: string; // Airport code e.g. JFK
  to?: string; // Airport code e.g. LHR
}

export interface Event {
  title: string;
  date: string;
  location: string;
  link?: string;
  description?: string;
  image?: string;
}

export interface EventResult {
  events: Event[];
  url: string;
  source: "google-events";
}

export interface EventSearchOptions extends ScraperOptions {
  date?: "today" | "tomorrow" | "week" | "weekend" | "month" | "next_month";
}

export interface MediaResult {
  title: string;
  description?: string;
  rating?: string;
  releaseDate?: string;
  cast?: string[];
  genres?: string[];
  posterUrl?: string;
  watchProviders?: {
    name: string;
    type: "stream" | "rent" | "buy";
  }[];
  url: string;
  source: "tmdb" | "thetvdb" | "anidb";
  mediaType: "movie" | "tv" | "anime";
}

export interface MediaSearchOptions extends ScraperOptions {
  type?: "movie" | "tv" | "anime";
}
