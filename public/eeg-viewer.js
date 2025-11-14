/**
 * EEG Viewer - Renders EEG signals on canvas
 */

class EEGViewer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.edfData = null;
        this.amplitudeScale = 1.0;
        this.timeWindow = 10; // seconds
        this.scrollPosition = 0; // 0-100%

        this.setupCanvas();
    }

    setupCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();

        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;

        this.ctx.scale(dpr, dpr);
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
    }

    setData(edfData) {
        this.edfData = edfData;
        this.render();
    }

    setAmplitudeScale(scale) {
        this.amplitudeScale = scale;
        this.render();
    }

    setTimeWindow(seconds) {
        this.timeWindow = seconds;
        this.render();
    }

    setScrollPosition(percent) {
        this.scrollPosition = percent;
        this.render();
    }

    render() {
        if (!this.edfData) return;

        const rect = this.canvas.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        // Clear canvas
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, width, height);

        const signals = this.edfData.signals;
        if (signals.length === 0) return;

        // Calculate time range to display
        const duration = this.edfData.header.numDataRecords * this.edfData.header.durationDataRecord;
        const startTime = (this.scrollPosition / 100) * Math.max(0, duration - this.timeWindow);
        const endTime = Math.min(startTime + this.timeWindow, duration);

        // Draw grid
        this.drawGrid(width, height, startTime, endTime);

        // Calculate channel height
        const channelHeight = height / signals.length;

        // Draw each signal
        signals.forEach((signal, index) => {
            const y = channelHeight * (index + 0.5);
            this.drawSignal(signal, y, channelHeight, width, startTime, endTime, index);
        });

        // Draw labels
        this.drawLabels(signals, channelHeight);
    }

    drawGrid(width, height, startTime, endTime) {
        this.ctx.strokeStyle = '#1a1a1a';
        this.ctx.lineWidth = 1;

        // Vertical grid lines (time)
        const numVerticalLines = 10;
        for (let i = 0; i <= numVerticalLines; i++) {
            const x = (i / numVerticalLines) * width;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();

            // Time labels
            const time = startTime + (endTime - startTime) * (i / numVerticalLines);
            this.ctx.fillStyle = '#666666';
            this.ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            this.ctx.fillText(time.toFixed(1) + 's', x + 2, height - 5);
        }

        // Horizontal grid lines (channels)
        const numChannels = this.edfData.signals.length;
        for (let i = 0; i <= numChannels; i++) {
            const y = (i / numChannels) * height;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }
    }

    drawSignal(signal, centerY, channelHeight, width, startTime, endTime, index) {
        const samplingRate = signal.numSamplesPerRecord / this.edfData.header.durationDataRecord;
        const startSample = Math.floor(startTime * samplingRate);
        const endSample = Math.min(Math.ceil(endTime * samplingRate), signal.samples.length);

        if (startSample >= endSample) return;

        // Calculate scale
        const range = signal.physicalMaximum - signal.physicalMinimum;
        const scale = (channelHeight * 0.4) / range * this.amplitudeScale;

        // Draw signal line
        this.ctx.strokeStyle = this.getChannelColor(index);
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();

        let firstPoint = true;
        for (let i = startSample; i < endSample; i++) {
            const sample = signal.samples[i];
            const x = ((i - startSample) / (endSample - startSample)) * width;
            const y = centerY - (sample - (signal.physicalMaximum + signal.physicalMinimum) / 2) * scale;

            if (firstPoint) {
                this.ctx.moveTo(x, y);
                firstPoint = false;
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.stroke();

        // Draw baseline
        this.ctx.strokeStyle = '#222222';
        this.ctx.lineWidth = 0.5;
        this.ctx.beginPath();
        this.ctx.moveTo(0, centerY);
        this.ctx.lineTo(width, centerY);
        this.ctx.stroke();
    }

    drawLabels(signals, channelHeight) {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

        signals.forEach((signal, index) => {
            const y = channelHeight * index + 15;
            const label = signal.label || `Channel ${index + 1}`;
            const unit = signal.physicalDimension || '';

            this.ctx.fillText(`${label} (${unit})`, 5, y);
        });
    }

    getChannelColor(index) {
        const colors = [
            '#ffffff', '#dddddd', '#bbbbbb', '#999999',
            '#cccccc', '#aaaaaa', '#888888', '#e5e5e5'
        ];
        return colors[index % colors.length];
    }

    clear() {
        const rect = this.canvas.getBoundingClientRect();
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, rect.width, rect.height);
    }
}
