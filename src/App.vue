<template>
  <div class="min-h-screen bg-black">
    <!-- Top Bar -->
    <nav class="border-b border-gray-800 bg-gray-900 sticky top-0 z-40">
      <div class="container mx-auto px-4">
        <div class="flex items-center justify-between h-16">
          <!-- App Name (Left) -->
          <div class="flex items-center gap-4">
            <h1 class="text-xl font-bold text-white">StemLab</h1>
            <!-- Navigation Tabs (Desktop) -->
            <div class="hidden md:flex gap-1">
              <button
                @click="currentView = 'library'"
                :class="[
                  'px-6 py-2 text-sm font-semibold transition-colors relative',
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
                  'px-6 py-2 text-sm font-semibold transition-colors relative',
                  currentView === 'player'
                    ? 'text-purple-400 border-b-2 border-purple-400'
                    : 'text-gray-400 hover:text-gray-300'
                ]"
              >
                Player
              </button>
            </div>
          </div>

          <!-- User Menu (Right) -->
          <div class="flex items-center gap-3">
            <!-- Not Authenticated -->
            <button
              v-if="!authStore.isAuthenticated"
              @click="showAuthModal = true"
              class="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
            >
              Sign In
            </button>
            
            <!-- Authenticated - Mobile: User Icon -->
            <div v-else class="relative">
              <!-- Mobile: User Icon Only -->
              <button
                @click="showUserMenu = !showUserMenu"
                class="md:hidden p-2 text-gray-300 hover:text-white transition-colors relative"
                aria-label="User menu"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span class="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full border-2 border-gray-900"></span>
              </button>
              
              <!-- Desktop: Email with Dropdown -->
              <button
                @click="showUserMenu = !showUserMenu"
                class="hidden md:flex px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors items-center gap-2"
              >
                <span class="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>{{ authStore.user?.email }}</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              <!-- Dropdown Menu -->
              <div
                v-if="showUserMenu"
                class="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-1 z-50"
              >
                <button
                  @click="handleSync"
                  :disabled="libraryStore.isLoading"
                  class="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <svg
                    v-if="libraryStore.isLoading"
                    class="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <svg
                    v-else
                    class="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>{{ libraryStore.isLoading ? 'Loading...' : 'Refresh' }}</span>
                </button>
                <div class="border-t border-gray-700 my-1"></div>
                <button
                  @click="handleSignOut"
                  class="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Navigation Tabs (Mobile) -->
        <div class="md:hidden flex gap-1 border-t border-gray-800">
          <button
            @click="currentView = 'library'"
            :class="[
              'flex-1 px-4 py-3 text-sm font-semibold transition-colors relative',
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
              'flex-1 px-4 py-3 text-sm font-semibold transition-colors relative',
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
    <div class="min-h-[calc(100vh-60px)]" @click="showUserMenu = false">
      <SongLibraryView
        v-if="currentView === 'library' && currentSubView !== 'upload'"
        @upload="currentSubView = 'upload'"
        @select="handleSongSelect"
        @show-auth="showAuthModal = true"
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

    <!-- Auth Modal -->
    <AuthModal v-model="showAuthModal" @authenticated="handleAuthenticated" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import SongLibraryView from './views/SongLibraryView.vue'
import UploadView from './views/UploadView.vue'
import PlayerView from './views/PlayerView.vue'
import AuthModal from './components/AuthModal.vue'
import { useAuthStore } from './stores/authStore'
import { useLibraryStore } from './stores/libraryStore'

const authStore = useAuthStore()
const libraryStore = useLibraryStore()

const currentView = ref<'library' | 'player'>('library')
const currentSubView = ref<'upload' | null>(null)
const selectedSongId = ref<string | null>(null)
const showAuthModal = ref(false)
const showUserMenu = ref(false)

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

async function handleAuthenticated() {
  // User just authenticated, load all songs (public + user's)
  await libraryStore.loadAllSongs()
}

async function handleSync() {
  if (!authStore.isAuthenticated) {
    showAuthModal.value = true
    showUserMenu.value = false
    return
  }

  showUserMenu.value = false
  
  if (navigator.onLine) {
    await libraryStore.loadSongs()
  }
}

async function handleSignOut() {
  showUserMenu.value = false
  await authStore.signOut()
  // Clear library after logout
  await libraryStore.clearLibrary()
}

onMounted(async () => {
  // Initialize auth
  await authStore.init()
  
  // Initialize library
  await libraryStore.init()

  // Reload songs when coming online
  window.addEventListener('online', () => {
    if (authStore.isAuthenticated) {
      libraryStore.loadSongs().catch(err => {
        console.error('Error loading songs when coming online:', err)
      })
    }
  })
})
</script>
