const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: true, 
        unique: true, 
        trim: true,
        minlength: 3,
        maxlength: 30
    },
    email: { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true,
        match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    password: { 
        type: String, 
        required: true,
        minlength: 6
    },
    avatar: { type: String, default: '' },
    bio: { type: String, default: '', maxlength: 500 },
    role: { 
        type: String, 
        enum: ['user', 'admin', 'uploader'], 
        default: 'user' 
    },
    permissions: {
        canUploadExcel: { type: Boolean, default: false },
        canCreateCharts: { type: Boolean, default: false },
        canPublishCharts: { type: Boolean, default: false }
    },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
    uploads: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Upload' }]
}, {
    timestamps: true
});

// 注意：unique: true 已经创建了索引，不需要再次声明
// userSchema.index({ username: 1 });
// userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);
