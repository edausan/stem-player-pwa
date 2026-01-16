<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        @click.self="$emit('update:modelValue', false)"
      >
        <div class="bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col border border-gray-800">
          <!-- Header -->
          <div class="px-6 py-4 border-b border-gray-800">
            <h2 class="text-2xl font-bold text-white">Upload</h2>
            <p class="text-sm text-gray-400 mt-1">Upload stems or a single song to separate</p>
            
            <!-- Mode Toggle -->
            <div class="mt-4 flex gap-2">
              <button
                @click="uploadMode = 'stems'"
                :class="[
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
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
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  uploadMode === 'song'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                ]"
              >
                Upload Song
              </button>
            </div>
          </div>

          <!-- Content -->
          <div class="px-6 py-4 overflow-y-auto flex-1">
            <!-- Song Title Input -->
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Song Title
              </label>
              <input
                v-model="localSongTitle"
                type="text"
                placeholder="Enter song title..."
                class="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              />
            </div>

            <!-- Upload Song Mode -->
            <div v-if="uploadMode === 'song'" class="mb-6">
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Song File
              </label>
              <div
                @drop="handleSongDrop"
                @dragover.prevent
                @dragenter.prevent="handleDragEnter"
                @dragleave.prevent="handleDragLeave"
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
                  @click="songFileInputRef?.click()"
                  :disabled="isSeparating"
                  class="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors mb-2"
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

            <!-- Upload Stems Mode -->
            <template v-else>
              <!-- File Upload Area -->
              <div class="mb-6">
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  Audio Files
                </label>
                <div
                  @drop="handleDrop"
                  @dragover.prevent
                  @dragenter.prevent="handleDragEnter"
                  @dragleave.prevent="handleDragLeave"
                  class="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-purple-600 transition-colors cursor-pointer"
                  :class="{ 'border-purple-600 bg-purple-900/10': isDragging }"
                >
                  <input
                    ref="fileInputRef"
                    type="file"
                    multiple
                    accept="audio/*"
                    @change="handleFileSelect"
                    class="hidden"
                  />
                  <button
                    @click="fileInputRef?.click()"
                    class="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg transition-colors mb-2"
                  >
                    Select Files
                  </button>
                  <p class="text-sm text-gray-400 mt-2">or drag and drop audio files here</p>
                </div>
              </div>

              <!-- File List -->
              <div v-if="files.length > 0" class="space-y-3">
                <h3 class="text-sm font-medium text-gray-300 mb-3">Selected Files</h3>
                <div
                  v-for="(file, index) in files"
                  :key="index"
                  class="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors"
                >
                  <div class="flex items-start gap-4">
                    <!-- File Info -->
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-white truncate">{{ getFileName(file) }}</p>
                    <p class="text-xs text-gray-400 mt-1">
                      {{ formatFileSize(getFileSize(file)) }} • {{ getFileType(getFileName(file)) }}
                    </p>
                  </div>

                    <!-- Stem Assignment -->
                    <div class="flex items-center gap-2">
                      <select
                        :value="file.assignedStem"
                        @change="(e) => handleStemChange(index, (e.target as HTMLSelectElement).value)"
                        class="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                      >
                        <option value="drums">Drums</option>
                        <option value="bass">Bass</option>
                        <option value="vocals">Vocals</option>
                        <option value="others">Others</option>
                      </select>
                      <button
                        @click="removeFile(index)"
                        class="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div v-if="file.displayName !== file.assignedStem" class="mt-2 text-xs text-gray-500">
                    Will be assigned as: <span class="text-purple-400">{{ file.displayName }}</span>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <!-- Footer -->
          <div class="px-6 py-4 border-t border-gray-800 flex justify-end gap-3">
            <button
              @click="$emit('update:modelValue', false)"
              class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              v-if="uploadMode === 'stems'"
              @click="handleLoadStems"
              :disabled="files.length === 0 || isLoading"
              class="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
            >
              {{ isLoading ? 'Loading...' : 'Load Stems' }}
            </button>
            <button
              v-else
              @click="handleSeparateAndLoad"
              :disabled="!selectedSongFile || isSeparating || localSongTitle.trim() === ''"
              class="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
            >
              {{ isSeparating ? 'Separating...' : 'Separate & Load' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePlayerStore } from '../stores/playerStore'
import { useLibraryStore } from '../stores/libraryStore'
import { validateAudioFile, type SeparationProgress } from '../services/stemSeparationService'

interface FileWithStem {
  file: File
  detectedStem: string | null
  assignedStem: string
  displayName: string
}

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'loaded': []
}>()

const store = usePlayerStore()
const libraryStore = useLibraryStore()
const files = ref<FileWithStem[]>([])
const localSongTitle = ref('')
const isDragging = ref(false)
const isLoading = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const songFileInputRef = ref<HTMLInputElement | null>(null)
const uploadMode = ref<'stems' | 'song'>('stems')
const selectedSongFile = ref<File | null>(null)
const isSeparating = ref(false)
const separationProgress = ref<SeparationProgress>({
  status: 'uploading',
  message: '',
  progress: 0
})
const separationError = ref<string | null>(null)

const stemOptions = ['drums', 'bass', 'vocals', 'others']

// Sync song title with store when modal opens
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    localSongTitle.value = store.songTitle
  } else {
    // Reset files when modal closes without loading
    if (!isLoading.value && !isSeparating.value) {
      files.value = []
      localSongTitle.value = ''
      selectedSongFile.value = null
      separationError.value = null
      uploadMode.value = 'stems'
    }
  }
})

