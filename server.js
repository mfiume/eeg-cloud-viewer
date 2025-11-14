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

// Proxy download for GCS file (streams directly through server)
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

    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Get file metadata
    const [metadata] = await file.getMetadata();

    // Set headers
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', metadata.size);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName.split('/').pop()}"`);
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Stream the file
    file.createReadStream()
      .on('error', (err) => {
        console.error('Error streaming file:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error streaming file' });
        }
      })
      .pipe(res);
  } catch (error) {
    console.error('Error downloading file:', error);
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
