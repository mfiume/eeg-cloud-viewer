# Quick Start Guide - Loading EEG Files from Google Cloud Storage

This guide will help you get up and running with the EEG Cloud Viewer using a sample file stored in Google Cloud Storage.

## Prerequisites

- Node.js 18+ installed
- Google Cloud SDK (`gcloud`) installed and authenticated
- Access to a Google Cloud Platform project

## Step 1: Start the Local Viewer

```bash
cd ~/Development/eeg-cloud-viewer
npm install
npm start
```

The viewer will start on http://localhost:8080

## Step 2: Load Sample File from GCS

We've uploaded a sample EEG file to demonstrate the viewer. Here's how to access it:

### Using the Web Interface

1. Open http://localhost:8080 in your browser
2. In the "Google Cloud Storage" section:
   - **Bucket name**: `eeg-viewer-demo-samples`
   - **Prefix**: `samples/`
3. Click "Load Files"
4. Click on "sleep_sample.edf" to view it

### What You'll See

The sample file is a polysomnographic sleep recording from PhysioNet with:
- **Size**: ~46 MB
- **Format**: EDF (European Data Format)
- **Type**: Multi-channel EEG recording
- **Duration**: Full night sleep study

## Step 3: Interact with the Viewer

Once the file loads, you can:

- **Adjust Amplitude Scale**: Change the vertical scale of signals (0.1x to 5x)
- **Set Time Window**: View 1-30 seconds of data at once
- **Scroll Through Recording**: Navigate using the scroll position slider
- **View Channel Info**: See all channel labels and physical units

## Uploading Your Own EEG Files

### Create Your Own Bucket

```bash
# Create a bucket (choose a unique name)
gcloud storage buckets create gs://my-eeg-files --location=us-central1

# Upload your EDF file
gcloud storage cp /path/to/your/file.edf gs://my-eeg-files/
```

### Load in Viewer

1. Enter bucket name: `my-eeg-files`
2. Click "Load Files"
3. Select your file from the list

## Authentication

The local server uses your default Google Cloud credentials. Make sure you're authenticated:

```bash
# Check current authentication
gcloud auth application-default print-access-token

# If not authenticated, run:
gcloud auth application-default login
```

## Sample Data Source

The demo file (`sleep_sample.edf`) is from the [PhysioNet Sleep-EDF Database](https://physionet.org/content/sleep-edfx/), a public dataset for sleep research.

## Troubleshooting

### "GCS not configured" Error

Make sure you're authenticated:
```bash
gcloud auth application-default login
```

### "Access Denied" Error

Grant yourself access to the bucket:
```bash
gsutil iam ch user:YOUR_EMAIL:objectViewer gs://BUCKET_NAME
```

### File Won't Load

Check that the file exists:
```bash
gcloud storage ls gs://BUCKET_NAME/path/to/file.edf
```

## Next Steps

- Try loading your own EEG files
- Adjust viewer controls to examine specific signals
- Deploy to Cloud Run for team access (see DEPLOYMENT.md)
- Explore the API endpoints for programmatic access

## Demo Bucket Details

- **Bucket**: `eeg-viewer-demo-samples`
- **Region**: `us-central1`
- **Project**: `omics-ai-mcp`
- **Sample File**: `samples/sleep_sample.edf` (46 MB)

Access to this demo bucket is public for testing purposes.
