import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { AudioEngine } from '../audio/AudioEngine'

export const usePlayerStore = defineStore('player', () => {
  const engine = new AudioEngine()
  
  // Reactive state
  const currentTime = ref(0)
  const duration = ref(0)
  const isPlaying = ref(false)
  const songTitle = ref('')
  
  // Computed formatted time display (MM:SS)
  const formattedCurrentTime = computed(() => {
    return formatTime(currentTime.value)
  })
  
  const formattedDuration = computed(() => {
    return formatTime(duration.value)
  })
  
  function formatTime(seconds: number): string {
    if (!isFinite(seconds) || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  // Update state from engine
  function updateState() {
    currentTime.value = engine.getCurrentTime()
    duration.value = engine.duration
    isPlaying.value = engine.isPlaying
  }
  
  // Wrapper methods that update state
  async function play() {
    await engine.play()
    updateState()
  }
  
  function pause() {
    engine.pause()
    updateState()
  }
  
  function stop() {
    engine.stop()
    updateState()
  }
  
  async function seekTo(time: number) {
    await engine.seekTo(time)
    updateState()
  }
  
  function updateTime() {
    const time = engine.updateTime()
    currentTime.value = time
    duration.value = engine.duration
    isPlaying.value = engine.isPlaying
    return time
  }
  
  function setSongTitle(title: string) {
    songTitle.value = title
  }
  
  return { 
    engine, 
    currentTime, 
    duration, 
    isPlaying,
    songTitle,
    formattedCurrentTime,
    formattedDuration,
    play,
    pause,
    stop,
    seekTo,
    updateTime,
    updateState,
    setSongTitle
  }
})
