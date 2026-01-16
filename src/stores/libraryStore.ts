import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface SongMetadata {
  id: string
  title: string
  stems: string[] // List of stem names (drums, bass, vocals, etc.)
  createdAt: number
}

export interface StoredSong extends SongMetadata {
  files: Record<string, File> // stemName -> File
}

class SongLibraryStorage {
  private dbName = 'stemPlayerDB'
  private dbVersion = 1
  private storeName = 'songs'
  private metadataKey = 'songsMetadata'
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' })
        }
      }
    })
  }


  async saveMetadata(song: SongMetadata): Promise<void> {
    const metadata = this.getAllMetadata()
    const index = metadata.findIndex(m => m.id === song.id)
    
    if (index >= 0) {
      metadata[index] = song
    } else {
      metadata.push(song)
    }

    localStorage.setItem(this.metadataKey, JSON.stringify(metadata))
  }

  getAllMetadata(): SongMetadata[] {
    const data = localStorage.getItem(this.metadataKey)
    if (!data) return []
    try {
      return JSON.parse(data)
    } catch {
      return []
    }
  }

  async getSong(id: string): Promise<StoredSong | null> {
    if (!this.db) await this.init()

    // Get metadata
    const metadata = this.getAllMetadata().find(m => m.id === id)
    if (!metadata) return null

    // Get files from IndexedDB
    const files = await this.loadSongFiles(id)
    if (!files) return null

    return {
      ...metadata,
      files
    }
  }

  async deleteSong(id: string): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.delete(id)

      request.onsuccess = async () => {
        // Remove from metadata
        const metadata = this.getAllMetadata().filter(m => m.id !== id)
        localStorage.setItem(this.metadataKey, JSON.stringify(metadata))
        resolve()
      }

      request.onerror = () => reject(request.error)
    })
  }

  // Store files as Blobs in IndexedDB
  async saveSongFiles(songId: string, files: Record<string, File>): Promise<void> {
    if (!this.db) await this.init()

    // Convert Files to Blobs for storage
    const filesData: Record<string, Blob> = {}
    const metadata: Record<string, { name: string, type: string }> = {}

    for (const [stemName, file] of Object.entries(files)) {
      filesData[stemName] = file
      metadata[stemName] = {
        name: file.name,
        type: file.type
      }
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      
      // Store files and metadata
      const request = store.put({
        id: songId,
        files: filesData,
        metadata
      })

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async loadSongFiles(songId: string): Promise<Record<string, File> | null> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.get(songId)

      request.onsuccess = () => {
        const data = request.result
        if (!data || !data.files) {
          resolve(null)
          return
        }

        // Convert Blobs back to Files
        const files: Record<string, File> = {}
        for (const [stemName, blob] of Object.entries(data.files)) {
          if (blob instanceof Blob && data.metadata?.[stemName]) {
            const meta = data.metadata[stemName]
            files[stemName] = new File([blob], meta.name, { type: meta.type })
          }
        }

        resolve(files)
      }

      request.onerror = () => reject(request.error)
    })
  }
}

export const useLibraryStore = defineStore('library', () => {
  const storage = new SongLibraryStorage()
  const songs = ref<SongMetadata[]>([])
  const isLoading = ref(false)

  async function init() {
    isLoading.value = true
    try {
      await storage.init()
      await loadSongs()
    } catch (error) {
      console.error('Failed to initialize library storage:', error)
    } finally {
      isLoading.value = false
    }
  }

  async function loadSongs() {
    songs.value = storage.getAllMetadata()
  }

  async function addSong(
    title: string,
    files: Record<string, File>
  ): Promise<string> {
    const id = `song_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const stems = Object.keys(files)

    const song: SongMetadata = {
      id,
      title,
      stems,
      createdAt: Date.now()
    }

    // Save files to IndexedDB
    await storage.saveSongFiles(id, files)
    
    // Save metadata
    await storage.saveMetadata(song)
    
    // Reload songs list
    await loadSongs()

    return id
  }

  async function deleteSong(id: string) {
    await storage.deleteSong(id)
    await loadSongs()
  }

  async function getSong(id: string): Promise<StoredSong | null> {
    const metadata = songs.value.find(s => s.id === id)
    if (!metadata) return null

    const files = await storage.loadSongFiles(id)
    if (!files) return null

    return {
      ...metadata,
      files
    }
  }

  return {
    songs,
    isLoading,
    init,
    loadSongs,
    addSong,
    deleteSong,
    getSong
  }
})
