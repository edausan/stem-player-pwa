export class AudioEngine {
  context = new AudioContext()
  master = this.context.createGain()
  stems: Record<string, { buffer: AudioBuffer, gain: GainNode, volume: number, isMuted: boolean }> = {}
  
  // Playback state
  isPlaying = false
  startTime: number = 0 // Timestamp when playback started
  playStartOffset: number = 0 // Audio position when playback started (for seeking)
  duration: number = 0
  sourceNodes: AudioBufferSourceNode[] = []
  
  // Solo state
  soloedStem: string | null = null

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
    this.stems[name] = { buffer, gain, volume: 1, isMuted: false }
    gain.gain.setValueAtTime(1, this.context.currentTime)
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
    const stem = this.stems[name]
    if (!stem) return
    
    stem.volume = vol
    this.updateStemGain(name)
  }

  setMute(name: string, muted: boolean) {
    const stem = this.stems[name]
    if (!stem) return
    
    stem.isMuted = muted
    this.updateStemGain(name)
  }

  setSolo(name: string) {
    // If clicking the same solo button, unsolo it
    if (this.soloedStem === name) {
      this.clearSolo()
      return
    }

    this.soloedStem = name
    this.updateAllGains()
  }

  clearSolo() {
    this.soloedStem = null
    this.updateAllGains()
  }

  private updateStemGain(name: string) {
    const stem = this.stems[name]
    if (!stem) return

    let effectiveVolume = stem.volume

    // Apply solo logic
    if (this.soloedStem !== null) {
      if (this.soloedStem === name) {
        // This stem is soloed, play at normal volume (unless muted)
        effectiveVolume = stem.isMuted ? 0 : stem.volume
      } else {
        // Other stem is soloed, mute this one
        effectiveVolume = 0
      }
    } else {
      // No solo active, apply mute
      effectiveVolume = stem.isMuted ? 0 : stem.volume
    }

    stem.gain.gain.setValueAtTime(effectiveVolume, this.context.currentTime)
  }

  private updateAllGains() {
    Object.keys(this.stems).forEach(name => {
      this.updateStemGain(name)
    })
  }

  getVolume(name: string): number {
    return this.stems[name]?.volume ?? 0
  }

  isMuted(name: string): boolean {
    return this.stems[name]?.isMuted ?? false
  }

  isSoloed(name: string): boolean {
    return this.soloedStem === name
  }

  clear() {
    // Stop playback
    if (this.isPlaying) {
      this.pause()
    }

    // Disconnect all gain nodes
    Object.values(this.stems).forEach(stem => {
      try {
        stem.gain.disconnect()
      } catch (e) {
        // Already disconnected
      }
    })

    // Clear stems
    this.stems = {}
    this.soloedStem = null
    this.duration = 0
    this.playStartOffset = 0
  }
}
