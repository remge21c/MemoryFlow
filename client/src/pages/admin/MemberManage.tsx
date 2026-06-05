import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MemberDTO } from '@memoryflow/shared';
import { apiGet, apiPost } from '../../lib/api';
import { Button, Card, EmptyState, Icon, Pill, Spinner, TextInput } from '../../components/ui';

export default function MemberManage() {
  const { pid } = useParams();
  const qc = useQueryClient();
  const key = ['members', pid];
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => apiGet<{ members: MemberDTO[] }>(`/projects/${pid}/members`) });
  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const remove = useMutation({ mutationFn: (uid: number) => apiPost(`/projects/${pid}/members/${uid}/remove`), onSuccess: invalidate });
  const restore = useMutation({ mutationFn: (uid: number) => apiPost(`/projects/${pid}/members/${uid}/restore`), onSuccess: invalidate });

  if (isLoading) return <Spinner />;
  if (!data?.members.length) return <EmptyState icon="group_off" title="합류한 멤버가 없습니다" hint="초대 링크로 업로더를 초대하세요." />;

  return (
    <div className="space-y-2">
      {data.members.map((m) => (
        <Card key={m.member_id} className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center shrink-0">
              <Icon name="person" className="text-on-secondary-container" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-body-lg font-semibold truncate">{m.name}</span>
                {m.status === 'removed' ? <Pill tone="muted">내보냄</Pill> : <Pill tone="success">활성</Pill>}
              </div>
              <p className="text-label-sm text-outline">{m.email}</p>
            </div>
            {m.status === 'active' ? (
              <button
                onClick={() => remove.mutate(m.user_id)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center px-2 text-label-sm text-error hover:text-error/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/40 rounded transition-colors"
              >
                내보내기
              </button>
            ) : (
              <button
                onClick={() => restore.mutate(m.user_id)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center px-2 text-label-sm text-primary hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded transition-colors"
              >
                복구
              </button>
            )}
          </div>
          <TempPassword pid={pid!} uid={m.user_id} />
        </Card>
      ))}
    </div>
  );
}

function TempPassword({ pid, uid }: { pid: string; uid: number }) {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState('');
  const [done, setDone] = useState(false);
  const mut = useMutation({
    mutationFn: () => apiPost(`/projects/${pid}/members/${uid}/temp-password`, { password: pw }),
    onSuccess: () => {
      setDone(true);
      setPw('');
    },
  });
  return (
    <div className="mt-2 pt-2 border-t border-outline/10">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="min-h-[44px] flex items-center gap-1.5 text-label-sm text-on-surface-variant hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded transition-colors"
        >
          <Icon name="key" className="text-[16px]" /> 임시 비밀번호 설정
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <TextInput value={pw} onChange={(e) => setPw(e.target.value)} placeholder="새 비밀번호(6자+)" className="flex-1" />
          <Button className="h-10 px-4 text-label-sm" loading={mut.isPending} disabled={pw.length < 6} onClick={() => mut.mutate()}>
            {done ? '변경됨' : '설정'}
          </Button>
        </div>
      )}
    </div>
  );
}
