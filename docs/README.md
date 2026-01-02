# llm-search-tools Documentation

This documentation covers usage for both TypeScript and Node.js environments.

## Table of Contents

- [Installation](#installation)
- [TypeScript Usage](#typescript-usage)
- [Node.js Usage](#nodejs-usage)
- [Module Documentation](#module-documentation)
- [Scraper Module - Bot Detection & Proxies](#scraper-module---bot-detection--proxies)

## Installation

```bash
npm install llm-search-tools
```

## TypeScript Usage

### Basic Search

```typescript
import { search, SearchResult } from "llm-search-tools";

async function searchExample() {
    try {
        const results: SearchResult[] = await search("typescript tutorial");
        console.log(results);
    } catch (error) {
        console.error("Search failed:", error);
    }
}
```

### Wikipedia Search and Content

```typescript
import { wikiSearch, wikiGetContent, WikipediaResult } from "llm-search-tools";

async function wikiExample() {
    try {
        const results: WikipediaResult[] = await wikiSearch("Node.js");
        const content = await wikiGetContent(results[0].title);
        console.log(content);
    } catch (error) {
        console.error("Wiki search failed:", error);
    }
}
```

### HackerNews Integration

```typescript
import {
    getTopStories,
    getNewStories,
    getStoryById,
    HackerNewsResult,
} from "llm-search-tools";

async function hnExample() {
    try {
        const topStories: HackerNewsResult[] = await getTopStories(5);
        const newStories: HackerNewsResult[] = await getNewStories(5);
        const story = await getStoryById(topStories[0].id);
        console.log({ topStories, newStories, story });
    } catch (error) {
        console.error("HN fetch failed:", error);
    }
}
```

### Webpage Content Extraction

```typescript
import { getWebpageContent, WebpageContent } from "llm-search-tools";

async function webpageExample() {
    try {
        const content: WebpageContent = await getWebpageContent(
            "https://example.com",
        );
        console.log({
            title: content.title,
            text: content.textContent,
            excerpt: content.excerpt,
        });
    } catch (error) {
        console.error("Content extraction failed:", error);
    }
}
```

## Node.js Usage

### Basic Search

```javascript
const { search } = require("llm-search-tools");

async function searchExample() {
    try {
        const results = await search("nodejs tutorial");
        console.log(results);
    } catch (error) {
        console.error("Search failed:", error);
    }
}
```

### Wikipedia Search and Content

```javascript
const { wikiSearch, wikiGetContent } = require("llm-search-tools");

async function wikiExample() {
    try {
        const results = await wikiSearch("Node.js");
        const content = await wikiGetContent(results[0].title);
        console.log(content);
    } catch (error) {
        console.error("Wiki search failed:", error);
    }
}
```

### HackerNews Integration

```javascript
const { getTopStories, getNewStories, getStoryById } = require("llm-search-tools");

async function hnExample() {
    try {
        const topStories = await getTopStories(5);
        const newStories = await getNewStories(5);
        const story = await getStoryById(topStories[0].id);
        console.log({ topStories, newStories, story });
    } catch (error) {
        console.error("HN fetch failed:", error);
    }
}
```

### Webpage Content Extraction

```javascript
const { getWebpageContent } = require("llm-search-tools");

async function webpageExample() {
    try {
        const content = await getWebpageContent("https://example.com");
        console.log({
            title: content.title,
            text: content.textContent,
            excerpt: content.excerpt,
        });
    } catch (error) {
        console.error("Content extraction failed:", error);
    }
}
```

## Module Documentation

For detailed documentation of each module, see:

- [Scraper Module](./scraper.md) - Bot detection, proxy support, and advanced scraping
- [Wikipedia Module](./wikipedia.md)
- [HackerNews Module](./hackernews.md)
- [Webpage Module](./webpage.md)

## Scraper Module - Bot Detection & Proxies

The scraper module provides intelligent web scraping with automatic bot detection and proxy support.

### Quick Examples

#### Basic Search with Bot Detection

```typescript
import { search } from "llm-search-tools";

// Automatically handles bot protection
const results = await search("typescript tutorial");
```

#### Using a Proxy

```typescript
// Proxy configuration
const results = await search("nodejs tutorial", {
    proxy: "http://proxy.example.com:8080",
});

// Or with authentication
const results = await search("python tutorial", {
    proxy: "http://user:pass@proxy.example.com:8080",
});
```

#### Force Puppeteer for JavaScript-heavy Sites

```typescript
const results = await search("react tutorial", {
    forcePuppeteer: true,
    limit: 10,
});
```

#### Advanced Configuration

```typescript
import { ProxyConfig, ScraperOptions } from "llm-search-tools";

const proxyConfig: ProxyConfig = {
    type: "socks5",
    host: "proxy.example.com",
    port: 1080,
    auth: {
        username: "user",
        password: "pass",
    },
};

const options: ScraperOptions = {
    limit: 20,
    proxy: proxyConfig,
    antiBot: {
        enabled: true,
        maxRetries: 5,
        retryDelay: 3000,
    },
};

const results = await search("web scraping", options);
```

### Key Features

- **Automatic Bot Detection**: Detects Cloudflare, PerimeterX, Akamai, DataDome, and more
- **Puppeteer Fallback**: Seamlessly switches to browser automation when needed
- **Full Proxy Support**: HTTP, HTTPS, SOCKS4, SOCKS5 with authentication
- **Rate Limiting**: Built-in protection against IP bans
- **Backward Compatible**: Works with existing search API code

For complete documentation, see the [Scraper Module Documentation](./scraper.md).

## Error Handling

All functions throw a `SearchError` type with the following structure:

```typescript
interface SearchError {
    message: string; // Human-readable error message
    code: string; // Error code for programmatic handling
    originalError?: unknown; // Original error object if available
}
```

Example error handling:

```typescript
try {
    const results = await search("typescript");
} catch (error) {
    if (error.code === "GOOGLE_SEARCH_ERROR") {
        // Handle Google search error
    } else if (error.code === "DDG_SEARCH_ERROR") {
        // Handle DuckDuckGo error
    }
}
```

The same error handling works in JavaScript, just without the type annotations.
