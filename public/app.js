/**
 * Main application logic
 */

let viewer;
let parser;
let currentEDFData = null;

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    viewer = new EEGViewer('eegCanvas');
    parser = new EDFParser();

    // Handle window resize
    window.addEventListener('resize', () => {
        viewer.setupCanvas();
        viewer.render();
    });
});

// Load files from GCS bucket
async function loadFiles() {
    const bucketName = document.getElementById('bucketName').value.trim();
    const prefix = document.getElementById('prefix').value.trim();
    const fileList = document.getElementById('fileList');

    if (!bucketName) {
        showError(fileList, 'Please enter a bucket name');
        return;
    }

    fileList.innerHTML = '<p>Loading files...</p>';

    try {
        const url = `/api/files/${bucketName}${prefix ? `?prefix=${encodeURIComponent(prefix)}` : ''}`;
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to load files');
        }

        if (data.files.length === 0) {
            fileList.innerHTML = '<p>No EDF files found</p>';
            return;
        }

        fileList.innerHTML = '';
        data.files.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.onclick = () => loadGCSFile(file.bucket, file.name);

            const fileName = document.createElement('span');
            fileName.className = 'file-name';
            fileName.textContent = file.name;

            const fileSize = document.createElement('span');
            fileSize.className = 'file-size';
            fileSize.textContent = formatFileSize(file.size);

            fileItem.appendChild(fileName);
            fileItem.appendChild(fileSize);
            fileList.appendChild(fileItem);
        });
    } catch (error) {
        showError(fileList, error.message);
    }
}

// Load file from GCS
async function loadGCSFile(bucketName, fileName) {
    try {
        const fileInfo = document.getElementById('fileInfo');
        fileInfo.innerHTML = '<p>Loading file from GCS...</p>';

        // Get signed URL
        const response = await fetch(`/api/download/${bucketName}/${fileName}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to get download URL');
        }

        // Download file
        const fileResponse = await fetch(data.url);
        const arrayBuffer = await fileResponse.arrayBuffer();

        await parseAndDisplayEDF(arrayBuffer, fileName);
    } catch (error) {
        const fileInfo = document.getElementById('fileInfo');
        showError(fileInfo, error.message);
    }
}

// Load local file
async function loadLocalFile() {
    const fileInput = document.getElementById('localFile');
    const file = fileInput.files[0];

    if (!file) return;

    try {
        const fileInfo = document.getElementById('fileInfo');
        fileInfo.innerHTML = '<p>Loading local file...</p>';

        const arrayBuffer = await file.arrayBuffer();
        await parseAndDisplayEDF(arrayBuffer, file.name);
    } catch (error) {
        const fileInfo = document.getElementById('fileInfo');
        showError(fileInfo, error.message);
    }
}

// Parse and display EDF file
async function parseAndDisplayEDF(arrayBuffer, fileName) {
    try {
        currentEDFData = await parser.parse(arrayBuffer);
        viewer.setData(currentEDFData);

        // Show controls
        document.getElementById('viewerControls').style.display = 'grid';

        // Display file info
        displayFileInfo(fileName);
    } catch (error) {
        throw new Error(`Failed to parse EDF file: ${error.message}`);
    }
}

// Display file information
function displayFileInfo(fileName) {
    const fileInfo = document.getElementById('fileInfo');
    const header = currentEDFData.header;
    const signals = currentEDFData.signals;

    const duration = header.numDataRecords * header.durationDataRecord;
    const samplingRates = signals.map((s, i) => parser.getSamplingRate(i));

    fileInfo.innerHTML = `
        <strong>File:</strong> ${fileName}<br>
        <strong>Patient ID:</strong> ${header.patientId || 'N/A'}<br>
        <strong>Recording ID:</strong> ${header.recordingId || 'N/A'}<br>
        <strong>Start Date:</strong> ${header.startDate} ${header.startTime}<br>
        <strong>Duration:</strong> ${duration.toFixed(2)} seconds<br>
        <strong>Number of Channels:</strong> ${signals.length}<br>
        <strong>Channels:</strong> ${signals.map(s => s.label).join(', ')}<br>
        <strong>Sampling Rates:</strong> ${samplingRates.map(r => r.toFixed(1) + ' Hz').join(', ')}
    `;
}

// Update viewer controls
function updateViewer() {
    if (!currentEDFData) return;

    const amplitudeScale = parseFloat(document.getElementById('amplitudeScale').value);
    const timeWindow = parseInt(document.getElementById('timeWindow').value);
    const scrollPosition = parseInt(document.getElementById('scrollPosition').value);

    document.getElementById('amplitudeValue').textContent = amplitudeScale.toFixed(1) + 'x';
    document.getElementById('timeWindowValue').textContent = timeWindow + 's';
    document.getElementById('scrollPositionValue').textContent = scrollPosition + '%';

    viewer.setAmplitudeScale(amplitudeScale);
    viewer.setTimeWindow(timeWindow);
    viewer.setScrollPosition(scrollPosition);
}

// Utility functions
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function showError(element, message) {
    element.innerHTML = `<div class="error">Error: ${message}</div>`;
}
