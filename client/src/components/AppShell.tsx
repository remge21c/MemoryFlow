import type { ReactNode } from 'react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from './ui';
import { useLogout, useMe } from '../lib/auth';
import { useActiveProject } from '../stores/activeProject';

export function AppShell({ children, max = 'max-w-2xl' }: { children: ReactNode; max?: string }) {
  const { data } = useMe();
  const logout = useLogout();
  const loc = useLocation();
  const active = useActiveProject((s) => s.active);
  const user = data?.user;
  const onAdminArea = loc.pathname.startsWith('/admin');
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface pb-12">
      <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur border-b border-outline-variant/20">
        <div className={`${max} mx-auto flex items-center gap-3 h-14 px-4`}>

          {/* 브랜드 */}
          <Link
            to={user?.is_admin
              ? (active ? `/admin/projects/${active.id}` : '/admin')
              : (active ? `/projects/${active.id}` : '/projects')
            }
            className="flex items-center gap-1.5 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded"
          >
            <Icon name="auto_stories" className="text-primary text-[24px]" />
            <span className="text-title-sm font-bold text-on-surface">MemoryFlow</span>
          </Link>

          {/* 활성 프로젝트 이름 + 소속 표시 안 함 */}
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
                  <div className="absolute right-0 top-12 z-40 w-64 overflow-hidden rounded-xl border border-outline/15 bg-surface-lowest linen-shadow">

                    {/* 관리자 영역 전환 */}
                    {user.is_admin ? (
                      onAdminArea ? (
                        <Link
                          to="/projects"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-3 px-4 h-12 text-body-md text-on-surface hover:bg-surface-container border-b border-outline/10 transition-colors"
                        >
                          <Icon name="photo_library" className="text-[20px] text-on-surface-variant" />
                          업로더 보기
                        </Link>
                      ) : (
                        <Link
                          to="/admin"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-3 px-4 h-12 text-body-md text-primary font-medium hover:bg-primary/5 border-b border-outline/10 transition-colors"
                        >
                          <Icon name="admin_panel_settings" className="text-[20px]" />
                          관리자 페이지
                        </Link>
                      )
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
      <main className={`${max} mx-auto px-5 py-6`}>{children}</main>
    </div>
  );
}

export function TopBar({ title, subtitle }: { title: string; subtitle?: string }) {
  const nav = useNavigate();
  return (
    <div className="flex items-center gap-3 mb-6">
      <button
        onClick={() => nav(-1)}
        aria-label="뒤로 가기"
        className="w-11 h-11 flex items-center justify-center -ml-2 rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors shrink-0"
      >
        <Icon name="arrow_back" className="text-[24px]" />
      </button>
      <div>
        <h1 className="text-headline-md font-semibold text-on-surface leading-tight">{title}</h1>
        {subtitle ? <p className="text-body-md text-on-surface-variant">{subtitle}</p> : null}
      </div>
    </div>
  );
}
