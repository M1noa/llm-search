# Parser Module Documentation

The parser module provides a unified interface for parsing various file types into text and structured data. It now supports both file paths and raw buffers as input.

## Supported File Types

- PDF documents (`.pdf`)
- Word documents (`.docx`) via Mammoth
- CSV files (`.csv`)
- Images (`.png`, `.jpg`, `.jpeg`, `.bmp`, `.gif`) via OCR
- Plain text files (`.txt`)
- XML documents (`.xml`)
- JSON files (`.json`)

## Installation

The module requires several dependencies:

```bash
npm install pdf-parse mammoth csv-parse tesseract.js fast-xml-parser
```

## Usage

### Basic Usage

```typescript
import { parse } from "llm-search-tools";

// parse a file by path (ez mode)
const result = await parse("path/to/file.pdf");
console.log(result.text);

// parse a buffer with known filename (recommended for buffers)
const buffer = readFileSync("path/to/file.docx");
const result = await parse(buffer, {}, "file.docx");
console.log(result.text);

// parse a buffer without filename (we'll try our best to detect type)
const buffer = someBuffer;
const result = await parse(buffer);
console.log(result.text);
```

### Type Detection for Buffers

When parsing buffers, the parser attempts to detect the file type in several ways:

1. Using the provided filename hint (most reliable)
2. Checking file magic numbers for binary formats
3. Attempting JSON parsing for potential JSON data
4. Looking for CSV patterns
5. Falling back to plain text if nothing else matches

### With Options

```typescript
// Parse CSV with custom options
const csvResult = await parse("data.csv", {
    csv: {
        delimiter: ";",
        columns: true,
    },
});

// OCR with different language
const imageResult = await parse("image.png", {
    language: "spa", // Spanish
});
```

## Return Type

The parser returns a `ParseResult` object:

```typescript
interface ParseResult {
    type:
        | "pdf"
        | "docx"
        | "csv"
        | "image"
        | "text"
        | "xml"
        | "json"
        | "unknown";
    text: string; // extracted text content
    metadata?: Record<string, unknown>; // file metadata
    data?: unknown; // structured data if we got it (xml/json/csv mostly)
}
```

## File Type Specific Features

### PDF Files

- Extracts text content
- Provides metadata (page count, PDF info, version)
- Preserves document structure

### DOCX Files

- Extracts text content
- Enhanced document handling via Mammoth
- Supports both HTML and raw text extraction
- Handles document formatting and structure
- Automatically cleans and preserves formatting

### CSV Files

- Extracts raw text
- Provides structured data array
- Supports custom delimiters
- Optional column headers

### Images (OCR)

- Extracts text via Tesseract OCR
- Supports multiple languages
- Returns confidence scores
- Handles common image formats

## Error Handling

```typescript
try {
    const result = await parse("file.pdf");
} catch (error) {
    if (error.code === "PDF_PARSE_ERROR") {
        // Handle PDF-specific error
    } else if (error.code === "DOCX_PARSE_ERROR") {
        // Handle DOCX-specific error
    }
    // Generic error handling
    console.error(error.message);
}
```

## Supported Error Codes

- `PDF_PARSE_ERROR`: pdf parsing failed (ugh these pdfs i swear)
- `DOCX_PARSE_ERROR`: docx parsing failed (word docs are the worst)
- `CSV_PARSE_ERROR`: csv parsing went sideways
- `IMAGE_PARSE_ERROR`: ocr failed (probably bad image quality or smth)
- `TEXT_PARSE_ERROR`: somehow failed to parse plain text (how even?)
- `XML_PARSE_ERROR`: xml parsing went wrong (invalid format probs)
- `JSON_PARSE_ERROR`: json parsing died (check your brackets)
- `PARSE_ERROR`: generic error when everything else fails

## Language Support

For OCR (image parsing), the following languages are supported:

- English (default, 'eng')
- Spanish ('spa')
- French ('fra')
- German ('deu')
- And [many more](https://tesseract-ocr.github.io/tessdoc/Data-Files#data-files-for-version-400-november-29-2016)

## Performance Considerations

- Image OCR is CPU-intensive and may take longer
- Large PDFs may require more memory
- Consider using streams for large files
- CSV parsing is typically very fast

## Examples

### Parse PDF and Extract Text

```typescript
const result = await parse("document.pdf");
console.log(`Pages: ${result.metadata.pages}`);
console.log(`Text: ${result.text}`);
```

### Parse CSV with Custom Options

```typescript
const result = await parse("data.csv", {
    csv: {
        delimiter: ";",
        columns: true,
    },
});
console.log(`Rows: ${result.metadata.rowCount}`);
console.log(`Data:`, result.data);
```

### OCR Image in Different Language

```typescript
const result = await parse("chinese-text.png", {
    language: "chi_sim",
});
console.log(`Extracted Text: ${result.text}`);
```
