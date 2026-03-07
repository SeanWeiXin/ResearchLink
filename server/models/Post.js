const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    author: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    authorName: { type: String, required: true },
    content: { type: String, required: true },
    parentComment: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Comment' 
    },
    likes: { type: Number, default: 0 },
    replies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }]
}, {
    timestamps: true
});

const postSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    author: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    authorName: { type: String, required: true },
    category: { 
        type: String, 
        enum: ['blog', 'user', 'question', 'share'], 
        default: 'user' 
    },
    tags: [{ type: String }],
    views: { type: Number, default: 0 },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [commentSchema],
    charts: [{
        chartId: { type: String },
        chartType: { type: String },
        title: { type: String },
        config: { type: Object }
    }],
    isPinned: { type: Boolean, default: false },
    pinnedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    pinnedAt: { type: Date }
}, {
    timestamps: true
});

// 索引优化
postSchema.index({ category: 1, createdAt: -1 });
postSchema.index({ tags: 1 });
postSchema.index({ title: 'text', content: 'text' });

module.exports = mongoose.model('Post', postSchema);
