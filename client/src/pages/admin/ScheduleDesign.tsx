import { useState } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ScheduleDTO } from '@memoryflow/shared';
import type { ProjectDetail } from './ProjectLayout';
import { apiDelete, apiPatch, apiPost } from '../../lib/api';
import { Button, Card, Field, Icon, Pill, TextInput } from '../../components/ui';

const empty = { day_index: 1, time: '', title: '', place: '', category: '', photo_seconds: '' };

export default function ScheduleDesign() {
  const data = useOutletContext<ProjectDetail>();
  const { pid } = useParams();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['project', pid] });
  const [form, setForm] = useState({ ...empty });

  const createMut = useMutation({
    mutationFn: () =>
      apiPost(`/projects/${pid}/schedules`, {
        ...form,
        photo_seconds: form.photo_seconds === '' ? null : Number(form.photo_seconds),
      }),
    onSuccess: () => {
      setForm({ ...empty, day_index: form.day_index });
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
              {Array.from({ length: data.project.day_count }, (_, i) => (
                <option key={i + 1} value={i + 1}>Day {i + 1}</option>
              ))}
            </select>
          </Field>
          <Field label="시간">
            <TextInput value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} placeholder="19:00" />
          </Field>
        </div>
        <Field label="제목 (장면 = 영상 대본의 한 컷)">
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
            type="number"
            min={1}
            max={60}
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
            <h3 className="text-title-sm font-bold text-primary">Day {day.day_index}</h3>
            <span className="text-label-sm text-outline">{day.date}</span>
          </div>
          {day.schedules.length === 0 ? (
            <p className="text-body-md text-outline py-2">아직 장면이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {day.schedules.map((s) => (
                <ScheduleRow key={s.id} s={s} defSec={data.project.default_photo_seconds} onChange={invalidate} />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

function ScheduleRow({ s, defSec, onChange }: { s: ScheduleDTO; defSec: number; onChange: () => void }) {
  const [edit, setEdit] = useState(false);
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
    onSuccess: () => {
      setEdit(false);
      onChange();
    },
  });
  const delMut = useMutation({ mutationFn: () => apiDelete(`/schedules/${s.id}`), onSuccess: onChange });

  if (edit) {
    return (
      <Card className="p-4 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <TextInput value={f.time} onChange={(e) => setF((x) => ({ ...x, time: e.target.value }))} placeholder="시간" />
          <TextInput value={f.category} onChange={(e) => setF((x) => ({ ...x, category: e.target.value }))} placeholder="분류" />
        </div>
        <TextInput value={f.title} onChange={(e) => setF((x) => ({ ...x, title: e.target.value }))} placeholder="제목" />
        <div className="grid grid-cols-2 gap-2">
          <TextInput value={f.place} onChange={(e) => setF((x) => ({ ...x, place: e.target.value }))} placeholder="장소" />
          <TextInput
            type="number"
            value={f.photo_seconds}
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
    <Card className="p-4 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {s.time ? <span className="text-label-sm text-on-surface-variant">{s.time}</span> : null}
          <span className="text-body-lg font-semibold truncate">{s.title}</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          {s.place ? <span className="text-label-sm text-outline">{s.place}</span> : null}
          {s.category ? <Pill tone="muted">{s.category}</Pill> : null}
          {s.photo_seconds ? <Pill tone="muted">{s.photo_seconds}초</Pill> : null}
        </div>
      </div>
      <button onClick={() => setEdit(true)} className="text-on-surface-variant hover:text-primary"><Icon name="edit" className="text-[20px]" /></button>
      <button onClick={() => delMut.mutate()} className="text-on-surface-variant hover:text-error"><Icon name="delete" className="text-[20px]" /></button>
    </Card>
  );
}
