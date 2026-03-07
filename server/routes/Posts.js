const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const { authMiddleware } = require('../middleware/auth');

// 获取所有帖子（支持分页、筛选、搜索）
router.get('/', async (req, res) => {
    try {
        const { 
            category, 
            tag, 
            search, 
            page = 1, 
            limit = 10,
            sortBy = 'isPinned',
            order = 'desc'
        } = req.query;
        
        let query = {};
        
        // 分类筛选
        if (category && category !== 'all') {
            query.category = category;
        }
        
        // 标签筛选
        if (tag) {
            query.tags = tag;
        }
        
        // 搜索
        if (search) {
            query.$text = { $search: search };
        }
        
        // 排序
        const sortOptions = {};
        if (sortBy === 'isPinned') {
            sortOptions.isPinned = -1;
            sortOptions.createdAt = -1;
        } else if (sortBy === 'likes') {
            sortOptions.likes = order === 'asc' ? 1 : -1;
        } else if (sortBy === 'favorites') {
            sortOptions.favorites = order === 'asc' ? 1 : -1;
        } else {
            sortOptions[sortBy] = order === 'asc' ? 1 : -1;
        }
        
        // 分页
        const skip = (page - 1) * limit;
        
        const posts = await Post.find(query)
            .populate('author', 'username avatar')
            .sort(sortOptions)
            .limit(parseInt(limit))
            .skip(skip)
            .select('title content author category tags views likes favorites comments createdAt updatedAt isPinned');
        
        const total = await Post.countDocuments(query);
        
        res.json({
            posts,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalPosts: total,
                hasNext: page * limit < total,
                hasPrev: page > 1
            }
        });
    } catch (err) {
        console.error('获取帖子列表错误:', err);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 获取单个帖子详情
router.get('/:id', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate('author', 'username avatar bio role')
            .populate('comments.author', 'username avatar');
        
        if (!post) {
            return res.status(404).json({ message: '帖子不存在' });
        }
        
        // 浏览量 +1
        post.views += 1;
        await post.save();
        
        res.json(post);
    } catch (err) {
        console.error('获取帖子详情错误:', err);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 创建新帖子
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { title, content, category, tags } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({ message: '标题和内容不能为空' });
        }
        
        const post = new Post({
            title,
            content,
            author: req.user.userId,
            authorName: req.user.username,
            category: category || 'user',
            tags: tags || []
        });
        
        const newPost = await post.save();
        
        // 填充作者信息返回
        const populatedPost = await Post.findById(newPost._id)
            .populate('author', 'username avatar');
        
        res.status(201).json(populatedPost);
    } catch (err) {
        console.error('创建帖子错误:', err);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 更新帖子
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        
        if (!post) {
            return res.status(404).json({ message: '帖子不存在' });
        }
        
        // 检查是否是作者
        if (post.author.toString() !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: '无权限修改' });
        }
        
        const { title, content, category, tags } = req.body;
        
        if (title) post.title = title;
        if (content) post.content = content;
        if (category) post.category = category;
        if (tags) post.tags = tags;
        
        await post.save();
        
        const updatedPost = await Post.findById(post._id)
            .populate('author', 'username avatar');
        
        res.json(updatedPost);
    } catch (err) {
        console.error('更新帖子错误:', err);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 删除帖子（仅维护者可删除）
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        
        if (!post) {
            return res.status(404).json({ message: '帖子不存在' });
        }
        
        // 仅维护者（admin 角色）可以删除
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: '仅维护者有权限删除帖子' });
        }
        
        await Post.findByIdAndDelete(req.params.id);
        
        res.json({ message: '删除成功' });
    } catch (err) {
        console.error('删除帖子错误:', err);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 置顶/取消置顶帖子（仅维护者）
router.put('/:id/pin', authMiddleware, async (req, res) => {
    try {
        // 检查是否为维护者
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: '仅维护者可以置顶帖子' });
        }
        
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: '帖子不存在' });
        }
        
        const { isPinned } = req.body;
        post.isPinned = isPinned !== undefined ? isPinned : !post.isPinned;
        
        if (post.isPinned) {
            post.pinnedBy = req.user.userId;
            post.pinnedAt = new Date();
        } else {
            post.pinnedBy = undefined;
            post.pinnedAt = undefined;
        }
        
        await post.save();
        
        res.json({
            message: post.isPinned ? '置顶成功' : '取消置顶成功',
            isPinned: post.isPinned
        });
    } catch (err) {
        console.error('置顶操作错误:', err);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 添加评论
router.post('/:id/comments', authMiddleware, async (req, res) => {
    try {
        const { content, parentCommentId } = req.body;
        
        if (!content || content.trim() === '') {
            return res.status(400).json({ message: '评论内容不能为空' });
        }
        
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: '帖子不存在' });
        }
        
        const newComment = {
            author: req.user.userId,
            authorName: req.user.username,
            content: content.trim()
        };
        
        if (parentCommentId) {
            // 回复评论
            const parentComment = post.comments.id(parentCommentId);
            if (!parentComment) {
                return res.status(404).json({ message: '父评论不存在' });
            }
            
            newComment.parentComment = parentCommentId;
            post.comments.push(newComment);
            await post.save();
            
            // 获取完整的评论信息
            const updatedPost = await Post.findById(post._id)
                .populate('comments.author', 'username avatar');
            const addedComment = updatedPost.comments[updatedPost.comments.length - 1];
            
            res.status(201).json(addedComment);
        } else {
            // 直接评论
            post.comments.push(newComment);
            await post.save();
            
            // 获取完整的评论信息
            const updatedPost = await Post.findById(post._id)
                .populate('comments.author', 'username avatar');
            const addedComment = updatedPost.comments[updatedPost.comments.length - 1];
            
            res.status(201).json(addedComment);
        }
    } catch (err) {
        console.error('添加评论错误:', err);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 删除评论（仅维护者可删除）
router.delete('/:postId/comments/:commentId', authMiddleware, async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);
        if (!post) {
            return res.status(404).json({ message: '帖子不存在' });
        }
        
        const comment = post.comments.id(req.params.commentId);
        if (!comment) {
            return res.status(404).json({ message: '评论不存在' });
        }
        
        // 仅维护者可以删除评论
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: '仅维护者有权限删除评论' });
        }
        
        comment.remove();
        await post.save();
        
        res.json({ message: '删除成功' });
    } catch (err) {
        console.error('删除评论错误:', err);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 点赞/取消点赞
router.post('/:id/like', authMiddleware, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: '帖子不存在' });
        }
        
        const likeIndex = post.likes.indexOf(req.user.userId);
        
        if (likeIndex > -1) {
            // 取消点赞
            post.likes.splice(likeIndex, 1);
        } else {
            // 点赞
            post.likes.push(req.user.userId);
        }
        
        await post.save();
        
        res.json({ 
            likes: post.likes.length,
            isLiked: likeIndex === -1
        });
    } catch (err) {
        console.error('点赞操作错误:', err);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 收藏/取消收藏
router.post('/:id/favorite', authMiddleware, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: '帖子不存在' });
        }
        
        const favoriteIndex = post.favorites.indexOf(req.user.userId);
        
        if (favoriteIndex > -1) {
            // 取消收藏
            post.favorites.splice(favoriteIndex, 1);
        } else {
            // 收藏
            post.favorites.push(req.user.userId);
        }
        
        await post.save();
        
        res.json({ 
            favorites: post.favorites.length,
            isFavorited: favoriteIndex === -1
        });
    } catch (err) {
        console.error('收藏操作错误:', err);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 获取用户的收藏帖子
router.get('/user/:userId/favorites', async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;
        
        const posts = await Post.find({ favorites: req.params.userId })
            .populate('author', 'username avatar')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(skip);
        
        const total = await Post.countDocuments({ favorites: req.params.userId });
        
        res.json({
            posts,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalPosts: total
            }
        });
    } catch (err) {
        console.error('获取收藏列表错误:', err);
        res.status(500).json({ message: '服务器错误' });
    }
});

module.exports = router;
