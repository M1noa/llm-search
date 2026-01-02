# Scraper Module Documentation

The scraper module provides powerful web scraping and content extraction capabilities with automatic bot detection and proxy support. It can intelligently switch between basic HTTP requests and Puppeteer-based browser automation when bot protection is detected.

## Features

- **Automatic Bot Detection**: Detects Cloudflare, PerimeterX, Akamai, DataDome, and other bot protections
- **Puppeteer Fallback**: Automatically switches to browser automation when needed
- **Stealth Mode**: Uses puppeteer-extra-plugin-stealth to bypass advanced bot protection including Cloudflare
- **Proxy Support**: Full support for HTTP, HTTPS, SOCKS4, and SOCKS5 proxies with authentication
- **Rate Limiting**: Built-in rate limiting to avoid IP bans
- **Caching**: Intelligent caching to reduce redundant requests
- **Content Extraction**: Extract readable content from webpages using Mozilla Readability
- **Special Handlers**: Optimized extraction for Wikipedia and HackerNews

## Basic Usage

### Search Functions
```typescript
import { search, SearchResult } from 'llm-kit';

// Basic search - automatically handles bot detection
const results: SearchResult[] = await search('typescript tutorial');
console.log(results);
```

### Webpage Content Extraction
```typescript
import { getWebpageContent, getWebpageText } from 'llm-kit';

// Extract content from any webpage
const content = await getWebpageContent('https://example.com/article');
console.log(content.title);
console.log(content.textContent);

// Get just the text content
const text = await getWebpageText('https://example.com/article');
```

### Force Puppeteer Usage
```typescript
// Always use Puppeteer (useful for JavaScript-heavy sites)
const results = await search('react tutorial', {
  forcePuppeteer: true,
  limit: 10
});
```

## Webpage Content Extraction

### Basic Content Extraction
```typescript
import { getWebpageContent, WebpageContent } from 'llm-kit';

// Extract content from any webpage
const content: WebpageContent = await getWebpageContent('https://example.com/article');

console.log('Title:', content.title);
console.log('Site:', content.siteName);
console.log('Content length:', content.length);
console.log('Excerpt:', content.excerpt);
console.log('Full text:', content.textContent);
```

### Force Puppeteer for Protected Sites
```typescript
// Use stealth puppeteer for Cloudflare-protected sites
const content = await getWebpageContent('https://protected-site.com/article', {
  usePuppeteer: true
});
```

### Using Proxies with Content Extraction
```typescript
// Extract content through a proxy
const content = await getWebpageContent('https://example.com/article', {
  proxy: 'http://proxy.example.com:8080',
  usePuppeteer: true  // Often needed for proxies
});

// Or with proxy configuration object
const proxyConfig: ProxyConfig = {
  type: 'socks5',
  host: 'proxy.example.com',
  port: 1080,
  auth: {
    username: 'user',
    password: 'pass'
  }
};

const content = await getWebpageContent('https://example.com/article', {
  proxy: proxyConfig,
  usePuppeteer: true
});
```

### Special Site Handlers
The scraper automatically detects and optimizes for certain sites:

```typescript
// Wikipedia - automatically extracts clean content
const wikiContent = await getWebpageContent('https://en.wikipedia.org/wiki/Web_scraping');

// HackerNews - extracts story content
const hnContent = await getWebpageContent('https://news.ycombinator.com/item?id=123456');
```

### URL Accessibility Check
```typescript
import { isUrlAccessible } from 'llm-kit';

const isAccessible = await isUrlAccessible('https://example.com');
if (isAccessible) {
  const content = await getWebpageContent('https://example.com');
}
```

## Proxy Configuration

### Using Proxy Object
```typescript
import { search, ProxyConfig } from 'llm-kit';

const proxyConfig: ProxyConfig = {
  type: 'http',        // or 'https', 'socks4', 'socks5'
  host: 'proxy.example.com',
  port: 8080,
  auth: {              // Optional authentication
    username: 'user',
    password: 'pass'
  }
};

const results = await search('nodejs tutorial', {
  proxy: proxyConfig
});
```

### Using Proxy URL String
```typescript
// Simple proxy without auth
const results = await search('python tutorial', {
  proxy: 'http://proxy.example.com:8080'
});

// Proxy with authentication
const results = await search('java tutorial', {
  proxy: 'http://user:pass@proxy.example.com:8080'
});

// SOCKS proxy
const results = await search('go tutorial', {
  proxy: 'socks5://proxy.example.com:1080'
});
```

## Bot Detection & Fallback

The scraper automatically detects bot protection and falls back to Puppeteer:

