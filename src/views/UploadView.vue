<template>
  <div class="min-h-screen bg-black text-white">
    <div class="container mx-auto px-4 py-8 max-w-4xl">
      <h1 class="text-4xl font-bold mb-8 text-center">Upload Song</h1>

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

        <!-- Stem Upload Sections -->
        <div class="space-y-4">
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
            :disabled="!canSubmit || isUploading"
            class="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
          >
            {{ isUploading ? 'Uploading...' : 'Upload Song' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useLibraryStore } from '../stores/libraryStore'

const emit = defineEmits<{
  cancel: []
  uploaded: [songId: string]
}>()

const libraryStore = useLibraryStore()
const songTitle = ref('')
const files = ref<Record<string, File>>({})
const isUploading = ref(false)

const requiredStems = ['drums', 'bass', 'vocals', 'others']
const optionalStems = ['guitars', 'keys']
const audioAccept = 'audio/*'

const canSubmit = computed(() => {
  return songTitle.value.trim() !== '' && 
         requiredStems.every(stem => files.value[stem] !== undefined)
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

async function handleSubmit() {
  if (!canSubmit.value || isUploading.value) return

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
      filesToUpload
    )

    // Reset form
    songTitle.value = ''
    files.value = {}

    emit('uploaded', songId)
  } catch (error) {
    console.error('Failed to upload song:', error)
    alert('Failed to upload song. Please try again.')
  } finally {
    isUploading.value = false
  }
}
</script>
