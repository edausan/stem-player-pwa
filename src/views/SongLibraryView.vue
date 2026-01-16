<template>
  <div class="min-h-screen bg-black text-white">
    <div class="container mx-auto px-4 py-8 max-w-4xl">
      <h1 class="text-4xl font-bold mb-8 text-center">Song Library</h1>

      <!-- Empty State -->
      <div v-if="!isLoading && libraryStore.songs.length === 0" class="text-center py-16">
        <div class="mb-6">
          <svg class="w-24 h-24 mx-auto text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        </div>
        <p class="text-xl text-gray-400 mb-4">No songs in your library yet</p>
        <button
          @click="$emit('upload')"
          class="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg transition-colors duration-200 inline-flex items-center gap-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Upload Your First Song
        </button>
      </div>

      <!-- Loading State -->
      <div v-else-if="isLoading" class="text-center py-16">
        <p class="text-gray-400">Loading songs...</p>
      </div>

      <!-- Song List -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="song in libraryStore.songs"
          :key="song.id"
          @click="selectSong(song.id)"
          class="bg-gray-900 rounded-lg p-6 border border-gray-800 hover:border-purple-600 hover:bg-gray-800 cursor-pointer transition-all duration-200"
        >
          <div class="flex items-start justify-between mb-4">
            <h3 class="text-lg font-semibold text-white flex-1 pr-2">{{ song.title }}</h3>
            <button
              @click.stop="deleteSong(song.id)"
              class="text-gray-500 hover:text-red-500 transition-colors p-1"
              title="Delete song"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
          <div class="space-y-2">
            <p class="text-sm text-gray-400">
              <span class="font-medium">{{ song.stems.length }}</span> stem{{ song.stems.length !== 1 ? 's' : '' }}
            </p>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="stem in song.stems"
                :key="stem"
                class="px-2 py-1 text-xs bg-purple-900/50 text-purple-300 rounded"
              >
                {{ stem }}
              </span>
            </div>
            <p class="text-xs text-gray-500 mt-3">
              {{ formatDate(song.createdAt) }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useLibraryStore } from '../stores/libraryStore'
import { usePlayerStore } from '../stores/playerStore'

const emit = defineEmits<{
  upload: []
  select: [songId: string]
}>()

const libraryStore = useLibraryStore()
const playerStore = usePlayerStore()
const isLoading = libraryStore.isLoading

onMounted(async () => {
  if (libraryStore.songs.length === 0) {
    await libraryStore.init()
  }
})

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

async function selectSong(songId: string) {
  emit('select', songId)
}

async function deleteSong(songId: string) {
  if (confirm('Are you sure you want to delete this song?')) {
    await libraryStore.deleteSong(songId)
  }
}
</script>
