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
            fileItem.onclick = () => {
                loadGCSFile(file.bucket, file.name);
                closeFileList();
            };

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

        // Show file list sidebar
        document.getElementById('fileListSidebar').style.display = 'block';
    } catch (error) {
        showError(fileList, error.message);
    }
}

// Load file from GCS
async function loadGCSFile(bucketName, fileName) {
    try {
        const fileInfo = document.getElementById('fileInfo');
        fileInfo.innerHTML = '<p>Loading file from GCS...</p>';

        // Download file directly through proxy
        const downloadUrl = `/api/download/${bucketName}/${fileName}`;
        const response = await fetch(downloadUrl);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to download file');
        }

        // Get array buffer
        const arrayBuffer = await response.arrayBuffer();

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

        // Show inline controls
        document.getElementById('viewerControlsInline').style.display = 'flex';

        // Show timeline scrubber
        document.getElementById('timelineScrubber').style.display = 'block';

        // Initialize timeline
        initializeTimeline();

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
    const autoScale = document.getElementById('autoScale').checked;

    document.getElementById('amplitudeValue').textContent = amplitudeScale.toFixed(1) + 'x';
    document.getElementById('timeWindowValue').textContent = timeWindow + 's';

    viewer.setAmplitudeScale(amplitudeScale);
    viewer.setTimeWindow(timeWindow);
    viewer.setAutoScale(autoScale);
}

// Initialize timeline
function initializeTimeline() {
    const duration = parser.getDuration();
    document.getElementById('totalDuration').textContent = formatTime(duration);
    document.getElementById('currentTime').textContent = '0:00';
    document.getElementById('timelineSlider').value = 0;
    document.getElementById('timelineProgress').style.width = '0%';
}

// Update timeline position
function updateTimelinePosition(value) {
    if (!currentEDFData) return;

    const duration = parser.getDuration();
    const currentTime = (value / 100) * duration;

    document.getElementById('currentTime').textContent = formatTime(currentTime);
    document.getElementById('timelineProgress').style.width = value + '%';

    viewer.setScrollPosition(parseFloat(value));
}

// Format time as MM:SS
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

function closeFileList() {
    document.getElementById('fileListSidebar').style.display = 'none';
}

function toggleFileList() {
    const sidebar = document.getElementById('fileListSidebar');
    if (sidebar.style.display === 'none' || sidebar.style.display === '') {
        sidebar.style.display = 'block';
    } else {
        sidebar.style.display = 'none';
    }
}
