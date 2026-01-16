<template>
  <div class="min-h-screen bg-black">
    <!-- Navigation Tabs -->
    <nav class="border-b border-gray-800 bg-gray-900 sticky top-0 z-40">
      <div class="container mx-auto px-4">
        <div class="flex gap-1">
          <button
            @click="currentView = 'library'"
            :class="[
              'px-6 py-4 text-sm font-semibold transition-colors relative',
              currentView === 'library'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-gray-300'
            ]"
          >
            Song Library
          </button>
          <button
            @click="currentView = 'player'"
            :class="[
              'px-6 py-4 text-sm font-semibold transition-colors relative',
              currentView === 'player'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-gray-300'
            ]"
          >
            Player
          </button>
        </div>
      </div>
    </nav>

    <!-- Content -->
    <div class="min-h-[calc(100vh-60px)]">
      <SongLibraryView
        v-if="currentView === 'library' && currentSubView !== 'upload'"
        @upload="currentSubView = 'upload'"
        @select="handleSongSelect"
      />
      <UploadView
        v-else-if="currentView === 'library' && currentSubView === 'upload'"
        @cancel="currentSubView = null"
        @uploaded="handleSongUploaded"
      />
      <PlayerView
        v-else-if="currentView === 'player'"
        :song-id="selectedSongId"
        @song-loaded="handleSongLoaded"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import SongLibraryView from './views/SongLibraryView.vue'
import UploadView from './views/UploadView.vue'
import PlayerView from './views/PlayerView.vue'

const currentView = ref<'library' | 'player'>('library')
const currentSubView = ref<'upload' | null>(null)
const selectedSongId = ref<string | null>(null)

function handleSongSelect(songId: string) {
  selectedSongId.value = songId
  currentView.value = 'player'
  currentSubView.value = null
}

function handleSongUploaded(songId: string) {
  currentSubView.value = null
  // Optionally switch to player view with the new song
  handleSongSelect(songId)
}

function handleSongLoaded() {
  // Song has been loaded into player
}
</script>
