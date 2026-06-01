import { create } from 'zustand'
import type { Feed } from '../../main/types'

interface FeedsState {
  feeds: Feed[]
  loading: boolean
  error: string | null
  loadFeeds: () => Promise<void>
  addFeed: (feed: Omit<Feed, 'id' | 'addedAt' | 'lastFetchedAt' | 'skillVersion'>) => Promise<{ success: boolean; error?: string }>
  updateFeed: (feed: Feed) => Promise<{ success: boolean; error?: string }>
  deleteFeed: (id: string) => Promise<void>
  toggleFeed: (id: string) => Promise<void>
}

export const useFeedsStore = create<FeedsState>((set, get) => ({
  feeds: [],
  loading: true,
  error: null,

  loadFeeds: async () => {
    set({ loading: true, error: null })
    try {
      const feeds = (await window.electronAPI.getFeeds()) as Feed[]
      set({ feeds, loading: false })
    } catch (err) {
      set({ error: String(err), loading: false })
    }
  },

  addFeed: async (feedData) => {
    const result = (await window.electronAPI.addFeed(feedData)) as {
      success?: boolean
      error?: string
      feed?: Feed
    }
    if (result?.error) return { success: false, error: result.error }
    if (result?.feed) {
      set({ feeds: [...get().feeds, result.feed] })
    }
    return { success: true }
  },

  updateFeed: async (feed) => {
    const result = (await window.electronAPI.updateFeed(feed)) as { error?: string }
    if (result?.error) return { success: false, error: result.error }
    set({ feeds: get().feeds.map((f) => (f.id === feed.id ? feed : f)) })
    return { success: true }
  },

  deleteFeed: async (id) => {
    await window.electronAPI.deleteFeed(id)
    set({ feeds: get().feeds.filter((f) => f.id !== id) })
  },

  toggleFeed: async (id) => {
    const result = (await window.electronAPI.toggleFeed(id)) as {
      success?: boolean
      enabled?: boolean
    }
    if (result?.success) {
      set({
        feeds: get().feeds.map((f) =>
          f.id === id ? { ...f, enabled: result.enabled! } : f
        )
      })
    }
  }
}))
