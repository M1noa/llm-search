import * as readline from 'readline';
import { searchGoogle } from '../modules/scrapers/google';
import { searchDuckDuckGo } from '../modules/scrapers/duckduckgo';
import { searchSearxNG } from '../modules/scrapers/searxng';
import { SearchResult, ScraperOptions } from '../types';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

type SearchFunction = (query: string, options?: ScraperOptions) => Promise<SearchResult[]>;

const searchEngine = async (name: string, searchFn: SearchFunction, query: string) => {
  try {
    console.log(`\n🔍 Searching ${name}...`);
    const results = await searchFn(query, { limit: 3 });
    console.log(`\n✅ ${name} Results:`);
    if (results.length === 0) {
      console.log('  No results found.');
    } else {
      results.slice(0, 3).forEach((result: SearchResult, index: number) => {
        console.log(`  ${index + 1}. ${result.title}`);
        console.log(`     ${result.url}`);
        if (result.snippet) console.log(`     "${result.snippet.substring(0, 100)}..."`);
      });
    }
  } catch (error: unknown) {
    let errorMessage: string;
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
      try {
        errorMessage = JSON.stringify(error, null, 2);
      } catch {
        errorMessage = String(error);
      }
    } else {
      errorMessage = String(error);
    }
    console.log(`\n❌ ${name} Failed: ${errorMessage}`);
  }
};

console.log("Welcome to the LLM-Search-Tools Interactive Tester!");
console.log("This tool will search DuckDuckGo, Google, and SearxNG for your query.");

rl.question('\n👉 Enter what to search: ', async (query) => {
  if (!query.trim()) {
    console.log("Empty query, exiting.");
    rl.close();
    return;
  }

  console.log(`\n🚀 Starting search for: "${query}"...`);

  // Run sequentially to keep output clean, or parallel?
  // Parallel might mix output. Let's do parallel but capture output, or just sequential for readability.
  // User asked to "search all search engines", sequential is fine and cleaner for reading.

  await searchEngine('DuckDuckGo', searchDuckDuckGo, query);
  await searchEngine('Google', searchGoogle, query);
  await searchEngine('SearxNG', searchSearxNG, query);

  console.log("\n✨ All searches completed!");
  rl.close();
  process.exit(0);
});
