<template>
  <div class="w-full">
    <div class="flex items-center gap-3 mb-2">
      <span class="text-sm text-gray-400 font-mono min-w-[3rem] text-right">
        {{ formattedCurrentTime }}
      </span>
      <input
        type="range"
        :min="0"
        :max="duration || 0"
        :step="0.1"
        :value="currentTime"
        :disabled="!duration"
        @input="onSeek"
        class="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600 hover:accent-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <span class="text-sm text-gray-400 font-mono min-w-[3rem]">
        {{ formattedDuration }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePlayerStore } from '../stores/playerStore'

const store = usePlayerStore()

const currentTime = computed(() => store.currentTime)
const duration = computed(() => store.duration)
const formattedCurrentTime = computed(() => store.formattedCurrentTime)
const formattedDuration = computed(() => store.formattedDuration)

function onSeek(e: Event) {
  const target = e.target as HTMLInputElement
  const time = parseFloat(target.value)
  store.seekTo(time).catch(err => {
    console.error('Failed to seek:', err)
  })
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
  width: 16px;
  height: 16px;
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
  width: 16px;
  height: 16px;
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
