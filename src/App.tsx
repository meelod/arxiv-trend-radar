import { Navigate, Route, Routes } from 'react-router-dom';
import Daily from './pages/Daily';
import Trends from './pages/Trends';
import Bookmarks from './pages/Bookmarks';
import Info from './pages/Info';
import TrendCluster from './pages/TrendCluster';
import { Layout } from './components/Layout';

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Layout>
            <Daily />
          </Layout>
        }
      />
      <Route
        path="/trends"
        element={
          <Layout>
            <Trends />
          </Layout>
        }
      />
      <Route
        path="/bookmarks"
        element={
          <Layout>
            <Bookmarks />
          </Layout>
        }
      />
      <Route
        path="/info"
        element={
          <Layout>
            <Info />
          </Layout>
        }
      />
      <Route
        path="/trends/:date/:slug"
        element={
          <Layout>
            <TrendCluster />
          </Layout>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
