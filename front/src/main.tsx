import React from 'react';
import ReactDOM from 'react-dom/client';
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleHomeRedirect } from './components/RoleHomeRedirect';
import { AppLayout } from './layouts/AppLayout';
import { routeAccess } from './auth/roles';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { SensorEventsPage } from './pages/SensorEventsPage';
import { RecordingsPage } from './pages/RecordingsPage';
import { RecordingDetailPage } from './pages/RecordingDetailPage';
import { AiAnalysisPage } from './pages/AiAnalysisPage';
import { CatalogsPage } from './pages/CatalogsPage';
import { ReportsPage } from './pages/ReportsPage';
import './styles.css';

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute allowedRoles={routeAccess.dashboard}>
            <DashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'inicio',
        element: <RoleHomeRedirect />,
      },
      {
        path: 'eventos',
        element: (
          <ProtectedRoute allowedRoles={routeAccess.eventos}>
            <SensorEventsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'grabaciones',
        element: (
          <ProtectedRoute allowedRoles={routeAccess.grabaciones}>
            <RecordingsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'grabaciones/:id',
        element: (
          <ProtectedRoute allowedRoles={routeAccess.grabaciones}>
            <RecordingDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'reportes',
        element: (
          <ProtectedRoute allowedRoles={routeAccess.reportes}>
            <ReportsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'analisis-ia',
        element: (
          <ProtectedRoute allowedRoles={routeAccess.analisisIa}>
            <AiAnalysisPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'catalogos',
        element: (
          <ProtectedRoute allowedRoles={routeAccess.catalogos}>
            <CatalogsPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  { path: '*', element: <Navigate to="/inicio" replace /> },
]);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>,
);
