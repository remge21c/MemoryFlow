import { useRef, useState } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { VideoDTO, VideoStatus } from '@memoryflow/shared';
import type { ProjectDetail } from './ProjectLayout';
import { apiDelete, apiForm, apiGet, apiPatch, apiPost } from '../../lib/api';
import { Button, Card, EmptyState, Icon, Pill, Spinner } from '../../components/ui';
import { VIDEO_STATUS_LABEL } from '../../lib/format';

export default function ExportVideo() {
  const { pid } = useParams();
  const detail = useOutletContext<ProjectDetail>();
  const qc = useQueryClient();
  const key = ['videos', pid];
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => apiGet<{ videos: VideoDTO[] }>(`/projects/${pid}/videos`) });
  const invalidate = () => qc.invalidateQueries({ queryKey: key });
  
  const fileRef = useRef<HTMLInputElement>(null);
  const bgmFileRef = useRef<HTMLInputElement>(null);
  
  const [exportMsg, setExportMsg] = useState('');
  const [err, setErr] = useState('');

  const p = detail.project;
  const approved = detail.storybook.status === 'approved';

  const exportMut = useMutation({
    mutationFn: () => apiPost<{ dir: string }>(`/projects/${pid}/export`),
    onSuccess: (r) => setExportMsg(`패키지 생성됨: ${r.dir}`),
    onError: (e) => setErr((e as Error).message),
  });

  const uploadMut = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return apiForm('POST', `/projects/${pid}/videos`, fd);
    },
    onSuccess: () => {
      if (fileRef.current) fileRef.current.value = '';
      invalidate();
    },
  });

  const bgmUploadMut = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return apiForm('POST', `/projects/${pid}/bgm`, fd);
    },
    onSuccess: () => {
      if (bgmFileRef.current) bgmFileRef.current.value = '';
      qc.invalidateQueries({ queryKey: ['project', pid] });
    },
    onError: (e) => setErr((e as Error).message),
  });

  const bgmDeleteMut = useMutation({
    mutationFn: () => apiDelete(`/projects/${pid}/bgm`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', pid] });
    },
    onError: (e) => setErr((e as Error).message),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: VideoStatus }) => apiPatch(`/videos/${id}`, { status }),
    onSuccess: invalidate,
  });
  const delMut = useMutation({ mutationFn: (id: number) => apiDelete(`/videos/${id}`), onSuccess: invalidate });

  return (
    <div>
      <Card className="p-4 mb-6">
        <h2 className="text-title-sm font-semibold mb-1">영상 제작용 패키지 내보내기</h2>
        <p className="text-body-md text-on-surface-variant mb-3">
          승인된 스토리북을 project.json + scene-timeline.json + 미디어 묶음으로 내보냅니다.
        </p>
        <Button icon="archive" disabled={!approved} loading={exportMut.isPending} onClick={() => { setErr(''); exportMut.mutate(); }}>
          패키지 내보내기
        </Button>
        {!approved ? <p className="text-label-sm text-outline mt-2">스토리북 승인 후 사용할 수 있습니다.</p> : null}
        {exportMsg ? <p className="text-body-md text-tertiary mt-2 break-all">{exportMsg}</p> : null}
        {err ? <p className="text-body-md text-error mt-2">{err}</p> : null}
      </Card>

      {/* 배경 음악(BGM) 설정 카드 */}
      <Card className="p-4 mb-6">
        <h2 className="text-title-sm font-semibold mb-1">배경 음악(BGM) 설정</h2>
        <p className="text-body-md text-on-surface-variant mb-3">
          영상 제작용 패키지를 내보낼 때 함께 패킹할 오디오 파일(MP3, WAV 등)을 지정합니다.
        </p>

        {p.bgm_path ? (
          <div className="bg-surface-low rounded-lg p-3 border border-outline/10 mb-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-body-md font-semibold text-on-surface flex items-center gap-1.5 truncate">
                <Icon name="music_note" className="text-primary text-[20px] shrink-0" />
                <span className="truncate">{p.bgm_path.split('/').pop()}</span>
              </span>
              <button
                onClick={() => bgmDeleteMut.mutate()}
                className="text-on-surface-variant hover:text-error transition-colors shrink-0"
                title="BGM 삭제"
                disabled={bgmDeleteMut.isPending}
              >
                <Icon name="delete" />
              </button>
            </div>
            {p.bgm_url && (
              <audio src={p.bgm_url} controls className="w-full h-8 mt-1" />
            )}
          </div>
        ) : (
          <div className="border border-dashed border-outline/30 rounded-lg p-4 text-center text-on-surface-variant mb-3">
            <p className="text-body-md">설정된 배경 음악이 없습니다.</p>
          </div>
        )}

        <input
          ref={bgmFileRef}
          type="file"
          accept="audio/*"
          onChange={(e) => e.target.files?.[0] && bgmUploadMut.mutate(e.target.files[0])}
          className="block w-full text-body-md file:mr-3 file:rounded-full file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-primary file:font-semibold"
          disabled={bgmUploadMut.isPending || bgmDeleteMut.isPending}
        />
        {bgmUploadMut.isPending ? <p className="text-label-sm text-outline mt-2">BGM 업로드 중…</p> : null}
        {bgmDeleteMut.isPending ? <p className="text-label-sm text-outline mt-2">BGM 삭제 중…</p> : null}
      </Card>

      <Card className="p-4 mb-6">
        <h2 className="text-title-sm font-semibold mb-1">최종 영상 업로드</h2>
        <p className="text-body-md text-on-surface-variant mb-3">외부에서 제작한 완성 MP4를 올려 보관·공유합니다.</p>
        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          onChange={(e) => e.target.files?.[0] && uploadMut.mutate(e.target.files[0])}
          className="block w-full text-body-md file:mr-3 file:rounded-full file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-primary file:font-semibold"
        />
        {uploadMut.isPending ? <p className="text-label-sm text-outline mt-2">업로드 중…</p> : null}
      </Card>

      <h3 className="text-title-sm font-semibold mb-3">업로드된 영상</h3>
      {isLoading ? (
        <Spinner />
      ) : !data?.videos.length ? (
        <EmptyState icon="movie" title="업로드된 영상이 없습니다" />
      ) : (
        <div className="space-y-3">
          {data.videos.map((v) => (
            <Card key={v.id} className="p-4">
              <video src={v.url} controls className="w-full rounded-lg bg-black mb-3" />
              <div className="flex items-center justify-between">
                <Pill tone={v.status === 'published' ? 'success' : 'muted'}>{VIDEO_STATUS_LABEL[v.status]}</Pill>
                <div className="flex items-center gap-2">
                  <select
                    value={v.status}
                    onChange={(e) => statusMut.mutate({ id: v.id, status: e.target.value as VideoStatus })}
                    className="rounded-md border border-outline/30 bg-surface-lowest px-2 py-1.5 text-body-md"
                  >
                    <option value="uploaded">업로드됨</option>
                    <option value="published">공개</option>
                    <option value="hidden">숨김</option>
                  </select>
                  <button onClick={() => delMut.mutate(v.id)} className="text-on-surface-variant hover:text-error"><Icon name="delete" /></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
