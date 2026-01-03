# Wikipedia Module 📚

The Wikipedia module provides functions for searching Wikipedia and retrieving article content.

## Functions

### wikiSearch(query: string, limit?: number)

Search Wikipedia articles.

```typescript
import { wikiSearch } from 'llm-search';

const results = await wikiSearch('Node.js', 5);
```

### wikiGetContent(title: string)

Get the full content of a Wikipedia article.

```typescript
import { wikiGetContent } from 'llm-search';

const content = await wikiGetContent('Node.js');
```

### wikiGetSummary(title: string)

Get a summary of a Wikipedia article.

```typescript
import { wikiGetSummary } from 'llm-search';

const summary = await wikiGetSummary('Node.js');
```

### setWikiLang(language: string)

Set the Wikipedia language (default: 'en').

```typescript
import { setWikiLang } from 'llm-search';

setWikiLang('es'); // switch to Spanish Wikipedia
```

## Result Format

```typescript
interface WikipediaResult extends SearchResult {
  extract?: string;    // article extract/summary
  thumbnail?: string;  // URL of article thumbnail image
}
```

## Error Handling

All functions throw a `SearchError` on failure:

```typescript
try {
  const results = await wikiSearch('nodejs');
} catch (err) {
  if (err.code === 'WIKI_SEARCH_ERROR') {
    console.error('wikipedia search failed:', err.message);
  }
}
```

## Tips

- Use `wikiGetSummary()` to get a quick overview of a topic
- `wikiSearch()` results include thumbnails when available
- Switch languages with `setWikiLang()` for international content
- Article content from `wikiGetContent()` is in raw format, you may want to parse it

## Common Languages

Here are some common language codes for `setWikiLang()`:

- 'en' - English
- 'es' - Spanish
- 'fr' - French
- 'de' - German
- 'it' - Italian
- 'pt' - Portuguese
- 'ru' - Russian
- 'ja' - Japanese
- 'zh' - Chinese

See [Wikipedia language codes](https://en.wikipedia.org/wiki/List_of_Wikipedias) for more options.