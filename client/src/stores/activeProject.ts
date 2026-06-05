import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ActiveProject {
  id: number;
  name: string;
  org_name?: string;
}

interface ActiveProjectState {
  active: ActiveProject | null;
  setActive: (p: ActiveProject) => void;
  clear: () => void;
}

/** 현재 활성 프로젝트(사용자가 선택). 상단 타이틀에 표시. localStorage 영속. */
export const useActiveProject = create<ActiveProjectState>()(
  persist(
    (set) => ({
      active: null,
      setActive: (p) => set({ active: p }),
      clear: () => set({ active: null }),
    }),
    { name: 'mf-active-project' },
  ),
);
