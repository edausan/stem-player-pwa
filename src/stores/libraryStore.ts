import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './authStore'
import { separateStems, validateAudioFile, type SeparationProgress } from '../services/stemSeparationService'

export interface SongMetadata {
  id: string
  title: string
  stems: string[] // List of stem names (drums, bass, vocals, etc.)
  isPublic: boolean // Whether the song is public or private
  createdAt: number
  updatedAt?: number
  userId?: string // User ID
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

export const useLibraryStore = defineStore('library', () => {
  const songs = ref<SongMetadata[]>([])
  const isLoading = ref(false)

  // Cloud storage bucket name
  const STORAGE_BUCKET = 'songs'

  async function init() {
    isLoading.value = true
    try {
      await loadSongs()
    } catch (error) {
      console.error('Failed to initialize library:', error)
    } finally {
      isLoading.value = false
    }
  }

  async function loadSongs() {
    if (!navigator.onLine) {
      songs.value = []
      return
    }

    try {
      const authStore = useAuthStore()
      
      // Get public songs (always available)
      const publicSongs = await getPublicSongs()
      
      // Get user's songs if authenticated
      const userSongs = authStore.isAuthenticated ? await getCloudSongs() : []

      // Combine and deduplicate (user's songs take priority)
      const allSongs = new Map<string, CloudSongRecord>()
      
      // Add public songs first
      for (const song of publicSongs) {
        allSongs.set(song.id, song)
      }
      
      // Add/override with user's songs (includes user's own public songs)
      for (const song of userSongs) {
        allSongs.set(song.id, song)
      }

      // Convert to SongMetadata format
      songs.value = Array.from(allSongs.values()).map(cloudSong => ({
        id: cloudSong.id,
        title: cloudSong.title,
        stems: cloudSong.stems,
        isPublic: cloudSong.is_public ?? false,
        createdAt: new Date(cloudSong.created_at).getTime(),
        updatedAt: new Date(cloudSong.updated_at).getTime(),
        userId: cloudSong.user_id
      }))
    } catch (error) {
      console.error('Error loading songs from cloud:', error)
      songs.value = []
    }
  }

  async function clearLibrary() {
    // Just clear the local state - songs are in cloud
    songs.value = []
  }

  async function addSong(
    title: string,
    files: Record<string, File>,
    isPublic: boolean = false
  ): Promise<string> {
    const authStore = useAuthStore()
    if (!authStore.user) {
      throw new Error('User must be authenticated to upload songs')
    }

    if (!navigator.onLine) {
      throw new Error('Internet connection required to upload songs')
    }

    const id = `song_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const stems = Object.keys(files)
    const userId = authStore.user.id

    // Upload files directly to Supabase Storage
    for (const [stemName, file] of Object.entries(files)) {
      const filePath = `${userId}/songs/${id}/${stemName}`
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type
        })

      if (uploadError) {
        console.error(`Error uploading ${stemName}:`, uploadError)
        throw new Error(`Failed to upload ${stemName}: ${uploadError.message}`)
      }
    }

    // Save metadata to Supabase database
    const { error: dbError } = await supabase
      .from('songs')
      .insert({
        id,
        user_id: userId,
        title,
        stems,
        is_public: isPublic,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (dbError) {
      console.error('Error saving song metadata:', dbError)
      throw new Error(`Failed to save song: ${dbError.message}`)
    }

    // Reload songs list
    await loadSongs()

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
    const authStore = useAuthStore()
    if (!authStore.user) {
      throw new Error('User must be authenticated to update songs')
    }

    if (!navigator.onLine) {
      throw new Error('Internet connection required to update songs')
    }

    // Get current song metadata
    const currentSong = songs.value.find(s => s.id === id)
    if (!currentSong) {
      throw new Error('Song not found')
    }

    // Check if user owns the song
    if (currentSong.userId && currentSong.userId !== authStore.user.id) {
      throw new Error('You can only edit your own songs')
    }

    // Update in Supabase database
    const updateData: { title?: string; is_public?: boolean; updated_at: string } = {
      updated_at: new Date().toISOString()
    }

    if (updates.title !== undefined) {
      updateData.title = updates.title
    }
    if (updates.isPublic !== undefined) {
      updateData.is_public = updates.isPublic
    }

    const { error: dbError } = await supabase
      .from('songs')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', authStore.user.id)

    if (dbError) {
      console.error('Error updating song:', dbError)
      throw new Error(`Failed to update song: ${dbError.message}`)
    }

    await loadSongs()
  }

  async function deleteSong(id: string) {
    const authStore = useAuthStore()
    if (!authStore.user) {
      throw new Error('User must be authenticated to delete songs')
    }

    if (!navigator.onLine) {
      throw new Error('Internet connection required to delete songs')
    }

    // Get song to know which files to delete
    const song = songs.value.find(s => s.id === id)
    if (!song) {
      throw new Error('Song not found')
    }

    // Check if user owns the song
    if (song.userId && song.userId !== authStore.user.id) {
      throw new Error('You can only delete your own songs')
    }

    const userId = authStore.user.id

    // Delete files from storage
    if (song.stems && song.stems.length > 0) {
      const filePaths = song.stems.map(stem => `${userId}/songs/${id}/${stem}`)
      const { error: deleteError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove(filePaths)

      if (deleteError) {
        console.error('Error deleting files from storage:', deleteError)
        // Continue with database deletion even if file deletion fails
      }
    }

    // Delete metadata from database
    const { error: dbError } = await supabase
      .from('songs')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (dbError) {
      console.error('Error deleting song from database:', dbError)
      throw new Error(`Failed to delete song: ${dbError.message}`)
    }

    await loadSongs()
  }

  async function getSong(id: string): Promise<StoredSong | null> {
    const authStore = useAuthStore()
    if (!authStore.isAuthenticated || !navigator.onLine) {
      return null
    }

    // Download from cloud
    const cloudSong = await downloadSongFromCloud(id)
    if (cloudSong) {
      return cloudSong
    }

    return null
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
        userId: cloudSong.user_id,
        files
      }

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

  async function loadAllSongs(): Promise<void> {
    await loadSongs()
  }

  return {
    songs,
    isLoading,
    init,
    loadSongs,
    loadAllSongs,
    clearLibrary,
    addSong,
    addSongWithSeparation,
    updateSong,
    deleteSong,
    getSong,
    downloadSongFromCloud,
    getCloudSongs,
    getPublicSongs
  }
})
