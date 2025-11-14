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
        this.autoScale = true; // Auto-scale channels by default

        // Panning state
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartScrollPosition = 0;

        this.setupCanvas();
        this.setupPanning();
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

    setupPanning() {
        this.canvas.addEventListener('mousedown', (e) => {
            if (!this.edfData) return;
            this.isDragging = true;
            this.dragStartX = e.clientX;
            this.dragStartScrollPosition = this.scrollPosition;
            this.canvas.style.cursor = 'grabbing';
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (!this.isDragging || !this.edfData) return;

            const rect = this.canvas.getBoundingClientRect();
            const deltaX = e.clientX - this.dragStartX;
            // Reduce sensitivity by dividing by 5
            const deltaPercent = -(deltaX / rect.width) * 100 / 5;

            const newPosition = Math.max(0, Math.min(100, this.dragStartScrollPosition + deltaPercent));
            this.setScrollPosition(newPosition);

            // Update timeline slider if it exists
            const timelineSlider = document.getElementById('timelineSlider');
            if (timelineSlider) {
                timelineSlider.value = newPosition;
                // Update the timeline display
                if (window.updateTimelinePosition) {
                    window.updateTimelinePosition(newPosition);
                }
            }
        });

        this.canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.canvas.style.cursor = 'grab';
        });

        this.canvas.addEventListener('mouseleave', () => {
            if (this.isDragging) {
                this.isDragging = false;
                this.canvas.style.cursor = 'grab';
            }
        });

        // Update cursor on hover
        this.canvas.addEventListener('mouseenter', () => {
            if (this.edfData && !this.isDragging) {
                this.canvas.style.cursor = 'grab';
            }
        });
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

    setAutoScale(enabled) {
        this.autoScale = enabled;
        this.render();
    }

    render() {
        if (!this.edfData) return;

        const rect = this.canvas.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        // Clear canvas
        this.ctx.fillStyle = '#ffffff';
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
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.04)';
        this.ctx.lineWidth = 0.5;

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
            this.ctx.fillStyle = '#86868b';
            this.ctx.font = '500 11px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
            this.ctx.fillText(time.toFixed(1) + 's', x + 2, height - 8);
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
        let range, offset;
        if (this.autoScale) {
            // Auto-scale: find min/max in visible window
            let min = Infinity, max = -Infinity;
            for (let i = startSample; i < endSample; i++) {
                const val = signal.samples[i];
                if (val < min) min = val;
                if (val > max) max = val;
            }
            range = max - min;
            offset = (max + min) / 2;
            // Use more vertical space for auto-scale
            const scale = range > 0 ? (channelHeight * 0.8) / range * this.amplitudeScale : 1;
            this.drawSignalLine(signal, centerY, width, startSample, endSample, offset, scale, index);
        } else {
            // Original scaling based on physical min/max
            range = signal.physicalMaximum - signal.physicalMinimum;
            offset = (signal.physicalMaximum + signal.physicalMinimum) / 2;
            const scale = (channelHeight * 0.4) / range * this.amplitudeScale;
            this.drawSignalLine(signal, centerY, width, startSample, endSample, offset, scale, index);
        }
    }

    drawSignalLine(signal, centerY, width, startSample, endSample, offset, scale, index) {
        // Draw signal line
        this.ctx.strokeStyle = this.getChannelColor(index);
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();

        let firstPoint = true;
        for (let i = startSample; i < endSample; i++) {
            const sample = signal.samples[i];
            const x = ((i - startSample) / (endSample - startSample)) * width;
            const y = centerY - (sample - offset) * scale;

            if (firstPoint) {
                this.ctx.moveTo(x, y);
                firstPoint = false;
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.stroke();

        // Draw baseline
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
        this.ctx.lineWidth = 0.5;
        this.ctx.beginPath();
        this.ctx.moveTo(0, centerY);
        this.ctx.lineTo(width, centerY);
        this.ctx.stroke();
    }

    drawLabels(signals, channelHeight) {
        this.ctx.fillStyle = '#1d1d1f';
        this.ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';

        signals.forEach((signal, index) => {
            const y = channelHeight * index + 15;
            const label = signal.label || `Channel ${index + 1}`;
            const unit = signal.physicalDimension || '';

            this.ctx.fillText(`${label} (${unit})`, 5, y);
        });
    }

    getChannelColor(index) {
        const colors = [
            '#3b82f6', // blue
            '#ef4444', // red
            '#10b981', // green
            '#f59e0b', // amber
            '#8b5cf6', // purple
            '#ec4899', // pink
            '#14b8a6', // teal
            '#f97316', // orange
            '#6366f1', // indigo
            '#84cc16', // lime
        ];
        return colors[index % colors.length];
    }

    clear() {
        const rect = this.canvas.getBoundingClientRect();
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, rect.width, rect.height);
    }
}
