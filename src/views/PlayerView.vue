<template>
  <div class="min-h-screen bg-black text-white">
    <div class="container mx-auto px-4 py-8 max-w-4xl">
      <h1 class="text-4xl font-bold mb-8 text-center">Stem Player</h1>

      <!-- File Upload -->
      <div class="mb-8">
        <label class="block mb-3 text-sm font-medium text-gray-300">
          Load Audio Files
        </label>
        <input
          type="file"
          multiple
          accept="audio/*"
          @change="loadFiles"
          class="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-500 file:cursor-pointer cursor-pointer"
        />
      </div>

      <!-- Seekbar -->
      <div class="mb-8">
        <Seekbar />
      </div>

      <!-- Stem Controls -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <StemControl
          v-for="stem in stems"
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
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { usePlayerStore } from '../stores/playerStore'
import StemControl from '../components/StemControl.vue'
import Seekbar from '../components/Seekbar.vue'

const store = usePlayerStore()
const stems = ['drums', 'bass', 'vocals', 'others']

const hasStems = computed(() => {
  return Object.keys(store.engine.stems).length > 0
})

let updateInterval: number | null = null

function loadFiles(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (!files) return

  Array.from(files).forEach(file => {
    store.engine.loadStem(file.name, file).then(() => {
      store.updateState()
    })
  })
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

onMounted(() => {
  // Start update loop if already playing
  if (store.isPlaying) {
    startUpdateLoop()
  }
})

onUnmounted(() => {
  stopUpdateLoop()
})
</script>
