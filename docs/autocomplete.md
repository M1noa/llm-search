# Autocomplete Documentation

The autocomplete module provides real-time search suggestions from multiple search engines. It's useful for building "search as you type" interfaces or generating keyword ideas.

## Supported Providers

- **Google**
- **DuckDuckGo** (default)
- **Yahoo**
- **Brave**
- **Yandex**
- **Ecosia**
- **Startpage**
- **Qwant**
- **Swisscows**

## Usage

```typescript
import { getSuggestions } from "llm-kit";

// Default (DuckDuckGo)
const results = await getSuggestions("typescript");
console.log(results.suggestions);
// Output: ['typescript tutorial', 'typescript types', ...]

// Specify provider
const googleResults = await getSuggestions("react", "google");

// With options
const braveResults = await getSuggestions("linux", "brave", {
    limit: 5,
    proxy: "http://proxy.example.com:8080",
});
```

## API Reference

### `getSuggestions(query, provider?, options?)`

- **query**: `string` - The partial search term
- **provider**: `string` - One of the supported providers (default: `'duckduckgo'`)
- **options**: `AutocompleteOptions`

### Options

| Option    | Type                    | Description                                                                       |
| --------- | ----------------------- | --------------------------------------------------------------------------------- |
| `limit`   | `number`                | Maximum number of suggestions to return (default varies by provider, usually ~10) |
| `proxy`   | `string \| ProxyConfig` | Proxy configuration                                                               |
| `timeout` | `number`                | Request timeout in milliseconds                                                   |

## Return Value

Returns a `Promise<AutocompleteResult>`:

```typescript
interface AutocompleteResult {
    query: string; // The original query
    suggestions: string[]; // Array of suggestion strings
    source: string; // The provider used (e.g., 'google')
}
```

## Error Handling

```typescript
try {
    const results = await getSuggestions("query", "google");
} catch (error) {
    console.error("Autocomplete failed:", error.message);
}
```
