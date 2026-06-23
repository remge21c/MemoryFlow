import type { ReactNode } from 'react';
import { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from './ui';
import { useLogout, useMe } from '../lib/auth';
import { useActiveProject } from '../stores/activeProject';
import { ADMIN_PROJECT_TABS } from '../lib/adminNav';
import type { SessionUser } from '@memoryflow/shared';

/**
 * 앱 공통 셸.
 * - 데스크톱(lg 이상): 왼쪽 고정 사이드바 (상황별 메뉴 + 하단에 전환/설정/로그아웃)
 * - 모바일: 상단 헤더 + 햄버거 드롭다운 (기존 방식 유지)
 */
export function AppShell({
  children,
  max = 'max-w-2xl lg:max-w-4xl',
}: {
  children: ReactNode;
  max?: string;
}) {
  const { data } = useMe();
  const logout = useLogout();
  const loc = useLocation();
  const active = useActiveProject((s) => s.active);
  const viewing = useActiveProject((s) => s.viewing);
  const user = data?.user;
  // 프로젝트 화면에서는 "보고 있는 프로젝트"를 타이틀에 표시 (활성 프로젝트와 다를 수 있음)
  const onProjectRoute = /^\/(admin\/)?projects\/\d+/.test(loc.pathname);
  const titleProject = onProjectRoute && viewing ? viewing : active;
  const onAdminArea = loc.pathname.startsWith('/admin');
  // 관리자 영역이면 보고 있는(없으면 활성) 프로젝트의 섹션 메뉴를 햄버거에 노출
  const adminPid = loc.pathname.match(/^\/admin\/projects\/(\d+)/)?.[1];
  const adminMenuPid =
    user?.is_admin && onAdminArea ? adminPid ?? (active ? String(active.id) : undefined) : undefined;
  const [menuOpen, setMenuOpen] = useState(false);

  // 영역 전환 시 활성 프로젝트가 있으면 목록이 아니라 바로 해당 화면으로
  const uploaderHome = active ? `/projects/${active.id}` : '/projects';
  const adminHome = active ? `/admin/projects/${active.id}` : '/admin';
  // 로고 클릭 시 역할과 무관하게 현재 프로젝트의 업로드 페이지(피드)로 이동
  const brandTo = uploaderHome;

  return (
    <div className="min-h-screen bg-surface lg:flex">
      {/* 데스크톱 사이드바 */}
      {user ? <Sidebar user={user} brandTo={brandTo} onLogout={logout} /> : null}

      <div className="flex-1 min-w-0 pb-12">
        {/* 데스크톱 고정 타이틀 바 — 현재 프로젝트명 + 소속 */}
        {user ? (
          <div className="hidden lg:flex sticky top-0 z-40 items-center gap-3 h-14 px-6 bg-surface/95 backdrop-blur border-b border-outline-variant/20">
            {titleProject ? (
              <div className="flex items-baseline gap-2 min-w-0">
                <p className="text-title-sm font-bold text-on-surface truncate">{titleProject.name}</p>
                {titleProject.org_name ? (
                  <p className="text-label-sm text-on-surface-variant truncate shrink-0">{titleProject.org_name}</p>
                ) : null}
              </div>
            ) : (
              <span className="text-title-sm font-semibold text-on-surface-variant">프로젝트를 선택하세요</span>
            )}
          </div>
        ) : null}

        {/* 모바일 헤더 (로그인 상태에서 데스크톱은 사이드바가 대신함) */}
        <header
          className={`${user ? 'lg:hidden' : ''} sticky top-0 z-40 bg-surface/95 backdrop-blur border-b border-outline-variant/20`}
        >
          <div className={`${max} mx-auto flex items-center gap-3 h-14 px-4`}>
            {/* 브랜드 */}
            <Link
              to={brandTo}
              className="flex items-center gap-1.5 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded"
            >
              <Icon name="auto_stories" className="text-primary text-[24px]" />
              <span className="text-title-sm font-bold text-on-surface">MemoryFlow</span>
            </Link>

            <div className="flex-1" />

            {/* 햄버거 메뉴 */}
            {user ? (
              <div className="relative shrink-0">
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  aria-label="메뉴 열기"
                  aria-expanded={menuOpen}
                  aria-haspopup="true"
                  className="w-11 h-11 flex items-center justify-center rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors"
                >
                  <Icon name={menuOpen ? 'close' : 'menu'} className="text-[24px]" />
                </button>

                {menuOpen ? (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 top-12 z-40 w-64 max-h-[80vh] overflow-y-auto rounded-xl border border-outline/15 bg-surface-lowest linen-shadow">
                      {/* 관리자 영역 전환 — 데스크톱 사이드바와 동일하게 최상단 */}
                      {user.is_admin ? (
                        onAdminArea ? (
                          <Link
                            to={uploaderHome}
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-3 px-4 h-12 text-body-md text-on-surface hover:bg-surface-container border-b border-outline/10 transition-colors"
                          >
                            <Icon name="photo_library" className="text-[20px] text-on-surface-variant" />
                            업로더 보기
                          </Link>
                        ) : (
                          <Link
                            to={adminHome}
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-3 px-4 h-12 text-body-md text-primary font-medium hover:bg-primary/5 border-b border-outline/10 transition-colors"
                          >
                            <Icon name="admin_panel_settings" className="text-[20px]" />
                            관리자 페이지
                          </Link>
                        )
                      ) : null}

                      {/* 관리자 프로젝트 섹션 메뉴 — 영역 전환 아래 (데스크톱과 동일 순서) */}
                      {adminMenuPid ? (
                        <div className="border-b border-outline/10 py-1">
                          {ADMIN_PROJECT_TABS.map((t) => (
                            <NavLink
                              key={t.to}
                              to={`/admin/projects/${adminMenuPid}${t.to ? `/${t.to}` : ''}`}
                              end={t.end}
                              onClick={() => setMenuOpen(false)}
                              className={({ isActive }) =>
                                `flex items-center gap-3 px-4 h-11 text-body-md transition-colors ${
                                  isActive
                                    ? 'text-primary font-semibold bg-primary/5'
                                    : 'text-on-surface hover:bg-surface-container'
                                }`
                              }
                            >
                              <Icon name={t.icon} className="text-[20px]" />
                              {t.label}
                            </NavLink>
                          ))}
                        </div>
                      ) : null}

                      {/* 설정 / 로그아웃 */}
                      <Link
                        to="/settings"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-4 h-12 text-body-md text-on-surface hover:bg-surface-container border-b border-outline/10 transition-colors"
                      >
                        <Icon name="settings" className="text-[20px] text-on-surface-variant" />
                        설정
                      </Link>
                      <button
                        onClick={() => { setMenuOpen(false); logout(); }}
                        className="w-full flex items-center gap-3 px-4 h-12 text-body-md text-on-surface hover:bg-surface-container text-left transition-colors"
                      >
                        <Icon name="logout" className="text-[20px] text-on-surface-variant" />
                        로그아웃
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </header>

        <main className={`${max} mx-auto lg:mx-0 px-5 lg:px-8 py-6`}>{children}</main>
      </div>
    </div>
  );
}

/** 데스크톱 사이드바 — 상황(관리자/업로더, 현재 프로젝트)에 따라 메뉴 구성. */
function Sidebar({
  user,
  brandTo,
  onLogout,
}: {
  user: SessionUser;
  brandTo: string;
  onLogout: () => void;
}) {
  const loc = useLocation();
  const active = useActiveProject((s) => s.active);
  const onAdminArea = loc.pathname.startsWith('/admin');
  // 보고 있는 프로젝트가 있으면 그것, 없으면 활성 프로젝트의 섹션 메뉴
  const adminPid = loc.pathname.match(/^\/admin\/projects\/(\d+)/)?.[1];
  const menuPid = adminPid ?? (active ? String(active.id) : undefined);

  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 sticky top-0 h-screen border-r border-outline-variant/20 bg-surface-lowest">
      {/* 브랜드 */}
      <Link
        to={brandTo}
        className="flex items-center gap-1.5 h-14 px-5 border-b border-outline/10 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <Icon name="auto_stories" className="text-primary text-[24px]" />
        <span className="text-title-sm font-bold text-on-surface">MemoryFlow</span>
      </Link>

      {/* 상황별 메뉴 — 최상단: 영역 전환, 그 아래: 프로젝트 섹션 메뉴 */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        {user.is_admin ? (
          onAdminArea ? (
            <>
              <SideLink
                to={active ? `/projects/${active.id}` : '/projects'}
                icon="photo_library"
                label="업로더 보기"
              />
              {menuPid ? (
                <div className="mt-3 pt-3 border-t border-outline/10">
                  {ADMIN_PROJECT_TABS.map((t) => (
                    <SideLink
                      key={t.to}
                      to={`/admin/projects/${menuPid}${t.to ? `/${t.to}` : ''}`}
                      icon={t.icon}
                      label={t.label}
                      end={t.end}
                    />
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <SideLink
              to={active ? `/admin/projects/${active.id}` : '/admin'}
              icon="admin_panel_settings"
              label="관리자 페이지"
            />
          )
        ) : null /* 업로더: 별도 메뉴 없음 — 피드는 로고, 프로젝트 변경·생성은 설정에서 */}
      </nav>

      {/* 하단: 설정 / 로그아웃 */}
      <div className="border-t border-outline/10 py-3 px-3 shrink-0">
        <SideLink to="/settings" icon="settings" label="설정" />
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 h-10 px-3 rounded-lg text-body-md text-on-surface hover:bg-surface-container text-left transition-colors"
        >
          <Icon name="logout" className="text-[20px] text-on-surface-variant" />
          로그아웃
        </button>
        <p className="px-3 pt-2.5 text-label-sm text-on-surface-variant truncate" title={user.name}>
          {user.email}
        </p>
      </div>
    </aside>
  );
}

function SideLink({ to, icon, label, end }: { to: string; icon: string; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 h-10 px-3 rounded-lg text-body-md transition-colors ${
          isActive
            ? 'bg-primary/10 text-primary font-semibold'
            : 'text-on-surface hover:bg-surface-container'
        }`
      }
    >
      <Icon name={icon} className="text-[20px] shrink-0" />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

export function TopBar({
  title,
  subtitle,
  onTitleSave,
}: {
  title: string;
  subtitle?: string;
  onTitleSave?: (newTitle: string) => void;
}) {
  const nav = useNavigate();
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(title);

  // 외부에서 title이 바뀌면 (저장 후 쿼리 갱신) 동기화
  if (!editing && val !== title) setVal(title);

  function commit() {
    const t = val.trim();
    if (t && t !== title && onTitleSave) onTitleSave(t);
    setEditing(false);
  }

  return (
    <div className="flex items-center gap-3 mb-6">
      <button
        onClick={() => nav(-1)}
        aria-label="뒤로 가기"
        className="w-11 h-11 flex items-center justify-center -ml-2 rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors shrink-0"
      >
        <Icon name="arrow_back" className="text-[24px]" />
      </button>
      <div className="flex items-baseline gap-2 min-w-0 flex-1">
        {editing ? (
          <input
            autoFocus
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') { setEditing(false); setVal(title); }
            }}
            className="flex-1 text-headline-md font-semibold text-on-surface bg-transparent border-b-2 border-primary focus:outline-none leading-tight"
          />
        ) : (
          <h1
            className={`text-headline-md font-semibold text-on-surface leading-tight truncate ${onTitleSave ? 'cursor-text hover:text-primary' : ''}`}
            onClick={() => onTitleSave && setEditing(true)}
            title={onTitleSave ? '클릭하여 제목 편집' : undefined}
          >
            {title}
          </h1>
        )}
        {subtitle && !editing ? <p className="text-body-md text-on-surface-variant truncate shrink-0">{subtitle}</p> : null}
      </div>
    </div>
  );
}
