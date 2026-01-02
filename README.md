# llm-kit 🔍

[![npm version](https://badge.fury.io/js/llm-kit.svg)](https://badge.fury.io/js/llm-kit)

> A Node.js module for searching and scraping web content, designed for LLMs but useful for everyone!

## Features

- Search multiple engines (Google, DuckDuckGo, SearxNG)
- News search (Google News, DuckDuckGo)
- Finance data (Yahoo Finance)
- Wikipedia search and content extraction
- Media search (Movies, TV, Anime) via TMDB, AniDB, TheTVDB
- HackerNews scraping
- Webpage content extraction
- Document parsing (PDF, DOCX, CSV)
- Image OCR/text extraction support
- **No API keys required at all**
- Automatic fallbacks
- TypeScript & Node support

## Installation

```bash
npm install llm-kit

# Optional: Install OCR language data for non-English languages
npm install tesseract.js-data
```

## Quick Start

```typescript
import { search, parse, searchNews, searchMedia, getQuote } from "llm-kit";

// Web Search
const results = await search("typescript tutorial");
console.log(results);

// News Search
const news = await searchNews("technology trends");
console.log(news);

// Media Search
const movies = await searchMedia("Inception", { type: "movie" });
console.log(movies);

// Finance Data
const quote = await getQuote("AAPL");
console.log(quote);

// Parse Documents
const pdfResult = await parse("document.pdf");
console.log(pdfResult.text);

const csvResult = await parse("data.csv", {
  csv: { columns: true },
});
console.log(csvResult.data);

// OCR Images
const imageResult = await parse("image.png", {
  language: "eng",
});
console.log(imageResult.text);
```

## Supported File Types

### Documents

- PDF files (`.pdf`)
- Word documents (`.docx`)
- CSV files (`.csv`)
- XML files (`.xml`)
- JSON files (`.json`)
- Text files (`.txt`, `.md`, etc.)

### Images (OCR)

- PNG (`.png`)
- JPEG (`.jpg`, `.jpeg`)
- BMP (`.bmp`)
- GIF (`.gif`)

## Documentation

See the [docs](./docs) directory for detailed documentation:

- [Search](./docs/search.md) - Web search capabilities
- [Media](./docs/media.md) - Media search (Movies, TV, Anime)
- [News](./docs/news.md) - News search capabilities
- [Finance](./docs/finance.md) - Finance data capabilities
- [Wikipedia](./docs/wikipedia.md) - Wikipedia integration
- [HackerNews](./docs/hackernews.md) - HackerNews API
- [Webpage](./docs/webpage.md) - Web content extraction
- [Parser](./docs/parser.md) - Document and image parsing

## Example Usage

### Web Search

```typescript
import { search } from "llm-kit";

const results = await search("typescript tutorial");
console.log(results);
```

### Media Search

```typescript
import { searchMedia } from "llm-kit";

// Search for a movie
const movies = await searchMedia("The Matrix", { type: "movie" });
console.log(movies);

// Search for anime (uses AniDB)
const anime = await searchMedia("Cowboy Bebop", { type: "anime" });
console.log(anime);
```

### Document Parsing

```typescript
import { parse } from "llm-kit";

// Parse PDF
const pdfResult = await parse("document.pdf");
console.log(pdfResult.text);

// Parse CSV with options
const csvResult = await parse("data.csv", {
  csv: {
    delimiter: ";",
    columns: true,
  },
});
console.log(csvResult.data);

// OCR Image
const imageResult = await parse("image.png", {
  language: "eng", // supports multiple languages
});
console.log(imageResult.text);
```

### Error Handling

```typescript
try {
  const result = await parse("document.pdf");
  console.log(result.text);
} catch (error) {
  if (error.code === "PDF_PARSE_ERROR") {
    console.error("PDF parsing failed:", error.message);
  }
  // Handle other errors
}
```

[![NPM Download Stats](https://nodei.co/npm/llm-kit.png?downloads=true)](https://www.npmjs.com/package/llm-kit)

## Dependencies

This package uses these great libraries:

- [@mozilla/readability](https://www.npmjs.com/package/@mozilla/readability) - Web content extraction
- [csv-parse](https://www.npmjs.com/package/csv-parse) - CSV parsing
- [fast-xml-parser](https://www.npmjs.com/package/fast-xml-parser) - XML parsing
- [google-sr](https://www.npmjs.com/package/google-sr) - Google search
- [google-news-scraper](https://www.npmjs.com/package/google-news-scraper) - Google News search
- [jsdom](https://www.npmjs.com/package/jsdom) - DOM emulation for web scraping
- [mammoth](https://www.npmjs.com/package/mammoth) - DOCX parsing
- [pdf-parse](https://www.npmjs.com/package/pdf-parse) - PDF parsing
- [puppeteer](https://www.npmjs.com/package/puppeteer) - Headless browser automation
- [tesseract.js](https://www.npmjs.com/package/tesseract.js) - OCR
- [wikipedia](https://www.npmjs.com/package/wikipedia) - Wikipedia API

## License

MIT

## Contributing [![contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](TODO.md)

Contributions VERY welcome!! Please read the [contributing guidelines](CONTRIBUTING.md) first.
