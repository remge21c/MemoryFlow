import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InviteDTO } from '@memoryflow/shared';
import { apiGet, apiPost } from '../../lib/api';
import { Button, Card, EmptyState, Icon, Pill, Spinner } from '../../components/ui';
import { formatDate } from '../../lib/format';

export default function InviteManage() {
  const { pid } = useParams();
  const qc = useQueryClient();
  const key = ['invites', pid];
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => apiGet<{ invites: InviteDTO[] }>(`/projects/${pid}/invites`) });
  const [days, setDays] = useState(7);
  const [newUrl, setNewUrl] = useState('');

  const createMut = useMutation({
    mutationFn: () => apiPost<{ invite: InviteDTO }>(`/projects/${pid}/invites`, { expires_days: days }),
    onSuccess: (r) => {
      setNewUrl(window.location.origin + r.invite.url);
      qc.invalidateQueries({ queryKey: key });
    },
  });
  const deact = useMutation({
    mutationFn: (id: number) => apiPost(`/invites/${id}/deactivate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return (
    <div>
      <Card className="p-4 mb-6 space-y-3">
        <h2 className="text-title-sm font-semibold">초대 링크 발급</h2>
        <div className="flex items-end gap-3">
          <label className="flex-1">
            <span className="block text-label-sm text-outline uppercase mb-1.5">만료 기간</span>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full rounded-md border border-outline/30 bg-surface-lowest px-3 py-3 text-body-lg"
            >
              <option value={1}>1일</option>
              <option value={3}>3일</option>
              <option value={7}>7일</option>
              <option value={30}>30일</option>
            </select>
          </label>
          <Button icon="add_link" loading={createMut.isPending} onClick={() => createMut.mutate()}>발급</Button>
        </div>
        {newUrl ? (
          <div className="rounded-md bg-primary/5 border border-primary/20 p-3">
            <p className="text-label-sm text-outline mb-1">새 초대 링크 (이번 한 번만 표시됩니다)</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-body-md text-primary break-all">{newUrl}</code>
              <button onClick={() => navigator.clipboard?.writeText(newUrl)} className="text-primary"><Icon name="content_copy" /></button>
            </div>
          </div>
        ) : null}
      </Card>

      <h3 className="text-title-sm font-semibold mb-3">발급된 링크</h3>
      {isLoading ? (
        <Spinner />
      ) : !data?.invites.length ? (
        <EmptyState icon="link_off" title="발급된 초대 링크가 없습니다" />
      ) : (
        <div className="space-y-2">
          {data.invites.map((inv) => {
            const expired = new Date(inv.expires_at).getTime() < Date.now();
            return (
              <Card key={inv.id} className="p-4 flex items-center gap-3">
                <Icon name="link" className="text-outline" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {!inv.is_active ? <Pill tone="muted">무효</Pill> : expired ? <Pill tone="muted">만료</Pill> : <Pill tone="success">활성</Pill>}
                  </div>
                  <p className="text-label-sm text-outline mt-1">만료 {formatDate(inv.expires_at)}</p>
                </div>
                {inv.is_active && !expired ? (
                  <button onClick={() => deact.mutate(inv.id)} className="text-label-sm text-error">무효화</button>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
