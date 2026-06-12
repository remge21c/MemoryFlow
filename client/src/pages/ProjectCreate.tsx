import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import type { ProjectDTO } from '@memoryflow/shared';
import { apiPost } from '../lib/api';
import { AppShell, TopBar } from '../components/AppShell';
import { Button, Field, TextInput, TextArea, ErrorNote } from '../components/ui';
import { useActiveProject } from '../stores/activeProject';

export default function ProjectCreate() {
  const nav = useNavigate();
  const setActive = useActiveProject((s) => s.setActive);
  const [form, setForm] = useState({
    name: '',
    org_name: '',
    description: '',
    start_date: '',
    end_date: '',
    default_photo_seconds: 3,
  });
  const [err, setErr] = useState('');

  const mut = useMutation({
    mutationFn: () => apiPost<{ project: ProjectDTO }>('/projects', form),
    onSuccess: (r) => {
      // 생성한 프로젝트를 바로 활성화
      setActive({ id: r.project.id, name: r.project.name, org_name: r.project.org_name ?? undefined });
      nav(`/admin/projects/${r.project.id}`);
    },
    onError: (e) => setErr((e as Error).message),
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <AppShell max="max-w-xl">
      <TopBar title="새 프로젝트" />
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setErr('');
          mut.mutate();
        }}
      >
        <Field label="프로젝트명">
          <TextInput value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="여름 수련회 2026" required />
        </Field>
        <Field label="소속 / 단체명">
          <TextInput value={form.org_name} onChange={(e) => set('org_name', e.target.value)} placeholder="햇살교회 청년부" />
        </Field>
        <Field label="설명">
          <TextArea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} placeholder="간단한 소개" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="시작일">
            <TextInput type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} required />
          </Field>
          <Field label="종료일">
            <TextInput type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} required />
          </Field>
        </div>
        <Field label="기본 사진 노출시간 (초)">
          <TextInput
            type="number"
            min={1}
            max={60}
            value={form.default_photo_seconds}
            onChange={(e) => set('default_photo_seconds', Number(e.target.value))}
          />
        </Field>
        <p className="text-label-sm text-outline">시작일~종료일로 Day가 자동 생성됩니다.</p>
        {err ? <ErrorNote message={err} /> : null}
        <Button type="submit" loading={mut.isPending} className="w-full">프로젝트 만들기</Button>
      </form>
    </AppShell>
  );
}