```typescript
// This will automatically handle bot detection
const results = await search('scraping tutorial', {
  antiBot: {
    enabled: true,        // Enable bot detection (default: true)
    maxRetries: 3,        // Max retries on bot detection (default: 3)
    retryDelay: 2000      // Delay between retries in ms (default: 2000)
  }
});
```

### Detected Protections

- **Cloudflare**: CF-Ray headers, challenge pages, "Just a moment" redirects
- **PerimeterX**: _px cookies, PX headers, captcha challenges
- **Akamai**: ak_bmsc cookies, akamaized hosts
- **DataDome**: __ddg_ cookies, x-datadome headers
- **Generic**: CAPTCHAs, 403 errors, rate limiting messages

## Advanced Options

```typescript
import { ScraperOptions } from 'llm-kit';

const options: ScraperOptions = {
  limit: 10,              // Number of results (default: 10)
  safeSearch: true,       // Enable safe search (default: true)
  timeout: 10000,         // Request timeout in ms (default: 10000)
  forcePuppeteer: false,  // Force Puppeteer usage (default: false)
  proxy: {                // Proxy configuration
    type: 'https',
    host: 'proxy.example.com',
    port: 8080,
    auth: {
      username: 'user',
      password: 'pass'
    }
  },
  antiBot: {              // Anti-bot configuration
    enabled: true,
    maxRetries: 3,
    retryDelay: 2000
  }
};

const results = await search('advanced query', options);
```

## Search Engine Specific Functions

### Google Search
```typescript
import { searchGoogle } from 'llm-kit';

// Google-specific search
const googleResults = await searchGoogle('machine learning', {
  limit: 5,
  proxy: 'http://proxy.example.com:8080'
});
```

### DuckDuckGo Search
```typescript
import { searchDuckDuckGo } from 'llm-kit';

// DuckDuckGo-specific search
const ddgResults = await searchDuckDuckGo('data science', {
  safeSearch: false,
  forcePuppeteer: true
});
```

## Error Handling

### Proxy Errors
```typescript
try {
  const results = await search('test', { proxy: 'invalid-proxy' });
} catch (error) {
  if (error.code === 'PROXY_CONNECTION_FAILED') {
    console.error('Could not connect to proxy:', error.message);
  } else if (error.code === 'PROXY_AUTH_FAILED') {
    console.error('Proxy authentication failed');
  } else if (error.code === 'PROXY_CONNECTION_REFUSED') {
    console.error('Proxy server refused connection');
  }
}
```

### Search Errors
```typescript
try {
  const results = await search('test');
} catch (error) {
  if (error.code === 'GOOGLE_SEARCH_ERROR') {
    console.error('Google search failed');
  } else if (error.code === 'DDG_SEARCH_ERROR') {
    console.error('DuckDuckGo search failed');
  }
}
```

## Migration from Search API

The new scraper module is backward compatible with the old search API:

```typescript
// Old API (still works)
import { SearchOptions } from 'llm-kit';

const oldOptions: SearchOptions = {
  limit: 10,
  safeSearch: true,
  timeout: 5000
};

// New API (recommended)
import { ScraperOptions } from 'llm-kit';

const newOptions: ScraperOptions = {
  limit: 10,
  safeSearch: true,
  timeout: 5000,
  forcePuppeteer: false,  // New option
  proxy: undefined,       // New option
  antiBot: {              // New option
    enabled: true,
    maxRetries: 3,
    retryDelay: 2000
  }
};
```

## Best Practices

1. **Use Proxies for High Volume**: Always use proxies when making many requests
2. **Respect Rate Limits**: The built-in rate limiting helps avoid IP bans
3. **Monitor for Bot Detection**: Check console logs for fallback messages
4. **Cache Results**: Enable caching to reduce redundant requests
5. **Handle Errors Gracefully**: Always wrap searches in try-catch blocks

## Example: Complete Scraper Setup

```typescript
import { search, ProxyConfig, ScraperOptions } from 'llm-kit';

async function advancedScraping() {
  const proxyConfig: ProxyConfig = {
    type: 'socks5',
    host: 'rotating-proxy.example.com',
    port: 1080,
    auth: {
      username: 'your-username',
      password: 'your-password'
    }
  };

  const options: ScraperOptions = {
    limit: 20,
    safeSearch: false,
    timeout: 15000,
    proxy: proxyConfig,
    antiBot: {
      enabled: true,
      maxRetries: 5,
      retryDelay: 3000
    }
  };

  try {
    const results = await search('web scraping techniques', options);
    console.log(`Found ${results.length} results`);
    
    // Process results...
    results.forEach(result => {
      console.log(`- ${result.title}`);
      console.log(`  ${result.url}`);
      console.log(`  ${result.snippet}\n`);
    });
  } catch (error) {
    console.error('Scraping failed:', error);
  }
}

advancedScraping();
```
