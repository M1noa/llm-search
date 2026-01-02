# Search Module 🔍

The search module provides unified search capabilities using Google, DuckDuckGo, and SearxNG.

## Functions

### search(query: string, options?: SearchOptions)

Main search function that tries engines in sequence:

1. **DuckDuckGo** (Most lenient)
2. **Google** (Best quality, strict bot detection)
3. **SearxNG** (Fallback to public instances)

```typescript
import { search } from "llm-search-tools";

const results = await search("typescript tutorial", {
    limit: 5,
    safeSearch: true,
    timeout: 5000,
});
```

### searchDuckDuckGo(query: string, options?: SearchOptions)

Search using DuckDuckGo specifically. Uses HTML scraping with Puppeteer fallback.

```typescript
import { searchDuckDuckGo } from "llm-search-tools";

const results = await searchDuckDuckGo("typescript tutorial");
```

### searchGoogle(query: string, options?: SearchOptions)

Search using Google specifically.

```typescript
import { searchGoogle } from "llm-search-tools";

const results = await searchGoogle("typescript tutorial");
```

### searchSearxNG(query: string, options?: SearchOptions)

Search using SearxNG (meta-search engine). Uses public instances by default or a custom instance.

```typescript
import { searchSearxNG } from "llm-search-tools";

const results = await searchSearxNG("typescript tutorial", {
    searxngInstance: "https://searx.be",
});
```

## Options

```typescript
interface SearchOptions {
    limit?: number; // max number of results (default: 10)
    safeSearch?: boolean; // enable safe search (default: true)
    timeout?: number; // request timeout in ms (default: 10000)

    // Advanced Options
    proxy?: string | ProxyConfig; // Proxy configuration
    antiBot?: {
        enabled?: boolean; // Enable anti-bot detection measures
        maxRetries?: number;
        retryDelay?: number;
    };
    searxngInstance?: string; // Custom SearxNG instance URL
}
```

## Result Format

```typescript
interface SearchResult {
    title: string; // result title
    url: string; // result url
    snippet?: string; // result description/snippet
    source: "google" | "duckduckgo" | "wikipedia" | "hackernews" | "searxng";
}
```

## Error Handling

All functions throw a `SearchError` on failure. The main `search()` function aggregates errors if all providers fail.

```typescript
try {
    const results = await search("typescript tutorial");
} catch (err) {
    if (err.code === "ALL_SEARCH_ENGINES_FAILED") {
        console.log("All search engines failed:", err.errors);
    }
}
```

## Tips

- For best results, use the main `search()` function which handles fallbacks automatically.
- DuckDuckGo is the default first choice as it is less restrictive.
- SearxNG is a great fallback as it aggregates multiple engines.
- If you are getting blocked, try enabling `antiBot` or configuring a proxy.
