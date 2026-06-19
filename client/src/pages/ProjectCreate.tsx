import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import type { ProjectDTO } from '@memoryflow/shared';
import { apiPost } from '../lib/api';
import { AppShell, TopBar } from '../components/AppShell';
import { Button, Card, Field, Icon, TextInput, TextArea, ErrorNote } from '../components/ui';
import { useActiveProject } from '../stores/activeProject';

type ScheduleType = 'date' | 'sequence';

export default function ProjectCreate() {
  const nav = useNavigate();
  const setActive = useActiveProject((s) => s.setActive);
  const [scheduleType, setScheduleType] = useState<ScheduleType>('date');
  const [form, setForm] = useState({
    name: '',
    org_name: '',
    description: '',
    start_date: '',
    end_date: '',
    default_photo_seconds: 3,
    initial_sequence_count: 10,
  });
  const [err, setErr] = useState('');

  const mut = useMutation({
    mutationFn: () => {
      const base = {
        name: form.name,
        org_name: form.org_name,
        description: form.description,
        default_photo_seconds: form.default_photo_seconds,
      };
      const payload = scheduleType === 'date'
        ? { ...base, schedule_type: 'date', start_date: form.start_date, end_date: form.end_date }
        : { ...base, schedule_type: 'sequence', initial_sequence_count: form.initial_sequence_count };
      return apiPost<{ project: ProjectDTO }>('/projects', payload);
    },
    onSuccess: (r) => {
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

        {/* 일정 타입 선택 */}
        <Field label="일정 구성 방식">
          <div className="grid grid-cols-2 gap-3 mt-1">
            <button
              type="button"
              onClick={() => setScheduleType('date')}
              className={`flex flex-col items-start gap-1.5 p-3.5 rounded-xl border-2 text-left transition-colors ${
                scheduleType === 'date'
                  ? 'border-primary bg-primary/5'
                  : 'border-outline/20 hover:border-outline/40'
              }`}
            >
              <Icon name="calendar_month" className={`text-[22px] ${scheduleType === 'date' ? 'text-primary' : 'text-on-surface-variant'}`} />
              <span className="text-body-md font-semibold text-on-surface">날짜 기반</span>
              <span className="text-label-sm text-on-surface-variant">시작일~종료일로<br />Day가 자동 생성</span>
            </button>
            <button
              type="button"
              onClick={() => setScheduleType('sequence')}
              className={`flex flex-col items-start gap-1.5 p-3.5 rounded-xl border-2 text-left transition-colors ${
                scheduleType === 'sequence'
                  ? 'border-primary bg-primary/5'
                  : 'border-outline/20 hover:border-outline/40'
              }`}
            >
              <Icon name="format_list_numbered" className={`text-[22px] ${scheduleType === 'sequence' ? 'text-primary' : 'text-on-surface-variant'}`} />
              <span className="text-body-md font-semibold text-on-surface">순번 기반</span>
              <span className="text-label-sm text-on-surface-variant">날짜 없이 장면 번호로<br />구성 (소개, 프로필 등)</span>
            </button>
          </div>
        </Field>

        {/* 날짜 기반 필드 */}
        {scheduleType === 'date' ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="시작일">
                <TextInput type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} required />
              </Field>
              <Field label="종료일">
                <TextInput type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} required />
              </Field>
            </div>
            <p className="text-label-sm text-outline">시작일~종료일로 Day가 자동 생성됩니다.</p>
          </>
        ) : (
          <>
            <Field label="초기 순번 개수">
              <TextInput
                type="number"
                min={1}
                max={200}
                value={form.initial_sequence_count}
                onChange={(e) => set('initial_sequence_count', Number(e.target.value))}
              />
            </Field>
            <Card className="p-3 bg-surface-container border-0">
              <p className="text-label-sm text-on-surface-variant flex items-start gap-1.5">
                <Icon name="info" className="text-[16px] shrink-0 mt-0.5" />
                장면 {form.initial_sequence_count}개로 시작합니다. 나중에 앞/뒤에 추가하거나 삭제할 수 있습니다.
              </p>
            </Card>
          </>
        )}

        <Field label="기본 사진 노출시간 (초)">
          <TextInput
            type="number"
            min={1}
            max={60}
            value={form.default_photo_seconds}
            onChange={(e) => set('default_photo_seconds', Number(e.target.value))}
          />
        </Field>

        {err ? <ErrorNote message={err} /> : null}
        <Button type="submit" loading={mut.isPending} className="w-full">프로젝트 만들기</Button>
      </form>
    </AppShell>
  );
}
