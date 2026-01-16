import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './authStore'
import { syncService } from '../services/syncService'
import { separateStems, validateAudioFile, type SeparationProgress } from '../services/stemSeparationService'

export interface SongMetadata {
  id: string
  title: string
  stems: string[] // List of stem names (drums, bass, vocals, etc.)
  isPublic: boolean // Whether the song is public or private
  createdAt: number
  updatedAt?: number
  syncedAt?: number // When last synced to cloud
  userId?: string // User ID if synced to cloud
}

export interface CloudSongRecord {
  id: string
  user_id: string
  title: string
  stems: string[]
  is_public: boolean
  created_at: string
  updated_at: string
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
      const metadata = JSON.parse(data)
      // Ensure backward compatibility: add isPublic field if missing
      return metadata.map((song: SongMetadata) => ({
        ...song,
        isPublic: song.isPublic ?? false
      }))
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
  const isSyncing = ref(false)

  // Cloud storage bucket name
  const STORAGE_BUCKET = 'songs'

  async function init() {
    isLoading.value = true
    try {
      await storage.init()
      await loadSongs()

      // Load sync queue
      syncService.loadQueue()

      // If authenticated and online, sync from cloud
      const authStore = useAuthStore()
      if (authStore.isAuthenticated && navigator.onLine) {
        // Background sync (non-blocking)
        syncService.fullSync().catch(err => {
          console.error('Initial sync error:', err)
        })
      }
    } catch (error) {
      console.error('Failed to initialize library storage:', error)
    } finally {
      isLoading.value = false
    }
  }

  async function loadSongs() {
    songs.value = storage.getAllMetadata()
  }

  async function clearLibrary() {
    // Clear all songs from local storage
    const allSongIds = songs.value.map(song => song.id)
    for (const songId of allSongIds) {
      await storage.deleteSong(songId)
    }
    songs.value = []
  }