function detectStemFromFilename(filename: string): string | null {
  const lower = filename.toLowerCase()
  
  if (lower.includes('drums') || lower.includes('drum')) {
    return 'drums'
  }
  if (lower.includes('bass')) {
    return 'bass'
  }
  if (lower.includes('vocals') || lower.includes('vox') || lower.includes('vocal')) {
    return 'vocals'
  }
  
  return null
}

function getNextStemName(baseStem: string, assignedStems: string[]): string {
  if (!assignedStems.includes(baseStem)) {
    return baseStem
  }
  
  let suffix = 2
  let candidate = `${baseStem}-${suffix}`
  while (assignedStems.includes(candidate)) {
    suffix++
    candidate = `${baseStem}-${suffix}`
  }
  
  return candidate
}

function assignStem(fileIndex: number, stemType: string) {
  const assignedStems = files.value.map(f => f.displayName)
  const baseStem = stemType
  const finalStem = getNextStemName(baseStem, assignedStems)
  
  files.value[fileIndex].assignedStem = stemType
  files.value[fileIndex].displayName = finalStem
}

function handleStemChange(index: number, stemType: string) {
  assignStem(index, stemType)
  
  // Re-assign all stems to handle conflicts
  reassignAllStems()
}

function reassignAllStems() {
  // Create a map to track assigned stems
  const assignedStems: string[] = []
  
  files.value.forEach((file) => {
    const baseStem = file.assignedStem
    const finalStem = getNextStemName(baseStem, assignedStems)
    file.displayName = finalStem
    assignedStems.push(finalStem)
  })
}

function addFiles(fileList: FileList) {
  const newFiles: FileWithStem[] = []
  
  Array.from(fileList).forEach(file => {
    // Check if it's an audio file
    if (!file.type.startsWith('audio/') && !/\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.name)) {
      return
    }
    
    const detectedStem = detectStemFromFilename(file.name)
    const assignedStem = detectedStem || 'others'
    
    newFiles.push({
      file,
      detectedStem,
      assignedStem,
      displayName: assignedStem
    })
  })
  
  files.value.push(...newFiles)
  reassignAllStems()
}

function handleFileSelect(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    addFiles(target.files)
  }
  // Reset input so same file can be selected again
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

function handleDragEnter(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  isDragging.value = true
}

function handleDragLeave(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  // Check if we're actually leaving the drop zone
  const relatedTarget = e.relatedTarget as HTMLElement
  const currentTarget = e.currentTarget as HTMLElement
  if (!currentTarget.contains(relatedTarget)) {
    isDragging.value = false
  }
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
  
  if (e.dataTransfer?.files) {
    addFiles(e.dataTransfer.files)
  }
}

function removeFile(index: number) {
  files.value.splice(index, 1)
  reassignAllStems()
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

function getFileName(fileWithStem: FileWithStem): string {
  return fileWithStem.file.name
}

function getFileSize(fileWithStem: FileWithStem): number {
  return fileWithStem.file.size
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
  }
  // Reset input so same file can be selected again
  if (songFileInputRef.value) {
    songFileInputRef.value.value = ''
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
  }
}

async function handleSeparateAndLoad() {
  if (!selectedSongFile.value || localSongTitle.value.trim() === '') return
  
  isSeparating.value = true
  separationError.value = null
  
  try {
    // Set song title
    store.setSongTitle(localSongTitle.value)
    
    // Separate stems and add to library
    const songId = await libraryStore.addSongWithSeparation(
      localSongTitle.value.trim(),
      selectedSongFile.value,
      false, // isPublic - could be made configurable
      (progress) => {
        separationProgress.value = progress
        if (progress.status === 'error') {
          separationError.value = progress.message
        }
      }
    )
    
    // Load the separated stems into the player
    const song = await libraryStore.getSong(songId)
    if (song && song.files) {
      const loadPromises = Object.entries(song.files).map(([stemName, file]) =>
        store.engine.loadStem(stemName, file)
      )
      await Promise.all(loadPromises)
      store.updateState()
    }
    
    // Reset and close
    selectedSongFile.value = null
    localSongTitle.value = ''
    separationError.value = null
    
    emit('update:modelValue', false)
    emit('loaded')
  } catch (error) {
    console.error('Error separating stems:', error)
    separationError.value = error instanceof Error ? error.message : 'Failed to separate stems. Please try again.'
  } finally {
    isSeparating.value = false
  }
}

async function handleLoadStems() {
  if (files.value.length === 0) return
  
  isLoading.value = true
  
  try {
    // Set song title
    store.setSongTitle(localSongTitle.value)
    
    // Load all files
    const loadPromises = files.value.map(fileWithStem =>
      store.engine.loadStem(fileWithStem.displayName, fileWithStem.file)
    )
    
    await Promise.all(loadPromises)
    
    // Update state
    store.updateState()
    
    // Reset and close
    files.value = []
    localSongTitle.value = ''
    
    emit('update:modelValue', false)
    emit('loaded')
  } catch (error) {
    console.error('Error loading stems:', error)
    alert('Error loading stems. Please try again.')
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .bg-gray-900,
.modal-leave-active .bg-gray-900 {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.modal-enter-from .bg-gray-900,
.modal-leave-to .bg-gray-900 {
  opacity: 0;
  transform: scale(0.95);
}
</style>
