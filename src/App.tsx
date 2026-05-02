import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';

const Daily = lazy(() => import('./pages/Daily'));
const Trends = lazy(() => import('./pages/Trends'));
const Bookmarks = lazy(() => import('./pages/Bookmarks'));
const Info = lazy(() => import('./pages/Info'));
const TrendCluster = lazy(() => import('./pages/TrendCluster'));

const Fallback = () => (
  <div className="text-stone-500 dark:text-stone-400">Loading…</div>
);

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Layout>
            <Suspense fallback={<Fallback />}>
              <Daily />
            </Suspense>
          </Layout>
        }
      />
      <Route
        path="/trends"
        element={
          <Layout>
            <Suspense fallback={<Fallback />}>
              <Trends />
            </Suspense>
          </Layout>
        }
      />
      <Route
        path="/bookmarks"
        element={
          <Layout>
            <Suspense fallback={<Fallback />}>
              <Bookmarks />
            </Suspense>
          </Layout>
        }
      />
      <Route
        path="/info"
        element={
          <Layout>
            <Suspense fallback={<Fallback />}>
              <Info />
            </Suspense>
          </Layout>
        }
      />
      <Route
        path="/trends/:date/:slug"
        element={
          <Layout>
            <Suspense fallback={<Fallback />}>
              <TrendCluster />
            </Suspense>
          </Layout>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
