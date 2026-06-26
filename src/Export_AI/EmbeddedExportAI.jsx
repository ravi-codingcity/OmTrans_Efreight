import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './src/context/AuthContext.jsx';
import Layout from './src/components/Layout.jsx';
import ProtectedRoute from './src/components/ProtectedRoute.jsx';
import Dashboard from './src/pages/Dashboard.jsx';
import NewJob from './src/pages/NewJob.jsx';
import JobDetail from './src/pages/JobDetail.jsx';
import MblReview from './src/pages/MblReview.jsx';
import IsfReview from './src/pages/IsfReview.jsx';
import Costing from './src/pages/Costing.jsx';
import Settings from './src/pages/Settings.jsx';
import './src/index.css';

/* ------------------------------------------------------------------ */
/*  Export AI — embedded workspace.                                   */
/*  Mounted inside the main app (which owns the top navbar + auth).    */
/*  Uses an isolated in-memory router so it never touches the main     */
/*  app's URL, and the existing logged-in user (passed in) instead of  */
/*  a separate login. HBL / MBL / ISF generation + AI analysis live    */
/*  entirely here.                                                     */
/* ------------------------------------------------------------------ */
export default function EmbeddedExportAI({ currentUser }) {
  return (
    <AuthProvider initialUser={currentUser}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/jobs/new" element={<NewJob />} />
            <Route path="/jobs/:id" element={<JobDetail />} />
            <Route path="/jobs/:id/mbl" element={<MblReview />} />
            <Route path="/jobs/:id/isf" element={<IsfReview />} />
            <Route
              path="/costing"
              element={
                <ProtectedRoute adminOnly>
                  <Costing />
                </ProtectedRoute>
              }
            />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </MemoryRouter>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
    </AuthProvider>
  );
}
