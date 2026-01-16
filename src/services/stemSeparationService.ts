/**
 * Service for separating audio files into stems using Demucs API
 * Uses Supabase Edge Function to avoid CORS issues
 */

import { supabase } from '../lib/supabase'

export interface SeparationProgress {
  status: 'uploading' | 'processing' | 'downloading' | 'complete' | 'error'
  message: string
  progress?: number // 0-100
}

export interface SeparatedStems {
  drums: File
  bass: File
  vocals: File
  other: File
}

export type ProgressCallback = (progress: SeparationProgress) => void

/**
 * Convert a File to base64 string
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove data URL prefix (e.g., "data:audio/mpeg;base64,")
      const base64 = result.includes(',') ? result.split(',')[1] : result
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Convert base64 string to File
 */
function base64ToFile(base64: string, filename: string, mimeType: string = 'audio/mpeg'): File {
  const byteCharacters = atob(base64)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  const blob = new Blob([byteArray], { type: mimeType })
  return new File([blob], filename, { type: mimeType })
}

/**
 * Separate an audio file into stems using Demucs API
 */
export async function separateStems(
  audioFile: File,
  onProgress?: ProgressCallback
): Promise<SeparatedStems> {
  try {
    // Step 1: Upload/encode audio
    onProgress?.({
      status: 'uploading',
      message: 'Preparing audio file...',
      progress: 10
    })

    const base64Audio = await fileToBase64(audioFile)
    
    onProgress?.({
      status: 'processing',
      message: 'Separating stems (this may take a few minutes)...',
      progress: 30
    })

    // Step 2: Call Demucs API via Supabase Edge Function (to avoid CORS)
    const { data: result, error: functionError } = await supabase.functions.invoke('separate-stems', {
      body: {
        instances: [
          {
            b64: base64Audio
          }
        ]
      }
    })

    if (functionError) {
      throw new Error(`Stem separation error: ${functionError.message || 'Unknown error'}`)
    }

    if (!result) {
      throw new Error('No response from stem separation service')
    }

    // Handle error response from the function
    if (result.error) {
      throw new Error(result.error + (result.details ? `: ${result.details}` : ''))
    }

    // Validate response structure
    if (!result.drums || !result.bass || !result.vocals || !result.other) {
      throw new Error('Invalid response from Demucs API: missing stems')
    }

    onProgress?.({
      status: 'downloading',
      message: 'Processing separated stems...',
      progress: 80
    })

    // Step 3: Convert base64 stems to Files
    const stems: SeparatedStems = {
      drums: base64ToFile(result.drums, 'drums.mp3', 'audio/mpeg'),
      bass: base64ToFile(result.bass, 'bass.mp3', 'audio/mpeg'),
      vocals: base64ToFile(result.vocals, 'vocals.mp3', 'audio/mpeg'),
      other: base64ToFile(result.other, 'other.mp3', 'audio/mpeg')
    }

    onProgress?.({
      status: 'complete',
      message: 'Stem separation complete!',
      progress: 100
    })

    return stems
  } catch (error) {
    onProgress?.({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      progress: 0
    })
    throw error
  }
}

/**
 * Validate that a file is a valid audio file
 */
export function validateAudioFile(file: File): { valid: boolean; error?: string } {
  const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav', 'audio/mp4', 'audio/m4a', 'audio/aac', 'audio/ogg', 'audio/flac']
  const validExtensions = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac']
  
  const extension = '.' + file.name.split('.').pop()?.toLowerCase()
  
  if (!validTypes.includes(file.type) && !validExtensions.includes(extension)) {
    return {
      valid: false,
      error: 'Please select a valid audio file (MP3, WAV, M4A, AAC, OGG, or FLAC)'
    }
  }

  // Check file size (limit to 50MB to avoid API issues)
  const maxSize = 50 * 1024 * 1024 // 50MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size must be less than 50MB'
    }
  }

  return { valid: true }
}
