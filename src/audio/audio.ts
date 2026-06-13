import { Howl, Howler } from 'howler'
import { ambientUri, pickupUri, transitionUri } from './sounds'
import { storyStore } from '../state/story'

/**
 * Audio lives outside Pixi and reacts to discrete state (agent_docs/architecture.md):
 * picking up an item plays a blip, a scene change plays a chime, and a soft drone
 * loops underneath. Set up once at module load; the menu toggles mute.
 */
const ambient = new Howl({ src: [ambientUri], format: ['wav'], loop: true, volume: 0.4 })
const pickup = new Howl({ src: [pickupUri], format: ['wav'], volume: 0.6 })
const transition = new Howl({ src: [transitionUri], format: ['wav'], volume: 0.5 })

let muted = false

export function setMuted(value: boolean): void {
  muted = value
  Howler.mute(value)
}

export function isMuted(): boolean {
  return muted
}

// SFX as a side-effect of discrete state changes on the single story store.
let prev = storyStore.getState()
storyStore.subscribe(() => {
  const next = storyStore.getState()
  if (next.inventory.length > prev.inventory.length) pickup.play()
  if (next.currentScene !== prev.currentScene) transition.play()
  prev = next
})

// Browsers block autoplay until a user gesture; start the loop on the first one.
window.addEventListener(
  'pointerdown',
  () => {
    if (!ambient.playing()) ambient.play()
  },
  { once: true },
)
