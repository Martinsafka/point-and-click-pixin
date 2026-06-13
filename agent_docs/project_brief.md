# Project Brief

The assignment and vision. Authoritative for **what** we're building and what's in / out of scope. For **how** it's built, see `architecture.md`.

## The game

A 2D point-and-click adventure (stealth + logic puzzles) played in **pseudo-3D ("2.5D") scenes**: flat 2D layers that fake depth via character scaling and depth-sorting, in the lineage of Broken Sword, Black Mirror (Posel smrti), and Polda. (**Not** a side-scroller — the character walks around the scene in depth.) The player explores hand-framed scenes, picks up and combines items, solves puzzles, hides from threats, and progresses a short narrative.

## Visual direction

Dark-horror **"Röki-style" flat vector**: simplified geometric shapes, strong chiaroscuro (light/shadow), a muted cool palette, layered atmospheric depth (fog, lights). The look leans on silhouette and atmosphere, not detail — which is why geometric placeholders can become a coherent shippable style if real art slips (see `asset_pipeline.md`).

## Core loop

- **Move:** click-to-move within a scene; the character walks in **8 directions** and **scales with depth** (smaller as it moves away from the camera, larger as it approaches) — a 3D illusion from flat 2D layers. Technical spec: `architecture.md`.
- **Interact:** click an interactive object → dialog / pickup / puzzle.
- **Inventory:** collect items; combine them (data-driven recipes); use an item on a world object.
- **Stealth:** hide behind foreground elements to avoid detection (visual occlusion + detection logic).
- **Progress:** solve the gate(s), move between scenes.

## Scope (jam reality)

**In:**
- 2–3 screens.
- Click-to-move, interaction → dialog, inventory + combination, a couple of stealth/puzzle beats.
- Simple UI (menu, inventory, dialog), audio (ambient loop + a few SFX).
- A minimal animation set: idle, **walk (8-directional — mirror to ~5 cycles)**, sneak, one context action. The 8-directional walk is the biggest animation cost — trivial for placeholder shapes, a real budget item only for final sprites (drop to 4 directions if needed).

**Out / deferred / at risk:**
- Large pose libraries, many scenes, free-form dialogue.
- Polished art — deferred behind the swappable-view layer; geometric fallback is acceptable.

**Hard limits:** 2–3 screens max · minimal animation set · no free-form dialogue.

## Bonus (stretch only)

An LLM-driven **persuasion-gate NPC**: the player convinces an NPC to cooperate; after success the LLM is no longer needed (one-shot gate). **The game must be complete and playable without it.** If built: small local model, structured success signal (`{persuaded, trust}` or argument classification — never gate on raw prose), and an anti-stall safety net (turn cap → auto-success, or skip) so it can never block a demo. Build it behind a stubbed interface and wire the real model last.

## Why these decisions (short)

- **PixiJS over a full framework (Phaser/Godot):** the game's custom layered rendering, stealth occlusion, character-animation focus, and tight React/DOM-overlay integration are exactly where a renderer's control wins; the wiring cost is offset by the global PixiJS skills.
- **Frame-by-frame over rigged animation:** drawing is a predictable, bounded cost; rig-tuning is an open-ended rabbit hole. (Decision made deliberately.)
- **LLM demoted to bonus:** removes the riskiest dependency from the critical path.