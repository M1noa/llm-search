# Finance Module 📈

The finance module provides real-time stock quotes and financial market data using Yahoo Finance.

## Functions

### getQuote(symbol: string)

Main finance function that retrieves stock quotes. Currently backed by Yahoo Finance.

```typescript
import { getQuote } from "llm-search-tools";

const quote = await getQuote("AAPL");
console.log(`${quote.symbol}: $${quote.regularMarketPrice}`);
```

### getStockQuote(symbol: string)

Direct access to the Yahoo Finance scraper.

```typescript
import { getStockQuote } from "llm-search-tools";

const quote = await getStockQuote("GOOGL");
```

## Result Format

The module returns `FinanceResult` objects:

```typescript
interface FinanceResult {
  symbol: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketTime?: Date;
  currency?: string;
  exchange?: string;
  marketState?: string;
  source: "yahoo-finance";
}
```

## Error Handling

If the symbol is not found or the API fails, the function throws a `SearchError` with code `FINANCE_QUOTE_ERROR`.

```typescript
try {
  const quote = await getQuote("INVALID_SYMBOL");
} catch (err) {
  if (err.code === "FINANCE_QUOTE_ERROR") {
    console.error("Failed to fetch quote:", err.message);
  }
}
```
