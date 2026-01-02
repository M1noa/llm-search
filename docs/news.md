# News Module 📰

The news module provides specialized news search capabilities using Google News and DuckDuckGo News.

## Functions

### searchNews(query: string, options?: ScraperOptions)

Main news search function that orchestrates multiple providers for resilience:

1. **Google News** (Primary source, rich metadata)
2. **DuckDuckGo News** (Fallback source)

```typescript
import { searchNews } from "llm-kit";

const results = await searchNews("technology trends", {
    limit: 10,
    timeout: 10000,
});
```

### searchGoogleNews(query: string, options?: ScraperOptions)

Search using Google News specifically. Uses the `google-news-scraper` library.

```typescript
import { searchGoogleNews } from "llm-kit";

const results = await searchGoogleNews("AI developments");
```

## Options

```typescript
interface ScraperOptions {
    limit?: number;        // max number of results (default: 10)
    timeout?: number;      // request timeout in ms (default: 10000)
    safeSearch?: boolean;  // enable safe search (default: true)

    // Proxy configuration
    proxy?: string | ProxyConfig;
}
```

## Result Format

The module returns `NewsResult` objects which extend the standard `SearchResult`:

```typescript
interface NewsResult extends SearchResult {
    source: "google-news" | "duckduckgo-news";
    sourceName?: string;   // The specific publisher (e.g., "The Verge", "CNN")
    publishedAt?: string;  // Publication time string (e.g., "2 hours ago")
    imageUrl?: string;     // URL to the article's thumbnail image
}
```

## Caching

The Google News provider implements in-memory caching (TTL: 30 minutes) to prevent rate limiting and improve performance for repeated queries.

## Error Handling

Like the search module, `searchNews` aggregates errors and only throws `ALL_NEWS_ENGINES_FAILED` if all providers fail.

```typescript
try {
    const results = await searchNews("query");
} catch (err) {
    if (err.code === "ALL_NEWS_ENGINES_FAILED") {
        console.error("News search failed:", err.errors);
    }
}
```
