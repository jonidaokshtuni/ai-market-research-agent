
import "server-only";

import mammoth from "mammoth";

const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024;
const MAX_EXTRACTED_TEXT_CHARACTERS = 1_500_000;

const ALLOWED_EXTENSIONS = new Set(["pdf", "docx", "txt"]);

export type SupportedDocumentType = "application/pdf" | 
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document" |
  "text/plain";

export type ExtractedDocument = {
  text: string;
  mimeType: SupportedDocumentType;
  originalSize: number;
};

export class DocumentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentValidationError";
  }
}

function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");

  if (lastDot <= 0 || lastDot === filename.length - 1) {
    throw new DocumentValidationError(
      "The uploaded file must have a supported extension."
    );
  }

  return filename.slice(lastDot + 1).toLowerCase();
}

function validateFilename(filename: string): string {
  if (
    typeof filename !== "string" ||
    filename.length === 0 ||
    filename.length > 255 ||
    filename.includes("/") ||
    filename.includes("\\") ||
    /[\u0000-\u001f\u007f]/u.test(filename)
  ) {
    throw new DocumentValidationError("Invalid filename.");
  }

  const extension = getExtension(filename);

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new DocumentValidationError(
      "Only PDF, DOCX, and TXT files are supported."
    );
  }

  return extension;
}

function isPdf(bytes: Uint8Array): boolean {
  const header = new TextDecoder().decode(bytes.slice(0, 1024));
  return header.includes("%PDF-");
}

function isZip(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    (
      (bytes[2] === 0x03 && bytes[3] === 0x04) ||
      (bytes[2] === 0x05 && bytes[3] === 0x06) ||
      (bytes[2] === 0x07 && bytes[3] === 0x08)
    )
  );
}

function decodePlainText(bytes: Uint8Array): string {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);

    // Reject binary/control characters, while allowing normal whitespace.
    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(text)) {
      throw new DocumentValidationError(
        "The TXT file contains unsupported binary characters."
      );
    }

    return text;
  } catch (error) {
    if (error instanceof DocumentValidationError) {
      throw error;
    }

    throw new DocumentValidationError(
      "The TXT file must contain valid UTF-8 text."
    );
  }
}

function validateExtractedText(text: string): string {
  const normalized = text
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .trim();

  if (!normalized) {
    throw new DocumentValidationError(
      "No readable text was found in the document."
    );
  }

  if (normalized.length > MAX_EXTRACTED_TEXT_CHARACTERS) {
    throw new DocumentValidationError(
      "The extracted document text exceeds the allowed limit."
    );
  }

  return normalized;
}
async function extractPdfText(bytes: Uint8Array): Promise<string> {
  // Load the worker first to provide the required CanvasFactory.
  const { CanvasFactory } = await import("pdf-parse/worker");
  const { PDFParse } = await import("pdf-parse");

  const parser = new PDFParse({
    data: bytes,
    CanvasFactory,
  });

  try {
    const result = await parser.getText();
    return result.text.trim();
  } finally {
    await parser.destroy();
  }
}
export async function extractDocumentText(
  file: File
): Promise<ExtractedDocument> {
  if (!(file instanceof File)) {
    throw new DocumentValidationError("A valid uploaded file is required.");
  }

  const extension = validateFilename(file.name);

  if (file.size <= 0 || file.size > MAX_FILE_SIZE_BYTES) {
    throw new DocumentValidationError(
      "The file must be between 1 byte and 4 MB."
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  if (bytes.byteLength !== file.size) {
    throw new DocumentValidationError("The uploaded file is incomplete.");
  }

  let text: string;
  let mimeType: SupportedDocumentType;

  if (extension === "pdf") {
    if (!isPdf(bytes)) {
      throw new DocumentValidationError(
        "The file does not contain a valid PDF signature."
      );
    }

    // PDF parser is loaded only when a PDF is uploaded.
    text = await extractPdfText(bytes);

    mimeType = "application/pdf";
  } else if (extension === "docx") {
    if (!isZip(bytes)) {
      throw new DocumentValidationError(
        "The file does not contain a valid DOCX container."
      );
    }

    const result = await mammoth.extractRawText({
      buffer: Buffer.from(bytes),
    });

    text = result.value;
    mimeType =
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  } else {
    if (isPdf(bytes) || isZip(bytes)) {
      throw new DocumentValidationError(
        "The file contents do not match its TXT extension."
      );
    }

    text = decodePlainText(bytes);
    mimeType = "text/plain";
  }

  return {
    text: validateExtractedText(text),
    mimeType,
    originalSize: bytes.byteLength,
  };
}
