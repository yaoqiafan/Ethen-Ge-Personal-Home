import { ref, onUnmounted } from 'vue'

export function useTypewriter() {
  const displayText = ref('')
  let timerId: ReturnType<typeof setTimeout> | null = null

  function type(text: string, speed = 40): Promise<void> {
    return new Promise((resolve) => {
      let index = 0
      displayText.value = ''

      function tick() {
        if (index < text.length) {
          displayText.value += text[index]
          index++
          timerId = setTimeout(tick, speed)
        } else {
          resolve()
        }
      }

      tick()
    })
  }

  function clear() {
    if (timerId) clearTimeout(timerId)
    displayText.value = ''
  }

  onUnmounted(clear)

  return { displayText, type, clear }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
