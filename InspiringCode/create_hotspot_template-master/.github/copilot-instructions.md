# VR Hotspots Educational Edition - AI Coding Instructions

## Architecture Overview

This is an **educational VR platform** with three distinct layers:

- **Frontend VR Editor** (`index.html` + `script.js`): A-Frame-based 360° hotspot creation tool
- **Educational Backend** (`simple-server.js`): Node.js/Express server for student submissions
- **Style Customization** (`style-editor.html`): Standalone visual theme editor with localStorage persistence

**Key Pattern**: Single-file architecture with embedded CSS in HTML and monolithic JavaScript classes for offline classroom deployment.

## Core Classes & Components

### `HotspotEditor` (script.js:14-4700+)

**Central singleton** managing the entire VR editing experience:

```javascript
// Key state properties
this.scenes = {}; // Multi-scene 360° environments
this.currentScene = "scene1"; // Active scene ID
this.customStyles = {}; // Visual theme settings
this.editMode = false; // Edit vs Navigation mode toggle
```

**Critical Methods by Function:**

- **Scene**: `switchToScene()`, `addNewScene()`, `showSceneManager()`
- **Hotspots**: `placeHotspot()`, `createHotspotElement()`, `showEditHotspotDialog()`
- **Export**: `saveTemplate()`, `saveAsCompleteProject()`, `generateCompleteHTML()`
- **Audio**: `toggleEditorGlobalSound()`, `updateGlobalSound()`
- **Styles**: `loadCSSFromLocalStorage()`, `refreshAllHotspotStyles()`

### Navigation Hotspot UX

- Visual: Thin solid green ring with transparent center (approx. 3px), color `rgb(0, 85, 0)`
- Interactions:
  - Invisible circle collider (radius 0.6) used for clicks/hover
  - Inline hover preview: a circle behind the ring displays the destination scene image
  - Animation: preview grows from center on hover, shrinks on leave; ring has a subtle scale pulse
- Parity: Implemented in both Editor (`createHotspotElement`) and Export runtime (`HotspotProject.createHotspots`)

### Scene Transitions

- DOM crossfade overlay with CSS opacity transition on scene switches
- Coordinated via a `vrhotspots:scene-loaded` event; includes a safety timeout fallback

### A-Frame Custom Components

```javascript
// Face-camera behavior for hotspot UI elements
AFRAME.registerComponent("face-camera", {...})
// Editor-specific hotspot interactions
AFRAME.registerComponent("editor-spot", {...})
// Runtime hotspot behavior for exported projects
AFRAME.registerComponent("hotspot", {...})
```

## Data Architecture

### Scene Structure

```javascript
this.scenes = {
  "scene1": {
    name: "Scene 1",
    image: "./images/scene1.jpg",         // 360° panoramic image
    hotspots: [],                       // Scene-specific hotspots
    startingPoint: { rotation: {...} }, // Camera initial view
    globalSound: { audio, volume, enabled } // Ambient audio
  }
}
```

### Hotspot Types & Validation

```javascript
// 4 hotspot types with specific requirements:
"text"; // text content required
"audio"; // audio file/URL required
"text_audio"; // both text + audio required
"navigation"; // navigationTarget scene required
```

## Development Workflows

### Local Development

```bash
npm install  # Installs A-Frame locally for offline use
npm start    # Starts Express server on :3000
```

### Testing Workflow

1. **Editor**: http://localhost:3000 - Student VR creation interface
2. **Dashboard**: http://localhost:3000/professor-dashboard.html - Professor submission management
3. **Direct**: Open `index.html` - Offline editor mode

### Educational Backend API

```javascript
POST /submit-project     // Student project submission (multipart/form-data)
GET  /professor/submissions // List all student submissions
GET  /professor/download/:filename // Download student project ZIP
POST /professor/host/:filename     // Deploy project to live URL
```

## Critical Patterns

### State Persistence Strategy

- **Scenes/Hotspots**: `localStorage` key `vr-hotspot-scenes-data` (JSON)
- **Visual Styles**: `localStorage` key `vr-hotspot-css-styles` (CSS object)
- **Student Submissions**: Server filesystem in `student-projects/` + `submissions.json` log
- **Template Safety**: Loaded templates persist across Style Editor navigation via automatic `saveScenesData()` calls

### File Asset Handling

```javascript
// Audio files: File objects → embedded base64 in exports
// Images: File uploads → data URLs or local paths
// Export normalization in normalizeScenePathsForExport()
```

### Export System Architecture

Two export modes:

1. **JSON Template**: Configuration only (requires existing project files)
2. **Complete Project**: Self-contained ZIP with embedded assets

**Export Runtime Fix**: The generated `HotspotProject` class no longer calls editor-only methods like `updateHotspotList()` or `saveScenesData()`, preventing TypeError crashes in standalone exports.

### Style System Integration

