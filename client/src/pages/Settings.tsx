import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { ProjectDTO } from '@memoryflow/shared';
import { apiGet, apiPost } from '../lib/api';
import { AppShell, TopBar } from '../components/AppShell';
import { Button, Card, Field, Icon, TextInput, ErrorNote } from '../components/ui';
import { useMe } from '../lib/auth';
import { useActiveProject } from '../stores/activeProject';

export default function Settings() {
  const { data: me } = useMe();
  const user = me?.user;
  const nav = useNavigate();
  const { active, setActive, clear } = useActiveProject();
  const { data } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiGet<{ projects: ProjectDTO[] }>('/projects'),
  });

  // 비밀번호 변경
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [next2, setNext2] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [pwOk, setPwOk] = useState(false);
  const [saving, setSaving] = useState(false);

  async function changePw(e: React.FormEvent) {
    e.preventDefault();
    setPwErr('');
    setPwOk(false);
    if (next !== next2) {
      setPwErr('새 비밀번호가 일치하지 않습니다');
      return;
    }
    setSaving(true);
    try {
      await apiPost('/auth/change-password', { current_password: cur, new_password: next });
      setPwOk(true);
      setCur('');
      setNext('');
      setNext2('');
    } catch (e) {
      setPwErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell max="max-w-xl">
      <TopBar title="설정" />

      {/* 계정 정보 */}
      <Card className="p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-secondary-container flex items-center justify-center">
            <Icon name="person" className="text-on-secondary-container" />
          </div>
          <div>
            <p className="text-body-lg font-semibold text-on-surface">{user?.name}</p>
            <p className="text-label-sm text-outline">{user?.email}</p>
          </div>
        </div>
      </Card>

      {/* 활성 프로젝트 — 활성화는 이 페이지에서만 가능 */}
      <section className="mb-6">
        <h2 className="text-title-sm font-semibold mb-3">활성 프로젝트</h2>
        <p className="text-label-sm text-on-surface-variant mb-3">
          홈과 사이드 메뉴가 기본으로 여는 프로젝트입니다. 다른 프로젝트를 둘러봐도 여기서 바꾸기 전까지 유지됩니다.
        </p>
        <Card className="p-4">
          <Field label="활성 프로젝트 선택">
            <select
              value={active?.id ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) {
                  clear();
                  nav(user?.is_admin ? '/admin' : '/projects');
                  return;
                }
                const pid = Number(val);
                const p = data?.projects.find((x) => x.id === pid);
                if (!p) return;
                setActive({ id: p.id, name: p.name, org_name: p.org_name ?? undefined });
                nav(user?.is_admin ? `/admin/projects/${p.id}` : `/projects/${p.id}`);
              }}
              className="w-full rounded-lg border border-outline/30 bg-surface px-3 py-2.5 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">프로젝트를 선택하세요</option>
              {(data?.projects ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.org_name ? ` · ${p.org_name}` : ''}
                </option>
              ))}
            </select>
          </Field>
          {user?.is_admin ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="secondary" icon="add" className="h-9 px-3 text-label-sm whitespace-nowrap" onClick={() => nav('/admin/projects/new')}>
                새 프로젝트
              </Button>
              <Button variant="secondary" icon="folder" className="h-9 px-3 text-label-sm whitespace-nowrap" onClick={() => nav('/admin')}>
                프로젝트 목록
              </Button>
            </div>
          ) : null}
        </Card>
      </section>

      {/* 비밀번호 변경 */}
      <section>
        <h2 className="text-title-sm font-semibold mb-3">비밀번호 변경</h2>
        <Card className="p-4">
          <form onSubmit={changePw} className="space-y-4">
            <Field label="현재 비밀번호">
              <TextInput type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" required />
            </Field>
            <Field label="새 비밀번호 (6자 이상)">
              <TextInput type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" required />
            </Field>
            <Field label="새 비밀번호 확인">
              <TextInput type="password" value={next2} onChange={(e) => setNext2(e.target.value)} autoComplete="new-password" required />
            </Field>
            {pwErr ? <ErrorNote message={pwErr} /> : null}
            {pwOk ? (
              <p className="text-body-md text-tertiary flex items-center gap-1">
                <Icon name="check_circle" className="text-[18px]" /> 비밀번호가 변경되었습니다.
              </p>
            ) : null}
            <Button type="submit" icon="lock_reset" loading={saving} disabled={!cur || next.length < 6}>
              비밀번호 변경
            </Button>
          </form>
        </Card>
      </section>
    </AppShell>
  );
}
