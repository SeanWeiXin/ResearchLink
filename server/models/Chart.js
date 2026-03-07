const mongoose = require('mongoose');

const chartSchema = new mongoose.Schema({
    upload: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Upload', 
        required: true 
    },
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    chartType: { 
        type: String, 
        enum: ['line', 'bar', 'column', 'area', 'scatter', 'pie', 'heatmap', 'candlestick'], 
        required: true 
    },
    config: {
        xAxis: {
            column: String,
            type: String,
            label: String
        },
        yAxis: [{
            column: String,
            type: String,
            label: String
        }],
        series: [{
            name: String,
            data: Array,
            type: String
        }],
        options: {
            title: String,
            legend: Object,
            tooltip: Object,
            colors: [String],
            grid: Object
        }
    },
    echartsOption: { type: Object },
    thumbnail: { type: String },
    publishedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
    isPublic: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
    downloads: { type: Number, default: 0 }
}, {
    timestamps: true
});

chartSchema.index({ user: 1, createdAt: -1 });
chartSchema.index({ upload: 1 });
chartSchema.index({ isPublic: 1, createdAt: -1 });

module.exports = mongoose.model('Chart', chartSchema);
