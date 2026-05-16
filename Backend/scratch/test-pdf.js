import { PDFParse } from "pdf-parse";

const dummyBuffer = Buffer.from("%PDF-1.0\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 421 595]/Contents 4 0 R>>endobj 4 0 obj<</Length 1>>stream\n \nendstreamendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\n0000000192 00000 n\ntrailer<</Size 5/Root 1 0 R>>startxref\n242\n%%EOF");

async function test() {
  try {
    console.log("Testing PDFParse v2.4.5...");
    // The constructor expects options object with data property
    const parser = new PDFParse({ data: dummyBuffer });
    const result = await parser.getText();
    console.log("PDF parsed successfully!");
    console.log("Text content Preview:", JSON.stringify(result.text.slice(0, 100)));
  } catch (err) {
    console.error("PDF parse failed:", err);
  }
}

test();
