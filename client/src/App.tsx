import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { ProjectDTO } from '@memoryflow/shared';
import { apiGet } from './lib/api';
import { useMe } from './lib/auth';
import { useActiveProject } from './stores/activeProject';

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
  if (isLoading) return null; // 인증 확인 중엔 회전 스피너 대신 조용히 대기 (목적지 스켈레톤이 자리를 채움)
  if (!data?.user) return <Navigate to="/login" replace />;
  if (admin && !data.user.is_admin) return <Navigate to="/projects" replace />;
  return <>{children}</>;
}

function RoleHome() {
  const { data, isLoading } = useMe();
  const { active, setActive } = useActiveProject();
  const user = data?.user;

  // 활성 프로젝트가 없으면 첫 프로젝트를 자동 활성화 → 접속 즉시 피드로
  const needAutoActivate = !!user && !active;
  const { data: projData, isLoading: projLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiGet<{ projects: ProjectDTO[] }>('/projects'),
    enabled: needAutoActivate,
  });
  const first = projData?.projects[0];

  useEffect(() => {
    if (needAutoActivate && first) {
      setActive({ id: first.id, name: first.name, org_name: first.org_name ?? undefined });
    }
  }, [needAutoActivate, first, setActive]);

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!active) {
    if (projLoading || first) return null; // 자동 활성화 진행 중 — 회전 스피너 없이 대기
    // 합류/생성한 프로젝트가 하나도 없음 → 목록(빈 상태 안내)으로
    return <Navigate to={user.is_admin ? '/admin' : '/projects'} replace />;
  }
  // 활성 프로젝트가 있으면 역할과 무관하게 무조건 업로드 페이지로 (관리자는 메뉴에서 관리자 페이지로 전환)
  return <Navigate to={`/projects/${active.id}`} replace />;
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
