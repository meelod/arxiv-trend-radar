import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Skeleton } from './components/Skeleton';

const Daily = lazy(() => import('./pages/Daily'));
const Trends = lazy(() => import('./pages/Trends'));
const Bookmarks = lazy(() => import('./pages/Bookmarks'));
const Info = lazy(() => import('./pages/Info'));
const TrendCluster = lazy(() => import('./pages/TrendCluster'));
const NotFound = lazy(() => import('./pages/NotFound'));

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Layout>
            <Suspense fallback={<Skeleton variant="daily" />}>
              <Daily />
            </Suspense>
          </Layout>
        }
      />
      <Route
        path="/trends"
        element={
          <Layout>
            <Suspense fallback={<Skeleton variant="trends" />}>
              <Trends />
            </Suspense>
          </Layout>
        }
      />
      <Route
        path="/bookmarks"
        element={
          <Layout>
            <Suspense fallback={<Skeleton variant="inline" />}>
              <Bookmarks />
            </Suspense>
          </Layout>
        }
      />
      <Route
        path="/info"
        element={
          <Layout>
            <Suspense fallback={<Skeleton variant="inline" />}>
              <Info />
            </Suspense>
          </Layout>
        }
      />
      <Route
        path="/trends/:date/:slug"
        element={
          <Layout>
            <Suspense fallback={<Skeleton variant="cluster" />}>
              <TrendCluster />
            </Suspense>
          </Layout>
        }
      />
      <Route
        path="*"
        element={
          <Layout>
            <Suspense fallback={<Skeleton variant="inline" />}>
              <NotFound />
            </Suspense>
          </Layout>
        }
      />
    </Routes>
  );
}
