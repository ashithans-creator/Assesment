import express from 'express';
import multer from 'multer';
import { getDocumentProxy, extractText } from 'unpdf';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, buffer, mimetype } = req.file;
    let extractedText = '';

    if (mimetype === 'application/pdf') {
      try {
        const pdfProxy = await getDocumentProxy(new Uint8Array(buffer));
        const result = await extractText(pdfProxy);
        extractedText = result.text;
      } catch (pdfErr) {
        console.error('PDF parsing failed:', pdfErr);
        res.status(500).json({ error: 'Failed to parse PDF document. It might be encrypted or corrupted.' });
        return;
      }
    } else {
      extractedText = buffer.toString('utf-8');
    }

    res.json({ text: extractedText, filename: originalname });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to process file' });
  }
});

export default router;
