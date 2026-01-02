// index.ts - main entry point for the package

// export all our cool modules
export * from "./modules/search";
export * from "./modules/scrape";
export * from "./modules/parser";
export * from "./modules/wikipedia";
export * from "./modules/hackernews";
export * from "./modules/news";
export * from "./modules/finance";
export * from "./modules/flights";
export * from "./modules/events";
export * from "./modules/media";
export * from "./modules/crawl";
export * from "./modules/autocomplete";
export * from "./modules/common"; // exporting common utilities might be useful for consumers too

// export types
export * from "./types";

// version info
export const VERSION = "1.1.0";
export const AUTHOR = "Minoa";

// default config
export const DEFAULT_TIMEOUT = 10000;
export const DEFAULT_LIMIT = 10;
