import {
  CheerioCrawler,
  PuppeteerCrawler,
  Configuration,
  CheerioCrawlingContext,
  PuppeteerCrawlingContext,
  RequestOptions,
} from "crawlee";
import { CrawlOptions, CrawlResult, CrawledPage, SearchError } from "../types";
import { normalizeContent } from "./scrape";
import { parseProxyConfig } from "./common";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

// Ensure stealth plugin is used
puppeteer.use(StealthPlugin());

/**
 * Crawl a website starting from a given URL.
 *
 * @param startUrl The URL to start crawling from
 * @param options Crawling options
 * @returns Promise<CrawlResult> Array of crawled pages
 */
export async function crawl(startUrl: string, options: CrawlOptions = {}): Promise<CrawlResult> {
  const results: CrawlResult = [];
  const maxPages = options.maxPages || options.limit || 10;
  const maxDepth = options.maxDepth || 2;
  const usePuppeteer = options.crawlType === "puppeteer" || options.forcePuppeteer;
  const stayOnDomain = options.stayOnDomain !== false; // Default to true if not specified

  // Configure global settings to avoid cluttering the filesystem and console
  const config = new Configuration({
    persistStorage: false,
    purgeOnStart: true,
    availableMemoryRatio: 0.8,
  });

  // Define a union type for the context
  type CrawlerContext = CheerioCrawlingContext | PuppeteerCrawlingContext;

  // Create the request handler closure
  const requestHandler = async (context: CrawlerContext) => {
    const { request, enqueueLinks, log } = context;
    try {
      const url = request.loadedUrl || request.url;
      const userData = request.userData as { depth?: number };
      const depth = userData.depth || 0;

      log.debug(`Processing ${url} at depth ${depth}`);

      let html: string;

      // Check if context has 'page' property (Puppeteer)
      if ("page" in context) {
        html = await (context as PuppeteerCrawlingContext).page.content();
      } else {
        html = (context as CheerioCrawlingContext).body.toString();
      }

      // Normalize content using our existing robust normalizer
      const content = normalizeContent({
        url,
        html,
        skipReadability: false, // We want readable content
      });

      const crawledPage: CrawledPage = {
        ...content,
        url,
        depth,
      };

      results.push(crawledPage);

      // Enqueue links if we haven't reached max depth
      // Note: maxPages is handled by maxRequestsPerCrawl in the crawler config
      if (depth < maxDepth) {
        await enqueueLinks({
          strategy: stayOnDomain ? "same-domain" : "all",
          userData: { depth: depth + 1 },
          transformRequestFunction: (req: RequestOptions) => {
            // Ignore robots.txt if requested (Crawlee respects it by default usually)
            // But we can also filter extensions here if needed
            return req;
          },
        });
      }
    } catch (error) {
      log.error(`Failed to process ${request.url}: ${error}`);
    }
  };

  // Proxy configuration logic could go here
  if (options.proxy) {
    parseProxyConfig(options.proxy);
    // Note: detailed proxy configuration for Crawlee would require creating a ProxyConfiguration
    // instance, but for now we rely on Puppeteer's launchContext or Cheerio's defaults
  }

  try {
    if (usePuppeteer) {
      const crawler = new PuppeteerCrawler(
        {
          requestHandler: requestHandler as (inputs: PuppeteerCrawlingContext) => Promise<void>,
          maxRequestsPerCrawl: maxPages,
          launchContext: {
            launcher: puppeteer,
            launchOptions: {
              headless: true,
              args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
            },
          },
        },
        config,
      );

      await crawler.run([startUrl]);
    } else {
      const crawler = new CheerioCrawler(
        {
          requestHandler: requestHandler as (inputs: CheerioCrawlingContext) => Promise<void>,
          maxRequestsPerCrawl: maxPages,
          additionalMimeTypes: ["text/html", "application/xhtml+xml"],
        },
        config,
      );

      await crawler.run([startUrl]);
    }

    return results;
  } catch (error) {
    throw {
      message: `Crawling failed: ${(error as Error).message}`,
      code: "CRAWL_ERROR",
      originalError: error,
    } as SearchError;
  }
}
