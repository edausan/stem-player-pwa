<template>
  <div class="bg-gray-900 rounded-lg p-4 border border-gray-800 hover:border-gray-700 transition-colors">
    <div class="flex items-center justify-between mb-3">
      <label class="text-sm font-semibold text-gray-300 uppercase tracking-wide">
        {{ name }}
      </label>
      <div class="flex items-center gap-2">
        <button
          @click="toggleSolo"
          :class="[
            'px-3 py-1 text-xs font-medium rounded transition-colors',
            isSoloed
              ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
          ]"
        >
          Solo
        </button>
        <button
          @click="toggleMute"
          :class="[
            'px-3 py-1 text-xs font-medium rounded transition-colors',
            isMuted
              ? 'bg-red-600 hover:bg-red-500 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
          ]"
        >
          Mute
        </button>
      </div>
    </div>
    <div class="flex items-center gap-3">
      <span class="text-xs text-gray-500 font-mono min-w-[3rem]">0%</span>
      <input
        type="range"
        :value="currentVolume"
        min="0"
        max="1"
        step="0.01"
        @input="onVolume"
        class="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600 hover:accent-purple-500 transition-colors"
      />
      <span class="text-xs text-gray-500 font-mono min-w-[3rem] text-right">
        {{ volumePercent }}%
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePlayerStore } from '../stores/playerStore'

const props = defineProps<{ name: string }>()
const store = usePlayerStore()

const currentVolume = computed(() => store.engine.getVolume(props.name))
const isMuted = computed(() => store.engine.isMuted(props.name))
const isSoloed = computed(() => store.engine.isSoloed(props.name))

const volumePercent = computed(() => {
  return Math.round(currentVolume.value * 100)
})

function onVolume(e: Event) {
  const value = Number((e.target as HTMLInputElement).value)
  store.engine.setVolume(props.name, value)
}

function toggleMute() {
  const newMutedState = !isMuted.value
  store.engine.setMute(props.name, newMutedState)
}

function toggleSolo() {
  store.engine.setSolo(props.name)
}
</script>

<style scoped>
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #9333ea;
  cursor: pointer;
  border: 2px solid #111;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

input[type="range"]::-webkit-slider-thumb:hover {
  background: #a855f7;
}

input[type="range"]::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #9333ea;
  cursor: pointer;
  border: 2px solid #111;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

input[type="range"]::-moz-range-thumb:hover {
  background: #a855f7;
}

input[type="range"]::-moz-range-track {
  background: #374151;
  height: 8px;
  border-radius: 0.5rem;
}

input[type="range"]::-webkit-slider-runnable-track {
  background: #374151;
  height: 8px;
  border-radius: 0.5rem;
}
</style>
