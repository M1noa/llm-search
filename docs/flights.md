# Flights Search Documentation

The flights module allows you to search for flight prices and schedules using Google Flights. It uses headless browser automation to navigate the interface and extract flight data.

## Usage

```typescript
import { searchFlights } from "llm-kit";

// Simple string query
const results = await searchFlights("flights from JFK to LHR");

// Structured query
const results = await searchFlights({
    from: "SFO",
    to: "HND",
    departureDate: "2025-05-01",
    returnDate: "2025-05-15",
});

results.flights.forEach((flight) => {
    console.log(`${flight.airline}: ${flight.price} (${flight.duration})`);
});
```

## API Reference

### `searchFlights(query, options?)`

- **query**: `string | FlightSearchOptions` - Either a natural language string or an options object
- **options**: `FlightSearchOptions` - Additional options (if query is a string)

### Options (`FlightSearchOptions`)

| Option          | Type                    | Description                                     |
| --------------- | ----------------------- | ----------------------------------------------- |
| `from`          | `string`                | Origin airport code or city                     |
| `to`            | `string`                | Destination airport code or city                |
| `departureDate` | `string`                | Departure date (YYYY-MM-DD or natural language) |
| `returnDate`    | `string`                | Return date (YYYY-MM-DD or natural language)    |
| `limit`         | `number`                | Maximum results (default: 10)                   |
| `proxy`         | `string \| ProxyConfig` | Proxy configuration                             |

## Output Structure

Returns a `Promise<FlightResult>`:

```typescript
interface FlightResult {
    flights: Flight[];
    url: string; // Google Flights URL
    source: string; // 'google-flights'
}

interface Flight {
    airline: string;
    departureTime: string;
    arrivalTime: string;
    duration: string;
    price: string;
    stops: string;
    origin?: string; // Inferred if available
    destination?: string; // Inferred if available
}
```

## Limitations

- Google Flights is a complex, dynamic application. Selectors are heavily obfuscated and change frequently.
- This module uses heuristics to extract data (e.g., regex for times and prices).
- Performance depends on network speed and proxy quality, as it loads a full React application.
