# SearXNG Search Provider

SearXNG is a free internet metasearch engine which aggregates results from various search services and databases. This provider allows you to use any SearXNG instance as a search backend.

## Configuration

To use SearXNG, you need to provide the base URL of a SearXNG instance:

```typescript
import { search, SearchProvider } from 'llm-search';

const results = await search('your query', {
  provider: SearchProvider.SearXNG,
  searxngConfig: {
    baseUrl: 'https://your-searxng-instance.com',
    apiKey: 'optional-api-key' // if your instance requires authentication
  },
  limit: 10,
  safeSearch: true
});
```

## Public Instances

You can find public SearXNG instances at [searx.space](https://searx.space/). Some popular ones include:

- `https://search.sapti.me`
- `https://searx.be`
- `https://searx.tiekoetter.com`
- `https://search.bus-hit.me`

**Note**: Public instances may have rate limits or may go offline. For production use, consider hosting your own SearXNG instance.

## Self-Hosting

For better reliability and control, you can host your own SearXNG instance:

1. Follow the [SearXNG installation guide](https://docs.searxng.org/admin/installation.html)
2. Configure your instance to enable JSON API responses
3. Optionally set up API key authentication for better security

## API Parameters

The SearXNG provider supports the following search options:

- `limit`: Number of results to return (default: 10)
- `safeSearch`: Enable safe search filtering (default: true)
- `timeout`: Request timeout in milliseconds (default: 10000)

## Error Handling

The provider will throw a `SearchError` with code `SEARXNG_SEARCH_ERROR` if:

- No base URL is provided in `searxngConfig.baseUrl`
- The SearXNG instance returns an error response
- Network connectivity issues occur
- The response format is invalid

## Rate Limiting

The SearXNG provider has a built-in rate limit of 500ms between requests to avoid overwhelming instances. This can be adjusted in the source code if needed.

## Example Usage

```typescript
import { search, SearchProvider } from 'llm-search';

async function searchWithSearXNG() {
  try {
    const results = await search('machine learning tutorials', {
      provider: SearchProvider.SearXNG,
      searxngConfig: {
        baseUrl: 'https://search.sapti.me'
      },
      limit: 5,
      safeSearch: true
    });
    
    console.log(`Found ${results.length} results:`);
    results.forEach(result => {
      console.log(`${result.title} - ${result.url}`);
    });
  } catch (error) {
    console.error('Search failed:', error.message);
  }
}
```