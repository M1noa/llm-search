# Media Search Module 🎬

The media search module provides unified access to metadata from **TMDB**, **TheTVDB**, and **AniDB** without requiring API keys. It uses a smart fallback strategy to find the best results for Movies, TV Shows, and Anime.

## Functions

### searchMedia(query: string, options?: MediaSearchOptions)

Main function that orchestrates the search based on the requested media type.

```typescript
import { searchMedia } from "llm-search-tools";

// General search (defaults to TMDB -> TheTVDB)
const results = await searchMedia("Breaking Bad");

// Specific Anime search (AniDB -> TMDB)
const animeResults = await searchMedia("Neon Genesis Evangelion", {
    type: "anime",
});
```

## Strategies

The module uses different strategies based on the `type` option:

1.  **Anime** (`type: "anime"`)
    - **Primary**: AniDB (Best for anime metadata)
    - **Fallback**: TMDB (filtered for Animation/TV)

2.  **TV** (`type: "tv"`)
    - **Primary**: TMDB (Fast, good coverage)
    - **Fallback**: TheTVDB (Specialized TV database)

3.  **Movie / General** (Default)
    - **Primary**: TMDB
    - **Fallback**: TheTVDB (Only if not explicitly searching for movies)

## Options

```typescript
interface MediaSearchOptions extends ScraperOptions {
    type?: "movie" | "tv" | "anime";

    // Inherited from ScraperOptions
    limit?: number;
    proxy?: ProxyConfig | string;
    forcePuppeteer?: boolean; // Useful if getting blocked
}
```

## Result Format

Returns a consistent `MediaResult` object regardless of the source.

```typescript
interface MediaResult {
    title: string;
    url: string;
    description?: string;
    rating?: string; // e.g. "85%" or "8.5"
    releaseDate?: string;
    posterUrl?: string;
    genres?: string[];
    cast?: string[];

    // Source identification
    source: "tmdb" | "thetvdb" | "anidb";
    mediaType: "movie" | "tv" | "anime";

    // Availability (if scraped)
    watchProviders?: {
        name: string;
        type: "stream" | "rent" | "buy";
    }[];
}
```

## Anti-Bot Features

- **AniDB**: Enforces strict rate limiting (2.5s between requests) and always uses a stealth browser to avoid IP bans.
- **TMDB/TheTVDB**: Starts with lightweight HTTP requests and automatically falls back to a stealth Puppeteer browser if bot protection is detected.

## Tips

- **Anime**: Always specify `{ type: "anime" }` for anime queries. AniDB has very strict matching but high-quality data.
- **Rate Limiting**: If you are making many requests, add delays between them. The module handles internal rate limits for specific providers, but aggressive usage might still trigger captchas.
