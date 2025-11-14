# EEG Cloud Viewer

A browser-based EEG/EDF file viewer with Google Cloud Storage integration. View and analyze EEG signals directly in your web browser.

![EEG Cloud Viewer](https://img.shields.io/badge/EEG-Viewer-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- 🧠 **Browser-based EEG visualization** - No desktop software required
- ☁️ **Google Cloud Storage integration** - Load EDF files directly from GCS buckets
- 📁 **Local file support** - Upload and view EDF files from your computer
- 📊 **Interactive controls** - Adjust amplitude, time window, and scroll through recordings
- 🎨 **Multi-channel display** - View all EEG channels simultaneously with color coding
- 📱 **Responsive design** - Works on desktop and mobile devices

## Quick Start

### Prerequisites

- Node.js 18 or higher
- (Optional) Google Cloud Platform account for GCS integration

### Installation

```bash
# Clone the repository
git clone https://github.com/mfiume/eeg-cloud-viewer.git
cd eeg-cloud-viewer

# Install dependencies
npm install

# Start the server
npm start
```

Open your browser to `http://localhost:8080`

## Usage

### Viewing Local EDF Files

1. Click "Choose File" under "Local File"
2. Select an EDF file from your computer
3. The file will be parsed and displayed automatically

### Viewing Files from Google Cloud Storage

1. Enter your GCS bucket name
2. (Optional) Enter a folder prefix to filter files
3. Click "Load Files"
4. Click on any file in the list to view it

**Note:** GCS integration requires proper authentication. Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to your service account key file.

### Viewer Controls

- **Amplitude Scale**: Adjust the vertical scale of the signals (0.1x to 5x)
- **Time Window**: Set the duration of visible data (1-30 seconds)
- **Scroll Position**: Navigate through the recording (0-100%)

## Google Cloud Storage Setup

To use GCS integration:

1. Create a service account in Google Cloud Console
2. Grant the service account `Storage Object Viewer` permission on your buckets
3. Download the service account key JSON file
4. Set the environment variable:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/keyfile.json"
npm start
```

## Deployment

### Deploy to Google Cloud Run

```bash
gcloud run deploy eeg-cloud-viewer \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080
```

The service account associated with Cloud Run will automatically have access to GCS buckets in the same project.

## EDF Format Support

Currently supports:
- EDF (European Data Format)
- Continuous EDF+ files

Does not currently support:
- Discontinuous EDF+ files
- BDF (BioSemi Data Format) - planned for future release

## Architecture

- **Frontend**: Vanilla JavaScript with HTML5 Canvas for signal rendering
- **Backend**: Node.js + Express for API and GCS integration
- **Parser**: Custom EDF parser implementing the EDF specification

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Author

Marc Fiume

## Acknowledgments

- EDF specification: https://www.edfplus.info/specs/edf.html
- Inspired by various open-source EEG tools (EEGLAB, MNE-Python, EDFbrowser)
