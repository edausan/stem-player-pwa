<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        @click.self="$emit('update:modelValue', false)"
      >
        <div class="bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4 border border-gray-800">
          <!-- Header -->
          <div class="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 class="text-2xl font-bold text-white">Edit Song</h2>
            <button
              @click="$emit('update:modelValue', false)"
              class="text-gray-400 hover:text-white transition-colors"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Content -->
          <div class="px-6 py-6">
            <!-- Error Message -->
            <div
              v-if="error"
              class="mb-4 p-3 bg-red-900/50 border border-red-700 rounded text-red-300 text-sm"
            >
              {{ error }}
            </div>

            <!-- Success Message -->
            <div
              v-if="successMessage"
              class="mb-4 p-3 bg-green-900/50 border border-green-700 rounded text-green-300 text-sm"
            >
              {{ successMessage }}
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
              <div v-if="authStore.isAuthenticated" class="bg-gray-800 rounded-lg p-4 border border-gray-700">
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

              <!-- Action Buttons -->
              <div class="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  @click="$emit('update:modelValue', false)"
                  class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  :disabled="isSaving || !songTitle.trim()"
                  class="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
                >
                  {{ isSaving ? 'Saving...' : 'Save Changes' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useLibraryStore, type SongMetadata } from '../stores/libraryStore'
import { useAuthStore } from '../stores/authStore'

const props = defineProps<{
  modelValue: boolean
  song: SongMetadata | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'updated': []
}>()

const libraryStore = useLibraryStore()
const authStore = useAuthStore()

const songTitle = ref('')
const isPublic = ref(false)
const isSaving = ref(false)
const error = ref<string | null>(null)
const successMessage = ref('')

// Reset form when modal opens/closes or song changes
watch([() => props.modelValue, () => props.song], ([isOpen, song]) => {
  if (isOpen && song) {
    songTitle.value = song.title
    isPublic.value = song.isPublic ?? false
    error.value = null
    successMessage.value = ''
  } else if (!isOpen) {
    songTitle.value = ''
    isPublic.value = false
    error.value = null
    successMessage.value = ''
  }
}, { immediate: true })

async function handleSubmit() {
  if (!props.song || !songTitle.value.trim() || isSaving.value) return

  isSaving.value = true
  error.value = null
  successMessage.value = ''

  try {
    await libraryStore.updateSong(props.song.id, {
      title: songTitle.value.trim(),
      isPublic: isPublic.value
    })

    successMessage.value = 'Song updated successfully!'
    
    // Close modal after a brief delay
    setTimeout(() => {
      emit('update:modelValue', false)
      emit('updated')
    }, 1000)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to update song. Please try again.'
    console.error('Failed to update song:', err)
  } finally {
    isSaving.value = false
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
