const express = require('express');
const cors = require('cors');
const path = require('path');
const { Storage } = require('@google-cloud/storage');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize Google Cloud Storage
let storage;
try {
  storage = new Storage();
  console.log('Google Cloud Storage initialized');
} catch (error) {
  console.warn('GCS not initialized (running in demo mode):', error.message);
}

// API Routes

// List EDF files from a GCS bucket
app.get('/api/files/:bucketName', async (req, res) => {
  try {
    if (!storage) {
      return res.status(503).json({
        error: 'GCS not configured. Set GOOGLE_APPLICATION_CREDENTIALS environment variable.'
      });
    }

    const { bucketName } = req.params;
    const bucket = storage.bucket(bucketName);

    const [files] = await bucket.getFiles({
      prefix: req.query.prefix || '',
    });

    const edfFiles = files
      .filter(file => file.name.toLowerCase().endsWith('.edf'))
      .map(file => ({
        name: file.name,
        size: file.metadata.size,
        updated: file.metadata.updated,
        bucket: bucketName
      }));

    res.json({ files: edfFiles });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get signed URL for downloading an EDF file
app.get('/api/download/:bucketName/*', async (req, res) => {
  try {
    if (!storage) {
      return res.status(503).json({
        error: 'GCS not configured'
      });
    }

    const { bucketName } = req.params;
    const fileName = req.params[0];

    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileName);

    // Generate signed URL valid for 15 minutes
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    });

    res.json({ url });
  } catch (error) {
    console.error('Error generating download URL:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    gcsConfigured: !!storage,
    timestamp: new Date().toISOString()
  });
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`EEG Cloud Viewer running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});
