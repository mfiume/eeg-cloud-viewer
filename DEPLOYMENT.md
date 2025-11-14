# Deployment Guide

## Deploy to Google Cloud Run

### Quick Deploy

```bash
# Make sure you're in the project directory
cd ~/Development/eeg-cloud-viewer

# Deploy to Cloud Run (will automatically build using buildpacks)
gcloud run deploy eeg-cloud-viewer \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080
```

### With Custom Configuration

```bash
# Deploy with more control
gcloud run deploy eeg-cloud-viewer \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10 \
  --set-env-vars NODE_ENV=production
```

### Grant GCS Access

If you need the Cloud Run service to access specific GCS buckets:

```bash
# Get the service account email
SERVICE_ACCOUNT=$(gcloud run services describe eeg-cloud-viewer \
  --region us-central1 \
  --format='value(spec.template.spec.serviceAccountName)')

# Grant Storage Object Viewer role on a specific bucket
gsutil iam ch serviceAccount:${SERVICE_ACCOUNT}:objectViewer gs://YOUR_BUCKET_NAME
```

### Custom Domain

```bash
# Map a custom domain
gcloud run domain-mappings create \
  --service eeg-cloud-viewer \
  --domain eeg.yourdomain.com \
  --region us-central1
```

## Local Development

### Run Locally

```bash
# Install dependencies
npm install

# Start the server (defaults to port 8080)
npm start

# Or specify a custom port
PORT=3000 npm start
```

### With Google Cloud Credentials

For local development with GCS access:

```bash
# Set credentials
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account-key.json"

# Start the server
npm start
```

### Using gcloud auth

Alternatively, use your user credentials:

```bash
# Authenticate
gcloud auth application-default login

# Start the server
npm start
```

## Environment Variables

- `PORT` - Server port (default: 8080)
- `NODE_ENV` - Environment (development/production)
- `GOOGLE_APPLICATION_CREDENTIALS` - Path to service account JSON (optional)

## Testing the Deployment

```bash
# Get the service URL
SERVICE_URL=$(gcloud run services describe eeg-cloud-viewer \
  --region us-central1 \
  --format='value(status.url)')

# Test health endpoint
curl ${SERVICE_URL}/health

# Open in browser
open ${SERVICE_URL}
```

## Monitoring

View logs:
```bash
gcloud run services logs read eeg-cloud-viewer --region us-central1
```

View service details:
```bash
gcloud run services describe eeg-cloud-viewer --region us-central1
```

## Updating the Deployment

Simply redeploy with the same command:
```bash
gcloud run deploy eeg-cloud-viewer --source . --region us-central1
```

Cloud Run will create a new revision automatically.
