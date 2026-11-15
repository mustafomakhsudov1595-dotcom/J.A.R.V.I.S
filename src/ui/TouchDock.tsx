import { useEffect } from 'react'
import { useStore, type Phase } from '../store'

/**
 * The controls, for a screen with no keyboard.
 *
 * Every control in this interface is a key — Space to talk, Escape to stand
 * down, V, D — which leaves a phone with a wake word and nothing else. This is
 * the same set as buttons. CSS shows it only where it is needed (a touch
 * screen or a narrow window) and hides the keyboard legend in its place.
 *
 * The buttons do not reach into the voice loop. They send the key the loop
 * already listens for, so there is exactly one implementation of "start a
 * turn" and the two ways of asking for it cannot drift apart.
 */
function press(key: string, code: string) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, code, bubbles: true }))
}

const micLabel: Record<Phase, string> = {
  offline: 'Power on',
  boot: 'Starting',
  dormant: 'Tap to talk',
  waking: 'Listening',
  listening: 'Listening',
  thinking: 'Tap to interrupt',
  tooling: 'Tap to interrupt',
  speaking: 'Tap to interrupt',
}

/**
 * Keep the screen awake while he is up. A phone that dims and locks after
 * thirty seconds takes the microphone with it, and the assistant goes deaf
 * without saying so. The lock is released by the browser whenever the tab is
 * hidden, so it is asked for again each time the page comes back.
 */
function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let gone = false
    const acquire = () => {
      if (gone || document.visibilityState !== 'visible') return
      navigator.wakeLock
        .request('screen')
        .then((l) => {
          if (gone) void l.release()
          else lock = l
        })
        .catch(() => {
          /* refused (battery saver, no gesture yet): nothing to do about it */
        })
    }
    acquire()
    document.addEventListener('visibilitychange', acquire)
    return () => {
      gone = true
      document.removeEventListener('visibilitychange', acquire)
      void lock?.release()
    }
  }, [active])
}

export function TouchDock() {
  const phase = useStore((s) => s.phase)
  useWakeLock(phase !== 'offline')

  if (phase === 'offline') return null

  const live = phase === 'listening' || phase === 'waking'

  return (
    <nav className="dock" aria-label="Controls">
      <button
        type="button"
        className="dock-btn"
        onClick={() => press('Escape', 'Escape')}
        aria-label="Stand down"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3v9M6.3 6.8a8 8 0 1 0 11.4 0" />
        </svg>
        <span>Standby</span>
      </button>

      <button
        type="button"
        className={`dock-mic${live ? ' dock-mic-live' : ''}`}
        onClick={() => press(' ', 'Space')}
        disabled={phase === 'boot'}
        aria-label={micLabel[phase]}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
        </svg>
      </button>

      <button
        type="button"
        className="dock-btn"
        onClick={() => press('v', 'KeyV')}
        aria-label="Change voice"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 10v4M8 6v12M12 9v6M16 4v16M20 10v4" />
        </svg>
        <span>Voice</span>
      </button>

      <span className="dock-label">{micLabel[phase]}</span>
    </nav>
  )
}
