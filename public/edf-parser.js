/**
 * Simple EDF (European Data Format) Parser
 * Supports basic EDF file parsing for EEG data visualization
 */

class EDFParser {
    constructor() {
        this.header = null;
        this.signals = [];
    }

    async parse(arrayBuffer) {
        const dataView = new DataView(arrayBuffer);
        let offset = 0;

        // Parse header (256 bytes)
        this.header = {
            version: this.readASCII(dataView, offset, 8).trim(),
            patientId: this.readASCII(dataView, offset + 8, 80).trim(),
            recordingId: this.readASCII(dataView, offset + 88, 80).trim(),
            startDate: this.readASCII(dataView, offset + 168, 8).trim(),
            startTime: this.readASCII(dataView, offset + 176, 8).trim(),
            headerBytes: parseInt(this.readASCII(dataView, offset + 184, 8)),
            reserved: this.readASCII(dataView, offset + 192, 44).trim(),
            numDataRecords: parseInt(this.readASCII(dataView, offset + 236, 8)),
            durationDataRecord: parseFloat(this.readASCII(dataView, offset + 244, 8)),
            numSignals: parseInt(this.readASCII(dataView, offset + 252, 4))
        };

        offset = 256;

        // Parse signal specifications
        const ns = this.header.numSignals;
        const signalInfo = {
            labels: [],
            transducerTypes: [],
            physicalDimensions: [],
            physicalMinimums: [],
            physicalMaximums: [],
            digitalMinimums: [],
            digitalMaximums: [],
            prefiltering: [],
            numSamplesPerRecord: [],
            reserved: []
        };

        // Read each field for all signals
        signalInfo.labels = this.readSignalField(dataView, offset, ns, 16);
        offset += ns * 16;
        signalInfo.transducerTypes = this.readSignalField(dataView, offset, ns, 80);
        offset += ns * 80;
        signalInfo.physicalDimensions = this.readSignalField(dataView, offset, ns, 8);
        offset += ns * 8;
        signalInfo.physicalMinimums = this.readSignalField(dataView, offset, ns, 8).map(parseFloat);
        offset += ns * 8;
        signalInfo.physicalMaximums = this.readSignalField(dataView, offset, ns, 8).map(parseFloat);
        offset += ns * 8;
        signalInfo.digitalMinimums = this.readSignalField(dataView, offset, ns, 8).map(parseInt);
        offset += ns * 8;
        signalInfo.digitalMaximums = this.readSignalField(dataView, offset, ns, 8).map(parseInt);
        offset += ns * 8;
        signalInfo.prefiltering = this.readSignalField(dataView, offset, ns, 80);
        offset += ns * 80;
        signalInfo.numSamplesPerRecord = this.readSignalField(dataView, offset, ns, 8).map(parseInt);
        offset += ns * 8;
        signalInfo.reserved = this.readSignalField(dataView, offset, ns, 32);

        // Initialize signals
        this.signals = [];
        for (let i = 0; i < ns; i++) {
            this.signals.push({
                label: signalInfo.labels[i].trim(),
                transducerType: signalInfo.transducerTypes[i].trim(),
                physicalDimension: signalInfo.physicalDimensions[i].trim(),
                physicalMinimum: signalInfo.physicalMinimums[i],
                physicalMaximum: signalInfo.physicalMaximums[i],
                digitalMinimum: signalInfo.digitalMinimums[i],
                digitalMaximum: signalInfo.digitalMaximums[i],
                prefiltering: signalInfo.prefiltering[i].trim(),
                numSamplesPerRecord: signalInfo.numSamplesPerRecord[i],
                samples: []
            });
        }

        // Parse data records
        offset = this.header.headerBytes;
        for (let record = 0; record < this.header.numDataRecords; record++) {
            for (let sig = 0; sig < ns; sig++) {
                const numSamples = this.signals[sig].numSamplesPerRecord;
                for (let sample = 0; sample < numSamples; sample++) {
                    const digitalValue = dataView.getInt16(offset, true);
                    offset += 2;

                    // Convert digital to physical value
                    const signal = this.signals[sig];
                    const physicalValue = this.digitalToPhysical(
                        digitalValue,
                        signal.digitalMinimum,
                        signal.digitalMaximum,
                        signal.physicalMinimum,
                        signal.physicalMaximum
                    );

                    signal.samples.push(physicalValue);
                }
            }
        }

        return {
            header: this.header,
            signals: this.signals
        };
    }

    readASCII(dataView, offset, length) {
        let str = '';
        for (let i = 0; i < length; i++) {
            str += String.fromCharCode(dataView.getUint8(offset + i));
        }
        return str;
    }

    readSignalField(dataView, offset, numSignals, fieldLength) {
        const values = [];
        for (let i = 0; i < numSignals; i++) {
            values.push(this.readASCII(dataView, offset + i * fieldLength, fieldLength));
        }
        return values;
    }

    digitalToPhysical(digital, digMin, digMax, physMin, physMax) {
        const scale = (physMax - physMin) / (digMax - digMin);
        return (digital - digMin) * scale + physMin;
    }

    getSamplingRate(signalIndex) {
        if (signalIndex >= this.signals.length) return 0;
        return this.signals[signalIndex].numSamplesPerRecord / this.header.durationDataRecord;
    }

    getDuration() {
        return this.header.numDataRecords * this.header.durationDataRecord;
    }
}
