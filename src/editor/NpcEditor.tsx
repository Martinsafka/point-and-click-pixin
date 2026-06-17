import { editorStore } from './editor-store'
import { EditorModal } from './EditorModal'
import { ConditionEditor } from './ConditionEditor'
import { EffectList } from './EffectList'
import { CharacterEditor } from './CharacterEditor'
import { AppearanceList } from './AppearanceList'
import { MonologueList } from './MonologueList'
import { RoutineEditor } from './RoutineEditor'
import { SoundSelect } from './SoundSelect'
import { SoundField } from './SoundField'
import { actionNames, actorIds } from './effect-options'
import { placeholderView } from '../entities/placeholder-atlas'
import { previewVoice } from '../audio/voice'
import type { ItemDef, ItemId, VisionConfig, VoiceConfig } from '../data/schema'

/** Drop an inspect with no text + no audio (so an emptied form clears the field). */
function trimInspect(inspect: { text?: string; audio?: string }) {
  const text = inspect.text?.trim() || undefined
  const audio = inspect.audio || undefined
  return text || audio ? { text, audio } : undefined
}

/** Drop a voice with default pitch + no sound (so an emptied form clears the field). */
function trimVoice(voice: VoiceConfig): VoiceConfig | undefined {
  const pitch = voice.pitch && voice.pitch !== 1 ? voice.pitch : undefined
  const sound = voice.sound || undefined
  return pitch || sound ? { pitch, sound } : undefined
}

/** Stealth vision config — range (fraction of height) + cone width (° or all-round) +
 *  the on-seen effects, gated by an optional `unless` (e.g. while the player is hidden). */
function VisionEditor({
  npcId,
  vision,
  items,
  sceneIds,
  animations,
  targets,
}: {
  npcId: string
  vision: VisionConfig
  items: Record<ItemId, ItemDef>
  sceneIds: string[]
  animations: string[]
  targets: string[]
}) {
  const s = () => editorStore.getState()
  const patch = (p: Partial<VisionConfig>) =>
    s().patchNpcDef(npcId, { vision: { ...vision, ...p } })
  return (
    <div className="logic">
      <div className="logic__head">
        <span>Vision (stealth)</span>
        <button
          type="button"
          className="logic__del"
          onClick={() => s().patchNpcDef(npcId, { vision: undefined })}
        >
          Remove
        </button>
      </div>
      <div className="intr-form__field">
        <span>range</span>
        <input
          className="logic__in"
          type="number"
          step="0.05"
          min="0"
          title="detection range, as a fraction of the design height"
          value={vision.range}
          onChange={(e) => patch({ range: Number(e.target.value) || 0 })}
        />
        <span>angle°</span>
        <input
          className="logic__in"
          type="number"
          step="5"
          min="0"
          max="360"
          placeholder="360"
          title="cone width in degrees; empty = all-round"
          value={vision.angle ?? ''}
          onChange={(e) =>
            patch({ angle: e.target.value === '' ? undefined : Number(e.target.value) })
          }
        />
        <label className="logic__chk">
          <input
            type="checkbox"
            checked={vision.once ?? false}
            onChange={(e) => patch({ once: e.target.checked || undefined })}
          />
          once
        </label>
        <label className="logic__chk" title="on detection, walk to the player before the effects">
          <input
            type="checkbox"
            checked={vision.approach ?? false}
            onChange={(e) => patch({ approach: e.target.checked || undefined })}
          />
          approach
        </label>
      </div>
      <div className="intr-form__field intr-form__field--col">
        <span>unless (no detection while)</span>
        <ConditionEditor
          condition={vision.unless}
          onChange={(c) => patch({ unless: c })}
          items={items}
          sceneIds={sceneIds}
        />
      </div>
      <EffectList
        effects={vision.effects}
        onChange={(fx) => patch({ effects: fx })}
        items={items}
        sceneIds={sceneIds}
        animations={animations}
        targets={targets}
        label="On seen"
      />
    </div>
  )
}

/**
 * The NPC's full definition (modal): a **dialogue** (from the Dialogs library) gated by
 * `dialogWhen`, with an **inspect** ("look at") fallback; its **voice** (procedural
 * pitch / an uploaded blip, with a Test); and its **appearance** (atlas + clips, reusing
 * the player's `CharacterEditor`). Reads the cast NPC live from the store; edits via
 * `patchNpcDef`.
 */
