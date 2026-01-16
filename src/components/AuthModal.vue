<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        @click.self="$emit('update:modelValue', false)"
      >
        <div class="bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4 border border-gray-800">
          <!-- Header -->
          <div class="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 class="text-2xl font-bold text-white">
              {{ isLoginMode ? 'Sign In' : 'Sign Up' }}
            </h2>
            <button
              @click="$emit('update:modelValue', false)"
              class="text-gray-400 hover:text-white transition-colors"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Content -->
          <div class="px-6 py-6">
            <!-- Error Message -->
            <div
              v-if="authStore.error"
              class="mb-4 p-3 bg-red-900/50 border border-red-700 rounded text-red-300 text-sm"
            >
              {{ authStore.error }}
            </div>

            <!-- Success Message -->
            <div
              v-if="successMessage"
              class="mb-4 p-3 bg-green-900/50 border border-green-700 rounded text-green-300 text-sm"
            >
              {{ successMessage }}
            </div>

            <form @submit.prevent="handleSubmit" class="space-y-4">
              <!-- Email Input -->
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  v-model="email"
                  type="email"
                  required
                  placeholder="your@email.com"
                  class="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                />
              </div>

              <!-- Password Input -->
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <input
                  v-model="password"
                  type="password"
                  required
                  :minlength="6"
                  placeholder="••••••"
                  class="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                />
                <p v-if="!isLoginMode" class="text-xs text-gray-500 mt-1">
                  Password must be at least 6 characters
                </p>
              </div>

              <!-- Submit Button -->
              <button
                type="submit"
                :disabled="authStore.loading"
                class="w-full px-4 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
              >
                {{ authStore.loading ? 'Loading...' : (isLoginMode ? 'Sign In' : 'Sign Up') }}
              </button>
            </form>

            <!-- Switch Mode -->
            <div class="mt-6 text-center">
              <p class="text-sm text-gray-400">
                {{ isLoginMode ? "Don't have an account?" : 'Already have an account?' }}
                <button
                  @click="toggleMode"
                  class="text-purple-400 hover:text-purple-300 font-medium ml-1"
                >
                  {{ isLoginMode ? 'Sign Up' : 'Sign In' }}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAuthStore } from '../stores/authStore'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'authenticated': []
}>()

const authStore = useAuthStore()
const email = ref('')
const password = ref('')
const isLoginMode = ref(true)
const successMessage = ref('')

// Reset form when modal closes
watch(() => props.modelValue, (isOpen) => {
  if (!isOpen) {
    email.value = ''
    password.value = ''
    successMessage.value = ''
    authStore.clearError()
  }
})

function toggleMode() {
  isLoginMode.value = !isLoginMode.value
  authStore.clearError()
  successMessage.value = ''
}

async function handleSubmit() {
  authStore.clearError()
  successMessage.value = ''

  let result

  if (isLoginMode.value) {
    result = await authStore.signIn(email.value, password.value)
  } else {
    result = await authStore.signUp(email.value, password.value)
    if (result.success) {
      successMessage.value = 'Account created! Please check your email to verify your account.'
      // Don't close modal immediately, let user see success message
      setTimeout(() => {
        emit('update:modelValue', false)
        emit('authenticated')
      }, 2000)
      return
    }
  }

  if (result.success) {
    emit('update:modelValue', false)
    emit('authenticated')
  }
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .bg-gray-900,
.modal-leave-active .bg-gray-900 {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.modal-enter-from .bg-gray-900,
.modal-leave-to .bg-gray-900 {
  opacity: 0;
  transform: scale(0.95);
}
</style>
