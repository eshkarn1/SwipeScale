import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router';
import { Layout } from '@/components/Layout';
import { PageLoadingFallback } from '@/components/PageLoadingFallback';

// Every route is code-split so the ~27KB-gzipped data module and the
// Three.js bundle never end up in the initial chunk together.
const Home = lazy(() => import('@/routes/Home/Home'));
const AgentsDirectory = lazy(() => import('@/routes/Agents/AgentsDirectory'));
const AgentDetail = lazy(() => import('@/routes/Agents/AgentDetail'));
const TeamsIndex = lazy(() => import('@/routes/Teams/TeamsIndex'));
const TeamDetail = lazy(() => import('@/routes/Teams/TeamDetail'));
const NotFound = lazy(() => import('@/routes/NotFound'));

export default function App() {
  return (
    <Layout>
      <Suspense fallback={<PageLoadingFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/agents" element={<AgentsDirectory />} />
          <Route path="/agents/:id" element={<AgentDetail />} />
          <Route path="/teams" element={<TeamsIndex />} />
          <Route path="/teams/studio-core" element={<TeamDetail />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}