  async function addSong(
    title: string,
    files: Record<string, File>,
    isPublic: boolean = false
  ): Promise<string> {
    const id = `song_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const stems = Object.keys(files)

    const song: SongMetadata = {
      id,
      title,
      stems,
      isPublic,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    // Always save locally first (offline-first)
    await storage.saveSongFiles(id, files)
    await storage.saveMetadata(song)
    
    // Reload songs list
    await loadSongs()

    // Queue for cloud sync if authenticated and online
    const authStore = useAuthStore()
    if (authStore.isAuthenticated && navigator.onLine) {
      syncService.queueOperation('upload', id)
      // Try immediate sync (non-blocking)
      syncService.processQueue().catch(err => {
        console.error('Background sync error:', err)
      })
    } else if (authStore.isAuthenticated) {
      // Queue for later when online
      syncService.queueOperation('upload', id)
    }

    return id
  }

  async function addSongWithSeparation(
    title: string,
    songFile: File,
    isPublic: boolean = false,
    onProgress?: (progress: SeparationProgress) => void
  ): Promise<string> {
    // Validate audio file
    const validation = validateAudioFile(songFile)
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid audio file')
    }

    // Separate stems
    const separatedStems = await separateStems(songFile, onProgress)

    // Convert separated stems to the format expected by addSong
    const files: Record<string, File> = {
      drums: separatedStems.drums,
      bass: separatedStems.bass,
      vocals: separatedStems.vocals,
      other: separatedStems.other
    }

    // Use existing addSong method to save
    return await addSong(title, files, isPublic)
  }

  async function updateSong(
    id: string,
    updates: { title?: string; isPublic?: boolean }
  ): Promise<void> {
    // Get current song metadata
    const currentSong = songs.value.find(s => s.id === id)
    if (!currentSong) {
      throw new Error('Song not found')
    }

    // Check if user owns the song (for authenticated users)
    const authStore = useAuthStore()
    if (authStore.isAuthenticated && currentSong.userId && currentSong.userId !== authStore.user?.id) {
      throw new Error('You can only edit your own songs')
    }

    // Update song metadata
    const updatedSong: SongMetadata = {
      ...currentSong,
      ...updates,
      updatedAt: Date.now()
    }

    // Save locally first (offline-first)
    await storage.saveMetadata(updatedSong)
    await loadSongs()

    // Queue for cloud sync if authenticated and online
    if (authStore.isAuthenticated && navigator.onLine) {
      syncService.queueOperation('upload', id)
      // Try immediate sync (non-blocking)
      syncService.processQueue().catch(err => {
        console.error('Background sync error:', err)
      })
    } else if (authStore.isAuthenticated) {
      // Queue for later when online
      syncService.queueOperation('upload', id)
    }
  }

  async function deleteSong(id: string) {
    // Always delete locally first (offline-first)
    await storage.deleteSong(id)
    await loadSongs()

    // Queue cloud deletion if authenticated
    const authStore = useAuthStore()
    if (authStore.isAuthenticated) {
      syncService.queueOperation('delete', id)
      // Try immediate sync if online (non-blocking)
      if (navigator.onLine) {
        syncService.processQueue().catch(err => {
          console.error('Background sync error:', err)
        })
      }
    }
  }

  async function getSong(id: string): Promise<StoredSong | null> {
    // First try local
    let metadata = songs.value.find(s => s.id === id)
    let files = await storage.loadSongFiles(id)

    // If not found locally and user is authenticated, try cloud
    if (!metadata || !files) {
      const authStore = useAuthStore()
      if (authStore.isAuthenticated && navigator.onLine) {
        const cloudSong = await downloadSongFromCloud(id)
        if (cloudSong) {
          return cloudSong
        }
      }
    }

    if (!metadata || !files) return null

    return {
      ...metadata,
      files
    }
  }

  // Cloud methods
  async function uploadSongToCloud(songId: string): Promise<boolean> {
    const authStore = useAuthStore()
    if (!authStore.user) {
      console.warn('Cannot upload to cloud: User not authenticated')
      return false
    }

    try {
      // Get song from local storage
      const song = await storage.getSong(songId)
      if (!song) {
        console.error('Song not found locally:', songId)
        return false
      }

      const userId = authStore.user.id

      // Upload files to Supabase Storage
      for (const [stemName, file] of Object.entries(song.files)) {
        const filePath = `${userId}/songs/${songId}/${stemName}`
        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(filePath, file, {
            upsert: true,
            contentType: file.type
          })

        if (uploadError) {
          console.error(`Error uploading ${stemName}:`, uploadError)
          return false
        }
      }

      // Save metadata to Supabase database
      const { error: dbError } = await supabase
        .from('songs')
        .upsert({
          id: songId,
          user_id: userId,
          title: song.title,
          stems: song.stems,
          is_public: song.isPublic ?? false,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        })

      if (dbError) {
        console.error('Error saving song metadata:', dbError)
        return false
      }

      // Update local metadata with sync info
      const updatedSong: SongMetadata = {
        ...song,
        syncedAt: Date.now(),
        userId,
        updatedAt: Date.now()
      }
      await storage.saveMetadata(updatedSong)

      return true
    } catch (error) {
      console.error('Error uploading song to cloud:', error)
      return false
    }
  }

  async function downloadSongFromCloud(songId: string, allowPublic: boolean = true): Promise<StoredSong | null> {
    const authStore = useAuthStore()
    
    // For public songs, allow download even if not authenticated
    if (!authStore.user && !allowPublic) {
      return null
    }

    try {
      const userId = authStore.user?.id

      // Build query - if allowPublic, check for public songs or user's own songs
      let query = supabase
        .from('songs')
        .select('*')
        .eq('id', songId)

      if (allowPublic && !userId) {
        // Guest user can only access public songs
        query = query.eq('is_public', true)
      } else if (userId) {
        // Authenticated user can access their own songs or public songs
        // RLS policy will handle this, so we just query by ID
        // The policy allows: user_id = auth.uid() OR is_public = TRUE
      }

      const { data: cloudSong, error: dbError } = await query.single()

      if (dbError || !cloudSong) {
        console.error('Song not found in cloud:', dbError)
        return null
      }

      // For public songs downloaded by guest users, use the song's owner ID
      const fileUserId = userId || cloudSong.user_id

      // Download files from storage
      const files: Record<string, File> = {}
      for (const stemName of cloudSong.stems) {
        const filePath = `${fileUserId}/songs/${songId}/${stemName}`
        const { data: fileData, error: downloadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .download(filePath)

        if (downloadError || !fileData) {
          console.error(`Error downloading ${stemName}:`, downloadError)
          return null
        }

        // Convert blob to File
        files[stemName] = new File([fileData], `${stemName}.mp3`, { type: fileData.type || 'audio/mpeg' })
      }

      // Convert cloud record to local format
      const song: StoredSong = {
        id: cloudSong.id,
        title: cloudSong.title,
        stems: cloudSong.stems,
        isPublic: cloudSong.is_public ?? false,
        createdAt: new Date(cloudSong.created_at).getTime(),
        updatedAt: new Date(cloudSong.updated_at).getTime(),
        syncedAt: Date.now(),
        userId: cloudSong.user_id,
        files
      }

      // For public songs downloaded by guests, mark as synced but don't set userId
      if (!userId && cloudSong.is_public) {
        song.userId = undefined
      }

      // Cache locally
      await storage.saveSongFiles(song.id, files)
      await storage.saveMetadata(song)

      return song
    } catch (error) {
      console.error('Error downloading song from cloud:', error)
      return null
    }
  }

  async function getCloudSongs(): Promise<CloudSongRecord[]> {
    const authStore = useAuthStore()
    if (!authStore.user) {
      return []
    }

    try {
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .eq('user_id', authStore.user.id)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error fetching cloud songs:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching cloud songs:', error)
      return []
    }
  }

  async function getPublicSongs(): Promise<CloudSongRecord[]> {
    try {
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .eq('is_public', true)
        .order('updated_at', { ascending: false })
        .limit(100) // Limit to prevent abuse

      if (error) {
        console.error('Error fetching public songs:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching public songs:', error)
      return []
    }
  }

  async function syncToCloud(): Promise<void> {
    const authStore = useAuthStore()
    if (!authStore.isAuthenticated || !navigator.onLine) {
      return
    }

    isSyncing.value = true

    try {
      // Upload all local songs that aren't synced or need updating
      for (const song of songs.value) {
        // Check if needs sync (no syncedAt or local updatedAt > syncedAt)
        const needsSync = !song.syncedAt || 
          (song.updatedAt && song.syncedAt && song.updatedAt > song.syncedAt)

        if (needsSync) {
          await uploadSongToCloud(song.id)
        }
      }

      await loadSongs()
    } catch (error) {
      console.error('Error syncing to cloud:', error)
    } finally {
      isSyncing.value = false
    }
  }

  async function syncFromCloud(): Promise<void> {
    const authStore = useAuthStore()
    if (!authStore.isAuthenticated || !navigator.onLine) {
      return
    }

    isSyncing.value = true

    try {
      // Get both user's songs and public songs
      const [userSongs, publicSongs] = await Promise.all([
        getCloudSongs(),
        getPublicSongs()
      ])

      // Combine and deduplicate (user's songs take priority)
      const allCloudSongs = new Map<string, CloudSongRecord>()
      
      // Add public songs first
      for (const song of publicSongs) {
        allCloudSongs.set(song.id, song)
      }
      
      // Add/override with user's songs (includes user's own public songs)
      for (const song of userSongs) {
        allCloudSongs.set(song.id, song)
      }

      // Download all songs that need updating
      for (const cloudSong of allCloudSongs.values()) {
        const localSong = songs.value.find(s => s.id === cloudSong.id)
        
        // Download if not in local or cloud is newer
        const cloudUpdated = new Date(cloudSong.updated_at).getTime()
        const shouldDownload = !localSong || 
          !localSong.syncedAt || 
          cloudUpdated > localSong.syncedAt

        if (shouldDownload) {
          await downloadSongFromCloud(cloudSong.id, cloudSong.is_public)
        }
      }

      await loadSongs()
    } catch (error) {
      console.error('Error syncing from cloud:', error)
    } finally {
      isSyncing.value = false
    }
  }

  async function loadAllSongs(): Promise<void> {
    // Load local songs first
    await loadSongs()

    // If authenticated and online, also load public and user songs from cloud
    const authStore = useAuthStore()
    if (authStore.isAuthenticated && navigator.onLine) {
      await syncFromCloud()
    }
  }

  async function deleteSongFromCloud(songId: string): Promise<boolean> {
    const authStore = useAuthStore()
    if (!authStore.user) {
      return false
    }

    try {
      const userId = authStore.user.id

      // Get song to know which files to delete
      const song = songs.value.find(s => s.id === songId)
      if (song) {
        // Delete files from storage
        const filePaths = song.stems.map(stem => `${userId}/songs/${songId}/${stem}`)
        const { error: deleteError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .remove(filePaths)

        if (deleteError) {
          console.error('Error deleting files from storage:', deleteError)
        }
      }

      // Delete metadata from database
      const { error: dbError } = await supabase
        .from('songs')
        .delete()
        .eq('id', songId)
        .eq('user_id', userId)

      if (dbError) {
        console.error('Error deleting song from database:', dbError)
        return false
      }

      return true
    } catch (error) {
      console.error('Error deleting song from cloud:', error)
      return false
    }
  }

  return {
    songs,
    isLoading,
    isSyncing,
    init,
    loadSongs,
    loadAllSongs,
    clearLibrary,
    addSong,
    addSongWithSeparation,
    updateSong,
    deleteSong,
    getSong,
    uploadSongToCloud,
    downloadSongFromCloud,
    getCloudSongs,
    getPublicSongs,
    syncToCloud,
    syncFromCloud,
    deleteSongFromCloud
  }
})
