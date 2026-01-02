declare module "pdf-parse" {
  interface PDFData {
    numpages: number;
    text: string;
    info: Record<string, unknown>;
    metadata: Record<string, unknown>;
    version: string;
  }

  function PDFParse(dataBuffer: Buffer): Promise<PDFData>;
  export default PDFParse;
}

declare module "mammoth" {
  interface ExtractResult {
    value: string;
    messages: Array<{
      type: string;
      message: string;
      [key: string]: unknown;
    }>;
  }

  interface Options {
    buffer?: Buffer;
    path?: string;
    [key: string]: unknown;
  }

  export function extractRawText(options: Options): Promise<ExtractResult>;
  export function convertToHtml(options: Options): Promise<ExtractResult>;
}

declare module "tesseract.js" {
  interface WorkerOptions {
    logger?: (message: unknown) => void;
    errorHandler?: (error: unknown) => void;
  }

  interface RecognizeResult {
    data: {
      text: string;
      confidence: number;
      words: Array<{
        text: string;
        confidence: number;
        baseline: unknown;
        bbox: unknown;
        choices: unknown[];
        [key: string]: unknown;
      }>;
    };
  }

  interface Worker {
    reinitialize(lang: string): Promise<void>;
    recognize(image: Buffer | string): Promise<RecognizeResult>;
    terminate(): Promise<void>;
  }

  export function createWorker(options?: WorkerOptions): Promise<Worker>;
}

declare module "wikipedia" {
  export interface WikiSearchResult {
    title: string;
    pageid: number;
    snippet: string;
    timestamp: string;
  }

  export interface WikiSearchResults {
    results: WikiSearchResult[];
    suggestion?: string;
  }

  export interface WikiSummary {
    title: string;
    extract: string;
    thumbnail?: {
      source: string;
      width: number;
      height: number;
    };
    originalimage?: {
      source: string;
      width: number;
      height: number;
    };
    lang: string;
    dir: string;
    timestamp: string;
    description?: string;
    coordinates?: {
      lat: number;
      lon: number;
    };
  }

  export interface WikiPage {
    content(): Promise<string>;
    html(): Promise<string>;
    summary(): Promise<WikiSummary>;
    images(): Promise<unknown[]>;
    references(): Promise<unknown[]>;
    links(): Promise<unknown[]>;
    categories(): Promise<unknown[]>;
  }

  export interface WikiOptions {
    limit?: number;
    suggestion?: boolean;
  }

  const wiki: {
    search(query: string, options?: WikiOptions): Promise<WikiSearchResults>;
    page(title: string): Promise<WikiPage>;
    summary(title: string): Promise<WikiSummary>;
    setLang(lang: string): void;
  };
  export default wiki;
}

declare module "google-news-scraper" {
  export interface GoogleNewsArticle {
    title: string;
    link: string;
    image?: string;
    source?: string;
    time?: string;
    subtitle?: string;
  }

  export interface GoogleNewsOptions {
    searchTerm: string;
    prettyURLs?: boolean;
    queryVars?: Record<string, string>;
    timeframe?: string;
    puppeteerArgs?: unknown[];
  }

  function googleNewsScraper(options: GoogleNewsOptions): Promise<GoogleNewsArticle[]>;
  export default googleNewsScraper;
}
