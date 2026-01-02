// parser.ts - unified parser for various file types
import { readFileSync, writeFileSync, unlinkSync } from "fs";
import { extname, join } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { parse as csvParse } from "csv-parse/sync";
import { createWorker } from "tesseract.js";
import { XMLParser } from "fast-xml-parser";
import { SearchError } from "../types";

// supported file types
export type FileType = "pdf" | "docx" | "csv" | "image" | "text" | "xml" | "json" | "unknown";

export interface ParseOptions {
  language?: string; // Language for OCR (default: 'eng')
  csv?: {
    delimiter?: string;
    columns?: boolean;
  };
  xml?: {
    ignoreAttributes?: boolean;
    parseAttributeValue?: boolean;
  };
}

export interface ParseResult {
  type: FileType;
  text: string;
  metadata?: Record<string, unknown>;
  data?: unknown; // Structured data if available
}

// detect file type from path or buffer
function detectFileType(pathOrBuffer: string | Buffer, filename?: string): FileType {
  // if we got a string path, use that
  if (typeof pathOrBuffer === "string") {
    const ext = extname(pathOrBuffer).toLowerCase();
    return getTypeFromExtension(ext);
  }

  // if we got a filename hint with the buffer, use that
  if (filename) {
    const ext = extname(filename).toLowerCase();
    return getTypeFromExtension(ext);
  }

  // ok fine we'll try to detect from buffer magic numbers
  const header = pathOrBuffer.slice(0, 4).toString("hex");

  // check magic numbers
  if (header.startsWith("89504e47")) return "image"; // PNG
  if (header.startsWith("ffd8")) return "image"; // JPEG
  if (header.startsWith("424d")) return "image"; // BMP
  if (header.startsWith("47494638")) return "image"; // GIF
  if (header.startsWith("25504446")) return "pdf"; // PDF
  if (header.startsWith("504b")) return "docx"; // ZIP/DOCX
  if (pathOrBuffer.slice(0, 5).toString() === "<?xml") return "xml";

  // attempt json detection
  try {
    JSON.parse(pathOrBuffer.toString());
    return "json";
  } catch {
    // not json, continue
  }

  // check if it looks like csv
  const firstLine = pathOrBuffer.toString().split("\n")[0];
  if (firstLine && firstLine.includes(",")) return "csv";

  // probably just text if we got here
  if (pathOrBuffer.toString().trim()) return "text";

  return "unknown";
}

// helper to get type from file extension
function getTypeFromExtension(ext: string): FileType {
  switch (ext) {
    case ".pdf":
      return "pdf";
    case ".docx":
      return "docx";
    case ".csv":
      return "csv";
    case ".txt":
      return "text";
    case ".xml":
      return "xml";
    case ".json":
      return "json";
    case ".png":
    case ".jpg":
    case ".jpeg":
    case ".bmp":
    case ".gif":
      return "image";
    default:
      return "unknown";
  }
}

// parse JSON files
function parseJSON(buffer: Buffer): ParseResult {
  try {
    const text = buffer.toString();
    const data = JSON.parse(text);
    return {
      type: "json",
      text: text,
      data: data,
      metadata: {
        length: text.length,
        lines: text.split("\n").length,
      },
    };
  } catch (error) {
    throw {
      message: "Failed to parse JSON file",
      code: "JSON_PARSE_ERROR",
      originalError: error,
    } as SearchError;
  }
}

// parse PDF files
async function parsePDF(buffer: Buffer): Promise<ParseResult> {
  try {
    const data = await pdfParse(buffer);
    return {
      type: "pdf",
      text: data.text,
      metadata: {
        pages: data.numpages,
        info: data.info,
        metadata: data.metadata,
        version: data.version,
      },
    };
  } catch (error) {
    throw {
      message: "Failed to parse PDF file",
      code: "PDF_PARSE_ERROR",
      originalError: error,
    } as SearchError;
  }
}

// parse CSV files
function parseCSV(buffer: Buffer, options?: ParseOptions): ParseResult {
  try {
    const text = buffer.toString();
    const lines = text.trim().split("\n");
    if (lines.length === 0) {
      throw new Error("Empty CSV file");
    }

    // Count columns from the header row
    const headerRow = lines[0];
    const columnCount = headerRow.split(options?.csv?.delimiter || ",").length;

    // Parse the CSV
    const records = csvParse(text, {
      delimiter: options?.csv?.delimiter,
      columns: options?.csv?.columns ?? true, // Default to true for column headers
      skip_empty_lines: true,
    });

    const headers = options?.csv?.columns !== false ? Object.keys(records[0] || {}) : undefined;

    return {
      type: "csv",
      text: text,
      data: records,
      metadata: {
        rowCount: records.length,
        columnCount: columnCount,
        headers: headers,
      },
    };
  } catch (error) {
    throw {
      message: "Failed to parse CSV file",
      code: "CSV_PARSE_ERROR",
      originalError: error,
    } as SearchError;
  }
}

