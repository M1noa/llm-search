import * as readline from "readline";
import { searchGoogle } from "../modules/scrapers/google";
import { searchDuckDuckGo } from "../modules/scrapers/duckduckgo";
import { searchSearxNG } from "../modules/scrapers/searxng";
import { SearchResult, ScraperOptions } from "../types";

const SEARCH_TIMEOUT_MS = 60000;
const RESULT_DISPLAY_LIMIT = 3;

const runSearch = async (
  name: string,
  searchFn: (query: string, options?: ScraperOptions) => Promise<SearchResult[]>,
  query: string,
) => {
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${SEARCH_TIMEOUT_MS / 1000}s`)), SEARCH_TIMEOUT_MS),
    );
    const searchPromise = searchFn(query, { limit: RESULT_DISPLAY_LIMIT, timeout: SEARCH_TIMEOUT_MS });

    console.log(`DEBUG: runSearch(${name}) - Awaiting race...`);
    const results = await Promise.race([searchPromise, timeoutPromise]);
    console.log(
      `DEBUG: runSearch(${name}) - Race won. Results type: ${typeof results}, isArray: ${Array.isArray(results)}`,
    );
    return { name, results: results as SearchResult[], error: null };
  } catch (error) {
    console.log(`DEBUG: runSearch(${name}) - Caught error:`, error instanceof Error ? error.message : error);
    return { name, results: [], error };
  }
};

const printResults = (name: string, results: SearchResult[], error: unknown) => {
  console.log(`\n--- ${name} Results ---`);
  console.log(`DEBUG: printResults(${name}) - Error: ${error ? "YES" : "NO"}, Results: ${results?.length}`);
  if (error) {
    let errorMessage: string;
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === "object" && error !== null) {
      try {
        errorMessage = JSON.stringify(error, null, 2);
      } catch {
        errorMessage = String(error);
      }
    } else {
      errorMessage = String(error);
    }
    console.error(`Error: ${errorMessage}`);
    return;
  }

  if (results.length === 0) {
    console.log("No results found.");
  } else {
    results.slice(0, RESULT_DISPLAY_LIMIT).forEach((result, index) => {
      console.log(`${index + 1}. ${result.title}`);
      console.log(`   URL: ${result.url}`);
      const snippet = result.snippet || "";
      console.log(`   Snippet: ${snippet.substring(0, 100)}${snippet.length > 100 ? "..." : ""}`);
      console.log("");
    });
  }
};

const main = async () => {
  let query = process.argv[2];

  if (!query) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    query = await new Promise<string>((resolve) => {
      rl.question("Enter search query: ", (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }

  if (!query) {
    console.error("Error: Search query cannot be empty.");
    process.exit(1);
  }

  console.log(`Searching for: "${query}"...`);
  console.log(`(Please wait, running searches in parallel with ${SEARCH_TIMEOUT_MS / 1000}s timeout...)`);

  const engines = [
    { name: "Google", fn: searchGoogle },
    { name: "DuckDuckGo", fn: searchDuckDuckGo },
    { name: "SearxNG", fn: searchSearxNG },
  ];

  // Run sequentially to avoid resource contention during debugging
  const results = [];
  for (const engine of engines) {
    console.log(`\nRunning ${engine.name}...`);
    results.push(await runSearch(engine.name, engine.fn, query));
  }

  results.forEach((r) => printResults(r.name, r.results, r.error));
  process.exit(0);
};

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
