import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ActiveProject {
  id: number;
  name: string;
  org_name?: string;
}

interface ActiveProjectState {
  /** 활성 프로젝트 — 홈/사이드 메뉴의 기준. 설정 페이지에서만 변경. localStorage 영속. */
  active: ActiveProject | null;
  /** 현재 보고 있는 프로젝트 — 타이틀 바 표시용. 페이지 진입 시 갱신, 비영속. */
  viewing: ActiveProject | null;
  setActive: (p: ActiveProject) => void;
  setViewing: (p: ActiveProject) => void;
  clear: () => void;
}

export const useActiveProject = create<ActiveProjectState>()(
  persist(
    (set) => ({
      active: null,
      viewing: null,
      setActive: (p) => set({ active: p }),
      setViewing: (p) => set({ viewing: p }),
      clear: () => set({ active: null }),
    }),
    {
      name: 'mf-active-project',
      partialize: (s) => ({ active: s.active }),
    },
  ),
);
