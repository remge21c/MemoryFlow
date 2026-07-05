import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { apiPost } from '../lib/api';
import { Button, Field, Icon, TextInput, ErrorNote } from '../components/ui';
import { BrandMark } from '../components/Brand';

export default function Login() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [bootstrap, setBootstrap] = useState(false);
  const [name, setName] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      if (bootstrap) {
        await apiPost('/auth/bootstrap-admin', { name, email, password });
      } else {
        await apiPost('/auth/login', { email, password });
      }
      await qc.invalidateQueries({ queryKey: ['me'] });
      nav('/');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-surface">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <BrandMark className="w-16 h-16 mb-3" />
          <h1 className="text-display-lg font-bold text-[#1e5b39]">Memory Flow</h1>
          <p className="text-body-md text-on-surface-variant mt-1">함께 만드는 추억 스토리북</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {bootstrap ? (
            <Field label="이름">
              <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동" required />
            </Field>
          ) : null}
          <Field label="이메일">
            <TextInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              inputMode="email"
              autoComplete="email"
              required
            />
          </Field>
          <Field label="비밀번호">
            <div className="relative">
              <TextInput
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                autoComplete={bootstrap ? 'new-password' : 'current-password'}
                required
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 보기'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded"
              >
                <Icon name={showPw ? 'visibility_off' : 'visibility'} className="text-[20px]" />
              </button>
            </div>
          </Field>
          {err ? <ErrorNote message={err} /> : null}
          <Button type="submit" loading={loading} className="w-full">
            {bootstrap ? '관리자 계정 만들기' : '로그인'}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => {
            setBootstrap((b) => !b);
            setErr('');
            setShowPw(false);
          }}
          className="mt-6 w-full text-center text-label-sm text-outline hover:text-primary focus-visible:outline-none focus-visible:underline transition-colors"
        >
          {bootstrap ? '← 로그인으로 돌아가기' : '처음 설치하셨나요? 관리자 계정 부트스트랩'}
        </button>
        <p className="mt-4 text-center text-label-sm text-outline/90">
          업로더는 관리자가 보낸 초대 링크로 가입합니다.
        </p>
      </div>
    </div>
  );
}
