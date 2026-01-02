# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Build**: `npm run build` (Runs `tsc`)
- **Test**: `npm test` (Runs `vitest run`)
- **Watch Tests**: `npm run test:watch`
- **Run Single Test**: `npx vitest run path/to/test`
- **Lint**: `npm run lint`
- **Clean**: `npm run clean`

## Architecture & Structure

- **Core Modules** (`src/modules/`):
  - `search.ts`: Web search implementation (Google, DuckDuckGo) with fallback strategies.
  - `scrape.ts`: Webpage content extraction using Puppeteer (stealth mode) and Readability.
  - `parser.ts`: Document parsing (PDF, DOCX, CSV, JSON, XML) and Image OCR (Tesseract.js).
  - `integrations/`: API wrappers for specific services (Wikipedia, HackerNews).
  - `common.ts`: Shared utilities for browser creation (Puppeteer Stealth), proxy config, and fetching.
- **Type Definitions** (`src/types/`): Centralized TypeScript definitions. `external.d.ts` contains manual overrides for untyped modules.
- **Testing**:
  - Uses **Vitest** for unit testing.
  - Extensive mocking of external dependencies (Puppeteer, Fetch, global libraries) to ensure isolated tests.
  - Tests are co-located or in `*.test.ts` files within modules.
- **Design Principles**:
  - **Strict TypeScript**: `noImplicitAny` is enabled. Use strict typing.
  - **Modularity**: Features are isolated in distinct modules.
  - **Zero-Config Fallbacks**: Scrapers automatically degrade from lightweight `fetch` to full `puppeteer` if bot protection is detected.
