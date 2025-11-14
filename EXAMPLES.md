# Usage Examples

## Example 1: Viewing a Local EDF File

The simplest way to get started:

1. Start the application: `npm start`
2. Open http://localhost:8080 in your browser
3. Click "Choose File" under "Local File"
4. Select an EDF file from your computer
5. The viewer will automatically parse and display the file

## Example 2: Loading Files from Google Cloud Storage

### Step 1: Set up GCS Authentication

For local development:
```bash
# Option A: Use a service account
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"

# Option B: Use your user credentials
gcloud auth application-default login
```

### Step 2: Start the Server
```bash
npm start
```

### Step 3: Load Files
1. Enter your bucket name (e.g., "my-eeg-recordings")
2. (Optional) Enter a prefix to filter files (e.g., "patient-001/")
3. Click "Load Files"
4. Click on any file in the list to view it

## Example 3: Navigating Through a Long Recording

Once a file is loaded:

1. **View the first 10 seconds**: Default view
2. **Zoom in for detail**: Reduce time window to 5s
3. **See more context**: Increase time window to 30s
4. **Jump to middle of recording**: Move scroll position to 50%
5. **Adjust signal amplitude**: Change amplitude scale to 2x for small signals, 0.5x for large signals

## Example 4: Analyzing Specific Channels

The viewer displays all channels simultaneously. To focus on specific channels:

1. Note the channel labels on the left (e.g., "Fp1", "C3", "O1")
2. Each channel has a unique color
3. The baseline (center line) for each channel is shown in grey
4. Physical units are displayed with each label (e.g., "μV")

## Example 5: Working with Multiple Files

To compare multiple recordings:

1. Open the viewer in multiple browser tabs
2. Load a different file in each tab
3. Synchronize the time windows and amplitude scales
4. Position tabs side-by-side for comparison

## Example 6: Deploying to Cloud Run with GCS Access

### Deploy the Application
```bash
gcloud run deploy eeg-cloud-viewer \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```

### Grant Access to Your Bucket
```bash
# Get the service account
SERVICE_ACCOUNT=$(gcloud run services describe eeg-cloud-viewer \
  --region us-central1 \
  --format='value(spec.template.spec.serviceAccountName)')

# Grant access to your bucket
gsutil iam ch serviceAccount:${SERVICE_ACCOUNT}:objectViewer gs://your-eeg-bucket
```

### Use the Web Application
```bash
# Get the URL
gcloud run services describe eeg-cloud-viewer \
  --region us-central1 \
  --format='value(status.url)'

# Open in browser
open $(gcloud run services describe eeg-cloud-viewer \
  --region us-central1 \
  --format='value(status.url)')
```

## Example 7: Organizing EEG Files in GCS

Recommended bucket structure:

```
gs://my-eeg-recordings/
├── patient-001/
│   ├── session-001/
│   │   ├── recording.edf
│   │   └── notes.txt
│   └── session-002/
│       └── recording.edf
├── patient-002/
│   └── session-001/
│       └── recording.edf
└── templates/
    └── montage-standard.json
```

Then use the prefix field to filter:
- "patient-001/" - All files for patient 001
- "patient-001/session-001/" - Specific session
- "" (empty) - All files in bucket

## Example 8: Troubleshooting Common Issues

### File Won't Load from GCS
```bash
# Check if file exists
gsutil ls gs://your-bucket/path/to/file.edf

# Check permissions
gsutil iam get gs://your-bucket

# Verify service account has access
gcloud projects get-iam-policy YOUR_PROJECT_ID
```

### File Loads but Shows No Signals
- Check that the file is a valid EDF/EDF+ file
- Verify the file isn't corrupted
- Look at the file info to see if channels were detected

### Performance is Slow
- Reduce the time window (shorter = faster rendering)
- Use a more powerful device
- Check network speed for GCS files
- Consider using local files for very large recordings

## Example 9: Sample API Usage

The backend exposes REST APIs you can use programmatically:

### List Files
```bash
curl http://localhost:8080/api/files/my-bucket?prefix=patient-001/
```

Response:
```json
{
  "files": [
    {
      "name": "patient-001/session-001/recording.edf",
      "size": 10485760,
      "updated": "2024-01-15T10:30:00.000Z",
      "bucket": "my-bucket"
    }
  ]
}
```

### Get Download URL
```bash
curl http://localhost:8080/api/download/my-bucket/patient-001/recording.edf
```

Response:
```json
{
  "url": "https://storage.googleapis.com/my-bucket/patient-001/recording.edf?X-Goog-Algorithm=..."
}
```

### Health Check
```bash
curl http://localhost:8080/health
```

Response:
```json
{
  "status": "healthy",
  "gcsConfigured": true,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Example 10: Embedding in an iframe

You can embed the viewer in another web application:

```html
<iframe
  src="https://your-deployment.run.app"
  width="100%"
  height="800px"
  frameborder="0">
</iframe>
```

## Tips and Best Practices

1. **Performance**: For best performance, use Chrome or Edge browsers
2. **File Size**: Files up to 1GB work well; larger files may be slow
3. **Sampling Rate**: Higher sampling rates require more processing power
4. **Organization**: Use consistent naming and folder structure in GCS
5. **Security**: Use private buckets and grant access via IAM roles
6. **Sharing**: Share the Cloud Run URL with team members for collaboration
7. **Mobile**: The viewer works on mobile but desktop is recommended for detailed analysis
8. **Export**: Take screenshots for reports and presentations
9. **Documentation**: Keep notes in the same GCS bucket as your recordings
10. **Backups**: Always maintain backups of original EDF files
