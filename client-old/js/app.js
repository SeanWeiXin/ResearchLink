// API 基础地址
//const API_URL = 'http://localhost:5000/api';

// ========== 首页功能 ==========

async function renderPosts() {
    const postList = document.getElementById('post-list');
    if (!postList) return;
    
    const type = currentFilter || 'all';
    
    try {
        const response = await fetch(`${API_URL}/posts?type=${type}`);
        const posts = await response.json();
        
        if (posts.length === 0) {
            postList.innerHTML = '<div class="no-comments">暂无帖子，来发布第一个吧！</div>';
            return;
        }
        
        postList.innerHTML = posts.map(post => `
            <div class="post-card" onclick="viewPost('${post._id}')">
                <div class="post-header">
                    <span>👤 ${escapeHtml(post.author)}</span>
                    <span class="post-type ${post.type}">${post.type === 'blog' ? '博客' : '用户'}</span>
                </div>
                <h2 class="post-title">${escapeHtml(post.title)}</h2>
                <p class="post-excerpt">${escapeHtml(post.content.substring(0, 100))}...</p>
                <div class="post-meta">
                    <span>📅 ${post.date}</span>
                    <span>👁 ${post.views}</span>
                    <span>❤️ ${post.likes}</span>
                    <span>💬 ${post.comments.length}</span>
                </div>
            </div>
        `).join('');
        
    } catch (err) {
        console.error('获取帖子失败:', err);
        postList.innerHTML = '<div class="no-comments">加载失败，请检查后端是否启动</div>';
    }
}

let currentFilter = 'all';

function filterPosts(type) {
    currentFilter = type;
    
    document.querySelectorAll('.tag').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    renderPosts();
}

function viewPost(id) {
    localStorage.setItem('currentPostId', id);
    window.location.href = 'post.html';
}

// ========== 发帖功能 ==========

async function handleSubmit(event) {
    event.preventDefault();
    console.log('1. 表单提交触发');
    
    const type = document.querySelector('input[name="type"]:checked').value;
    const title = document.getElementById('title').value.trim();
    const content = document.getElementById('content').value.trim();
    
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const author = user?.username || '游客';
    
    console.log('2. 准备提交:', { title, content, author, type });
    
    try {
        console.log('3. 发送请求...');
        const response = await fetch(`${API_URL}/posts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, content, author, type })
        });
        
        console.log('4. 收到响应:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('5. 发布成功:', data);
            alert('发布成功！');
            window.location.href = 'index.html';
        } else {
            const err = await response.json();
            console.error('发布失败:', err);
            alert(err.message || '发布失败');
        }
    } catch (err) {
        console.error('网络错误:', err);
        alert('网络错误');
    }
}
    

// ========== 详情页功能 ==========

async function renderPostDetail() {
    const postId = localStorage.getItem('currentPostId');
    if (!postId) {
        document.getElementById('post-detail').innerHTML = '<p>帖子不存在</p>';
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/posts/${postId}`);
        const post = await response.json();
        
        if (!post._id) {
            document.getElementById('post-detail').innerHTML = '<p>帖子不存在</p>';
            return;
        }
        
        window.currentPost = post;
        
        document.getElementById('post-detail').innerHTML = `
            <a href="index.html" class="back-link">← 返回列表</a>
            <div class="post-detail-header">
                <h1 class="post-detail-title">${escapeHtml(post.title)}</h1>
                <div class="post-detail-meta">
                    <span>👤 ${post.author}</span>
                    <span class="post-type ${post.type}">${post.type === 'blog' ? '博客' : '用户'}</span>
                    <span>📅 ${post.date}</span>
                    <span>👁 ${post.views} 浏览</span>
                </div>
            </div>
            <div class="post-detail-content">
                ${escapeHtml(post.content).replace(/\n/g, '<br>')}
            </div>
            <div class="post-actions">
                <button class="action-btn" onclick="toggleLike('${post._id}')" id="like-btn">
                    <span>❤️</span>
                    <span id="like-count">${post.likes}</span>
                </button>
                <button class="action-btn" onclick="sharePost()">
                    <span>📤</span>
                    <span>分享</span>
                </button>
            </div>
        `;
        
        renderComments(post);
        
    } catch (err) {
        console.error('获取详情失败:', err);
        document.getElementById('post-detail').innerHTML = '<p>加载失败，请检查后端是否启动</p>';
    }
}

function renderComments(post) {
    document.getElementById('comment-count').textContent = post.comments.length;
    const commentsList = document.getElementById('comments-list');
    
    if (post.comments.length === 0) {
        commentsList.innerHTML = '<div class="no-comments">暂无评论，来抢沙发吧！</div>';
        return;
    }
    
    commentsList.innerHTML = post.comments.map(comment => `
        <div class="comment-item">
            <div class="comment-header">
                <span class="comment-author">👤 ${escapeHtml(comment.author)}</span>
                <span class="comment-date">${comment.date}</span>
            </div>
            <div class="comment-content">${escapeHtml(comment.content)}</div>
        </div>
    `).join('');
}

async function addComment() {
    const postId = localStorage.getItem('currentPostId');
    const name = document.getElementById('comment-name').value.trim();
    const content = document.getElementById('comment-content').value.trim();
    
    if (!name || !content) {
        alert('请填写昵称和评论内容');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/posts/${postId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ author: name, content })
        });
        
        if (response.ok) {
            const updatedPost = await response.json();
            document.getElementById('comment-content').value = '';
            renderComments(updatedPost);
            document.getElementById('comment-count').textContent = updatedPost.comments.length;
        }
    } catch (err) {
        console.error('评论失败:', err);
        alert('评论失败');
    }
}

async function toggleLike(postId) {
    try {
        const response = await fetch(`${API_URL}/posts/${postId}/like`, {
            method: 'PATCH'
        });
        
        if (response.ok) {
            const data = await response.json();
            document.getElementById('like-count').textContent = data.likes;
            document.getElementById('like-btn').classList.add('liked');
        }
    } catch (err) {
        console.error('点赞失败:', err);
    }
}

function sharePost() {
    navigator.clipboard.writeText(window.location.href).then(() => {
        alert('链接已复制！');
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', () => {
    // 自动填充当前用户名到发帖表单
    const authorInput = document.getElementById('author');
    if (authorInput) {
        const { user } = checkAuth();
        if (user && user.username) {
            authorInput.value = user.username;
        } else {
            authorInput.value = '游客';
        }
    }
    
    // 原有功能
    if (document.getElementById('post-list')) {
        renderPosts();
    }
    if (document.getElementById('post-detail')) {
        renderPostDetail();
    }
});