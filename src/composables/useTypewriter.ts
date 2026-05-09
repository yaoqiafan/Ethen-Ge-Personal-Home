import { ref, onUnmounted } from 'vue'

const SCRAMBLE_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`αβγδεζηθικλμνξπρστυφχψω'

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

  /** Type with a quick "scramble" effect — each character flickers through random glyphs before settling */
  function typeWithScramble(
    text: string,
    speed = 50,
    scrambleFrames = 4,
  ): Promise<void> {
    return new Promise((resolve) => {
      let index = 0
      displayText.value = ''

      function tick() {
        if (index < text.length) {
          const targetChar = text[index]
          let frame = 0

          function scrambleTick() {
            if (frame < scrambleFrames) {
              const scrambled = SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
              displayText.value =
                displayText.value.slice(0, index) + scrambled
              frame++
              timerId = setTimeout(scrambleTick, speed / scrambleFrames)
            } else {
              displayText.value =
                displayText.value.slice(0, index) + targetChar
              index++
              timerId = setTimeout(tick, speed * 0.3)
            }
          }

          scrambleTick()
        } else {
          resolve()
        }
      }

      tick()
    })
  }

  /** Glitch-swap: flash the entire text with random chars, then restore */
  async function glitchPulse(duration = 120): Promise<void> {
    const original = displayText.value
    const start = Date.now()

    function frame() {
      const elapsed = Date.now() - start
      if (elapsed < duration) {
        displayText.value = original
          .split('')
          .map((c) =>
            Math.random() < 0.25
              ? SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
              : c,
          )
          .join('')
        timerId = setTimeout(frame, 30)
      } else {
        displayText.value = original
      }
    }

    frame()
  }

  function clear() {
    if (timerId) clearTimeout(timerId)
    displayText.value = ''
  }

  onUnmounted(clear)

  return { displayText, type, typeWithScramble, glitchPulse, clear }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
