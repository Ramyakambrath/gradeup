import { recognize } from "tesseract.js";

/** Run in-browser OCR on an image file/blob and return the extracted text. */
export async function recognizeImage(file, onProgress) {
  const {
    data: { text },
  } = await recognize(file, "eng", {
    logger: (m) => {
      if (onProgress && m.status === "recognizing text") onProgress(m.progress);
    },
  });
  return text.trim();
}
