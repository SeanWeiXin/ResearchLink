const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const Chart = require('../models/Chart');
const Upload = require('../models/Upload');
const Post = require('../models/Post');

// 创建图表
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { uploadId, title, description, chartType, config } = req.body;

        if (!uploadId || !title || !chartType) {
            return res.status(400).json({ message: '请填写完整信息' });
        }

        // 检查上传文件是否存在
        const upload = await Upload.findById(uploadId);
        if (!upload) {
            return res.status(404).json({ message: '上传文件不存在' });
        }

        // 检查权限
        if (upload.user.toString() !== req.user.userId) {
            return res.status(403).json({ message: '无权限使用该文件' });
        }

        const chart = new Chart({
            upload: uploadId,
            user: req.user.userId,
            title,
            description: description || '',
            chartType,
            config: config || {},
            echartsOption: req.body.echartsOption || {}
        });

        await chart.save();

        // 更新上传记录的图表列表
        upload.charts.push(chart._id);
        await upload.save();

        const populatedChart = await Chart.findById(chart._id)
            .populate('user', 'username avatar');

        res.status(201).json(populatedChart);
    } catch (err) {
        console.error('创建图表错误:', err);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 获取图表列表
router.get('/', async (req, res) => {
    try {
        const { userId, isPublic, page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        let query = {};
        if (userId) {
            query.user = userId;
        }
        if (isPublic !== undefined) {
            query.isPublic = isPublic === 'true';
        }

        const charts = await Chart.find(query)
            .populate('user', 'username avatar')
            .populate('upload', 'originalName')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(skip);

        const total = await Chart.countDocuments(query);

        res.json({
            charts,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalCharts: total
            }
        });
    } catch (err) {
        console.error('获取图表列表错误:', err);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 获取单个图表详情
router.get('/:id', async (req, res) => {
    try {
        const chart = await Chart.findById(req.params.id)
            .populate('user', 'username avatar bio')
            .populate('upload', 'originalName metadata processingConfig')
            .populate('publishedPosts', 'title category');

        if (!chart) {
            return res.status(404).json({ message: '图表不存在' });
        }

        // 检查权限
        const canAccess = chart.isPublic || chart.user._id.toString() === req.user.userId;
        if (!canAccess) {
            return res.status(403).json({ message: '无权限访问' });
        }

        // 增加浏览量
        chart.views += 1;
        await chart.save();

        res.json(chart);
    } catch (err) {
        console.error('获取图表详情错误:', err);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 更新图表
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const chart = await Chart.findById(req.params.id);

        if (!chart) {
            return res.status(404).json({ message: '图表不存在' });
        }

        if (chart.user.toString() !== req.user.userId) {
            return res.status(403).json({ message: '无权限修改' });
        }

        const { title, description, config, echartsOption } = req.body;

        if (title) chart.title = title;
        if (description !== undefined) chart.description = description;
        if (config) chart.config = config;
        if (echartsOption) chart.echartsOption = echartsOption;

        await chart.save();

        const updatedChart = await Chart.findById(chart._id)
            .populate('user', 'username avatar')
            .populate('upload', 'originalName');

        res.json(updatedChart);
    } catch (err) {
        console.error('更新图表错误:', err);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 删除图表
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const chart = await Chart.findById(req.params.id);

        if (!chart) {
            return res.status(404).json({ message: '图表不存在' });
        }

        if (chart.user.toString() !== req.user.userId) {
            return res.status(403).json({ message: '无权限删除' });
        }

        // 从上传记录中移除
        await Upload.findByIdAndUpdate(chart.upload, {
            $pull: { charts: chart._id }
        });

        // 从发布的帖子中移除引用
        if (chart.publishedPosts && chart.publishedPosts.length > 0) {
            await Post.updateMany(
                { _id: { $in: chart.publishedPosts } },
                { $pull: { charts: { chartId: chart._id.toString() } } }
            );
        }

        await Chart.findByIdAndDelete(req.params.id);

        res.json({ message: '删除成功' });
    } catch (err) {
        console.error('删除图表错误:', err);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 发布图表到帖子
router.post('/:id/publish', authMiddleware, async (req, res) => {
    try {
        const { postId } = req.body;

        if (!postId) {
            return res.status(400).json({ message: '请提供帖子 ID' });
        }

        const chart = await Chart.findById(req.params.id);
        if (!chart) {
            return res.status(404).json({ message: '图表不存在' });
        }

        if (chart.user.toString() !== req.user.userId) {
            return res.status(403).json({ message: '无权限操作' });
        }

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ message: '帖子不存在' });
        }

        // 检查是否是帖子作者
        if (post.author.toString() !== req.user.userId) {
            return res.status(403).json({ message: '无权限修改该帖子' });
        }

        // 添加图表到帖子
        const chartRef = {
            chartId: chart._id.toString(),
            chartType: chart.chartType,
            title: chart.title,
            config: chart.config
        };

        post.charts.push(chartRef);
        await post.save();

        // 更新图表的发布记录
        if (!chart.publishedPosts) {
            chart.publishedPosts = [];
        }
        chart.publishedPosts.push(postId);
        await chart.save();

        res.json({
            message: '发布成功',
            post
        });
    } catch (err) {
        console.error('发布图表错误:', err);
        res.status(500).json({ message: '服务器错误' });
    }
});

// 设置图表公开/私有
router.put('/:id/visibility', authMiddleware, async (req, res) => {
    try {
        const chart = await Chart.findById(req.params.id);

        if (!chart) {
            return res.status(404).json({ message: '图表不存在' });
        }

        if (chart.user.toString() !== req.user.userId) {
            return res.status(403).json({ message: '无权限修改' });
        }

        const { isPublic } = req.body;
        if (isPublic !== undefined) {
            chart.isPublic = isPublic;
            await chart.save();
        }

        res.json({
            message: '更新成功',
            isPublic: chart.isPublic
        });
    } catch (err) {
        console.error('更新可见性错误:', err);
        res.status(500).json({ message: '服务器错误' });
    }
});

module.exports = router;
