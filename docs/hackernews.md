# HackerNews Module 💻

Get the latest tech news and discussions from Hacker News.

## Functions

### getTopStories(limit?: number)

Get the current top stories.

```typescript
import { getTopStories } from 'llm-search';

const stories = await getTopStories(10);
```

### getNewStories(limit?: number)

Get the newest stories.

```typescript
import { getNewStories } from 'llm-search';

const stories = await getNewStories(10);
```

### getBestStories(limit?: number)

Get the best stories of all time.

```typescript
import { getBestStories } from 'llm-search';

const stories = await getBestStories(10);
```

### getAskStories(limit?: number)

Get "Ask HN" posts.

```typescript
import { getAskStories } from 'llm-search';

const stories = await getAskStories(10);
```

### getShowStories(limit?: number)

Get "Show HN" posts.

```typescript
import { getShowStories } from 'llm-search';

const stories = await getShowStories(10);
```

### getJobStories(limit?: number)

Get job postings.

```typescript
import { getJobStories } from 'llm-search';

const stories = await getJobStories(10);
```

### getStoryById(id: number)

Get a specific story by its ID.

```typescript
import { getStoryById } from 'llm-search';

const story = await getStoryById(123456);
```

## Result Format

```typescript
interface HackerNewsResult extends SearchResult {
  points?: number;     // story points/score
  author?: string;     // post author
  comments?: number;   // number of comments
  time?: Date;        // post timestamp
}
```

## Error Handling

All functions throw a `SearchError` on failure:

```typescript
try {
  const stories = await getTopStories();
} catch (err) {
  if (err.code === 'HN_TOP_ERROR') {
    console.error('failed to get top stories:', err.message);
  }
}
```

## Tips

- Default limit is 10 stories for all functions
- Stories are returned in descending order (highest score first)
- Use `getStoryById()` to fetch full details of a story
- Comments count might be null for very new stories
- URLs point to HN discussion if no external URL exists
- Job stories won't have points or comments
- "Ask HN" and "Show HN" often have interesting discussions

## Story Types

Each function gets different types of content:

- `getTopStories()` - Currently trending stories
- `getNewStories()` - Most recent submissions
- `getBestStories()` - Highest voted all time
- `getAskStories()` - Questions and discussions
- `getShowStories()` - Project showcases
- `getJobStories()` - Job listings