export function NpcEditor({ npcId, onClose }: { npcId: string; onClose: () => void }) {
  const s = () => editorStore.getState()
  const doc = s().doc
  const npc = doc.npcs?.[npcId]
  if (!npc) return null
  const dialogIds = Object.keys(doc.dialogs ?? {})
  const sceneIds = Object.keys(doc.scenes)
  const animations = actionNames(doc)
  const targets = actorIds(doc)
  // Scenes this NPC is placed in — its `home` (start scene) must be one of these, else
  // it would start nowhere. Only meaningful when placed in more than one scene.
  const placedScenes = sceneIds.filter((sid) =>
    (doc.scenes[sid].npcs ?? []).some((p) => p.npc === npcId),
  )

  return (
    <EditorModal title={`NPC · ${npc.name ?? npc.id}`} onClose={onClose}>
      {placedScenes.length > 1 && (
        <div className="intr-form__field">
          <span>home (start scene)</span>
          <select
            className="logic__sel"
            value={npc.home ?? ''}
            onChange={(e) => s().patchNpcDef(npcId, { home: e.target.value || undefined })}
          >
            <option value="">— first placement ({placedScenes[0]}) —</option>
            {placedScenes.map((sid) => (
              <option key={sid} value={sid}>
                {doc.scenes[sid].name} ({sid})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="intr-form__field">
        <span>dialog</span>
        <select
          className="logic__sel"
          value={npc.dialog ?? ''}
          onChange={(e) => s().patchNpcDef(npcId, { dialog: e.target.value || undefined })}
        >
          <option value="">— none —</option>
          {dialogIds.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </div>

      <div className="intr-form__field intr-form__field--col">
        <span>dialog when (else falls back to inspect)</span>
        <ConditionEditor
          condition={npc.dialogWhen}
          onChange={(c) => s().patchNpcDef(npcId, { dialogWhen: c })}
          items={doc.items}
          sceneIds={sceneIds}
        />
      </div>

      <div className="intr-form__field intr-form__field--col">
        <span>inspect text ("look at")</span>
        <input
          className="logic__in"
          placeholder="what the player says when looking…"
          value={npc.inspect?.text ?? ''}
          onChange={(e) =>
            s().patchNpcDef(npcId, {
              inspect: trimInspect({ ...npc.inspect, text: e.target.value }),
            })
          }
        />
      </div>
      <div className="intr-form__field">
        <span>inspect audio</span>
        <SoundSelect
          value={npc.inspect?.audio}
          onChange={(audio) =>
            s().patchNpcDef(npcId, { inspect: trimInspect({ ...npc.inspect, audio }) })
          }
        />
      </div>

      <div className="intr-form__field">
        <span>voice</span>
        <input
          className="logic__in"
          type="number"
          step="0.1"
          min="0.3"
          title="pitch (× base); 1 = default"
          value={npc.voice?.pitch ?? 1}
          onChange={(e) =>
            s().patchNpcDef(npcId, {
              voice: trimVoice({ ...npc.voice, pitch: Number(e.target.value) || 1 }),
            })
          }
        />
        <span>blip</span>
        <SoundSelect
          value={npc.voice?.sound}
          onChange={(sound) =>
            s().patchNpcDef(npcId, { voice: trimVoice({ ...npc.voice, sound }) })
          }
        />
        <button type="button" onClick={() => previewVoice(npc.voice ?? undefined)}>
          Test
        </button>
      </div>

      {npc.vision ? (
        <VisionEditor
          npcId={npcId}
          vision={npc.vision}
          items={doc.items}
          sceneIds={sceneIds}
          animations={animations}
          targets={targets}
        />
      ) : (
        <div className="intr-form__field">
          <span>vision</span>
          <button
            type="button"
            onClick={() =>
              s().patchNpcDef(npcId, { vision: { range: 0.4, angle: 70, effects: [] } })
            }
          >
            + Vision (stealth)
          </button>
        </div>
      )}

      <div className="intr-form__field intr-form__field--col">
        <span>monologues (ambient speech)</span>
        <MonologueList
          monologues={npc.monologues ?? []}
          onChange={(m) => s().patchNpcDef(npcId, { monologues: m.length ? m : undefined })}
          items={doc.items}
          sceneIds={sceneIds}
        />
      </div>

      <SoundField
        label="footsteps"
        value={npc.footstep}
        defaultVolume={0.5}
        onChange={(footstep) => s().patchNpcDef(npcId, { footstep })}
      />

      <div className="intr-form__field intr-form__field--col">
        <span>appearance</span>
        <CharacterEditor
          view={npc.view}
          onCreate={() => s().patchNpcDef(npcId, { view: structuredClone(placeholderView) })}
          onChange={(patch) =>
            npc.view && s().patchNpcDef(npcId, { view: { ...npc.view, ...patch } })
          }
          onRemove={() => s().patchNpcDef(npcId, { view: undefined })}
        />
        <AppearanceList
          variants={npc.views ?? []}
          onChange={(views) => s().patchNpcDef(npcId, { views: views.length ? views : undefined })}
          items={doc.items}
          sceneIds={sceneIds}
        />
      </div>

      <div className="intr-form__field intr-form__field--col">
        <span>routine (cross-scene schedule)</span>
        <RoutineEditor npcId={npcId} />
      </div>
    </EditorModal>
  )
}
