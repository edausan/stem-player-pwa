<template>
  <div class="min-h-screen bg-black text-white">
    <div class="container mx-auto px-4 py-8 max-w-4xl">
      <!-- Empty State -->
      <div v-if="!songId && !isLoading" class="text-center py-16">
        <div class="mb-6">
          <svg class="w-24 h-24 mx-auto text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        </div>
        <p class="text-xl text-gray-400 mb-4">No song selected</p>
        <p class="text-gray-500">Select a song from the Song Library to start playing</p>
      </div>

      <!-- Loading State -->
      <div v-else-if="isLoading" class="text-center py-16">
        <p class="text-gray-400">Loading song...</p>
      </div>

      <!-- Player Content -->
      <div v-else-if="loadedSong">
        <!-- Header with Song Title -->
        <div class="mb-8 text-center">
          <h1 class="text-4xl font-bold mb-2 text-purple-400">
            {{ loadedSong.title }}
          </h1>
          <p class="text-gray-400 text-sm">Stem Player</p>
        </div>

        <!-- Seekbar -->
        <div class="mb-8">
          <Seekbar />
        </div>

        <!-- Stem Controls -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <StemControl
            v-for="stem in loadedSong.stems"
            :key="stem"
            :name="stem"
          />
        </div>

        <!-- Playback Controls -->
        <div class="flex justify-center gap-4">
          <button
            @click="play"
            :disabled="!hasStems"
            class="px-8 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 text-white font-semibold rounded-lg transition-colors duration-200"
          >
            Play
          </button>
          <button
            @click="pause"
            :disabled="!hasStems || !store.isPlaying"
            class="px-8 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 text-white font-semibold rounded-lg transition-colors duration-200"
          >
            Pause
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { usePlayerStore } from '../stores/playerStore'
import { useLibraryStore, type StoredSong } from '../stores/libraryStore'
import StemControl from '../components/StemControl.vue'
import Seekbar from '../components/Seekbar.vue'

const props = defineProps<{
  songId: string | null
}>()

const emit = defineEmits<{
  'song-loaded': []
}>()

const store = usePlayerStore()
const libraryStore = useLibraryStore()

const loadedSong = ref<StoredSong | null>(null)
const isLoading = ref(false)

const hasStems = computed(() => {
  return Object.keys(store.engine.stems).length > 0
})

let updateInterval: number | null = null

// Load song when songId changes
watch(() => props.songId, async (newSongId) => {
  if (newSongId) {
    await loadSong(newSongId)
  } else {
    clearSong()
  }
}, { immediate: true })

async function loadSong(songId: string) {
  isLoading.value = true
  
  try {
    // Pause current playback if playing
    if (store.isPlaying) {
      store.pause()
      stopUpdateLoop()
    }

    // Clear existing stems
    await clearStems()

    // Load song from library
    const song = await libraryStore.getSong(songId)
    if (!song) {
      console.error('Song not found:', songId)
      return
    }

    loadedSong.value = song

    // Set song title
    store.setSongTitle(song.title)

    // Load all stems into engine
    const loadPromises = Object.entries(song.files).map(([stemName, file]) =>
      store.engine.loadStem(stemName, file)
    )

    await Promise.all(loadPromises)

    // Update state
    store.updateState()

    emit('song-loaded')
  } catch (error) {
    console.error('Failed to load song:', error)
    alert('Failed to load song. Please try again.')
  } finally {
    isLoading.value = false
  }
}

async function clearSong() {
  loadedSong.value = null
  store.setSongTitle('')
  await clearStems()
  store.updateState()
}

async function clearStems() {
  // Stop playback
  if (store.isPlaying) {
    store.engine.pause()
  }
  
  // Clear all stems from engine
  store.engine.clear()
}

function play() {
  store.play()
  startUpdateLoop()
}

function pause() {
  store.pause()
  stopUpdateLoop()
}

function startUpdateLoop() {
  if (updateInterval) return
  
  updateInterval = window.setInterval(() => {
    store.updateTime()
  }, 100) // Update every 100ms for smooth seekbar movement
}

function stopUpdateLoop() {
  if (updateInterval) {
    clearInterval(updateInterval)
    updateInterval = null
  }
}

onMounted(async () => {
  // Initialize library store
  await libraryStore.init()
  
  // Load song if songId is provided
  if (props.songId) {
    await loadSong(props.songId)
  }

  // Start update loop if already playing
  if (store.isPlaying) {
    startUpdateLoop()
  }
})

onUnmounted(() => {
  stopUpdateLoop()
})
</script>
