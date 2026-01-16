<template>
  <div class="bg-gray-900 rounded-lg p-4 border border-gray-800 hover:border-gray-700 transition-colors">
    <div class="flex items-center justify-between mb-3">
      <label class="text-sm font-semibold text-gray-300 uppercase tracking-wide">
        {{ name }}
      </label>
      <button
        @click="mute"
        class="px-3 py-1 text-xs font-medium bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
      >
        Mute
      </button>
    </div>
    <div class="flex items-center gap-3">
      <span class="text-xs text-gray-500 font-mono min-w-[3rem]">0%</span>
      <input
        type="range"
        :value="volume"
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
import { ref, computed } from 'vue'
import { usePlayerStore } from '../stores/playerStore'

const props = defineProps<{ name: string }>()
const store = usePlayerStore()
const volume = ref(1)

const volumePercent = computed(() => {
  return Math.round(volume.value * 100)
})

function onVolume(e: Event) {
  const value = Number((e.target as HTMLInputElement).value)
  volume.value = value
  store.engine.setVolume(props.name, value)
}

function mute() {
  volume.value = 0
  store.engine.setVolume(props.name, 0)
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
