import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import Home from './pages/Home';
import PostDetail from './pages/PostDetail';
import NewPost from './pages/NewPost';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import QuickAdmin from './pages/QuickAdmin';
import UploadExcel from './pages/UploadExcel';
import UploadList from './pages/UploadList';
import UploadPreview from './pages/UploadPreview';
import CreateChart from './pages/CreateChart';
import ChartDetail from './pages/ChartDetail';
import DataList from './pages/DataList';
import { useAuthStore } from './store/authStore';

// 管理员专用路由
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  if (user?.role !== 'admin') {
    return <Navigate to="/" />;
  }
  return <>{children}</>;
};

// 受保护的路由组件
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const App: React.FC = () => {
  return (
    <ConfigProvider locale={zhCN}>
      <ErrorBoundary>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Home />} />
            <Route path="/post/:id" element={<PostDetail />} />
            <Route
              path="/new-post"
              element={
                <ProtectedRoute>
                  <NewPost />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <Admin />
                </AdminRoute>
              }
            />
            <Route
              path="/quick-admin"
              element={
                <ProtectedRoute>
                  <QuickAdmin />
                </ProtectedRoute>
              }
            />
            
            {/* Excel 上传和图表相关路由 */}
            <Route
              path="/upload"
              element={
                <ProtectedRoute>
                  <UploadExcel />
                </ProtectedRoute>
              }
            />
            <Route
              path="/uploads"
              element={
                <ProtectedRoute>
                  <UploadList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/uploads/:uploadId/preview"
              element={
                <ProtectedRoute>
                  <UploadPreview />
                </ProtectedRoute>
              }
            />
            <Route
              path="/uploads/create-chart"
              element={
                <ProtectedRoute>
                  <CreateChart />
                </ProtectedRoute>
              }
            />
            <Route
              path="/charts/:chartId"
              element={
                <ProtectedRoute>
                  <ChartDetail />
                </ProtectedRoute>
              }
            />
            
            {/* 数据管理路由 */}
            <Route
              path="/data"
              element={
                <ProtectedRoute>
                  <DataList />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </ErrorBoundary>
    </ConfigProvider>
  );
};

export default App;
