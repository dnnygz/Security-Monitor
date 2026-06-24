import React from 'react';
import ReactDOM from 'react-dom/client';
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './layouts/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { SensorEventsPage } from './pages/SensorEventsPage';
import { RecordingsPage } from './pages/RecordingsPage';
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
      { index: true, element: <DashboardPage /> },
      { path: 'eventos', element: <SensorEventsPage /> },
      { path: 'grabaciones', element: <RecordingsPage /> },
      { path: 'reportes', element: <ReportsPage /> },
      { path: 'analisis-ia', element: <AiAnalysisPage /> },
      { path: 'catalogos', element: <CatalogsPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>,
);