// Helper function to extract text from HTML
function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Helper function to create temp file
async function withTempFile<T>(buffer: Buffer, extension: string, callback: (path: string) => Promise<T>): Promise<T> {
  const tempFileName = `temp-${randomBytes(16).toString("hex")}${extension}`;
  const tempPath = join(tmpdir(), tempFileName);

  try {
    writeFileSync(tempPath, buffer);
    return await callback(tempPath);
  } finally {
    try {
      unlinkSync(tempPath);
    } catch {}
  }
}

// parse DOCX files using mammoth
async function parseDOCX(buffer: Buffer): Promise<ParseResult> {
  try {
    return await withTempFile(buffer, ".docx", async (tempPath) => {
      // Try HTML conversion first
      const htmlResult = await mammoth.convertToHtml({ path: tempPath });

      if (!htmlResult.value) {
        // Fallback to raw text extraction
        const textResult = await mammoth.extractRawText({ path: tempPath });
        if (!textResult.value) {
          throw new Error("No content found in DOCX file");
        }

        const cleanText = textResult.value.trim();
        return {
          type: "docx",
          text: cleanText,
          metadata: {
            type: "docx",
            paragraphs: cleanText.split("\n").filter(Boolean).length,
            warnings: textResult.messages,
            method: "raw",
          },
        };
      }

      // Convert HTML to plain text
      const text = htmlToText(htmlResult.value);
      const paragraphs = text.split("\n").filter(Boolean);

      return {
        type: "docx",
        text: text,
        metadata: {
          type: "docx",
          paragraphs: paragraphs.length,
          warnings: htmlResult.messages,
          hasHtml: true,
          method: "html",
        },
      };
    });
  } catch (error) {
    console.error("DOCX parsing error:", error);
    throw {
      message: "Failed to parse DOCX file",
      code: "DOCX_PARSE_ERROR",
      originalError: error,
    } as SearchError;
  }
}

// parse plain text files
function parseText(buffer: Buffer): ParseResult {
  try {
    const text = buffer.toString();
    return {
      type: "text",
      text: text,
      metadata: {
        length: text.length,
        lines: text.split("\n").length,
      },
    };
  } catch (error) {
    throw {
      message: "Failed to parse text file",
      code: "TEXT_PARSE_ERROR",
      originalError: error,
    } as SearchError;
  }
}

// parse XML files
function parseXML(buffer: Buffer, options?: ParseOptions): ParseResult {
  try {
    const text = buffer.toString();
    const parser = new XMLParser({
      ignoreAttributes: options?.xml?.ignoreAttributes ?? false,
      parseAttributeValue: options?.xml?.parseAttributeValue ?? true,
    });
    const data = parser.parse(text);

    return {
      type: "xml",
      text: text,
      data: data,
      metadata: {
        length: text.length,
        lines: text.split("\n").length,
      },
    };
  } catch (error) {
    throw {
      message: "Failed to parse XML file",
      code: "XML_PARSE_ERROR",
      originalError: error,
    } as SearchError;
  }
}

// parse images using OCR
async function parseImage(buffer: Buffer, options?: ParseOptions): Promise<ParseResult> {
  try {
    const worker = await createWorker();
    const lang = options?.language || "eng";

    // Initialize worker with language
    await worker.reinitialize(lang);
    const result = await worker.recognize(buffer);
    await worker.terminate();

    return {
      type: "image",
      text: result.data.text,
      metadata: {
        language: lang,
        confidence: result.data.confidence,
      },
    };
  } catch (error) {
    throw {
      message: "Failed to parse image file",
      code: "IMAGE_PARSE_ERROR",
      originalError: error,
    } as SearchError;
  }
}

// main parse function
export async function parse(
  pathOrBuffer: string | Buffer,
  options: ParseOptions = {},
  filename?: string, // optional filename hint for buffer inputs
): Promise<ParseResult> {
  try {
    // Get file buffer
    const buffer = typeof pathOrBuffer === "string" ? readFileSync(pathOrBuffer) : pathOrBuffer;

    // Detect file type (pass filename hint if we have it)
    const fileType = detectFileType(pathOrBuffer, filename);

    // Parse based on file type
    switch (fileType) {
      case "pdf":
        return await parsePDF(buffer);
      case "docx":
        return await parseDOCX(buffer);
      case "csv":
        return parseCSV(buffer, options);
      case "text":
        return parseText(buffer);
      case "xml":
        return parseXML(buffer, options);
      case "json":
        return parseJSON(buffer);
      case "image":
        return await parseImage(buffer, options);
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  } catch (error) {
    const searchError = error as SearchError;
    if (searchError.code) {
      throw searchError;
    }
    throw {
      message: `Failed to parse file: ${error instanceof Error ? error.message : String(error)}`,
      code: "PARSE_ERROR",
      originalError: error,
    } as SearchError;
  }
}
