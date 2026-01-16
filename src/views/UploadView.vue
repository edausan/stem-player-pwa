<template>
  <div class="min-h-screen bg-black text-white">
    <div class="container mx-auto px-4 py-8 max-w-4xl">
      <h1 class="text-4xl font-bold mb-8 text-center">Upload Song</h1>

      <!-- Auth Notice -->
      <div
        v-if="!authStore.isAuthenticated"
        class="mb-6 p-4 bg-yellow-900/30 border border-yellow-700 rounded-lg"
      >
        <p class="text-sm text-yellow-300">
          <strong>Note:</strong> You're not signed in. Songs will be saved locally and can be synced to the cloud after you sign in.
        </p>
      </div>

      <!-- Mode Toggle -->
      <div class="mb-6 flex justify-center gap-2">
        <button
          @click="uploadMode = 'stems'"
          :class="[
            'px-6 py-3 rounded-lg font-medium transition-colors',
            uploadMode === 'stems'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          ]"
        >
          Upload Stems
        </button>
        <button
          @click="uploadMode = 'song'"
          :class="[
            'px-6 py-3 rounded-lg font-medium transition-colors',
            uploadMode === 'song'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          ]"
        >
          Upload Song (Auto-Separate)
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Song Title Input -->
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">
            Song Title *
          </label>
          <input
            v-model="songTitle"
            type="text"
            required
            placeholder="Enter song title..."
            class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
          />
        </div>

        <!-- Visibility Toggle -->
        <div v-if="authStore.isAuthenticated" class="bg-gray-900 rounded-lg p-4 border border-gray-800">
          <label class="block text-sm font-medium text-gray-300 mb-3">
            Visibility
          </label>
          <div class="flex gap-4">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="isPublic"
                type="radio"
                :value="false"
                class="w-4 h-4 text-purple-600 bg-gray-800 border-gray-600 focus:ring-purple-500"
              />
              <div>
                <span class="text-sm font-medium text-gray-300">Private</span>
                <p class="text-xs text-gray-500">Only visible to you</p>
              </div>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="isPublic"
                type="radio"
                :value="true"
                class="w-4 h-4 text-purple-600 bg-gray-800 border-gray-600 focus:ring-purple-500"
              />
              <div>
                <span class="text-sm font-medium text-gray-300">Public</span>
                <p class="text-xs text-gray-500">Visible to everyone</p>
              </div>
            </label>
          </div>
        </div>

        <!-- Upload Song Mode -->
        <div v-if="uploadMode === 'song'" class="space-y-4">
          <h2 class="text-xl font-semibold text-gray-300 mb-4">Upload Song File</h2>
          
          <div class="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <label class="block text-sm font-medium text-gray-300 mb-3">
              Song File *
            </label>
            <div
              @drop="handleSongDrop"
              @dragover.prevent
              @dragenter.prevent="handleSongDragEnter"
              @dragleave.prevent="handleSongDragLeave"
              class="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-purple-600 transition-colors cursor-pointer"
              :class="{ 'border-purple-600 bg-purple-900/10': isDragging }"
            >
              <input
                ref="songFileInputRef"
                type="file"
                accept="audio/*"
                @change="handleSongFileSelect"
                class="hidden"
              />
              <button
                type="button"
                @click="songFileInputRef?.click()"
                :disabled="isSeparating"
                class="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors mb-2"
              >
                Select Song File
              </button>
              <p class="text-sm text-gray-400 mt-2">or drag and drop a song file here</p>
              <p class="text-xs text-gray-500 mt-1">Supported: MP3, WAV, M4A, AAC, OGG, FLAC (max 50MB)</p>
            </div>

            <!-- Selected Song File -->
            <div v-if="selectedSongFile" class="mt-4 bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div class="flex items-center justify-between">
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-white truncate">{{ selectedSongFile.name }}</p>
                  <p class="text-xs text-gray-400 mt-1">
                    {{ formatFileSize(selectedSongFile.size) }} • {{ getFileType(selectedSongFile.name) }}
                  </p>
                </div>
                <button
                  v-if="!isSeparating"
                  type="button"
                  @click="selectedSongFile = null"
                  class="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-500 text-white rounded transition-colors ml-4"
                >
                  Remove
                </button>
              </div>
            </div>

            <!-- Separation Progress -->
            <div v-if="isSeparating" class="mt-4 bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div class="flex items-center gap-3 mb-2">
                <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                <div class="flex-1">
                  <p class="text-sm font-medium text-white">{{ separationProgress.message }}</p>
                  <div v-if="separationProgress.progress !== undefined" class="mt-2">
                    <div class="w-full bg-gray-700 rounded-full h-2">
                      <div
                        class="bg-purple-600 h-2 rounded-full transition-all duration-300"
                        :style="{ width: `${separationProgress.progress}%` }"
                      ></div>
                    </div>
                    <p class="text-xs text-gray-400 mt-1">{{ separationProgress.progress }}%</p>
                  </div>
                </div>
              </div>
              <p v-if="separationError" class="text-sm text-red-400 mt-2">{{ separationError }}</p>
            </div>
          </div>
        </div>

        <!-- Upload Stems Mode -->
        <div v-else class="space-y-4">
          <h2 class="text-xl font-semibold text-gray-300 mb-4">Upload Stems</h2>
          
          <!-- Required Stems -->
          <div v-for="stem in requiredStems" :key="stem" class="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <div class="flex items-center justify-between mb-3">
              <label class="text-sm font-medium text-gray-300 capitalize">
                {{ stem }} *
              </label>
              <span v-if="files[stem]" class="text-xs text-green-400">✓ Uploaded</span>
            </div>
            <input
              type="file"
              :accept="audioAccept"
              @change="(e) => handleFileChange(stem, e)"
              class="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-500 file:cursor-pointer cursor-pointer"
            />
            <p v-if="files[stem]" class="text-xs text-gray-400 mt-2">
              {{ files[stem]!.name }} ({{ formatFileSize(files[stem]!.size) }})
            </p>
          </div>

          <!-- Optional Stems -->
          <div v-for="stem in optionalStems" :key="stem" class="bg-gray-900 rounded-lg p-4 border border-gray-800 opacity-75">
            <div class="flex items-center justify-between mb-3">
              <label class="text-sm font-medium text-gray-300 capitalize">
                {{ stem }}
                <span class="text-xs text-gray-500 ml-1">(optional)</span>
              </label>
              <span v-if="files[stem]" class="text-xs text-green-400">✓ Uploaded</span>
            </div>
            <input
              type="file"
              :accept="audioAccept"
              @change="(e) => handleFileChange(stem, e)"
              class="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-500 file:cursor-pointer cursor-pointer"
            />
            <p v-if="files[stem]" class="text-xs text-gray-400 mt-2">
              {{ files[stem]!.name }} ({{ formatFileSize(files[stem]!.size) }})
            </p>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end gap-4 pt-4">
          <button
            type="button"
            @click="$emit('cancel')"
            class="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="!canSubmit || isUploading || isSeparating"
            class="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
          >
            {{ isSeparating ? 'Separating...' : isUploading ? 'Uploading...' : 'Upload Song' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useLibraryStore } from '../stores/libraryStore'
import { useAuthStore } from '../stores/authStore'
import { validateAudioFile, type SeparationProgress } from '../services/stemSeparationService'

const emit = defineEmits<{
  cancel: []
  uploaded: [songId: string]
}>()

const libraryStore = useLibraryStore()
const authStore = useAuthStore()
const songTitle = ref('')
const files = ref<Record<string, File>>({})
const isUploading = ref(false)
const isPublic = ref(false)
const uploadMode = ref<'stems' | 'song'>('stems')
const selectedSongFile = ref<File | null>(null)
const songFileInputRef = ref<HTMLInputElement | null>(null)
const isSeparating = ref(false)
const isDragging = ref(false)
const separationProgress = ref<SeparationProgress>({
  status: 'uploading',
  message: '',
  progress: 0
})
const separationError = ref<string | null>(null)

const requiredStems = ['drums', 'bass', 'vocals', 'others']
const optionalStems = ['guitars', 'keys']
const audioAccept = 'audio/*'

const canSubmit = computed(() => {
  if (uploadMode.value === 'song') {
    return songTitle.value.trim() !== '' && selectedSongFile.value !== null && !isSeparating.value
  } else {
    return songTitle.value.trim() !== '' && 
           requiredStems.every(stem => files.value[stem] !== undefined)
  }
})

function handleFileChange(stem: string, event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    const file = input.files[0]
    // Validate it's an audio file
    if (file.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.name)) {
      files.value[stem] = file
    } else {
      alert('Please select an audio file')
      input.value = ''
    }
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

function getFileType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  return ext.toUpperCase()
}

