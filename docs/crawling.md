# Crawling Module Documentation

The crawling module allows you to crawl websites to extract content from multiple pages, following links up to a specified depth. It supports both lightweight HTML parsing (Cheerio) and full browser automation (Puppeteer).

## Features

- **Multi-page Crawling**: Follows links to discover new pages
- **Configurable Depth**: Control how deep the crawler goes
- **Domain Confinement**: Option to stay within the original domain
- **Dual Modes**:
    - `cheerio` (default): Fast, lightweight, static HTML only
    - `puppeteer`: Full browser automation for dynamic JS-heavy sites
- **Content Normalization**: Automatically converts pages to clean text and Markdown
- **Proxy Support**: Route requests through proxies
- **Stealth Mode**: Built-in evasion for bot protection when using Puppeteer

## Usage

```typescript
import { crawl } from "llm-search-tools";

// Basic crawl (depth 2, max 10 pages)
const results = await crawl("https://example.com");

results.forEach((page) => {
    console.log(`URL: ${page.url}`);
    console.log(`Title: ${page.title}`);
    console.log(`Text: ${page.textContent.substring(0, 100)}...`);
});
```

### Advanced Usage

```typescript
const results = await crawl("https://example.com", {
    maxDepth: 3,
    maxPages: 50,
    stayOnDomain: true,
    crawlType: "puppeteer", // Use for dynamic sites
    proxy: "http://user:pass@proxy.com:8080",
});
```

## Options

The `crawl` function accepts a `CrawlOptions` object:

| Option | Type | Default | Description |
| hum | --- | --- | --- |
| `maxDepth` | `number` | `2` | How many links deep to follow (0 = only start URL) |
| `maxPages` | `number` | `10` | Maximum number of pages to crawl |
| `stayOnDomain` | `boolean` | `true` | If true, only follows links on the same domain |
| `crawlType` | `'cheerio' \| 'puppeteer'` | `'cheerio'` | Use `cheerio` for speed, `puppeteer` for dynamic content |
| `forcePuppeteer` | `boolean` | `false` | Alias for setting `crawlType: 'puppeteer'` |
| `proxy` | `string \| ProxyConfig` | `undefined` | Proxy configuration |

## Output Structure

The crawler returns a `Promise<CrawlResult>`, which is an array of `CrawledPage` objects:

```typescript
interface CrawledPage {
    url: string;
    title: string;
    content: string; // HTML content
    textContent: string; // Cleaned text
    markdown?: string; // Markdown version
    excerpt?: string;
    siteName?: string;
    favicon?: string;
    imageUrls?: string[];
    depth: number; // Depth at which this page was found
}
```

## Error Handling

The crawler is robust and will log errors for individual pages while continuing to crawl others. If the entire crawl fails to start, it throws a `SearchError`.

```typescript
try {
    const results = await crawl("https://invalid-url.com");
} catch (error) {
    if (error.code === "CRAWL_ERROR") {
        console.error("Crawling failed:", error.message);
    }
}
```
