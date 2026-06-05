import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { TokenValidation } from '@memoryflow/shared';
import { apiGet, apiPost } from '../lib/api';
import { Button, Field, Icon, TextInput, ErrorNote, Spinner } from '../components/ui';

export default function Join() {
  const { token = '' } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['join', token],
    queryFn: () => apiGet<TokenValidation>(`/join/${token}`),
  });

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const r = await apiPost<{ project_id: number }>('/join', { token, name, email, password });
      await qc.invalidateQueries({ queryKey: ['me'] });
      nav(`/projects/${r.project_id}`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (isLoading) return <Spinner />;

  if (!data?.valid) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <Icon name="link_off" className="text-[44px] text-outline mb-3" />
        <h1 className="text-headline-md font-semibold">{data?.expired ? '만료된 초대 링크' : '유효하지 않은 초대 링크'}</h1>
        <p className="text-body-md text-on-surface-variant mt-2">관리자에게 새 링크를 요청해주세요.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-surface">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6 text-center">
          <Icon name="group_add" className="text-primary text-[40px] mb-2" />
          <h1 className="text-headline-md font-bold text-on-surface">{data.project_name}</h1>
          <p className="text-body-md text-on-surface-variant mt-1">초대를 받았어요. 합류하고 기록을 시작하세요.</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <Field label="이름">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동" required />
          </Field>
          <Field label="이메일">
            <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" inputMode="email" autoComplete="email" required />
          </Field>
          <Field label="비밀번호">
            <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6자 이상" required />
          </Field>
          {err ? <ErrorNote message={err} /> : null}
          <Button type="submit" loading={loading} className="w-full">합류하기</Button>
        </form>
        <p className="mt-4 text-center text-label-sm text-outline/90">
          이미 계정이 있으면 같은 이메일·비밀번호로 합류됩니다.
        </p>
      </div>
    </div>
  );
}