function handleSongFileSelect(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    const file = target.files[0]
    const validation = validateAudioFile(file)
    if (!validation.valid) {
      alert(validation.error || 'Invalid audio file')
      if (songFileInputRef.value) {
        songFileInputRef.value.value = ''
      }
      return
    }
    selectedSongFile.value = file
    separationError.value = null
  }
  // Reset input so same file can be selected again
  if (songFileInputRef.value) {
    songFileInputRef.value.value = ''
  }
}

function handleSongDragEnter(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  isDragging.value = true
}

function handleSongDragLeave(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  const relatedTarget = e.relatedTarget as HTMLElement
  const currentTarget = e.currentTarget as HTMLElement
  if (!currentTarget.contains(relatedTarget)) {
    isDragging.value = false
  }
}

function handleSongDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
  
  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    const file = e.dataTransfer.files[0]
    const validation = validateAudioFile(file)
    if (!validation.valid) {
      alert(validation.error || 'Invalid audio file')
      return
    }
    selectedSongFile.value = file
    separationError.value = null
  }
}

async function handleSubmit() {
  if (!canSubmit.value || isUploading.value || isSeparating.value) return

  if (uploadMode.value === 'song') {
    // Handle song separation
    if (!selectedSongFile.value) return
    
    isSeparating.value = true
    separationError.value = null

    try {
      const songId = await libraryStore.addSongWithSeparation(
        songTitle.value.trim(),
        selectedSongFile.value,
        isPublic.value,
        (progress) => {
          separationProgress.value = progress
          if (progress.status === 'error') {
            separationError.value = progress.message
          }
        }
      )

      // Reset form
      songTitle.value = ''
      selectedSongFile.value = null
      isPublic.value = false
      separationError.value = null

      emit('uploaded', songId)
    } catch (error) {
      console.error('Failed to separate and upload song:', error)
      separationError.value = error instanceof Error ? error.message : 'Failed to separate stems. Please try again.'
    } finally {
      isSeparating.value = false
    }
  } else {
    // Handle stem upload
    isUploading.value = true

    try {
      // Filter out optional stems that weren't uploaded
      const filesToUpload: Record<string, File> = {}
      for (const [stem, file] of Object.entries(files.value)) {
        if (file) {
          filesToUpload[stem] = file
        }
      }

      const songId = await libraryStore.addSong(
        songTitle.value.trim(),
        filesToUpload,
        isPublic.value
      )

      // Reset form
      songTitle.value = ''
      files.value = {}
      isPublic.value = false

      emit('uploaded', songId)
    } catch (error) {
      console.error('Failed to upload song:', error)
      alert('Failed to upload song. Please try again.')
    } finally {
      isUploading.value = false
    }
  }
}
</script>
