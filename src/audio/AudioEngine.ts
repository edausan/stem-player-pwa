export class AudioEngine {
  context = new AudioContext()
  master = this.context.createGain()
  stems: Record<string, { buffer: AudioBuffer, gain: GainNode }> = {}
  
  // Playback state
  isPlaying = false
  startTime: number = 0 // Timestamp when playback started
  playStartOffset: number = 0 // Audio position when playback started (for seeking)
  duration: number = 0
  sourceNodes: AudioBufferSourceNode[] = []

  constructor() {
    this.master.connect(this.context.destination)
    this.updateDuration()
  }

  private updateDuration() {
    const durations = Object.values(this.stems).map(stem => stem.buffer.duration)
    this.duration = durations.length > 0 ? Math.max(...durations) : 0
  }

  async loadStem(name: string, file: File) {
    const buffer = await this.context.decodeAudioData(await file.arrayBuffer())
    const gain = this.context.createGain()
    gain.connect(this.master)
    this.stems[name] = { buffer, gain }
    this.updateDuration()
  }

  getCurrentTime(): number {
    if (!this.isPlaying) {
      return this.playStartOffset
    }
    const elapsed = (this.context.currentTime - this.startTime)
    return Math.min(this.playStartOffset + elapsed, this.duration)
  }

  private stopAllSources() {
    this.sourceNodes.forEach(source => {
      try {
        source.stop()
      } catch (e) {
        // Source might already be stopped
      }
    })
    this.sourceNodes = []
  }

  play() {
    // If already playing, do nothing
    if (this.isPlaying) return
    
    // Stop any existing sources
    this.stopAllSources()

    this.isPlaying = true
    this.startTime = this.context.currentTime

    Object.entries(this.stems).forEach(([name, stem]) => {
      const src = this.context.createBufferSource()
      src.buffer = stem.buffer
      src.connect(stem.gain)
      
      // Start from current offset position
      if (this.playStartOffset > 0) {
        src.start(0, this.playStartOffset)
      } else {
        src.start(0)
      }
      
      this.sourceNodes.push(src)
      
      // Handle end of playback
      src.onended = () => {
        // Remove from active sources
        const index = this.sourceNodes.indexOf(src)
        if (index > -1) {
          this.sourceNodes.splice(index, 1)
        }
        
        // If all sources ended, update state
        if (this.sourceNodes.length === 0) {
          this.isPlaying = false
          this.playStartOffset = 0
        }
      }
    })
  }

  pause() {
    if (!this.isPlaying) return
    
    // Update current position before stopping
    this.playStartOffset = this.getCurrentTime()
    
    // Stop all sources
    this.stopAllSources()
    
    this.isPlaying = false
  }

  seekTo(time: number) {
    // Clamp time to valid range
    const seekTime = Math.max(0, Math.min(time, this.duration))
    
    const wasPlaying = this.isPlaying
    
    // Stop current playback
    if (wasPlaying) {
      this.pause()
    }
    
    // Update offset position
    this.playStartOffset = seekTime
    
    // Resume playback if it was playing
    if (wasPlaying) {
      this.play()
    }
  }

  updateTime() {
    // This method can be called to update time state
    // Actual calculation is done in getCurrentTime()
    return this.getCurrentTime()
  }

  setVolume(name: string, vol: number) {
    this.stems[name]?.gain.gain.setValueAtTime(vol, this.context.currentTime)
  }
}
