import { Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/Login';
import Daily from './pages/Daily';
import Trends from './pages/Trends';
import { Layout } from './components/Layout';
import { isAuthEnabled, isSessionValid } from './lib/auth';

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!isAuthEnabled() || isSessionValid()) {
    return <>{children}</>;
  }
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout>
              <Daily />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/trends"
        element={
          <RequireAuth>
            <Layout>
              <Trends />
            </Layout>
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
