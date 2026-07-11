import { useState } from 'react';
import { useOutletContext, useParams, Link, useNavigate } from 'react-router-dom';
import type { ProjectDetail } from './ProjectLayout';
import { Card, Icon, Pill, Button, TextInput, Field, ErrorNote } from '../../components/ui';
import { dateRange, PROJECT_STATUS_LABEL } from '../../lib/format';
import { apiSend } from '../../lib/api';

export default function ProjectOverview() {
  const data = useOutletContext<ProjectDetail>();
  const { pid } = useParams();
  const navigate = useNavigate();
  const p = data.project;
  const scheduleCount = data.days.reduce((a, d) => a + d.schedules.length, 0);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const steps = [
    { to: 'schedules', icon: 'event', label: '일정(장면) 설계', desc: `${scheduleCount}개 장면 · ${p.day_count}일` },
    { to: 'invites', icon: 'link', label: '초대 링크', desc: '업로더 초대' },
    { to: 'members', icon: 'group', label: '멤버 관리', desc: '합류한 사람들' },
    { to: 'storybook', icon: 'auto_stories', label: '스토리북 편집', desc: '사진 선별·내레이션·승인' },
    { to: 'share', icon: 'share', label: '공유 링크', desc: '외부 열람 발급' },
    { to: 'videos', icon: 'movie', label: '영상·내보내기', desc: '패키지/최종 영상' },
  ];

  const handleOpenDelete = () => {
    const isConfirmed = window.confirm(
      '정말로 이 프로젝트를 영구 삭제하시겠습니까?\n프로젝트 내의 모든 일정, 미디어 사진 및 동영상 자료가 CASCADE 처리되어 복구할 수 없이 영구적으로 삭제됩니다.'
    );
    if (isConfirmed) {
      setErrorMsg('');
      setConfirmPassword('');
      setIsDeleteModalOpen(true);
    }
  };

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmPassword) {
      setErrorMsg('비밀번호를 입력해 주세요.');
      return;
    }

    setIsDeleting(true);
    setErrorMsg('');

    try {
      await apiSend('DELETE', `/projects/${p.id}`, { password: confirmPassword });
      setIsDeleteModalOpen(false);
      navigate('/admin');
    } catch (err: any) {
      setErrorMsg(err.message || '프로젝트 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <Card className="p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Pill tone="muted">{PROJECT_STATUS_LABEL[p.status]}</Pill>
          <Pill tone="muted">기본 노출 {p.default_photo_seconds}초</Pill>
          {data.storybook.status === 'approved' ? <Pill tone="success">승인됨</Pill> : <Pill tone="primary">편집 중</Pill>}
        </div>
        <p className="text-body-md text-on-surface-variant">{dateRange(p.start_date, p.end_date)}</p>
        {p.description ? <p className="text-body-md text-on-surface mt-2 whitespace-pre-line">{p.description}</p> : null}
      </Card>

      <div className="grid grid-cols-2 gap-3 mb-8">
        {steps.map((s) => (
          <Link key={s.to} to={s.to}>
            <Card className="p-4 h-full">
              <Icon name={s.icon} className="text-primary text-[26px] mb-2" />
              <p className="text-body-lg font-semibold text-on-surface">{s.label}</p>
              <p className="text-label-sm text-outline mt-0.5">{s.desc}</p>
            </Card>
          </Link>
        ))}
      </div>

      {/* 프로젝트 삭제 — 하단에 조용히 배치 (실수 방지는 비밀번호 확인 모달이 담당) */}
      <div className="mt-10 pt-5 border-t border-outline/15 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-body-md font-medium text-on-surface">프로젝트 삭제</p>
          <p className="text-label-sm text-on-surface-variant mt-0.5">
            일정·사진·영상 등 모든 데이터가 영구 삭제되며 복구할 수 없습니다.
          </p>
        </div>
        <button
          onClick={handleOpenDelete}
          className="shrink-0 h-9 px-4 rounded-full border border-error/40 text-error text-label-sm font-medium hover:bg-error/5 transition-colors"
        >
          삭제
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-lowest rounded-xl border border-outline/10 p-6 max-w-md w-full shadow-card">
            <div className="flex items-center gap-2 text-error mb-4">
              <Icon name="report" className="text-[28px]" />
              <h3 className="text-title-md font-bold">프로젝트 영구 삭제</h3>
            </div>
            
            <p className="text-body-md text-on-surface mb-6 leading-relaxed">
              이 작업은 취소할 수 없습니다. 프로젝트를 안전하게 삭제하려면 현재 관리자의 로그인 비밀번호를 입력해 주십시오.
            </p>

            <form onSubmit={handleDelete} className="space-y-4">
              <Field label="관리자 비밀번호">
                <TextInput
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  autoFocus
                  disabled={isDeleting}
                />
              </Field>

              {errorMsg && <ErrorNote message={errorMsg} />}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsDeleteModalOpen(false)}
                  disabled={isDeleting}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  loading={isDeleting}
                  icon="delete_forever"
                >
                  삭제 확인
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

