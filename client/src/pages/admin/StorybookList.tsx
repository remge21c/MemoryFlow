import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { StorybookDTO } from '@memoryflow/shared';
import { formatSeconds } from '@memoryflow/shared';
import { apiGet, apiPost } from '../../lib/api';
import { Button, Card, Icon, Pill, Skeleton, Spinner } from '../../components/ui';

interface SceneMedia {
  id: number;
  type: string;
  url: string;
  thumb_url: string | null;
  included: boolean;
}

interface SceneStory {
  uploader_name: string;
  story_text: string;
}

interface SceneSummary {
  schedule_id: number;
  day_index: number;
  title: string;
  time: string | null;
  media_count: number;
  scene_seconds: number;
  target_chars: number;
  has_narration: boolean;
  narration_chars: number;
  narration: string;
  media: SceneMedia[];
  stories: SceneStory[];
}
interface StorybookResp {
  storybook: StorybookDTO;
  scenes: SceneSummary[];
  total_seconds: number;
}

/** 장면 사진 그리드 — 모든 사진을 펼쳐서 표시. 영상은 재생 아이콘만 (재생 불가). */
function SceneThumbs({ media, dimmed }: { media: SceneMedia[]; dimmed: boolean }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-1.5">
      {media.map((m) => (
        <div key={m.id} className="relative rounded-md overflow-hidden bg-surface-container aspect-square">
          <img
            src={m.thumb_url ?? m.url}
            className={`w-full h-full object-cover ${dimmed ? 'opacity-50' : ''}`}
            alt=""
            loading="lazy"
          />
          {m.type === 'video' ? (
            <span className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
              <Icon name="play_circle" fill className="text-white text-[22px]" />
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function SceneRowSkeleton() {
  return (
    <div aria-hidden="true" className="p-4 flex items-center gap-3 bg-surface-lowest rounded-lg border border-outline/10">
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-4 w-2/5" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
      </div>
      <Skeleton className="w-5 h-5 rounded shrink-0" />
    </div>
  );
}

export default function StorybookList() {
  const { pid } = useParams();
  const qc = useQueryClient();
  const key = ['storybook', pid];
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => apiGet<StorybookResp>(`/projects/${pid}/storybook`) });
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ['project', pid] });
  };

  const lockMut = useMutation({ mutationFn: (locked: boolean) => apiPost(`/projects/${pid}/storybook/lock`, { locked }), onSuccess: invalidate });
  const approveMut = useMutation({ mutationFn: () => apiPost(`/projects/${pid}/storybook/approve`), onSuccess: invalidate });
  const unapproveMut = useMutation({ mutationFn: () => apiPost(`/projects/${pid}/storybook/unapprove`), onSuccess: invalidate });
  const mergeAllMut = useMutation({ mutationFn: () => apiPost(`/projects/${pid}/storybook/ai/merge-all`), onSuccess: invalidate });

  if (isLoading || !data) {
    return (
      <div>
        <div className="p-4 mb-6 bg-surface-lowest rounded-lg border border-outline/10">
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-4 w-3/4 mb-3" />
          <div className="flex gap-2">
            <Skeleton className="h-12 w-32 rounded-full" />
            <Skeleton className="h-12 w-32 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-5 w-24 mb-3" />
        <div aria-label="장면 목록 로딩 중" className="space-y-2">
          {[0, 1, 2, 3].map((i) => <SceneRowSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  const sb = data.storybook;
  const approved = sb.status === 'approved';

  return (
    <div>
      <Card className="p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {approved ? <Pill tone="success">승인됨</Pill> : sb.is_edit_locked ? <Pill tone="primary">편집 잠금 중</Pill> : <Pill tone="muted">편집 중</Pill>}
          </div>
          <span className="text-body-md text-on-surface-variant font-medium">총 {formatSeconds(data.total_seconds)}</span>
        </div>
        {approved ? (
          <div className="space-y-3">
            <p className="text-body-md text-on-surface-variant">모든 기여가 잠겼습니다. 이제 공유 링크를 발급하세요.</p>
            <div className="flex flex-wrap gap-2">
              <Link
                to={`/admin/projects/${pid}/share`}
                className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-primary text-on-primary font-semibold text-body-md hover:opacity-90 shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/60 transition-opacity"
              >
                <Icon name="share" className="text-[20px]" />
                공유 링크 발급
              </Link>
              <Button variant="secondary" icon="lock_open" onClick={() => unapproveMut.mutate()} loading={unapproveMut.isPending}>
                승인 해제
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-body-md text-on-surface-variant">
              {sb.is_edit_locked ? '업로더 입력이 차단되어 있습니다. 관리자는 계속 편집할 수 있습니다.' : '업로더가 사진·글을 올릴 수 있습니다.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button icon="check_circle" onClick={() => approveMut.mutate()} loading={approveMut.isPending} disabled={mergeAllMut.isPending}>
                스토리북 승인
              </Button>
              <Button variant="secondary" icon={sb.is_edit_locked ? 'lock_open' : 'lock'} onClick={() => lockMut.mutate(!sb.is_edit_locked)} loading={lockMut.isPending} disabled={mergeAllMut.isPending}>
                {sb.is_edit_locked ? '편집 잠금 해제' : '편집 잠금'}
              </Button>
              <Button variant="secondary" icon="auto_awesome" onClick={() => {
                if (confirm('모든 장면에 대해 기존 대본이 덮어쓰여지고 AI 대본 초안이 일괄 생성됩니다. 계속하시겠습니까?')) {
                  mergeAllMut.mutate();
                }
              }} loading={mergeAllMut.isPending} disabled={approveMut.isPending || lockMut.isPending}>
                AI 대본 일괄 생성
              </Button>
            </div>
          </div>
        )}
      </Card>

      <h3 className="text-title-sm font-semibold mb-3">장면별 스토리북 리스트</h3>
      <div className="space-y-6">
        {(() => {
          const groupedScenes: { [key: number]: SceneSummary[] } = {};
          data.scenes.forEach((s) => {
            if (!groupedScenes[s.day_index]) {
              groupedScenes[s.day_index] = [];
            }
            groupedScenes[s.day_index]!.push(s);
          });

          const sortedDays = Object.keys(groupedScenes)
            .map(Number)
            .sort((a, b) => a - b);

          return sortedDays.map((dayIndex) => (
            <div key={dayIndex} className="space-y-3">
              {/* Day 구분 구분선 */}
              <div className="flex items-center gap-3 pt-2">
                <span className="bg-primary/10 text-primary text-title-sm font-bold px-3 py-1 rounded-full shrink-0">
                  Day {dayIndex}
                </span>
                <div className="h-[1px] w-full bg-outline-variant/30" />
              </div>

              <div className="space-y-3">
                {(groupedScenes[dayIndex] ?? []).map((s) => {
                  const includedMedia = s.media.filter((m) => m.included);
                  const displayMedia = includedMedia.length > 0 ? includedMedia : s.media;
                  
                  return (
                    <Link key={s.schedule_id} to={`/admin/projects/${pid}/storybook/scenes/${s.schedule_id}`} className="block group">
                      <Card className="p-4 hover:border-primary/40 transition-colors duration-200">
                        {/* 1. 상단 정보 헤더 */}
                        <div className="flex items-center justify-between border-b border-outline-variant/10 pb-2 mb-3">
                          <div className="flex items-center gap-2 min-w-0">
                            {s.time ? (
                              <span className="text-label-sm bg-surface-variant text-on-surface-variant px-1.5 py-0.5 rounded shrink-0 font-semibold">
                                {s.time}
                              </span>
                            ) : null}
                            <h4 className="text-body-lg font-bold text-on-surface truncate group-hover:text-primary transition-colors">{s.title}</h4>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-label-sm text-outline font-medium">{formatSeconds(s.scene_seconds)}</span>
                            {s.has_narration ? (
                              <Pill tone="success">내레이션 {s.narration_chars}자</Pill>
                            ) : (
                              <Pill tone="muted">내레이션 없음</Pill>
                            )}
                          </div>
                        </div>

                        {/* 2. 바디 콘텐츠 — 1열: 사진 → 내레이션 → 업로더 메모 */}
                        <div className="space-y-3">
                          {/* 사진 전체 표시 */}
                          {displayMedia.length > 0 ? (
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <p className="text-label-sm text-outline/80 font-semibold flex items-center gap-1">
                                  <Icon name="photo_library" className="text-[14px]" />
                                  {includedMedia.length > 0 ? `선택된 사진 ${includedMedia.length}장` : `사진 ${displayMedia.length}장`}
                                </p>
                                {includedMedia.length === 0 ? (
                                  <span className="bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">미선택</span>
                                ) : null}
                              </div>
                              <SceneThumbs media={displayMedia} dimmed={includedMedia.length === 0} />
                            </div>
                          ) : (
                            <div className="rounded-lg border border-dashed border-outline/20 bg-surface-lowest py-5 flex flex-col items-center justify-center text-outline text-label-sm">
                              <Icon name="image_not_supported" className="text-[20px] mb-1 opacity-60" />
                              사진 없음
                            </div>
                          )}

                          {/* 내레이션 대본 */}
                          {s.has_narration ? (
                            <div className="rounded-lg bg-primary/5 border border-primary/10 p-3">
                              <p className="text-label-sm text-primary font-bold flex items-center gap-1 mb-1">
                                <Icon name="volume_up" className="text-[16px]" />
                                최종 내레이션 대본
                              </p>
                              <p className="text-body-md text-on-surface leading-relaxed whitespace-pre-line">
                                {s.narration}
                              </p>
                            </div>
                          ) : (
                            <div className="rounded-lg bg-surface-lowest border border-outline-variant/10 p-3">
                              <p className="text-label-sm text-outline font-bold flex items-center gap-1 mb-1">
                                <Icon name="volume_mute" className="text-[16px]" />
                                대본이 비어 있습니다
                              </p>
                              <p className="text-body-sm text-outline italic">
                                클릭하여 업로더의 생각들을 합친 첫 대본 초안을 만들어 보세요.
                              </p>
                            </div>
                          )}

                          {/* 업로더 메모 */}
                          {s.stories.length > 0 ? (
                            <div className="space-y-1">
                              <p className="text-label-sm text-outline/80 font-semibold flex items-center gap-1">
                                <Icon name="chat" className="text-[14px]" />
                                업로더 사역 메모 ({s.stories.length}개)
                              </p>
                              <div className="space-y-0.5">
                                {s.stories.map((st, i) => (
                                  <div key={i} className="text-body-sm text-on-surface-variant">
                                    <span className="font-bold text-primary mr-1">{st.uploader_name}:</span>
                                    <span>{st.story_text}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-label-xs text-outline italic flex items-center gap-1">
                              <Icon name="info" className="text-[12px]" />
                              기록된 업로더 메모가 없습니다.
                            </p>
                          )}

                          <div className="flex justify-end">
                            <span className="inline-flex items-center gap-1 text-label-sm text-primary font-bold group-hover:underline">
                              내레이션 편집 및 사진 선별
                              <Icon name="arrow_forward" className="text-[16px]" />
                            </span>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          ));
        })()}
      </div>
    </div>
  );
}
