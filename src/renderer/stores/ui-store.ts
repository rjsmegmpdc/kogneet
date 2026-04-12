import { create } from 'zustand'

export type ActiveView =
  | 'digest'
  | 'skills'
  | 'feeds'
  | 'subscribers'
  | 'social'
  | 'logs'
  | 'settings'

interface UIState {
  activeView: ActiveView
  setActiveView: (view: ActiveView) => void
  criteriaFeedId: string | null
  setCriteriaFeedId: (id: string | null) => void
  skillEditorFeedId: string | null
  setSkillEditorFeedId: (id: string | null) => void
}

export const useUIStore = create<UIState>((set) => ({
  activeView: 'digest',
  setActiveView: (view) => set({ activeView: view }),
  criteriaFeedId: null,
  setCriteriaFeedId: (id) => set({ criteriaFeedId: id }),
  skillEditorFeedId: null,
  setSkillEditorFeedId: (id) => set({ skillEditorFeedId: id })
}))
