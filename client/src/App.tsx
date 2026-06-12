import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useMe } from './lib/auth';
import { useActiveProject } from './stores/activeProject';
import { Spinner } from './components/ui';

import Login from './pages/Login';
import Join from './pages/Join';
import ShareView from './pages/ShareView';
import Settings from './pages/Settings';
import UploaderProjects from './pages/UploaderProjects';
import ScheduleList from './pages/ScheduleList';
import ContributionEdit from './pages/ContributionEdit';
import AdminProjects from './pages/AdminProjects';
import ProjectCreate from './pages/ProjectCreate';
import ProjectLayout from './pages/admin/ProjectLayout';
import ProjectOverview from './pages/admin/ProjectOverview';
import ScheduleDesign from './pages/admin/ScheduleDesign';
import InviteManage from './pages/admin/InviteManage';
import MemberManage from './pages/admin/MemberManage';
import StorybookList from './pages/admin/StorybookList';
import StorybookEdit from './pages/admin/StorybookEdit';
import ShareManage from './pages/admin/ShareManage';
import ExportVideo from './pages/admin/ExportVideo';

function RequireAuth({ children, admin }: { children: ReactNode; admin?: boolean }) {
  const { data, isLoading } = useMe();
  if (isLoading) return <Spinner />;
  if (!data?.user) return <Navigate to="/login" replace />;
  if (admin && !data.user.is_admin) return <Navigate to="/projects" replace />;
  return <>{children}</>;
}

function RoleHome() {
  const { data, isLoading } = useMe();
  const active = useActiveProject((s) => s.active);
  if (isLoading) return <Spinner />;
  if (!data?.user) return <Navigate to="/login" replace />;
  if (data.user.is_admin) return <Navigate to={active ? `/admin/projects/${active.id}` : '/admin'} replace />;
  // 업로더 메인: 선택된(활성) 프로젝트 페이지로. 없으면 목록.
  return <Navigate to={active ? `/projects/${active.id}` : '/projects'} replace />;
}

export default function App() {
  return (
    <Routes>
      {/* 공개 */}
      <Route path="/login" element={<Login />} />
      <Route path="/join/:token" element={<Join />} />
      <Route path="/share/:token" element={<ShareView />} />

      <Route path="/" element={<RoleHome />} />
      <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />

      {/* 업로더 */}
      <Route path="/projects" element={<RequireAuth><UploaderProjects /></RequireAuth>} />
      <Route path="/projects/:pid" element={<RequireAuth><ScheduleList /></RequireAuth>} />
      <Route path="/projects/:pid/schedules/:sid" element={<RequireAuth><ContributionEdit /></RequireAuth>} />

      {/* 관리자 */}
      <Route path="/admin" element={<RequireAuth admin><AdminProjects /></RequireAuth>} />
      <Route path="/admin/projects/new" element={<RequireAuth admin><ProjectCreate /></RequireAuth>} />
      <Route path="/admin/projects/:pid" element={<RequireAuth admin><ProjectLayout /></RequireAuth>}>
        <Route index element={<ProjectOverview />} />
        <Route path="schedules" element={<ScheduleDesign />} />
        <Route path="invites" element={<InviteManage />} />
        <Route path="members" element={<MemberManage />} />
        <Route path="storybook" element={<StorybookList />} />
        <Route path="share" element={<ShareManage />} />
        <Route path="videos" element={<ExportVideo />} />
      </Route>
      <Route
        path="/admin/projects/:pid/storybook/scenes/:sid"
        element={<RequireAuth admin><StorybookEdit /></RequireAuth>}
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
