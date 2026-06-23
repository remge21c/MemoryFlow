import { useState } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ShareLinkDTO } from '@memoryflow/shared';
import type { ProjectDetail } from './ProjectLayout';
import { apiGet, apiPost } from '../../lib/api';
import { Button, Card, EmptyState, Icon, Pill, Spinner } from '../../components/ui';
import { formatDate } from '../../lib/format';

export default function ShareManage() {
  const { pid } = useParams();
  const detail = useOutletContext<ProjectDetail>();
  const qc = useQueryClient();
  const key = ['share-links', pid];
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => apiGet<{ share_links: ShareLinkDTO[] }>(`/projects/${pid}/share-links`) });
  const [days, setDays] = useState<30 | 60 | 120 | 180 | 360>(30);
  const [newUrl, setNewUrl] = useState('');

  const createMut = useMutation({
    mutationFn: () => apiPost<{ share_link: ShareLinkDTO }>(`/projects/${pid}/share-links`, { expires_days: days }),
    onSuccess: (r) => {
      setNewUrl(window.location.origin + r.share_link.url);
      qc.invalidateQueries({ queryKey: key });
    },
  });
  const deact = useMutation({ mutationFn: (id: number) => apiPost(`/share-links/${id}/deactivate`), onSuccess: () => qc.invalidateQueries({ queryKey: key }) });

  const approved = detail.storybook.status === 'approved';

  return (
    <div>
      {!approved ? (
        <div className="mb-5 flex items-center gap-2 rounded-md bg-secondary-container px-3.5 py-3 text-on-secondary-container text-body-md">
          <Icon name="info" className="text-[18px]" /> 스토리북을 승인해야 공유 링크로 내용이 보입니다.
        </div>
      ) : null}
      <Card className="p-4 mb-6 space-y-3">
        <h2 className="text-title-sm font-semibold">공유 링크 발급</h2>
        <div className="flex items-end gap-3">
          <label className="flex-1">
            <span className="block text-label-sm text-outline uppercase mb-1.5">만료 기간</span>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value) as typeof days)}
              className="w-full rounded-md border border-outline/30 bg-surface-lowest px-3 py-3 text-body-lg"
            >
              {[30, 60, 120, 180, 360].map((d) => <option key={d} value={d}>{d}일</option>)}
            </select>
          </label>
          <Button icon="share" loading={createMut.isPending} onClick={() => createMut.mutate()}>발급</Button>
        </div>
        {newUrl ? (
          <div className="rounded-md bg-primary/5 border border-primary/20 p-3">
            <p className="text-label-sm text-outline mb-1">새 공유 링크 (이번 한 번만 표시)</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-body-md text-primary break-all">{newUrl}</code>
              <button onClick={() => navigator.clipboard?.writeText(newUrl)} className="text-primary"><Icon name="content_copy" /></button>
            </div>
          </div>
        ) : null}
      </Card>

      <h3 className="text-title-sm font-semibold mb-3">발급된 공유 링크</h3>
      {isLoading ? (
        <Spinner />
      ) : !data?.share_links.length ? (
        <EmptyState icon="link_off" title="공유 링크가 없습니다" />
      ) : (
        <div className="space-y-2">
          {data.share_links.map((s) => {
            const expired = new Date(s.expires_at).getTime() < Date.now();
            const fullUrl = s.url ? window.location.origin + s.url : '';
            const openable = !!fullUrl && s.is_active && !expired;
            return (
              <Card key={s.id} className="p-4 flex items-center gap-3">
                <Icon name="public" className="text-outline" />
                <div className="flex-1 min-w-0">
                  {!s.is_active ? <Pill tone="muted">무효</Pill> : expired ? <Pill tone="muted">만료</Pill> : <Pill tone="success">활성</Pill>}
                  {fullUrl ? (
                    <a
                      href={fullUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-body-md text-primary break-all hover:underline mt-1"
                    >
                      {fullUrl}
                    </a>
                  ) : null}
                  <p className="text-label-sm text-outline mt-1">만료 {formatDate(s.expires_at)}</p>
                </div>
                {fullUrl ? (
                  <button onClick={() => navigator.clipboard?.writeText(fullUrl)} aria-label="링크 복사" title="링크 복사" className="shrink-0 text-primary">
                    <Icon name="content_copy" />
                  </button>
                ) : null}
                {openable ? (
                  <a href={fullUrl} target="_blank" rel="noopener noreferrer" aria-label="링크 열기" title="새 탭에서 열기" className="shrink-0 text-primary">
                    <Icon name="open_in_new" />
                  </a>
                ) : null}
                {s.is_active && !expired ? <button onClick={() => deact.mutate(s.id)} className="shrink-0 text-label-sm text-error">무효화</button> : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
