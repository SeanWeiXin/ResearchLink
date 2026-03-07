const mongoose = require('mongoose');

const uploadSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    path: { type: String, required: true },
    size: { type: Number, required: true },
    mimeType: { type: String, required: true },
    status: { 
        type: String, 
        enum: ['uploaded', 'processing', 'processed', 'error'], 
        default: 'uploaded' 
    },
    metadata: {
        rowCount: Number,
        columnCount: Number,
        columns: [{
            name: String,
            type: String,
            detectedType: String // 'date', 'number', 'string', 'time_series'
        }],
        isTimeSeries: { type: Boolean, default: false },
        timeSeriesFormat: String,
        frequency: String // 'daily', 'weekly', 'monthly', 'yearly'
    },
    processingConfig: {
        dateFormat: String,
        timeColumn: String,
        valueColumns: [String],
        transformations: [String],
        aggregation: String
    },
    charts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Chart' }],
    permissions: {
        isPublic: { type: Boolean, default: false },
        allowedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
    }
}, {
    timestamps: true
});

uploadSchema.index({ user: 1, createdAt: -1 });
uploadSchema.index({ status: 1 });

module.exports = mongoose.model('Upload', uploadSchema);
