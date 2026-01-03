# Examples 📚

Here are some examples of how to use llm-search in different scenarios.

## Basic Search Example

```typescript
import { search, wikiSearch, getWebpageContent } from 'llm-search';

async function searchAndGetContent() {
  try {
    // Search across engines
    const results = await search('typescript tutorial');
    console.log('Search results:', results);

    // Get webpage content from first result
    if (results.length > 0) {
      const content = await getWebpageContent(results[0].url);
      console.log('First result content:', content.textContent);
    }
  } catch (err) {
    console.error('Search failed:', err);
  }
}
```

## Wikipedia Research Example

```typescript
import { wikiSearch, wikiGetContent, wikiGetSummary } from 'llm-search';

async function researchTopic() {
  try {
    // Search Wikipedia
    const results = await wikiSearch('artificial intelligence');
    
    // Get full article for first result
    if (results.length > 0) {
      const summary = await wikiGetSummary(results[0].title);
      console.log('Summary:', summary.extract);
      
      const content = await wikiGetContent(results[0].title);
      console.log('Full content:', content);
    }
  } catch (err) {
    console.error('Wiki search failed:', err);
  }
}
```

## HackerNews Feed Example

```typescript
import { getTopStories, getBestStories, getStoryById } from 'llm-search';

async function getHNFeed() {
  try {
    // Get mix of top and best stories
    const topStories = await getTopStories(5);
    const bestStories = await getBestStories(5);
    
    console.log('Top stories:', topStories);
    console.log('Best stories:', bestStories);
    
    // Get full details of first story
    if (topStories.length > 0) {
      const firstStory = await getStoryById(topStories[0].id);
      console.log('Full story details:', firstStory);
    }
  } catch (err) {
    console.error('HN fetch failed:', err);
  }
}
```

## Webpage Content Extraction Example

```typescript
import { getWebpageContent, getWebpageText, isUrlAccessible } from 'llm-search';

async function extractContent(url: string) {
  try {
    // Check if URL is accessible
    if (await isUrlAccessible(url)) {
      // Get full content with HTML
      const content = await getWebpageContent(url);
      console.log('Title:', content.title);
      console.log('Excerpt:', content.excerpt);
      console.log('Content:', content.content);
      
      // Get just the text
      const text = await getWebpageText(url);
      console.log('Plain text:', text);
    }
  } catch (err) {
    console.error('Content extraction failed:', err);
  }
}
```

## Multi-Source Research Example

```typescript
import { search, wikiSearch, getWebpageContent, getTopStories } from 'llm-search';

async function researchTopic(query: string) {
  try {
    // Search multiple sources in parallel
    const [
      searchResults,
      wikiResults,
      hnStories
    ] = await Promise.all([
      search(query),
      wikiSearch(query),
      getTopStories(5)
    ]);
    
    console.log('Web search results:', searchResults);
    console.log('Wikipedia results:', wikiResults);
    console.log('Related HN stories:', hnStories);
    
    // Get content from first search result
    if (searchResults.length > 0) {
      const content = await getWebpageContent(searchResults[0].url);
      console.log('Main article content:', content.textContent);
    }
  } catch (err) {
    console.error('Research failed:', err);
  }
}
```

## Error Handling Example

```typescript
import { search, SearchError } from 'llm-search';

async function robustSearch(query: string) {
  try {
    const results = await search(query);
    return results;
  } catch (err) {
    if (err.code === 'GOOGLE_SEARCH_ERROR') {
      console.log('Google search failed, using fallback...');
      // Handle error or try alternative
    } else if (err.code === 'DDG_SEARCH_ERROR') {
      console.log('DuckDuckGo search failed...');
      // Handle error
    } else {
      console.error('Unknown error:', err);
    }
    return [];
  }
}
```

These examples demonstrate some common use cases, but there are many more possibilities! Check out the module-specific documentation for more details on available functions and options.