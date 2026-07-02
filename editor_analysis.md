# Analýza editoru — slabá místa, problémy, logické chyby

_Datum: 2026-07-02. Rozsah: no-code editor (`src/editor/`), persistenční vrstva
(`src/data/doc-draft.ts`, `src/state/idb.ts`), schéma (`src/data/schema.ts`) a runtime
cesty, které dokumenty vytvořené v editoru reálně procvičují (`src/engine/scene.ts`,
`src/systems/*`, `src/state/*`). Metoda: kompletní přečtení editor storu + shellu +
všech autorských panelů, plus cílené čtení runtime._

Tohle je audit, ne plán přepisu. Nálezy jsou seskupené podle tématu, každý má
**závažnost**, konkrétní **scénář selhání** a **návrh opravy**. Na konci je
prioritizovaný top-10 seznam. Sekce 9 vyjmenovává, co je už teď opravdu dobré — audit je
záměrně kritický, čti ho na tomhle pozadí.

Škála závažnosti: 🔴 ztráta dat / pád dosažitelný běžným autorováním · 🟠 tiché rozbití
logiky nebo velké tření · 🟡 drobnost / dluh.

---

## 1. Bezpečnost dat — editor umí ztratit celou session práce

### 1.1 🔴 Žádný autosave: úpravy žijí jen v RAM až do „▶ Test in game"

Pracovní `GameDoc` se ukládá **jen** ve chvíli, kdy autor klikne na **▶ Test in game**
(`saveDocDraft` v `src/editor/Editor.tsx:336`). Neexistuje autosave přes subscription na
store, žádné intervalové ukládání a nikde v `src/` není `beforeunload` guard (ověřeno
grepem).

