import { useLibraryStore } from '../stores/libraryStore'
import { useAuthStore } from '../stores/authStore'

export type SyncOperation = 'upload' | 'download' | 'delete'

export interface QueuedOperation {
  type: SyncOperation
  songId: string
  timestamp: number
}

class SyncService {
  private syncQueue: QueuedOperation[] = []
  private lastSyncTime: number = 0
  private isSyncing: boolean = false
  private syncInterval: number | null = null

  // Load queue from localStorage
  loadQueue(): QueuedOperation[] {
    const stored = localStorage.getItem('syncQueue')
    if (stored) {
      try {
        this.syncQueue = JSON.parse(stored)
      } catch {
        this.syncQueue = []
      }
    }
    return this.syncQueue
  }

  // Save queue to localStorage
  private saveQueue() {
    localStorage.setItem('syncQueue', JSON.stringify(this.syncQueue))
  }

  // Add operation to sync queue
  queueOperation(type: SyncOperation, songId: string) {
    const operation: QueuedOperation = {
      type,
      songId,
      timestamp: Date.now()
    }

    // Remove any existing operation for this song
    this.syncQueue = this.syncQueue.filter(op => op.songId !== songId)
    
    // Add new operation
    this.syncQueue.push(operation)
    this.saveQueue()
  }

  // Process sync queue
  async processQueue(): Promise<void> {
    if (this.isSyncing || !navigator.onLine) {
      return
    }

    const authStore = useAuthStore()
    if (!authStore.isAuthenticated) {
      return
    }

    this.isSyncing = true
    const libraryStore = useLibraryStore()

    try {
      const queue = [...this.syncQueue]
      this.syncQueue = []

      for (const operation of queue) {
        try {
          switch (operation.type) {
            case 'upload':
              await libraryStore.uploadSongToCloud(operation.songId)
              break
            case 'download':
              await libraryStore.downloadSongFromCloud(operation.songId)
              break
            case 'delete':
              await libraryStore.deleteSongFromCloud(operation.songId)
              break
          }
        } catch (error) {
          console.error(`Error processing ${operation.type} for ${operation.songId}:`, error)
          // Re-queue on error
          this.syncQueue.push(operation)
        }
      }

      this.saveQueue()
      this.lastSyncTime = Date.now()
      localStorage.setItem('lastSyncTime', this.lastSyncTime.toString())
    } catch (error) {
      console.error('Error processing sync queue:', error)
    } finally {
      this.isSyncing = false
    }
  }

  // Full sync: upload local changes and download cloud updates
  async fullSync(): Promise<void> {
    if (this.isSyncing || !navigator.onLine) {
      return
    }

    const authStore = useAuthStore()
    if (!authStore.isAuthenticated) {
      return
    }

    this.isSyncing = true
    const libraryStore = useLibraryStore()

    try {
      // First, upload local changes
      await libraryStore.syncToCloud()

      // Then, download cloud updates
      await libraryStore.syncFromCloud()

      // Process any queued operations
      await this.processQueue()

      this.lastSyncTime = Date.now()
      localStorage.setItem('lastSyncTime', this.lastSyncTime.toString())
    } catch (error) {
      console.error('Error during full sync:', error)
    } finally {
      this.isSyncing = false
    }
  }

  // Start automatic sync (polling)
  startAutoSync(intervalMs: number = 60000) {
    if (this.syncInterval) {
      this.stopAutoSync()
    }

    // Initial sync
    this.fullSync()

    // Periodic sync
    this.syncInterval = window.setInterval(() => {
      if (navigator.onLine) {
        this.fullSync()
      }
    }, intervalMs)
  }

  // Stop automatic sync
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }

  // Get sync status
  getStatus() {
    return {
      isSyncing: this.isSyncing,
      queueLength: this.syncQueue.length,
      lastSyncTime: this.lastSyncTime
    }
  }

  // Clear queue
  clearQueue() {
    this.syncQueue = []
    this.saveQueue()
  }
}

export const syncService = new SyncService()
