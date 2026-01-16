<template>
  <div class="min-h-screen bg-black text-white">
    <div class="container mx-auto px-4 py-8 max-w-4xl">
      <div class="mb-6">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
          <h1 class="text-4xl font-bold flex-1">Song Library</h1>
          <div class="flex items-center gap-3">
            <!-- Upload Button -->
            <button
              @click="$emit('upload')"
              class="w-full md:w-auto px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg transition-colors duration-200 inline-flex items-center justify-center gap-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload Song
            </button>
          </div>
        </div>

        <!-- View Options Toolbar -->
        <div v-if="!isLoading && libraryStore.songs.length > 0" class="flex items-center justify-end gap-2 bg-gray-900 rounded-lg p-2 border border-gray-800">
          <span class="text-sm text-gray-400 mr-2">View:</span>
          <button
            @click="layout = 'grid'"
            :class="[
              'px-3 py-2 rounded transition-colors duration-200',
              layout === 'grid'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            ]"
            title="Grid view"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            @click="layout = 'stacked'"
            :class="[
              'px-3 py-2 rounded transition-colors duration-200',
              layout === 'stacked'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            ]"
            title="Stacked view"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

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

      <!-- Song List - Grid Layout -->
      <div v-else-if="layout === 'grid'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="song in libraryStore.songs"
          :key="song.id"
          @click="selectSong(song.id)"
          class="bg-gray-900 rounded-lg p-6 border border-gray-800 hover:border-purple-600 hover:bg-gray-800 cursor-pointer transition-all duration-200"
        >
          <div class="flex items-start justify-between mb-4">
            <div class="flex-1 pr-2">
              <div class="flex items-center gap-2 mb-1">
                <h3 class="text-lg font-semibold text-white">{{ song.title }}</h3>
                <span
                  v-if="song.isPublic"
                  class="px-2 py-0.5 text-xs font-medium bg-green-900/50 text-green-300 rounded border border-green-700"
                  title="Public song"
                >
                  Public
                </span>
                <span
                  v-else-if="authStore.isAuthenticated"
                  class="px-2 py-0.5 text-xs font-medium bg-gray-700 text-gray-300 rounded border border-gray-600"
                  title="Private song"
                >
                  Private
                </span>
              </div>
            </div>
            <div class="flex items-center gap-1">
              <button
                v-if="authStore.isAuthenticated && (song.userId === authStore.user?.id || !song.userId)"
                @click.stop="openEditModal(song)"
                class="text-gray-500 hover:text-purple-400 transition-colors p-1"
                title="Edit song"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                v-if="authStore.isAuthenticated && (song.userId === authStore.user?.id || !song.userId)"
                @click.stop="deleteSong(song.id)"
                class="text-gray-500 hover:text-red-500 transition-colors p-1"
                title="Delete song"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
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

      <!-- Song List - Stacked Layout -->
      <div v-else class="space-y-3">
        <div
          v-for="song in libraryStore.songs"
          :key="song.id"
          @click="selectSong(song.id)"
          class="bg-gray-900 rounded-lg p-4 border border-gray-800 hover:border-purple-600 hover:bg-gray-800 cursor-pointer transition-all duration-200 flex items-center gap-4"
        >
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between mb-2">
              <div class="flex-1 pr-2 min-w-0">
                <div class="flex items-center gap-2">
                  <h3 class="text-lg font-semibold text-white truncate">{{ song.title }}</h3>
                  <span
                    v-if="song.isPublic"
                    class="px-2 py-0.5 text-xs font-medium bg-green-900/50 text-green-300 rounded border border-green-700 flex-shrink-0"
                    title="Public song"
                  >
                    Public
                  </span>
                  <span
                    v-else-if="authStore.isAuthenticated"
                    class="px-2 py-0.5 text-xs font-medium bg-gray-700 text-gray-300 rounded border border-gray-600 flex-shrink-0"
                    title="Private song"
                  >
                    Private
                  </span>
                </div>
              </div>
              <div class="flex items-center gap-1 flex-shrink-0">
                <button
                  v-if="authStore.isAuthenticated && (song.userId === authStore.user?.id || !song.userId)"
                  @click.stop="openEditModal(song)"
                  class="text-gray-500 hover:text-purple-400 transition-colors p-1"
                  title="Edit song"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  v-if="authStore.isAuthenticated && (song.userId === authStore.user?.id || !song.userId)"
                  @click.stop="deleteSong(song.id)"
                  class="text-gray-500 hover:text-red-500 transition-colors p-1"
                  title="Delete song"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
            <div class="flex items-center gap-4 flex-wrap">
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
              <p class="text-xs text-gray-500">
                {{ formatDate(song.createdAt) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Song Modal -->
    <EditSongModal
      v-model="showEditModal"
      :song="selectedSongForEdit"
      @updated="handleSongUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useLibraryStore, type SongMetadata } from '../stores/libraryStore'
import { useAuthStore } from '../stores/authStore'
import EditSongModal from '../components/EditSongModal.vue'

const emit = defineEmits<{
  upload: []
  select: [songId: string]
  'show-auth': []
}>()

const libraryStore = useLibraryStore()
const authStore = useAuthStore()
const isLoading = libraryStore.isLoading

// Edit modal state
const showEditModal = ref(false)
const selectedSongForEdit = ref<SongMetadata | null>(null)

// Layout state with localStorage persistence
const layout = ref<'grid' | 'stacked'>(
  (localStorage.getItem('songLibraryLayout') as 'grid' | 'stacked') || 'grid'
)

// Save layout preference to localStorage
watch(layout, (newLayout) => {
  localStorage.setItem('songLibraryLayout', newLayout)
})

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

function openEditModal(song: SongMetadata) {
  selectedSongForEdit.value = song
  showEditModal.value = true
}

function handleSongUpdated() {
  // Song was updated, reload songs list
  libraryStore.loadSongs()
}

async function deleteSong(songId: string) {
  if (confirm('Are you sure you want to delete this song?')) {
    await libraryStore.deleteSong(songId)
  }
}
</script>