**Selhání:** autor hodinu staví scény/dialogy, zavře tab (nebo spadne prohlížeč, nebo ze
zvyku zmáčkne ⌘R) → všechno od posledního „Test in game" je tiše pryč.
`agent_docs/editor_guide.md` („your edits live in a draft until you publish them")
aktivně podporuje špatný mentální model — draft existuje až po prvním testovacím
kolečku. (Guide navíc pořád tvrdí, že draft je v localStorage; je v IndexedDB.)

**Oprava (malá):** `editorStore.subscribe` → debounced (~1–2 s) `saveDocDraft`, plus
`beforeunload` handler, dokud je uložení ve frontě. Zápis celého dokumentu do IDB stojí
stejně jako existující uložení při Test in game. Tahle jediná změna odstraní největší
způsob, jak přijít o práci.

### 1.2 🔴 Vůbec žádné undo/redo

`editor-store.ts` nedrží žádnou historii; nikde není obsluha Ctrl+Z (grep: žádné `undo`,
v editoru žádné `keydown` handlery kromě Enteru u pole šířky). V kombinaci s 1.3 to
znamená, že **každý destruktivní klik je finální**.

**Oprava (střední):** store už dnes dělá immutable updaty — ohraničený zásobník snapshotů
(např. posledních 50 referencí na `doc` pushnutých při každém `set`; díky strukturálnímu
sdílení je to levné) plus Ctrl+Z/Ctrl+Shift+Z pokryje 95 % případů. Snapshoty jsou
zdaleka nejjednodušší model, když je `doc` jedna immutable hodnota.

### 1.3 🔴 Destruktivní akce bez potvrzení a bez možnosti návratu

`confirm()` se v `src/` nevyskytuje. Jeden překlik na ✕ nenávratně smaže:

- celou **scénu** se všemi vrstvami/interactably/NPC placementy
  (`deleteScene`, napojené přímo na tlačítko v `Editor.tsx:361`),
- strom **dialogu** (`DialogList.tsx:36`), **cutscénu**, **zvuk**, **item**,
  **NPC** (včetně všech placementů), **weather preset**,
- celé polygony přes tlačítka **Clear** (walkable / hole / hit-area / NPC path) —
  a protože editace polygonů je append-only (viz 7.6), je „Clear" jediný nástroj na
  odebrání bodu, tedy často mačkané destruktivní tlačítko.

**Oprava (malá):** confirm u mazání scény/dialogu/NPC/itemu/zvuku (nebo undo toast:
„Scéna smazána — Zpět"), což z většiny přestane být potřeba, jakmile existuje 1.2.

### 1.4 🟠 Draft je per-origin, ne per-projekt

Draft leží v IndexedDB pod fixním názvem DB + klíčem (`point-and-click-pixin` /
`draft` / `doc`, `src/state/idb.ts:10`, `src/data/doc-draft.ts:14`) a **má přednost před
předaným/commitnutým dokumentem** jak v `data/game.ts`, tak v `mountEditor`
(`editor-entry.tsx:47`). Každý Vite projekt běží na `localhost:5173`, takže dvě různé
hry editované na jednom stroji sdílejí jeden draft slot.

**Selhání:** autor edituje hru A, pak otevře hru B (jiné repo, stejný port) → editor i
dev hra od B tiše ukazují **obsah hry A**. Oprava z 0.1.3 (`loadDocDraft` ignoruje
*prázdné* drafty, dev log 2026-06-27) vyřešila jen variantu s prázdným draftem;
neprázdný cizí draft pořád stíní čerstvý projekt — přesně ten gamejamový průšvih, jen o
krok méně nápadný.

**Oprava (malá):** namespacovat klíč draftu identitou projektu — např. pole
`docId`/`name` v `GameDoc`, nebo `mountEditor(container, initialDoc, { draftKey })`;
pro staré dokumenty fallback přes hash `initialDoc.start + Object.keys(scenes)`.
V toolbaru ukázat, *který* draft se načetl („draft z 2026-07-01 14:32 — Zahodit?").

---

## 2. Referenční integrita — mazání nekaskáduje, reference visí

Tohle je největší **třída logických chyb** v editoru. Store vynucuje unikátní id při
vytvoření (`uniqueSceneId`, `uniqueKey`, …), ale nic neudržuje reference při mazání nebo
přejmenování. Neexistuje validační průchod, žádné „kde se tohle používá?" a žádný lint
při exportu. Jediný celodokumentový scanner, který existuje (`logic-scan.ts`), je
read-only vizualizace flagů.

### 2.1 🔴 Smazání scény umí tvrdě shodit publikovanou hru

`deleteScene` (`editor-store.ts:417`) opraví `doc.start` a výběr — nic jiného. Viset
zůstanou: `to` u exit interactablů, `goTo` efekty (v interactablech, volbách dialogů,
rules, effect krocích cutscén, item uses), `scene` u routine nodů, `from` u spawn
pointů, `home` u NPC, `visited` podmínky, cíle `moveNpc`.

Za běhu scene host volá `mountScene(app, scenes[id], …)` **bez kontroly existence**
(`src/engine/scene.ts:2029`, `show()` na 2013). Visící cíl `goTo`/exitu → `scenes[id]`
je `undefined` → TypeError uvnitř `mountScene` → unhandled rejection → hráč zůstane
viset na černém přechodovém washi. Je to stejná třída chyb jako pády nahlášené z
gamejamu a opravované reaktivně (chybějící `depth`, prázdný dokument — dev log
2026-06-27), ale pořád dosažitelná úplně obyčejnou editační akcí.

**Oprava (střední):** dvě doplňkové vrstvy, v duchu projektového pravidla
„kompletní data, ne guardy všude":
1. Při `deleteScene` projet celý dokument: přesměrovat nebo odstranit visící reference a
   **říct autorovi, čeho se to dotklo** („sem mířily 2 exity a 1 rule"). Ještě
   jednodušší je mazání s tímhle seznamem použití rovnou zablokovat.
2. Jeden runtime guard v `show()`: neznámá scéna → console error + no-op (zůstat v
   aktuální scéně) místo černé obrazovky. Ručně psané/importované dokumenty to dostanou
   zadarmo.

### 2.2 🟠 Každé ostatní mazání nechává tichou mrtvou logiku

Nic z tohohle nekaskáduje ani nevaruje (vše v `editor-store.ts`):

| Mazání | Co zůstane viset | Chování za běhu |
|---|---|---|
| `removeItem` (853) | recepty (`a`/`b`/`output`), `item` u pickablů, `hasItem` podmínky, `giveItem`/`takeItem` efekty, `uses[].item` | tiché: podmínky nikdy neprojdou, pickable dává ghost id |
| `removeDialog` (678) | `NpcDef.dialog`, override u placementů, `startDialog` efekty, `dialog` kroky cutscén, `ItemUse.dialog` | tichý no-op (`scene.ts:1197` chybějící dialogy přeskočí) |
| `removeSequence` (724) | `startSequence` efekty | tichý no-op |
| `removeSound` (914) | každý `SoundConfig`, `AnimClip.sound`, zvuky monologů/blesků, `pickupSound`, `transitionSound` | tiché: nic nehraje |
| `removeWeatherPreset` (952) | `SceneData.weather[].preset` | tiché: žádné počasí |
| `removeDialogNode` (700) | `next`/`choices[].next`/`branch[].to` ostatních nodů, `start` dialogu | graceful (dialog skončí dřív); editor je dokonce značí „(missing)" — dobré |
| `removeNpcDef` (631) | **placementy kaskádují — dobré**; ale zůstávají cíle `moveNpc`/`despawnNpc`/`say`/`playAnim`, aktéři cutscén, `target` u spawn pointů | většinou graceful no-opy |
| `removeNpcPath` (NpcList) | `pathId` u routine nodů | graceful (NPC stojí) |

Závažnost nejsou pády — ale to, že **no-code autor nemá jak rozbití objevit**. Dialog se
přestane otevírat, questový item nejde sebrat, a nikde nic neřekne proč.

**Oprava (střední, velká páka):** jedna čistá funkce `findReferences(doc, ref)` použitá
třemi způsoby: (a) blokovat/kaskádovat mazání se seznamem použití, (b) **Problems
panel**, který vypíše všechny visící reference + prázdná povinná pole v celém dokumentu
(viz 7.1), (c) kontrola při exportu. `logic-scan.ts` už průchod dokumentem předvádí;
tohle ho zobecní z flagů na všechny prostory id.

### 2.3 🟡 Zobrazení chybějící reference je napříč pickery nekonzistentní

`NodeSelect` v `DialogEditor` nechá smazaný cíl vybratelný a označí ho
„`id — (missing)`" (`DialogEditor.tsx:22-55`) — správný vzor. `SoundSelect` stale id
taky drží. Ale `SceneSelect` (exity, `goTo`, scéna routine nodu) a picker itemů vykreslí
visící hodnotu jako **prázdný select** — uložená hodnota přežije, ale autor vidí prázdný
ovládací prvek bez náznaku, že je rozbitý (`EffectList.tsx:29-47`,
`InteractableForm.tsx:73-87`).

**Oprava (malá):** sjednotit afordanci „(missing)" z `NodeSelect` na všechny referenční
pickery.

---

## 3. Hygiena identifikátorů — volný text tam, kde dokument odpovědi už zná

### 3.1 🟠 Flagy jsou volný text bez podpory slovníku

Podmínky s flagem a `setFlag` efekty jsou holé `<input>`y (`ConditionEditor.tsx:74`,
`EffectList.tsx:151`). Flagy jsou **páteř veškeré herní logiky** a jeden překlep
`doorOpen` vs. `door-open` tiše zabije quest — podmínka prostě nikdy neprojde. Ironií je,
že editor kompletní množinu flagů už počítá na dvou místech (`scanLogic` pro graf,
`collectFlags` ve `WorldState.tsx:10`) a v žádném inputu ji nenabízí.

**Oprava (malá):** sdílený `<datalist>`/combobox plněný ze `scanLogic(doc).flags` na
každém poli s flagem. Kontrola „flag se čte, ale nikde nezapisuje / zapisuje, ale nikde
nečte" v Problems panelu chytí zbylé překlepy. (Zároveň sjednotit `collectFlags` — regex
přes `JSON.stringify(doc)` — se `scanLogic`; dva rozdílné scannery flagů se rozjedou, a
procházení stromem dnes navíc míjí `examineWhen`, `ItemUse.when`, podmínky
monologů/appearance/playerLight, takže graf podreportuje.)

### 3.2 🟠 `startDialog` je volný text, zatímco všechny ostatní dialog pickery jsou selecty

`EffectList.tsx:196-204` — textový input, přestože `doc.dialogs` je enumerovatelný a
`startSequence` hned vedle dostává `OptionSelect`, stejně jako dialog pickery v
`ItemCatalogue`, `NpcList` a `SequenceEditor`. Překlep → klik ve hře nic neudělá.

**Oprava (triviální):** stejný `OptionSelect` jako u `startSequence`.

### 3.3 🟠 Id interactablů: editovatelná, neunikátní a nosná pro logiku

`setInteractableId` (`editor-store.ts:586`) přijme libovolný string bez kontroly
unikátnosti (ta platí jen při vytvoření). Jenže id je **sémantické**:

- pickable se po sebrání skrývá přes interní flag `picked:<id>`
  (`src/systems/interactions.ts:9`),
- dokumentovaný recept na skrytí grafiky propu je gate vrstvy `not flag picked:<id>`
  (tooltip v `LayerList.tsx:265`, editor guide, pixin-recipes).

**Selhání:** (a) dva pickably přejmenované na stejné id → sebrání jednoho označí za
sebrané oba; (b) přejmenování id pickablu po zapojení gatu vrstvy gate tiše rozbije —
grafika propu zůstane po sebrání viditelná; (c) přejmenování zároveň osiří `picked:`
flagy v uložených pozicích hráčů. Vzor váže editovatelné, kosmeticky vypadající pole na
herní logiku bez jakéhokoli varování ve formuláři.

**Oprava (malá):** vynutit unikátnost i při editaci (stejné `-2` sufixování jako při
vytvoření) a při přejmenování projet scénu/dokument na reference `picked:<oldId>` (nebo
u pole ukázat „referencováno 1 gatem vrstvy").

### 3.4 🟡 Prázdné referenční stringy jdou vyrobit všude a nikdo je neoznačí

- `addInteractable('pickable')` bez existujících itemů → `item: ''`
  (`editor-store.ts:568`); picker „—" nabízí trvale (`InteractableForm.tsx:63`).
- `addRecipe` bez itemů → `{a:'', b:'', output:''}` (`editor-store.ts:865`).
- `addSceneWeather` bez presetů → `preset: ''` (963).
- `defaultEffect('moveNpc')` → `npc: ''` a `OptionSelect` bez prázdné option vykreslí
  `''` jako prázdný výběr, který autor může číst jako „nastaveno"
  (`EffectList.tsx:116,219`).
- Podmínky `hasItem`/`flag` defaultují na `''` — podmínka, která nikdy neprojde.

Všechno je to ve hře tichá mrtvá logika. **Oprava:** opět Problems panel — „povinná
reference je prázdná" je jednořádkové pravidlo na pole, jakmile scanner existuje.

---

## 4. State management a korektnost preview

### 4.1 🟠 Výběr a řádky seznamů jsou indexové; jeden seznam má uncontrolled inputy

`Editor.tsx` drží `selectedInteractable/Hole/Npc/Light/DarkArea/Emitter/Spawn` jako holé
indexy; každý seznam renderuje řádky s `key={i}`. Mazání/přeuspořádání posune identitu:
výběr tiše skončí na *jiném* objektu (out-of-bounds ohlídané je, špatný objekt ne).
Horší: pole day-cycle peaku v `LayerList` je **uncontrolled** input (`defaultValue`,
`LayerList.tsx:133`): přesuň nebo smaž vrstvu a pole viditelně ukazuje hodnotu
*předchozího* řádku, zatímco dokument drží něco jiného.

**Oprava (malá):** stabilní klíče (vrstvy/interactably můžou nést interní `key`/použít
id), nebo minimálně controlled inputy + vyčištění výběru při strukturálních změnách.

### 4.2 🟡 Řada panelů čte store nereaktivně a spoléhá na re-render rodiče

`DialogEditor.tsx:266`, `SequenceEditor.tsx:222`, `SoundSelect.tsx:17`, `NpcList.tsx:45`,
`InteractableForm.tsx:39` volají při renderu `editorStore.getState()`. Funguje to jen
proto, že shell subscribuje **celý doc** (`useEditor((s) => s.doc)`, `Editor.tsx:127`) a
při každém stisku klávesy překreslí všechno. To je zároveň křehkost (memoizuj kterýkoli
rodič a děti zestárnou) i perf smell — každé otevřené plovoucí okno re-renderuje
`renderTab` při každé změně dokumentu; u reálně velkého dokumentu je to znát na každém
stisku.

**Oprava (střední):** úzké selektory per panel (`useEditor((s) => s.doc.dialogs)` atd.) a
nechat modály subscribovat samy.

### 4.3 🟠 Politika remountu přes `revision` je ručně udržovaná a místy drahá

Strukturální editace remountují celý Pixi svět přes React key
(`ScenePreview key={selectedId-revision}`). Rozhodnutí o bumpu je manuální per akce a
sjelo do nekonzistence:

- `setReferenceHeight` bumpuje při **každém stisku klávesy** v number fieldu
  (`Editor.tsx:814-827` + `editor-store.ts:458`) — napsání „1080" = až 4 plné remounty
  světa (každý = async Pixi init + znovunačtení assetů).
- `setSpawnPointPos` / `setSpawnPoint` / `setSpawnFrom` remountují při každém umisťovacím
  kliku (`editor-store.ts:1040-1107`) — opakované umisťování spawn pointu přestavuje
  svět, zatímco vizuálně téměř totožné přesuny markerů (světla, emittery) jdou live.
- `setDepthStops` remountuje per klik na šipku v `DepthEditoru`.
- `patchNpcDef` rozhoduje „strukturální" hardcodovaným seznamem klíčů
  (`editor-store.ts:660-665`) — přidej nové strukturální pole `NpcDef` a zapomeň na
  seznam = tiše stale preview (přesně ten failure mode, proti kterému ME.6 politika
  vznikla).

**Oprava (střední):** commit-on-blur u číselných polí (pole šířky to už dělá —
`widthDraft`), spawn markery přesunout na live-apply cestu a „strukturální" množinu
`patchNpcDef` odvodit z typované konstanty vedle schématu.

### 4.4 🟠 Každý remount smaže nastavený world-state (flagy/itemy z okna World)

`ScenePreview` vytváří **čerstvý story store** per mount (`ScenePreview.tsx:73-74`).
Jakákoli strukturální editace (přidání vrstvy, umístění spawnu, změna depth…) nebo
přepnutí scény tedy resetuje vše, co si autor přes okno World nastavil, aby viděl
gatovaný obsah — flagy pryč, itemy pryč, čas resetnutý. Workflow doporučený v guide
(„Give the flashlight, aby ses podíval na gatované světlo") degraduje na opakované
nastavování stavu po každé druhé editaci.

**Oprava (malá):** přenést snapshot předchozího storu přes remount (module-level
`lastPreviewState`, re-apply po `createStoryStore`), s „Reset world" ve World jako
explicitní cestou zpět na čistý stav.

### 4.5 🟡 Globální rules běží i v preview editoru a umí ho unést

Preview host spouští plný rules engine (`createSceneHost(..., d.rules, ...)`). Rule,
jehož `when` na čerstvém stavu projde a jehož `then` obsahuje `goTo`, vystřelí při
mountu → preview se přepne do jiné scény, zatímco panely pořád editují tu vybranou
(canvas ukazuje B, formuláře editují A). Tvrzení guide, že „gameplay reactions don't
fire" v live view, rules nepokrývá. Stejná třída: rule s `gameOver` nastaví
`state.screen` (v editoru inertní, ok), `setClock` posune previewovaný čas.

**Oprava (malá):** v preview módu filtrovat `goTo` z rule efektů (nebo přišpendlit
`currentScene` overridem `run` na storu, stejně jako je vypnutý gameplay input).

### 4.6 🟡 Freeze zastaví rendering, ne jen simulaci

⏸ Freeze zastavuje Pixi ticker (`ScenePreview.tsx:31-35`), což zastaví i
**vykreslování** — během freeze nejsou live-applied editace (slidery světel, velikost
postavy) vidět až do resume. Pokud je záměr „zastavit NPC, dál autorovat", pauza by měla
gate-ovat update světa, ne render loop.

---

## 5. Logické problémy runtime dosažitelné běžným autorovaným obsahem

### 5.1 🟠 `once` rules se po save/load vystřelí znovu

Rules runner drží vystřelené `once` rules v in-memory `Set`u
(`src/systems/rules.ts:51`); není součástí `StoryState`, takže se neukládá (snapshot v
`src/state/storage.ts`). Načtení save (nebo Retry) → nový runner → každý `once` rule,
jehož `when` aktuálně platí, vystřelí znovu. Idempotentní efekty to maskují,
neidempotentní ne: `once` rule s `goTo` **teleportuje hráče při každém načtení**;
`say`/`setClock` se přehrají taky.

**Oprava (malá):** persistovat id vystřelených rules ve story state (rules potřebují
stabilní id — schéma už volitelné `GameRule.id` má; generovat ho při vytvoření v
`RulesEditoru`).

### 5.2 🟠 Klip s prázdnými `frames` pravděpodobně shodí svět

`CharacterEditor` commitne pole frames přes `parseFrames` — prázdný/rozbitý vstup se
stane `[]` (`CharacterEditor.tsx:7-12,218`). `sprite-view.ts` postaví
`clipTextures[name] = []` a `setClip` přiřadí `sprite.textures = []` +
`gotoAndPlay(0)` bez guardu (`sprite-view.ts:64-67`) — `AnimatedSprite` s nula texturami
v Pixi při přehrání spadne. Stejné pole přijme indexy framů mimo mřížku atlasu (kreslí
prázdno/garbage) bez validace proti `columns × rows`.

**Oprava (malá):** v editoru clampovat indexy na rozsah atlasu, odmítnout commit
prázdného klipu a v `setClip` ohlídat prázdné seznamy textur (skip + warn).

### 5.3 🟡 `skip()` dialogu vystřelí všechny zbývající engine efekty najednou

Přeskočení fast-forwarduje nody přes `present`, který `run`ne efekty každého — včetně
`playSound`/`playAnim`/`say` (`src/state/dialogue.ts:158-172`, `run()` ve scene.ts).
Flagy se správně zachovají (o to jde), ale přeskočená konverzace umí vypálit salvu
překrývajících se zvuků/bublin. Zvážit potlačení engine-only efektů během skipu.

### 5.4 🟡 Různé, graceful, ale dobré vědět

- `RoutineEditor.removeNode` **posledního** nodu nechá viset `start`
  (`RoutineEditor.tsx:121-129`); runner pak prostě nic nenaseeduje — routina, která tiše
  nic nedělá. Přes `onConnect` jdou vyrobit i duplicitní/self-loop hrany; hop cap je
  zvládne.
- `stateSig` v `rules.ts` vynechává `clockMinutes` (`rules.ts:29-39`) — řetěz rules,
  který hýbe jen hodinami, dosáhne „fixpointu" okamžitě; dnes ok, past, až přibude víc
  clock logiky.
- `patchScene` na smazaném id scény by vyrobil rozbitou částečnou scénu z
  `{ ...undefined, ...patch }` (`editor-store.ts:387-394`) — nepravděpodobné (stale
  async callback), guard je levný.
- `withScene` opraví prázdné dokumenty, ale ne **visící `start`** u neprázdného
  dokumentu (`editor-store.ts:310-316`) — dosažitelné přes
  `mountEditor(root, docWithBadStart)`; hra pak bootne do `scenes[undefined]`
  (→ pád z 2.1). Jeden řádek navíc to spraví.
- `App.continueGame` tiše ne-udělá nic, když scéna ze save už neexistuje
  (`App.tsx:70-76`) — správný guard, ale tlačítko Continue vypadá mrtvě; publikovaným
  hrám by pomohla hláška „save je nekompatibilní".

---

## 6. Škálování a výkon — base64 dokument v editoru

**Kontext (záměr, ne omyl):** base64-v-dokumentu je vědomé rozhodnutí — jeden exportovaný
`game.json` nese celou hru, takže ho jde poslat kolegovi bez posílání souborů assetů.
A **deploy má vlastní pipeline**: editor Export → `export/game.json` (gitignored, fat —
reálně 70 MB) → **`pnpm assets`** (`scripts/build-assets.mjs`: externalizuje všechny
`data:` bloby do `public/assets/baked/{img,audio}/<sha1>.<ext>`, obrázky downscale + WebP
přes sharp, dedupe podle content hashe) → štíhlý `content/game.json` (69,5 MB → 75 kB,
dev log 2026-06-25) → `pnpm build`. Produkční bundle tedy fat JSON **neobsahuje** — pokud
se pipeline dodrží. Co z toho zůstává jako reálný problém:

- 🟡 **Dokumentace vede kolem pipeline.** `editor_guide.md` („To publish: Export, drop it
  in `content/game.json`, and commit") i `content/README.md:54` říkají „hoď export do
  content/ a commitni" — **bez** `pnpm assets` (tu zmiňuje jen `export/README.md`). Kdo
  se guide drží doslova, commitne fat JSON a eager `import.meta.glob`
  (`src/data/game.ts:44-48`) mu ho zabunduje do produkčního JS. Oprava: sladit docs +
  levný guard v buildu (warn/fail, když `content/game.json` obsahuje `data:` a má víc
  než pár MB).
- 🟠 **Editor-session náklady fat dokumentu trvají** (deploy pipeline na ně nemá vliv):
  `WorldState.collectFlags` dělá `JSON.stringify(doc)` při **každém renderu**
  (`WorldState.tsx:10-14`) — s desítkami MB base64 stovky ms janku při každém přepnutí
  flagu, dokud je okno World otevřené (použít memoizovaný `scanLogic`); `structuredClone`
  celého dokumentu při bootu editoru (`editor-store.ts:405`) a v `migrateSounds` při
  každém načtení (`migrate-sounds.ts:13`); zápis celého dokumentu do IDB při každém
  Test in game.
- 🟡 **Deduplikace obrázků existuje jen při deployi.** V editoru se obrázky/atlasy
  inlinují per vrstva / ikona / view (zvuky knihovnu mají — `GameDoc.sounds`). Vzor „dvě
  varianty pozadí gatované flagem" drží plnou grafiku dvakrát v pracovním dokumentu,
  draftu i exportu; stejný prop ve třech scénách třikrát. Editor-side `assets` knihovna
  (content-hash id, zrcadlo `sounds`) by zmenšila pracovní dokument, IDB zápisy i
  exporty — a mapování na hashe z `pnpm assets` by bylo stabilní.
- 🟡 **Single-file export jako kolaborační médium** řeší přenos, ne souběžnou práci:
  poslané JSONy jsou last-write-wins, merge dvou exportů je s base64 bloky prakticky
  nemožný. Rozhodnutý směr: **řešení A** — git-native split formát (viz §8); minimálním
  prvním krokem jsou metadata v dokumentu (`docId`, `version`, `savedAt`), o která se
  opře i per-projektový draft (§1.4).

---

## 7. Chybějící autorské afordance (mezery na úrovni produktu)

Tohle nejsou bugy; jsou to mezery, do kterých autor narazí nejtvrději, seřazené zhruba
podle páky.

1. 🟠 **Žádný validační / Problems panel.** Jednotlivě největší páka: visící reference
   (§2), prázdné reference (§3.4), flagy zapisované-nikdy-čtené / čtené-nikdy-zapisované
   (§3.1), nedosažitelné scény, dialogy bez cesty ke konci, cykly `start` nodů. ~80 %
   mašinérie už existuje v `logic-scan.ts`.
2. 🟠 **Žádné „kde se tohle používá?"** pro itemy/dialogy/zvuky/scény — otázka bezpečného
   mazání (§2.2) a autorská pomůcka v jednom.
3. 🟠 **Žádné duplikování/kopie** scén, interactablů, dialogů, NPC, presetů, cutscén.
   Vytváření jen z prázdna nutí opakovaně přewirovávat stejné hitboxy/podmínky; autoři
   mnohem víc kopírují, než tvoří.
4. 🟡 **Žádné přejmenování tam, kde jsou id vidět.** Scény/itemy/zvuky/NPC mají display
   jména, ale dialogy a cutscény ukazují syrová generovaná id (`dialog-7`) v každém
   pickeru (`DialogList.tsx:31`), což přestává škálovat kolem ~15 dialogů. Buď přidat
   pole `name` (bezpečné), nebo implementovat rename s průchodem referencí.
5. 🟠 **`EffectList` neumí přeuspořádat efekty** — jen přidat/odebrat
   (`EffectList.tsx:344-388`; docstring reorder slibuje). Na pořadí záleží (`goTo` před
   vs. po `setFlag`; `say` po `takeItem`…). `SequenceEditor` už ↑/↓ má — tady je potřeba
   stejná afordance, a změna kindu efektu navíc resetuje parametry (bez undo otravné).
6. 🟡 **Editace polygonů je append-only.** Všechny overlaye (walkable, holes, hit-areas,
   dark areas, NPC paths) umí jen klik-přidej + Clear (`WalkableOverlay.tsx`, wiring v
   `Editor.tsx:208-321`) — žádný drag vertexu, žádné smazání posledního bodu, žádné
   vložení na hranu. Jeden překlik = kreslit polygon znovu. Samotné
   smaž-poslední-bod (pravý klik / Backspace) by odstranilo většinu bolesti.
7. 🟡 **ConditionEditor zahazuje podstromy při přepnutí kindu** — přepnutí `all`→`any`
   staví znovu z `defaultCondition` a děti zahodí (`ConditionEditor.tsx:54`); zachování
   `of`, když jsou oba kindy kombinátory, je jednořádkovka. Neexistuje ani způsob, jak
   existující podmínku obalit do `not`/`all`.
8. 🟡 **Body cutscén se píší, ne umisťují.** Cíle `move`/`face`/`camera` jsou syrové 0..1
   number inputy (`SequenceEditor.tsx:39-51`) — jediné místo v editoru, kde se pozice ve
   světě neumisťuje klikem do preview.
9. 🟡 **Žádný klávesový model:** žádný Escape pro opuštění draw módu, žádný Delete pro
   vybraný vertex/objekt, žádné Ctrl+S („ulož draft"), žádné Ctrl+Z (§1.2).
10. 🟡 **Smyčka hra→editor je jednosměrná.** ▶ Test in game odnaviguje pryč; návrat
    znamená ruční přepsání URL zpět na `?edit` (tlačítko neexistuje — ověřeno) a editor
    se otevře s výchozím rozložením oken + výběrem. Tlačítko „Zpět do editoru" v dev hře
    (když `hasDocDraft()`), plus persistence otevřených oken/vybrané scény v
    sessionStorage, by smyčku uzavřely.
11. 🟡 **Selhání importu/uploadu jsou tichá.** `importDocFromFile` spolkne neshodu tvaru
    a chyby `JSON.parse` nechá utéct jako unhandled rejection (`editor-store.ts:1250-1255`,
    `Editor.tsx:171`); chyby `packFrames` ze špatného obrázku taky
    (`FramesUpload.tsx:16-19`). Neexistuje žádný toast/notifikační systém — tlačítko
    Import prostě nic neudělá. Navíc: import **vyžaduje** `scenes[start]`, zatímco
    `setDoc`+`withScene` by to uměly opravit — přísnější než kód, který za ním je.

---

## 8. Schéma a verzování

- 🟠 **`GameDoc` nemá pole `version`.** Migrace jsou shape-sniffing (`migrate-sounds.ts`
  detekuje inline `data:audio`); jednou to vyšlo, ale balíček je publikovaný
  (`@theideaguards/pixin`) a dokumenty uživatelů teď žijí mimo repo. Každá budoucí
  breaking změna potřebuje heuristiku „jaký tvar tohle je?". Přidat `version: 1` dnes
  nestojí nic a navždy kupuje uspořádané `migrations[]`.
- 🟡 Generický průchod `migrateSounds` nahradí **jakékoli** stringové pole začínající
  `data:audio` kdekoli ve scenes/npcs/dialogs/sequences — dnes korektní, ale slepý
  přepis podle tvaru hodnoty; verzovaná migrace by cílila pole explicitně.
- 🟡 Drift dokumentace: guide říká draft = localStorage (je to IDB); docstring
  `EffectList` slibuje reorder, který neexistuje; publish flow v guide (Export → commit
  `content/game.json`) je fajn, ale měl by zmínit důsledek pro velikost bundle (§6).

### Rozhodnuto (2026-07-02): verzování a kolaborace — řešení A

**Kanonický zdroj pravdy = git-native split formát** (to, co dnes vyrábí `pnpm assets`);
git pak zadarmo řeší historii, blame, branche i merge. Fat single-file export **zůstává**
jako snapshot pro sdílení/backup — oddělujeme transportní a kolaborační roli dokumentu:

1. **Split dokumentu na soubory podle entit** — `content/scenes/<id>.json`,
   `content/dialogs/<id>.json`, `content/items.json`, …; loader je slepí dohromady
   (eager `import.meta.glob` v `src/data/game.ts` už na to je). Dva autoři na různých
   scénách se v gitu nesrazí nikdy; konflikt vznikne jen na téže entitě — a tak je to
   správně.
2. **Deterministická serializace** (stabilní pořadí klíčů) → malé, čitelné diffy; platí
   i pro fat export.
3. **Metadata do `GameDoc`**: `docId` + `version` + `savedAt` (+ volitelně `author`) —
   potřebuje je i per-projektový draft klíč (§1.4) a nechávají otevřená vrátka pro
   případný pozdější editor-side merge pro ne-git uživatele.
4. **Publish tlačítko v editoru** — Vite dev-server middleware endpoint
   (např. `/__pixin/publish`): editor POSTne pracovní dokument, server provede
   externalizaci assetů (logika `build-assets.mjs`) a zapíše split soubory +
   `public/assets/baked/`. Jedno kliknutí → git-ready commit. Ruční cesta
   (Export → `export/` → `pnpm assets`) zůstává jako fallback bez dev serveru.
5. **Docs + guard** — sladit `editor_guide.md` / `content/README.md` s pipeline a přidat
   build guard (warn/fail na `data:` bloby v commitnutém obsahu).

Real-time kolaborace (CRDT, řešení C z diskuse) je zapsaná v roadmapě jako **V2**
položka — předpokládá hotové A (má pak k čemu synchronizovat) a dává smysl, až bude
editor hostovaný / týmový.

---

## 9. Co je už teď dobré (zachovat)

- **Jeden serializovatelný `GameDoc` + jeden slovník podmínek/efektů** — jádro designu je
  správně, a proto je většina oprav výše malá.
- **Runtime je defenzivní většinou tam, kde na tom záleží:** dialog toleruje chybějící
  nody/dialogy a capuje redirect smyčky; routiny přeskakují visící hrany/paths a capují
  hopy; rules běží do fixpointu s hop capem a re-entrancy guardem; kroky cutscén
  no-opují na chybějících aktérech; `withScene` udělal z „editor nikdy nepracuje nad
  prázdným dokumentem" root fix místo rozesetých guardů. **Jediná** tvrdá díra je mount
  chybějící scény (§2.1).
- **Dobré vzory pickerů existují** — „(missing)" u `NodeSelect`, `OptionSelect` drží
  stale hodnoty vybratelné, `SceneSelect` ukazuje jména + id. Jen nejsou aplikované
  jednotně (§2.3, §3.2).
- **Architektura live preview (ME.1–ME.6)** — reálný svět + `applyLive` diffing +
  mapování overlayů přes camera rect — je opravdu sofistikovaná a autorská smyčka
  Freeze/World okno je silný nápad.
- **Logic graph + WorldState** jsou přesně správné nástroje; jsou jeden krok od toho být
  páteří validace/autocomplete (§3.1, §7.1).
- **Knihovna zvuků s migrací + nedestruktivním seedováním** (`migrate-sounds`,
  `seed-sounds`, `weather-presets`) — model, který §6 chce pro obrázky.
- StrictMode-safe async Pixi mounty s cancellation v `GameCanvas` i `ScenePreview`.

---

## 10. Navržené priority

| # | Oprava | Záv. | Pracnost |
|---|--------|------|----------|
| 1 | Debounced autosave draftu + `beforeunload` guard (§1.1) | 🔴 | S |
| 2 | Guard `show()` proti chybějící scéně + oprava visícího `start` ve `withScene` (§2.1, §5.4) | 🔴 | S |
| 3 | Undo/redo přes zásobník snapshotů dokumentu + Ctrl+Z (§1.2) | 🔴 | M |
| 4 | Per-projektový klíč draftu v IDB (§1.4) | 🟠 | S |
| 5 | `findReferences` + mazání se seznamem použití (kaskáda nebo blok) (§2.2) | 🟠 | M |
| 6 | Problems panel (visící/prázdné reference, překlepy flagů) nad `logic-scan` (§7.1) | 🟠 | M |
| 7 | Datalist s flagy + select pro `startDialog` (§3.1, §3.2) | 🟠 | S |
| 8 | Unikátnost id interactablu při editaci + sweep `picked:` při přejmenování (§3.3) | 🟠 | S |
| 9 | Reorder efektů; zachování podstromu při přepnutí kindu podmínky (§7.5, §7.7) | 🟠 | S |
| 10 | Preview: udržet nastavený world-state přes remounty; zrušit remount-per-keystroke pole (§4.4, §4.3) | 🟠 | S–M |
| — | Delší oblouk: **řešení A** — git-native split formát + Publish endpoint (§8); editor-side asset knihovna (dedupe, §6); CRDT kolaborace → roadmap V2 | 🟠 | L |

_Poznámka k ověření: každý odkaz soubor:řádek výše byl v tomto průchodu přečten; chování
runtime označené „pravděpodobně" (pád Pixi na prázdných texturách §5.2) bylo dohledáno
ve zdrojáku, ale nespuštěno._
