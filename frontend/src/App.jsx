import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './components/context/AuthContext';
import Layout from './components/Layout/Layout';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import AdminDashboard from './components/Dashboard/AdminDashboard';
import EmployeeDashboard from './components/Dashboard/EmployeeDashboard';
import ValidatorDashboard from './components/Dashboard/ValidatorDashboard';
import RequestList from './components/Requests/RequestList';
import RequestForm from './components/Requests/RequestForm';
import RequestDetail from './components/Requests/RequestDetail';
import UserManagement from './components/Admin/UserManagement';
import OrgChart from './components/Admin/OrgChart';
import WorkflowManagement from './components/Admin/WorkflowManagement';
import Statistics from './components/Admin/Statistics';
import ChatList from './components/Chat/ChatList';
import ChatWindow from './components/Chat/ChatWindow';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="container">Chargement...</div>;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const PublicOnlyRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="container">Chargement...</div>;
  if (user) return <Navigate to="/" replace />;
  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();
  
  // Déterminer le dashboard selon le rôle
  const getDashboard = () => {
    if (user?.role === 'ADMIN') return <AdminDashboard />;
    if (user?.role === 'EMPLOYEE') return <EmployeeDashboard />;
    return <ValidatorDashboard />;
  };

  const router = createBrowserRouter(
    [
      {
        path: '/login',
        element: (
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        ),
      },
      {
        path: '/register',
        element: (
          <PublicOnlyRoute>
            <Register />
          </PublicOnlyRoute>
        ),
      },
      {
        path: '/',
        element: (
          <ProtectedRoute>
            <Layout>{getDashboard()}</Layout>
          </ProtectedRoute>
        ),
      },
      {
        path: '/requests',
        element: (
          <ProtectedRoute>
            <Layout><RequestList /></Layout>
          </ProtectedRoute>
        ),
      },
      {
        path: '/requests/new',
        element: (
          <ProtectedRoute>
            <Layout><RequestForm /></Layout>
          </ProtectedRoute>
        ),
      },
      {
        path: '/requests/:id',
        element: (
          <ProtectedRoute>
            <Layout><RequestDetail /></Layout>
          </ProtectedRoute>
        ),
      },
      {
        path: '/admin/users',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <Layout><UserManagement /></Layout>
          </ProtectedRoute>
        ),
      },
      {
        path: '/admin/orgchart',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <Layout><OrgChart /></Layout>
          </ProtectedRoute>
        ),
      },
      {
        path: '/admin/workflows',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <Layout><WorkflowManagement /></Layout>
          </ProtectedRoute>
        ),
      },
      {
        path: '/admin/stats',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <Layout><Statistics /></Layout>
          </ProtectedRoute>
        ),
      },
      {
        path: '/chats',
        element: (
          <ProtectedRoute>
            <Layout><ChatList /></Layout>
          </ProtectedRoute>
        ),
      },
      {
        path: '/chats/:chatId',
        element: (
          <ProtectedRoute>
            <Layout><ChatWindow /></Layout>
          </ProtectedRoute>
        ),
      },
      {
        path: '*',
        element: <Navigate to='/' replace />,
      },
    ],
    {
      future: {
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      },
    }
  );

  return <RouterProvider router={router} />;
};

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
      <ToastContainer position="top-right" autoClose={3000} />
    </AuthProvider>
  );
}

export default App;