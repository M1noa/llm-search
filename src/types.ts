// types.ts - all our shared types n stuff

export const enum SearchProvider {
  Google = 'google',
  Brave = 'brave',
  DuckDuckGo = 'duckduckgo',
  Ecosia = 'ecosia',
  SearXNG = 'searxng'
}

export interface ProviderConfig {
  enabled: boolean;
  name: string;
  experimental?: boolean;
}

export interface SearchOptions {
  limit?: number;
  safeSearch?: boolean;
  timeout?: number;
  provider?: SearchProvider;
  searxngConfig?: {
    baseUrl: string;
    apiKey?: string;
  };
}

// Base interface for all types of results
interface BaseResult {
  title: string;
  url: string;
  snippet?: string;
}

// Search engine specific results
export interface SearchResult extends BaseResult {
  source: SearchProvider;
}

// Domain specific interfaces extend BaseResult, not SearchResult
export interface WikipediaResult extends BaseResult {
  source: 'wikipedia';
  extract?: string;
  thumbnail?: string;
}

export interface HackerNewsResult extends BaseResult {
  source: 'hackernews';
  points?: number;
  author?: string;
  comments?: number;
  time?: Date;
}

export interface WebpageAsset {
  url: string;       // absolute url of the asset
  type: 'image' | 'link' | 'other';  // type of asset
  alt?: string;      // alt text for images
}

// Finance interfaces
export interface StockQuote {
  symbol: string;       // stock symbol
  price: number;        // current price
  currency: string;     // price currency
  change: number;       // price change
  changePercent: number; // price change percentage
  marketCap?: number;    // market capitalization
  volume?: number;       // trading volume
  timestamp: Date;       // quote timestamp
}

export interface StockHistory {
  date: Date;          // trading date
  open: number;        // opening price
  high: number;        // highest price
  low: number;         // lowest price
  close: number;       // closing price
  volume: number;      // trading volume
  adjClose: number;    // adjusted closing price
}

// Webpage metadata interface for additional info
export interface WebpageMetadata {
  author?: string;
  score?: number;
  numComments?: number;
  createdAt?: string;
  [key: string]: any; // allow for additional metadata fields
}

export interface WebpageContent {
  title: string;
  content: string;           // raw html content
  textContent: string;       // clean text content
  length: number;
  excerpt?: string;
  siteName?: string;
  faviconUrl?: string;      // absolute url of favicon
  processedHtml?: string;   // cleaned html with absolute urls
  assets?: WebpageAsset[];  // list of asset urls
  markdown?: string;        // html converted to markdown
  metadata?: WebpageMetadata; // additional metadata
}

export interface SearchError {
  message: string;
  code: string;
  originalError?: any;
}
