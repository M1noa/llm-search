import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { parse } from "./parser";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { createWorker } from "tesseract.js";
import { readFileSync } from "fs";

// Mock dependencies
vi.mock("pdf-parse", () => ({
  default: vi.fn(),
}));
vi.mock("mammoth");
vi.mock("tesseract.js");
vi.mock("fs", async () => {
  const actual = await vi.importActual<typeof import("fs")>("fs");
  return {
    ...actual,
    readFileSync: vi.fn(),
    // We don't mock writeFileSync/unlinkSync as they are used for temp files in docx parsing
    // and we want that to work or we mock the whole flow.
    // For now, let's just mock readFileSync for the input file reading.
  };
});

describe("Parser Module", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("Text Parsing", () => {
    it("should parse text from buffer", async () => {
      const buffer = Buffer.from("Hello world");
      const result = await parse(buffer);
      expect(result).toEqual({
        type: "text",
        text: "Hello world",
        metadata: {
          length: 11,
          lines: 1,
        },
      });
    });

    it("should parse text from file path", async () => {
      (readFileSync as Mock).mockReturnValue(Buffer.from("Hello file"));
      const result = await parse("test.txt");
      expect(result).toEqual({
        type: "text",
        text: "Hello file",
        metadata: {
          length: 10,
          lines: 1,
        },
      });
      expect(readFileSync).toHaveBeenCalledWith("test.txt");
    });
  });

  describe("JSON Parsing", () => {
    it("should parse JSON from buffer", async () => {
      const data = { key: "value" };
      const buffer = Buffer.from(JSON.stringify(data));
      const result = await parse(buffer, {}, "test.json");
      expect(result.type).toBe("json");
      expect(result.data).toEqual(data);
    });

    it("should detect JSON without extension", async () => {
      const data = { key: "value" };
      const buffer = Buffer.from(JSON.stringify(data));
      const result = await parse(buffer);
      expect(result.type).toBe("json");
    });
  });

  describe("CSV Parsing", () => {
    it("should parse CSV from buffer", async () => {
      const csv = "name,age\nAlice,30\nBob,25";
      const buffer = Buffer.from(csv);
      const result = await parse(buffer, {}, "test.csv");
      expect(result.type).toBe("csv");
      expect(Array.isArray(result.data)).toBe(true);
      const data = result.data as Array<Record<string, string>>;
      expect(data).toHaveLength(2);
      expect(data[0]).toEqual({ name: "Alice", age: "30" });
    });
  });

  describe("PDF Parsing", () => {
    it("should parse PDF using pdf-parse", async () => {
      const mockData = {
        numpages: 1,
        info: {},
        metadata: {},
        version: "1.0",
        text: "PDF content",
      };
      (pdfParse as unknown as Mock).mockResolvedValue(mockData);

      const buffer = Buffer.from("%PDF-1.5"); // Magic bytes for PDF
      const result = await parse(buffer);

      expect(result.type).toBe("pdf");
      expect(result.text).toBe("PDF content");
      expect(pdfParse).toHaveBeenCalledWith(buffer);
    });
  });

  describe("DOCX Parsing", () => {
    it("should parse DOCX using mammoth", async () => {
      const mockResult = { value: "DOCX content", messages: [] };
      // Mock convertToHtml since that's what the parser uses first
      (mammoth.convertToHtml as Mock).mockResolvedValue(mockResult);

      // Magic bytes for DOCX (PK zip header)
      const buffer = Buffer.from("504b0304", "hex");

      // We need to hint extension or provide magic bytes that match zip/docx
      // The parser checks magic bytes '504b' -> 'docx'

      const result = await parse(buffer);

      expect(result.type).toBe("docx");
      expect(result.text).toBe("DOCX content");
    });
  });

  describe("Image OCR", () => {
    it("should parse image using tesseract", async () => {
      const mockWorker = {
        reinitialize: vi.fn(),
        recognize: vi.fn().mockResolvedValue({
          data: {
            text: "OCR Text",
            confidence: 90,
          },
        }),
        terminate: vi.fn(),
      };
      (createWorker as Mock).mockResolvedValue(mockWorker);

      // Magic bytes for PNG
      const buffer = Buffer.from("89504e47", "hex");
      const result = await parse(buffer);

      expect(result.type).toBe("image");
      expect(result.text).toBe("OCR Text");
      expect(mockWorker.recognize).toHaveBeenCalledWith(buffer);
      expect(mockWorker.terminate).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should throw error for unsupported file type", async () => {
      // Empty buffer returns "unknown" type because it fails the text check (trim())
      const buffer = Buffer.from("");
      await expect(parse(buffer)).rejects.toThrow("Unsupported file type: unknown");
    });

    it("should propagate parsing errors", async () => {
      const buffer = Buffer.from("{ invalid json");
      // Expect the specific error from the JSON parser, not the generic wrapper
      await expect(parse(buffer, {}, "test.json")).rejects.toThrow("Failed to parse JSON file");
    });
  });
});
