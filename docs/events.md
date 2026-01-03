# Events Search Documentation

The events module enables searching for real-world events (concerts, festivals, meetups, etc.) using Google Events data. It uses Puppeteer with stealth techniques to extract structured event information.

## Usage

```typescript
import { searchEvents } from "llm-search";

const results = await searchEvents("concerts in Tokyo");

results.events.forEach((event) => {
    console.log(`${event.date}: ${event.title} @ ${event.location}`);
});
```

## API Reference

### `searchEvents(query, options?)`

- **query**: `string` - Search query (e.g., "tech conferences London", "music festivals 2024")
- **options**: `EventSearchOptions`

### Options

| Option    | Type                    | Description                                      |
| --------- | ----------------------- | ------------------------------------------------ |
| `limit`   | `number`                | Maximum number of events to return (default: 10) |
| `date`    | `string`                | _Experimental_ date filter                       |
| `proxy`   | `string \| ProxyConfig` | Proxy configuration                              |
| `timeout` | `number`                | Navigation timeout in ms (default: 30000)        |

## Output Structure

Returns a `Promise<EventResult>`:

```typescript
interface EventResult {
    events: Event[];
    url: string; // The Google Events URL scraped
    source: string; // 'google-events'
}

interface Event {
    title: string;
    date: string;
    location: string;
    link?: string;
    description?: string;
    image?: string;
}
```

## Notes

- This module relies on DOM scraping of Google's "Events" UI (`ibp=htl;events`).
- The structure of the Google Events page may change, which can affect extraction reliability.
- Proxy usage is recommended for frequent scraping to avoid CAPTCHAs.
