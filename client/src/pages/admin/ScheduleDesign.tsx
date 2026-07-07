import { useState } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ScheduleDTO } from '@memoryflow/shared';
import type { ProjectDetail } from './ProjectLayout';
import { apiDelete, apiPatch, apiPost } from '../../lib/api';
import { Button, Card, Field, Icon, Pill, TextInput } from '../../components/ui';

const emptyDate = { day_index: 1, time: '', title: '', place: '', category: '', photo_seconds: '' };
const emptyInsert = { title: '새 장면', time: '', place: '', category: '' };

export default function ScheduleDesign() {
  const data = useOutletContext<ProjectDetail>();
  const { pid } = useParams();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['project', pid] });
  const isSeq = data.project.schedule_type === 'sequence';

  return isSeq
    ? <SequenceView data={data} pid={pid!} invalidate={invalidate} />
    : <DateView data={data} pid={pid!} invalidate={invalidate} />;
}

// ──────────────────────────────── 날짜 기반 뷰 ────────────────────────────────

function DateView({ data, pid, invalidate }: { data: ProjectDetail; pid: string; invalidate: () => void }) {
  const [form, setForm] = useState({ ...emptyDate });

  const createMut = useMutation({
    mutationFn: () =>
      apiPost(`/projects/${pid}/schedules`, {
        ...form,
        photo_seconds: form.photo_seconds === '' ? null : Number(form.photo_seconds),
      }),
    onSuccess: () => {
      setForm({ ...emptyDate, day_index: form.day_index });
      invalidate();
    },
  });

  return (
    <div>
      <Card className="p-4 mb-6 space-y-3">
        <h2 className="text-title-sm font-semibold">새 장면 추가</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Day">
            <select
              value={form.day_index}
              onChange={(e) => setForm((f) => ({ ...f, day_index: Number(e.target.value) }))}
              className="w-full rounded-md border border-outline/30 bg-surface-lowest px-3 py-3 text-body-lg"
            >
              <option value={0}>사전 준비</option>
              {Array.from({ length: data.project.day_count }, (_, i) => (
                <option key={i + 1} value={i + 1}>Day {i + 1}</option>
              ))}
            </select>
          </Field>
          <Field label="시간">
            <TextInput value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} placeholder="19:00" />
          </Field>
        </div>
        <Field label="제목">
          <TextInput value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="저녁 집회" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="장소">
            <TextInput value={form.place} onChange={(e) => setForm((f) => ({ ...f, place: e.target.value }))} placeholder="본당" />
          </Field>
          <Field label="분류">
            <TextInput value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="집회" />
          </Field>
        </div>
        <Field label="사진 노출시간(초) — 비우면 기본값">
          <TextInput
            type="number" min={1} max={60}
            value={form.photo_seconds}
            onChange={(e) => setForm((f) => ({ ...f, photo_seconds: e.target.value }))}
            placeholder={`${data.project.default_photo_seconds}`}
          />
        </Field>
        <Button icon="add" loading={createMut.isPending} disabled={!form.title.trim()} onClick={() => createMut.mutate()}>
          장면 추가
        </Button>
      </Card>

      {data.days.map((day) => (
        <section key={day.day_index} className="mb-6">
          <div className="flex items-baseline gap-2 mb-2">
            <h3 className="text-title-sm font-bold text-primary">{day.day_index === 0 ? '사전 준비' : `Day ${day.day_index}`}</h3>
            {day.day_index !== 0 && day.date ? <span className="text-label-sm text-outline">{day.date}</span> : null}
          </div>
          {day.schedules.length === 0 ? (
            <p className="text-body-md text-outline py-2">아직 장면이 없습니다.</p>
          ) : (
            <div className="space-y-1">
              {day.schedules.map((s) => (
                <ScheduleRowWithInsert
                  key={s.id}
                  s={s}
                  defSec={data.project.default_photo_seconds}
                  isSeq={false}
                  onChange={invalidate}
                />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

// ──────────────────────────────── 순번 기반 뷰 ────────────────────────────────

function SequenceView({ data, pid, invalidate }: { data: ProjectDetail; pid: string; invalidate: () => void }) {
  // 모든 schedules를 flat하게 (dayIndex 순)
  const allSchedules = data.days.flatMap((d) => d.schedules).sort((a, b) => a.day_index - b.day_index);
  const lastId = allSchedules.length > 0 ? allSchedules[allSchedules.length - 1].id : null;

  const appendMut = useMutation({
    mutationFn: () => lastId
      ? apiPost(`/schedules/${lastId}/insert-after`, { title: `장면 ${allSchedules.length + 1}` })
      : apiPost(`/projects/${pid}/schedules`, { day_index: 1, title: '장면 1', sort_order: 0 }),
    onSuccess: invalidate,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-title-sm font-semibold">순번 목록 <span className="text-on-surface-variant font-normal">({allSchedules.length}개)</span></h2>
        <Button icon="add" size="sm" loading={appendMut.isPending} onClick={() => appendMut.mutate()}>
          순번 추가
        </Button>
      </div>

      {allSchedules.length === 0 ? (
        <p className="text-body-md text-outline py-4 text-center">장면이 없습니다. 순번 추가를 눌러 시작하세요.</p>
      ) : (
        <div className="space-y-1">
          {allSchedules.map((s) => (
            <ScheduleRowWithInsert
              key={s.id}
              s={s}
              defSec={data.project.default_photo_seconds}
              isSeq={true}
              onChange={invalidate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────── 공용 행 컴포넌트 (삽입 버튼 포함) ────────────

function ScheduleRowWithInsert({
  s,
  defSec,
  isSeq,
  onChange,
}: {
  s: ScheduleDTO;
  defSec: number;
  isSeq: boolean;
  onChange: () => void;
}) {
  const insertBeforeMut = useMutation({
    mutationFn: () => apiPost(`/schedules/${s.id}/insert-before`, { ...emptyInsert }),
    onSuccess: onChange,
  });
  const insertAfterMut = useMutation({
    mutationFn: () => apiPost(`/schedules/${s.id}/insert-after`, { ...emptyInsert }),
    onSuccess: onChange,
  });

  return (
    <div className="group relative">
      {/* 앞에 삽입 버튼 */}
      <div className="flex justify-center h-0 overflow-visible opacity-0 group-hover:opacity-100 transition-opacity relative z-10">
        <button
          onClick={() => insertBeforeMut.mutate()}
          disabled={insertBeforeMut.isPending}
          className="absolute -top-3.5 flex items-center gap-1 bg-primary text-on-primary text-label-sm font-semibold px-2.5 py-0.5 rounded-full shadow-sm hover:bg-primary/90 disabled:opacity-50"
        >
          <Icon name="add" className="text-[14px]" /> 앞에 추가
        </button>
      </div>

      <ScheduleRow s={s} defSec={defSec} isSeq={isSeq} onChange={onChange} />

      {/* 뒤에 삽입 버튼 */}
      <div className="flex justify-center h-0 overflow-visible opacity-0 group-hover:opacity-100 transition-opacity relative z-10">
        <button
          onClick={() => insertAfterMut.mutate()}
          disabled={insertAfterMut.isPending}
          className="absolute -bottom-3.5 flex items-center gap-1 bg-surface-container text-on-surface text-label-sm font-semibold px-2.5 py-0.5 rounded-full border border-outline/20 shadow-sm hover:bg-surface-lowest disabled:opacity-50"
        >
          <Icon name="add" className="text-[14px]" /> 뒤에 추가
        </button>
      </div>
    </div>
  );
}

function ScheduleRow({ s, defSec, isSeq, onChange }: { s: ScheduleDTO; defSec: number; isSeq: boolean; onChange: () => void }) {
  const [edit, setEdit] = useState(false);
  const [titleEdit, setTitleEdit] = useState(false);
  const [titleVal, setTitleVal] = useState(s.title);
  const [f, setF] = useState({
    time: s.time ?? '',
    title: s.title,
    place: s.place ?? '',
    category: s.category ?? '',
    photo_seconds: s.photo_seconds ?? '',
  });

  const saveMut = useMutation({
    mutationFn: () =>
      apiPatch(`/schedules/${s.id}`, { ...f, photo_seconds: f.photo_seconds === '' ? null : Number(f.photo_seconds) }),
    onSuccess: () => { setEdit(false); onChange(); },
  });
  const saveTitleMut = useMutation({
    mutationFn: (title: string) => apiPatch(`/schedules/${s.id}`, { title }),
    onSuccess: () => { setTitleEdit(false); onChange(); },
  });
  const delMut = useMutation({ mutationFn: () => apiDelete(`/schedules/${s.id}`), onSuccess: onChange });

  function commitTitle() {
    const trimmed = titleVal.trim();
    if (!trimmed || trimmed === s.title) { setTitleEdit(false); return; }
    saveTitleMut.mutate(trimmed);
  }

  if (edit) {
    return (
      <Card className="p-4 space-y-2 my-2">
        <div className="grid grid-cols-2 gap-2">
          <TextInput value={f.time} onChange={(e) => setF((x) => ({ ...x, time: e.target.value }))} placeholder="시간" />
          <TextInput value={f.category} onChange={(e) => setF((x) => ({ ...x, category: e.target.value }))} placeholder="분류" />
        </div>
        <TextInput value={f.title} onChange={(e) => setF((x) => ({ ...x, title: e.target.value }))} placeholder="제목" />
        <div className="grid grid-cols-2 gap-2">
          <TextInput value={f.place} onChange={(e) => setF((x) => ({ ...x, place: e.target.value }))} placeholder="장소" />
          <TextInput
            type="number"
            value={f.photo_seconds as string}
            onChange={(e) => setF((x) => ({ ...x, photo_seconds: e.target.value }))}
            placeholder={`${defSec}초`}
          />
        </div>
        <div className="flex gap-2">
          <Button className="h-9 px-4 text-label-sm" loading={saveMut.isPending} onClick={() => saveMut.mutate()}>저장</Button>
          <Button variant="ghost" className="h-9 px-4 text-label-sm" onClick={() => setEdit(false)}>취소</Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 flex items-center gap-3 my-2">
      {isSeq ? (
        <span className="text-label-lg font-bold text-primary shrink-0 w-8 text-center">#{s.day_index}</span>
      ) : null}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {s.time ? <span className="text-label-sm text-on-surface-variant">{s.time}</span> : null}
          {isSeq && titleEdit ? (
            <input
              autoFocus
              value={titleVal}
              onChange={(e) => setTitleVal(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => { if (e.key === 'Enter') commitTitle(); if (e.key === 'Escape') { setTitleEdit(false); setTitleVal(s.title); } }}
              className="flex-1 rounded-md border border-primary/50 bg-surface-lowest px-2 py-0.5 text-body-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          ) : (
            <span
              className={`text-body-lg font-semibold truncate ${isSeq ? 'cursor-text hover:text-primary' : ''}`}
              onClick={() => isSeq && setTitleEdit(true)}
              title={isSeq ? '클릭하여 이름 편집' : undefined}
            >
              {s.title}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          {s.place ? <span className="text-label-sm text-outline">{s.place}</span> : null}
          {s.category ? <Pill tone="muted">{s.category}</Pill> : null}
          {s.photo_seconds ? <Pill tone="muted">{s.photo_seconds}초</Pill> : null}
        </div>
      </div>
      <button onClick={() => setEdit(true)} className="text-on-surface-variant hover:text-primary">
        <Icon name="edit" className="text-[20px]" />
      </button>
      <button onClick={() => delMut.mutate()} disabled={delMut.isPending} className="text-on-surface-variant hover:text-error">
        <Icon name="delete" className="text-[20px]" />
      </button>
    </Card>
  );
}
