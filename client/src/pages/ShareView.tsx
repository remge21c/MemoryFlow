import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { formatSeconds } from '@memoryflow/shared';
import { apiGet } from '../lib/api';
import { Icon, Spinner, Pill } from '../components/ui';
import { dateRange } from '../lib/format';

interface ShareMedia {
  id: number;
  type: 'photo' | 'video';
  url: string;
  thumb_url: string | null;
  duration_seconds: number | null;
}
interface ShareScene {
  schedule: { id: number; day_index: number; title: string; time: string | null; place: string | null };
  media: ShareMedia[];
  narration: string;
  scene_seconds: number;
}
interface ShareData {
  project: { name: string; org_name: string | null; description: string | null; start_date: string; end_date: string; schedule_type?: string };
  days: { day_index: number; date: string; scenes: ShareScene[] }[];
  videos: { id: number; url: string }[];
}

function SceneArticle({ scene, seqNo }: { scene: ShareScene; seqNo?: number }) {
  return (
    <article className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-title-sm font-semibold text-on-surface flex items-center gap-2 min-w-0">
          {seqNo != null ? <span className="text-primary font-bold shrink-0">#{seqNo}</span> : null}
          {scene.schedule.time ? <span className="text-on-surface-variant">{scene.schedule.time}</span> : null}
          <span className="truncate">{scene.schedule.title}</span>
        </h3>
        <Pill tone="muted">{formatSeconds(scene.scene_seconds)}</Pill>
      </div>
      {scene.media.length > 0 ? (
        <div className="space-y-2 mb-3">
          {scene.media.map((m) =>
            m.type === 'video' ? (
              <video key={m.id} src={m.url} controls className="w-full rounded-lg linen-shadow bg-black" />
            ) : (
              <img key={m.id} src={m.url} loading="lazy" className="w-full rounded-lg linen-shadow object-contain" />
            ),
          )}
        </div>
      ) : null}
      {scene.narration ? (
        <p className="text-body-lg leading-relaxed text-on-surface bg-surface-lowest rounded-lg p-4 linen-shadow whitespace-pre-line">
          {scene.narration}
        </p>
      ) : null}
    </article>
  );
}

export default function ShareView() {
  const { token = '' } = useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ['share', token],
    queryFn: () => apiGet<ShareData>(`/share/${token}`),
    retry: false,
  });

  if (isLoading) return <Spinner />;
  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <Icon name="lock" className="text-[44px] text-outline mb-3" />
        <h1 className="text-headline-md font-semibold">열람할 수 없습니다</h1>
        <p className="text-body-md text-on-surface-variant mt-2">{(error as Error)?.message ?? '링크가 만료되었거나 비공개입니다.'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface pb-16">
      <div className="max-w-2xl mx-auto px-5">
        <header className="py-8 text-center border-b border-outline-variant/20 mb-6">
          <div className="flex justify-center mb-2">
            <Icon name="auto_stories" className="text-primary text-[32px]" />
          </div>
          {data.project.org_name ? <p className="text-label-sm text-on-surface-variant">{data.project.org_name}</p> : null}
          <h1 className="text-display-lg font-bold text-on-surface mt-1">{data.project.name}</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            {dateRange(data.project.start_date, data.project.end_date)}
          </p>
          {data.project.description ? (
            <p className="text-body-md text-on-surface-variant mt-3 whitespace-pre-line">{data.project.description}</p>
          ) : null}
        </header>

        {data.videos.length > 0 ? (
          <section className="mb-10">
            {data.videos.map((v) => (
              <video key={v.id} src={v.url} controls className="w-full rounded-lg linen-shadow bg-black mb-3" />
            ))}
          </section>
        ) : null}

        {data.project.schedule_type === 'sequence' ? (
          // 순번(장면) 기반 — 날짜 그룹 없이 장면을 순서대로
          <section className="mb-10">
            {data.days.flatMap((d) => d.scenes).map((scene, i) => (
              <SceneArticle key={scene.schedule.id} scene={scene} seqNo={i + 1} />
            ))}
          </section>
        ) : (
          data.days.map((day) => (
            <section key={day.day_index} className="mb-10">
              <div className="flex items-baseline gap-2 mb-4">
                <h2 className="text-headline-md font-bold text-primary">Day {day.day_index}</h2>
                <span className="text-body-md text-on-surface-variant">{day.date}</span>
              </div>
              {day.scenes.map((scene) => (
                <SceneArticle key={scene.schedule.id} scene={scene} />
              ))}
            </section>
          ))
        )}

        <footer className="text-center text-label-sm text-outline/60 py-8 border-t border-outline-variant/20">
          MemoryFlow로 만든 추억 스토리북
        </footer>
      </div>
    </div>
  );
}