- **Editor Integration**: `style-editor.html` operates independently via localStorage
- **Runtime Application**: `refreshAllHotspotStyles()` applies changes to live A-Frame entities
- **Export Embedding**: Custom styles included in `generateCompleteHTML()`
- **Navigation Ring Customization**: Ring color, radius, and thickness configurable via `CUSTOM_STYLES.navigation`
- **Template Persistence**: `openStyleEditor()` saves scenes before navigation; `checkForStyleUpdates()` restores on return

## Project-Specific Conventions

### Hotspot Creation Flow

1. Select type → validate required fields → enter edit mode → click 360° image → create entity
2. **No labels required** - smart naming based on content type
3. Info hotspots use a filled circular "i" icon (style-driven background/text). The icon is offset slightly forward on Z to ensure clickability.
4. Navigation portals render as a thin green ring; destination preview image appears inside the ring on hover.

### Scene Navigation Logic

- Navigation hotspots create portals between scenes
- Starting points saved per-scene for consistent user experience
- Edit vs Navigation mode toggle for creator vs user experience

### Offline-First Design

- **A-Frame bundled** in `node_modules/` (not CDN)
- **Complete asset embedding** in exports for standalone deployment
- **localStorage fallbacks** for all user preferences

## Integration Points

### Student Submission Workflow

```javascript
StudentSubmission.showSubmissionDialog() // script.js
→ POST /submit-project                   // simple-server.js
→ organized in student-projects/         // filesystem
→ logged in submissions.json             // metadata
```

### Cross-Component Communication

- **Style Editor ↔ Main Editor**: localStorage bridge
- **Edit Mode ↔ Navigation Mode**: `this.navigationMode` toggle affects event handling
- **Scene Management**: Centralized in `HotspotEditor` with dropdown synchronization

## Common Modification Patterns

### Adding New Hotspot Types

1. Update validation in `validateHotspotData()`
2. Extend UI in `updateFieldRequirements()`
3. Add creation logic in `createHotspotElement()`
4. Handle in export system `generateCompleteJS()`

### Educational Customization

- Modify submission form fields in `StudentSubmission.showSubmissionDialog()`
- Customize professor dashboard in `professor-dashboard.html`
- Adjust file organization logic in `simple-server.js` endpoints

### Template Loading & Style Editor Fixes

- Templates loaded via `loadJSONTemplate()` are now automatically saved to localStorage for persistence
- Style Editor navigation preserves loaded templates by calling `saveScenesData()` before opening
- Export runtime classes avoid calling editor-only functions to prevent crashes

### A-Frame Integration Points

- Custom components registered globally in `script.js` header
- Entity manipulation via `setAttribute()` and direct DOM methods
- VR controller support through A-Frame's built-in WebXR integration

## In-Scene Hotspot Controls (Editor)

- In edit mode, each hotspot shows a small face-camera control cluster created by `addInSceneEditButton()`:
  - Edit: green circle (`#4CAF50`) with a white pencil icon rendered via inline SVG image in `<a-image>`.
  - Move: blue circle (`#2196F3`) with a white pin icon rendered via inline SVG image in `<a-image>`.
  - Buttons scale slightly on hover and are visible only in edit mode (hidden when `navigationMode` is true). Edit opens `showEditHotspotDialog(id)`; Move calls `startReposition(id)`.
- Reasoning: A-Frame `<a-text>` emoji rendering is unreliable across browsers; using inline SVG images ensures consistent display without adding external assets. For larger icon sets, consider a spritesheet + `atlas-uvs`.

## Audio Hotspot UI

- Audio-only and text+audio hotspots render a play/pause control image next to the hotspot:
  - Node: `<a-image class="clickable audio-control">` with `src` from `customStyles.buttonImages.play/pause` (fallback to `images/play.png` / `images/pause.png`).
  - Position: centered at the hotspot (`position: 0 0 0.02`; previously `0 -1 0.02`).
  - Style: color and opacity from `customStyles.audio`.
  - Animations: hover scale-in/out; fade transitions when toggling icons; wired to `a-sound` component.
  - Input: `.audio-control` included in raycaster selectors for mouse/VR controllers.

## Loading Overlay & Transitions

- Crossfade overlay: a full-screen black overlay fades in/out during scene switches.
- Loading indicator: `showLoadingIndicator(message)` / `hideLoadingIndicator()` display a centered spinner+message for heavy operations or validation.

## Repositioning UX

- Reposition starts from in-scene Move button or list; a notice shows with ESC-to-cancel.
- While repositioning, only the blue info button becomes semi-transparent; the invisible plane remains fully transparent to avoid white box artifacts.
- Clicking the skybox commits the new position, updates localStorage, and restores normal opacity.

## Emoji/Text vs Image Icons

- Avoid emojis in `<a-text>` due to inconsistent glyph support.
- Current approach: inline SVGs in `<a-image>` for Edit (pencil) and Move (pin) icons.
- Alternative: spritesheet with `atlas-uvs` (kframe) to map multiple icons from one texture.
