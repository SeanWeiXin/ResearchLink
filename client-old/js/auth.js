const API_URL = 'http://localhost:5000/api';

// 注册
async function handleRegister(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch(`${API_URL}/users/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('注册成功！请登录');
            window.location.href = 'login.html';
        } else {
            alert(data.message || '注册失败');
        }
    } catch (err) {
        alert('网络错误');
    }
}

// 登录
async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch(`${API_URL}/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // 保存登录状态
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            alert('登录成功！');
            window.location.href = 'index.html';
        } else {
            alert(data.message || '登录失败');
        }
    } catch (err) {
        alert('网络错误');
    }
}

// 检查登录状态
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    return { token, user };
}

// 退出登录
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// 更新导航栏显示用户信息
function updateNav() {
    const { user } = checkAuth();
    const navLinks = document.querySelector('.nav-links');
    
    if (user.username && navLinks) {
        navLinks.innerHTML = `
            <a href="index.html">首页</a>
            <a href="new-post.html">发布</a>
            <span style="color: #666;">👤 ${user.username}</span>
            <a href="#" onclick="logout(); return false;">退出</a>
        `;
    }
}

// 页面加载时更新导航
document.addEventListener('DOMContentLoaded', updateNav);