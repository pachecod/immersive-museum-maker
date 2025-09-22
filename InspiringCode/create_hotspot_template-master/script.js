// Face camera component with cached camera
AFRAME.registerComponent("face-camera", {
  init: function () {
    this.cameraObj = document.querySelector("[camera]").object3D;
  },
  tick: function () {
    if (this.cameraObj) {
      this.el.object3D.lookAt(this.cameraObj.position);
    }
  },
});

// Hotspot Editor Manager
class HotspotEditor {
  constructor() {
    this.hotspots = [];
    this.editMode = false;
    this.selectedHotspotType = "text";
    this.hotspotIdCounter = 0;
    this.selectedHotspotId = null;
    this.scenes = {
      scene1: {
        name: "Scene 1",
        image: "./images/scene1.jpg",
        hotspots: [],
        startingPoint: null, // { rotation: { x: 0, y: 0, z: 0 } }
        globalSound: null, // { audio: string|File, volume: number, enabled: boolean }
      },
    };
    this.currentScene = "scene1";
    this.navigationMode = false; // false = edit mode, true = navigation mode
    this.editorGlobalSoundEnabled = false; // For editor controls - start disabled
    this.editorGlobalAudio = null; // For editor audio playback
    this.editorProgressInterval = null; // For editor progress tracking

    // CSS Customization Settings
    this.customStyles = {
      hotspot: {
        infoButton: {
          backgroundColor: "#4A90E2", // Blue background for i icon
          textColor: "#FFFFFF",
          fontSize: 12, // Larger font for i icon
          opacity: 0.9,
          size: 0.4, // Size of the i icon circle
        },
        popup: {
          backgroundColor: "#333333",
          textColor: "#FFFFFF",
          borderColor: "#555555",
          borderWidth: 0,
          borderRadius: 0,
          opacity: 0.95,
          fontSize: 1,
          padding: 0.2,
        },
        closeButton: {
          size: 0.4,
          opacity: 1.0,
        },
      },
      audio: {
        buttonColor: "#FFFFFF",
        buttonOpacity: 1.0,
      },
      buttonImages: {
        portal: "images/up-arrow.png",
        play: "images/play.png",
        pause: "images/pause.png",
      },
      navigation: {
        ringColor: "#005500",
        ringOuterRadius: 0.6,
        ringThickness: 0.02,
      },
    };

    console.log(
      "🔄 INIT: Editor sound initialized as:",
      this.editorGlobalSoundEnabled ? "ENABLED" : "DISABLED"
    );

    this.init();
  }

  init() {
    this.bindEvents();
    this.setupHotspotTypeSelection();
    this.setupSceneManagement();

    // Load saved CSS styles
    this.loadCSSFromLocalStorage();

    // Load saved scenes and hotspots data
    this.loadScenesData();

    // Update the scene dropdown to show all loaded scenes
    this.updateSceneDropdown();

    // Update navigation targets dropdown to ensure it's populated on load
    this.updateNavigationTargets();

    // Apply loaded styles to ensure they take effect
    this.refreshAllHotspotStyles();

    this.loadCurrentScene();

    // Initialize editor sound controls
    this.updateEditorSoundButton();
  }

  // ===== Crossfade helpers (Editor) =====
  _ensureCrossfadeOverlay() {
    let overlay = document.getElementById("scene-crossfade");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "scene-crossfade";
      overlay.style.cssText = `
        position: fixed; inset: 0; background: #000; opacity: 0; pointer-events: none;
        transition: opacity 300ms ease; z-index: 100000;
      `;
      document.body.appendChild(overlay);
    }
    return overlay;
  }

  _startCrossfadeOverlay() {
    return new Promise((resolve) => {
      const overlay = this._ensureCrossfadeOverlay();
      // allow layout flush
      requestAnimationFrame(() => {
        overlay.style.pointerEvents = "auto";
        overlay.style.opacity = "1";
        setTimeout(resolve, 320);
      });
    });
  }

  _endCrossfadeOverlay() {
    const overlay = this._ensureCrossfadeOverlay();
    overlay.style.opacity = "0";
    setTimeout(() => {
      overlay.style.pointerEvents = "none";
    }, 320);
  }

  // ===== Loading Indicator =====
  _ensureLoadingIndicator() {
    let indicator = document.getElementById("loading-indicator");
    if (!indicator) {
      indicator = document.createElement("div");
      indicator.id = "loading-indicator";
      indicator.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8); color: white; padding: 20px 30px;
        border-radius: 8px; font-family: Arial, sans-serif; font-size: 16px;
        z-index: 100001; opacity: 0; pointer-events: none;
        transition: opacity 300ms ease; display: flex; align-items: center; gap: 15px;
      `;
      
      // Add spinning loader
      const spinner = document.createElement("div");
      spinner.style.cssText = `
        width: 20px; height: 20px; border: 2px solid #ffffff40;
        border-top: 2px solid #ffffff; border-radius: 50%;
        animation: spin 1s linear infinite;
      `;
      
      const text = document.createElement("span");
      text.id = "loading-text";
      text.textContent = "Loading...";
      
      indicator.appendChild(spinner);
      indicator.appendChild(text);
      
      // Add CSS animation for spinner
      if (!document.getElementById("loading-spinner-style")) {
        const style = document.createElement("style");
        style.id = "loading-spinner-style";
        style.textContent = `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `;
        document.head.appendChild(style);
      }
      
      document.body.appendChild(indicator);
    }
    return indicator;
  }

  showLoadingIndicator(message = "Loading...") {
    const indicator = this._ensureLoadingIndicator();
    const textEl = document.getElementById("loading-text");
    if (textEl) textEl.textContent = message;
    
    indicator.style.pointerEvents = "auto";
    indicator.style.opacity = "1";
  }

  hideLoadingIndicator() {
    const indicator = this._ensureLoadingIndicator();
    indicator.style.opacity = "0";
    setTimeout(() => {
      indicator.style.pointerEvents = "none";
    }, 300);
  }

  _dispatchSceneLoaded() {
    try {
      const ev = new CustomEvent("vrhotspots:scene-loaded");
      window.dispatchEvent(ev);
    } catch (e) {
      // ignore
    }
  }

  // ===== Navigation Preview (Editor) =====
  _ensureNavPreview() {
    let box = document.getElementById("nav-preview");
    if (!box) {
      box = document.createElement("div");
      box.id = "nav-preview";
      box.style.cssText = `
        position: fixed; top: 0; left: 0; transform: translate(12px, 12px);
        display: none; pointer-events: none; z-index: 100001;
        background: rgba(0,0,0,0.9); color: #fff; border: 1px solid #4CAF50;
        border-radius: 8px; overflow: hidden; width: 220px; box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        font-family: Arial, sans-serif; backdrop-filter: blur(2px);
      `;
      const img = document.createElement("img");
      img.style.cssText =
        "display:block; width: 100%; height: 120px; object-fit: cover; background:#111;";
      img.id = "nav-preview-img";
      const caption = document.createElement("div");
      caption.id = "nav-preview-caption";
      caption.style.cssText =
        "padding: 8px 10px; font-size: 12px; color: #ddd; border-top: 1px solid rgba(255,255,255,0.08);";
      box.appendChild(img);
      box.appendChild(caption);
      document.body.appendChild(box);
    }
    return box;
  }

  _positionNavPreview(x, y) {
    const box = this._ensureNavPreview();
    // Keep within viewport edges
    const rectW = box.offsetWidth || 220;
    const rectH = box.offsetHeight || 160;
    const pad = 12;
    const maxX = window.innerWidth - rectW - pad;
    const maxY = window.innerHeight - rectH - pad;
    const nx = Math.min(Math.max(x + 12, pad), maxX);
    const ny = Math.min(Math.max(y + 12, pad), maxY);
    box.style.left = nx + "px";
    box.style.top = ny + "px";
  }

  _getEditorPreviewSrc(sceneId) {
    const sc = this.scenes[sceneId];
    if (!sc) return null;
    const img = sc.image || "";
    if (
      img.startsWith("http://") ||
      img.startsWith("https://") ||
      img.startsWith("data:")
    )
      return img;
    return img.startsWith("./") ? img : `./${img}`;
  }

  _showNavPreview(sceneId) {
    const box = this._ensureNavPreview();
    const imgEl = document.getElementById("nav-preview-img");
    const cap = document.getElementById("nav-preview-caption");
    const sc = this.scenes[sceneId];
    if (!sc) return;
    const src = this._getEditorPreviewSrc(sceneId);
    if (src) imgEl.src = src;
    cap.textContent = `Go to: ${sc.name || sceneId}`;
    box.style.display = "block";
    // Begin tracking mouse
    if (!this._navPreviewMove) {
      this._navPreviewMove = (e) =>
        this._positionNavPreview(e.clientX || 0, e.clientY || 0);
    }
    window.addEventListener("mousemove", this._navPreviewMove);
  }

  _hideNavPreview() {
    const box = this._ensureNavPreview();
    box.style.display = "none";
    if (this._navPreviewMove) {
      window.removeEventListener("mousemove", this._navPreviewMove);
    }
  }
  bindEvents() {
    // Add hotspot button
    document.getElementById("add-hotspot").addEventListener("click", () => {
      this.enterEditMode();
    });

    // Clear hotspots button
    document.getElementById("clear-hotspots").addEventListener("click", () => {
      this.clearAllHotspots();
    });

    // Clear data button
    document.getElementById("clear-data").addEventListener("click", () => {
      if (
        confirm(
          "This will clear all saved data (scenes, hotspots, and styles) and reload the page. Are you sure?"
        )
      ) {
        clearLocalStorage();
      }
    });

    // Save template button
    document.getElementById("save-template").addEventListener("click", () => {
      this.saveTemplate();
    });

    // Load template button
    document.getElementById("load-template").addEventListener("click", () => {
      this.loadTemplate();
    });

    // Student submission button
    document
      .getElementById("submit-to-professor")
      .addEventListener("click", () => {
        StudentSubmission.showSubmissionDialog();
      });

    // CSS Settings button
    document.getElementById("css-settings").addEventListener("click", () => {
      this.openStyleEditor();
    });

    // Check if returning from style editor
    this.checkForStyleUpdates();

    // Sky click event for placing or repositioning hotspots
    document.getElementById("skybox").addEventListener("click", (evt) => {
      // Reposition has highest precedence
      if (this.repositioningHotspotId) {
        this.applyReposition(evt);
        return;
      }
      if (this.editMode) {
        this.placeHotspot(evt);
      }
    });

    // Edit mode toggle
    document
      .getElementById("edit-mode-toggle")
      .addEventListener("change", (e) => {
        this.navigationMode = !e.target.checked;
        this.updateModeIndicator();
      });

    // Scene management
    document.getElementById("add-scene").addEventListener("click", () => {
      this.addNewScene();
    });

    document.getElementById("manage-scenes").addEventListener("click", () => {
      this.showSceneManager();
    });

    document.getElementById("current-scene").addEventListener("change", (e) => {
      this.switchToScene(e.target.value);
    });

    // Starting point controls
    document
      .getElementById("set-starting-point")
      .addEventListener("click", () => {
        this.setStartingPoint();
      });

    document
      .getElementById("clear-starting-point")
      .addEventListener("click", () => {
        this.clearStartingPoint();
      });

    // Audio input coordination - clear URL when file is selected
    document.getElementById("hotspot-audio").addEventListener("change", () => {
      if (document.getElementById("hotspot-audio").files.length > 0) {
        document.getElementById("hotspot-audio-url").value = "";
      }
    });

    // Audio URL coordination - clear file when URL is entered
    document
      .getElementById("hotspot-audio-url")
      .addEventListener("input", () => {
        if (document.getElementById("hotspot-audio-url").value.trim()) {
          document.getElementById("hotspot-audio").value = "";
        }
      });

    // Global sound controls
    document
      .getElementById("global-sound-enabled")
      .addEventListener("change", (e) => {
        this.toggleGlobalSoundControls(e.target.checked);
      });

    // Global sound file/URL coordination
    document
      .getElementById("global-sound-file")
      .addEventListener("change", () => {
        if (document.getElementById("global-sound-file").files.length > 0) {
          document.getElementById("global-sound-url").value = "";
        }
        this.updateGlobalSound();
      });

    document
      .getElementById("global-sound-url")
      .addEventListener("input", () => {
        if (document.getElementById("global-sound-url").value.trim()) {
          document.getElementById("global-sound-file").value = "";
        }
        this.updateGlobalSound();
      });

    document
      .getElementById("global-sound-volume")
      .addEventListener("input", () => {
        this.updateGlobalSound();
      });

    // Editor global sound control
    document
      .getElementById("editor-sound-control")
      .addEventListener("click", () => {
        this.toggleEditorGlobalSound();
      });

    this.setupEditorProgressBar();
  }

  setupHotspotTypeSelection() {
    const typeElements = document.querySelectorAll(".hotspot-type");
    typeElements.forEach((element) => {
      element.addEventListener("click", () => {
        // Remove selected class from all
        typeElements.forEach((el) => el.classList.remove("selected"));
        // Add selected class to clicked element
        element.classList.add("selected");
        // Update radio button
        const radio = element.querySelector('input[type="radio"]');
        radio.checked = true;
        this.selectedHotspotType = radio.value;

        // Update field requirements visibility
        this.updateFieldRequirements();
      });
    });

    // Initialize field requirements for default selection
    this.updateFieldRequirements();
  }

  updateFieldRequirements() {
    const textGroup = document.querySelector(
      'label[for="hotspot-text"]'
    ).parentElement;
    const audioGroup = document.querySelector(
      'label[for="hotspot-audio"]'
    ).parentElement;
    const audioUrlGroup = document.querySelector(
      'label[for="hotspot-audio-url"]'
    ).parentElement;
    const navigationGroup = document.getElementById("navigation-target-group");
    const textLabel = document.querySelector('label[for="hotspot-text"]');
    const audioLabel = document.querySelector('label[for="hotspot-audio"]');

    // Reset labels
    textLabel.innerHTML = "Text Content:";
    audioLabel.innerHTML = "Audio File:";

    // Reset visibility
    textGroup.style.display = "block";
    audioGroup.style.display = "block";
    audioUrlGroup.style.display = "block";
    navigationGroup.style.display = "none";

    switch (this.selectedHotspotType) {
      case "text":
        textLabel.innerHTML =
          'Text Content: <span style="color: #f44336;">*Required</span>';
        audioGroup.style.display = "none";
        audioUrlGroup.style.display = "none";
        break;

      case "audio":
        audioLabel.innerHTML =
          'Audio File: <span style="color: #f44336;">*Required</span>';
        textGroup.style.display = "none";
        break;

      case "text-audio":
        textLabel.innerHTML =
          'Text Content: <span style="color: #f44336;">*Required</span>';
        audioLabel.innerHTML =
          'Audio File: <span style="color: #f44336;">*Required</span>';
        break;

      case "navigation":
        textGroup.style.display = "none";
        audioGroup.style.display = "none";
        audioUrlGroup.style.display = "none";
        navigationGroup.style.display = "block";
        // Removed stray labelLabel reference (was undefined)
        this.updateNavigationTargets();
        break;
    }
  }

  enterEditMode() {
    this.editMode = true;
    document.getElementById("edit-indicator").style.display = "block";
    this.updateModeIndicator(); // Keep instructions consistent
  }

  exitEditMode() {
    this.editMode = false;
    document.getElementById("edit-indicator").style.display = "none";
    this.updateModeIndicator(); // Keep instructions consistent
  }

  placeHotspot(evt) {
    if (!this.editMode) return;

    // Validate required fields based on hotspot type
    const validationResult = this.validateHotspotData();
    if (!validationResult.valid) {
      alert(validationResult.message);
      return;
    }

    // Get intersection point from the click event
    const intersection = evt.detail.intersection;
    if (!intersection) return;

    // Get camera for position calculation
    const camera = document.querySelector("#cam");

    // Use the optimal coordinate calculation method
    const optimizedPosition = this.calculateOptimalPosition(
      intersection,
      camera
    );

    // Create hotspot data with optimized positioning
    const hotspotData = {
      id: ++this.hotspotIdCounter,
      type: this.selectedHotspotType,
      position: `${optimizedPosition.x.toFixed(
        2
      )} ${optimizedPosition.y.toFixed(2)} ${optimizedPosition.z.toFixed(2)}`,
      text: document.getElementById("hotspot-text").value || "",
      audio: this.getSelectedAudioFile(),
      scene: this.currentScene,
      navigationTarget:
        document.getElementById("navigation-target").value || null,
    };

    // Default popup sizing for text-based hotspots (used by editor/runtime components)
    if (
      this.selectedHotspotType === "text" ||
      this.selectedHotspotType === "text-audio"
    ) {
      hotspotData.popupWidth = 4;
      hotspotData.popupHeight = 2.5;
    }

    this.createHotspotElement(hotspotData);
    this.hotspots.push(hotspotData);
    this.scenes[this.currentScene].hotspots.push(hotspotData);
    this.updateHotspotList();
    this.saveScenesData(); // Save after adding hotspot
    this.exitEditMode();

    // Clear form fields
    document.getElementById("hotspot-text").value = "";
    document.getElementById("hotspot-audio").value = "";
    document.getElementById("hotspot-audio-url").value = "";
    document.getElementById("navigation-target").value = "";
  }

  validateHotspotData() {
    const type = this.selectedHotspotType;
    const textContent = document.getElementById("hotspot-text").value.trim();
    const audioFile = document.getElementById("hotspot-audio").files[0];
    const audioUrl = document.getElementById("hotspot-audio-url").value.trim();
    const navigationTarget = document.getElementById("navigation-target").value;

    switch (type) {
      case "text":
        if (!textContent) {
          return {
            valid: false,
            message: "Text popup type requires text content to be filled.",
          };
        }
        break;

      case "audio":
        if (!audioFile && !audioUrl) {
          return {
            valid: false,
            message:
              "Audio only type requires an audio file or audio URL to be provided.",
          };
        }
        break;

      case "text-audio":
        if (!textContent || (!audioFile && !audioUrl)) {
          return {
            valid: false,
            message:
              "Text + Audio type requires both text content and audio (file or URL).",
          };
        }
        break;

      case "navigation":
        if (!navigationTarget) {
          return {
            valid: false,
            message: "Navigation hotspots require a target scene.",
          };
        }
        break;
    }

    return { valid: true };
  }

  getSelectedAudioFile() {
    const audioFile = document.getElementById("hotspot-audio").files[0];
    const audioUrl = document.getElementById("hotspot-audio-url").value.trim();

    if (audioUrl) {
      return audioUrl; // Return URL string for online audio
    }
    return audioFile ? audioFile : null; // Return file object for uploaded audio
  }

  createHotspotElement(data) {
    const container = document.getElementById("hotspot-container");
    let hotspotEl;
    if (data.type === "navigation") {
      // Parent container
      hotspotEl = document.createElement("a-entity");
      hotspotEl.setAttribute("face-camera", "");

      // Transparent circle collider to capture pointer inside the circle
      const collider = document.createElement("a-entity");
      // Use customizable ring size
      const navStyles =
        (this.customStyles && this.customStyles.navigation) || {};
      const ringOuter =
        typeof navStyles.ringOuterRadius === "number"
          ? navStyles.ringOuterRadius
          : 0.6;
      const ringThickness =
        typeof navStyles.ringThickness === "number"
          ? navStyles.ringThickness
          : 0.02;
      const ringInner = Math.max(0.001, ringOuter - ringThickness);
      const ringColor = navStyles.ringColor || "rgb(0, 85, 0)";
      collider.setAttribute(
        "geometry",
        `primitive: circle; radius: ${ringOuter}`
      );
      collider.setAttribute("material", "opacity: 0; transparent: true");
      collider.classList.add("clickable");
      hotspotEl.appendChild(collider);

      // Visible green border ring (approx. 3px) with transparent center
      const ring = document.createElement("a-entity");
      ring.setAttribute(
        "geometry",
        `primitive: ring; radiusInner: ${ringInner}; radiusOuter: ${ringOuter}`
      );
      ring.setAttribute(
        "material",
        `color: ${ringColor}; opacity: 1; transparent: true; shader: flat`
      );
      ring.setAttribute("position", "0 0 0.002");
      ring.classList.add("nav-ring");
      hotspotEl.appendChild(ring);

      // Inline preview circle (hidden by default), shows destination scene image inside the ring
      const preview = document.createElement("a-entity");
      preview.setAttribute(
        "geometry",
        `primitive: circle; radius: ${ringInner}`
      );
      preview.setAttribute("material", "transparent: true; opacity: 1");
      preview.setAttribute("visible", "false");
      preview.setAttribute("position", "0 0 0.001");
      preview.setAttribute("scale", "0.01 0.01 0.01");
      preview.classList.add("nav-preview-circle");
      hotspotEl.appendChild(preview);
    } else {
      // Use a transparent plane for invisible clickable area
      hotspotEl = document.createElement("a-entity");
      hotspotEl.setAttribute(
        "geometry",
        "primitive: plane; width: 0.7; height: 0.7"
      );
      hotspotEl.setAttribute("material", "opacity: 0; transparent: true");
      // Optionally, add face-camera for consistent interaction
      hotspotEl.setAttribute("face-camera", "");
    }
    hotspotEl.setAttribute("id", `hotspot-${data.id}`);
    hotspotEl.setAttribute("position", data.position);
    hotspotEl.setAttribute("class", "clickable");

    // Create spot component attributes based on type
    let spotConfig = `type:${data.type}`;

    if (data.type === "text" || data.type === "text-audio") {
      const pw = typeof data.popupWidth === "number" ? data.popupWidth : 4;
      const ph = typeof data.popupHeight === "number" ? data.popupHeight : 2.5;
      spotConfig += `;popup:${data.text};popupWidth:${pw};popupHeight:${ph};popupColor:#333333`;
    }

    if (data.type === "audio" || data.type === "text-audio") {
      // Use custom audio URL if available, otherwise use default
      let audioSrc = data.audio || "#default-audio";

      // If it's a File object, create a blob URL for the editor
      if (
        data.audio &&
        typeof data.audio === "object" &&
        data.audio instanceof File
      ) {
        audioSrc = URL.createObjectURL(data.audio);
      }

      spotConfig += `;audio:${audioSrc}`;
    }

    if (data.type === "navigation") {
      spotConfig += `;navigation:${data.navigationTarget}`;
    }

    hotspotEl.setAttribute("editor-spot", spotConfig);

    // Add in-scene edit and move buttons for easier access (visible only in edit mode)
    this.addInSceneEditButton(hotspotEl, data);

    // Add navigation click handler if not in edit mode
    if (data.type === "navigation") {
      const targetEl = hotspotEl.querySelector(".clickable") || hotspotEl;
      targetEl.addEventListener("click", (e) => {
        if (!this.navigationMode) return; // Only navigate when not in edit mode
        e.stopPropagation();
        this.navigateToScene(data.navigationTarget);
      });

      // Hover preview of destination scene INSIDE the circle
      const previewEl = hotspotEl.querySelector(".nav-preview-circle");
      targetEl.addEventListener("mouseenter", () => {
        if (previewEl) {
          const src = this._getEditorPreviewSrc(data.navigationTarget);
          if (src) {
            previewEl.setAttribute(
              "material",
              `src: ${src}; transparent: true; opacity: 1`
            );
          }
          previewEl.setAttribute("visible", "true");
          previewEl.removeAttribute("animation__shrink");
          previewEl.setAttribute("scale", "0.01 0.01 0.01");
          previewEl.setAttribute("animation__grow", {
            property: "scale",
            to: "1 1 1",
            dur: 180,
            easing: "easeOutCubic",
          });
        }
      });
      targetEl.addEventListener("mouseleave", () => {
        if (previewEl) {
          previewEl.removeAttribute("animation__grow");
          previewEl.setAttribute("animation__shrink", {
            property: "scale",
            to: "0.01 0.01 0.01",
            dur: 120,
            easing: "easeInCubic",
          });
          setTimeout(() => {
            previewEl.setAttribute("visible", "false");
          }, 130);
        }
      });
    }

    container.appendChild(hotspotEl);
  }

  addInSceneEditButton(hotspotEl, data) {
    // Create container for both buttons
    const buttonContainer = document.createElement("a-entity");
    buttonContainer.setAttribute("face-camera", "");
    buttonContainer.setAttribute("position", "0.8 0.6 0.05");
    
    // EDIT BUTTON (Gear icon)
    const editButton = document.createElement("a-entity");
    editButton.setAttribute("class", "in-scene-edit-btn clickable");
    editButton.setAttribute("position", "-0.15 0 0"); // Left position
    editButton.setAttribute("visible", "true");
    
    // Edit button background
    editButton.setAttribute("geometry", "primitive: circle; radius: 0.12");
    editButton.setAttribute("material", "color: #4CAF50; opacity: 1.0");
    
  // Edit icon using inline SVG image (reliable vs text/emoji)
  const editIcon = document.createElement("a-image");
  editIcon.setAttribute("src", this._getEditIconDataURI());
  editIcon.setAttribute("position", "0 0 0.01");
  editIcon.setAttribute("width", "0.16");
  editIcon.setAttribute("height", "0.16");
  editIcon.setAttribute("material", "shader: flat; transparent: true");
  editButton.appendChild(editIcon);
    
    // MOVE BUTTON (Location pin)
    const moveButton = document.createElement("a-entity");
    moveButton.setAttribute("class", "in-scene-move-btn clickable");
    moveButton.setAttribute("position", "0.15 0 0"); // Right position
    moveButton.setAttribute("visible", "true");
    
    // Move button background
    moveButton.setAttribute("geometry", "primitive: circle; radius: 0.12");
    moveButton.setAttribute("material", "color: #2196F3; opacity: 1.0"); // Blue color
    
  // Move icon using inline SVG image (reliable vs text/emoji)
  const moveIcon = document.createElement("a-image");
  moveIcon.setAttribute("src", this._getMoveIconDataURI());
  moveIcon.setAttribute("position", "0 0 0.01");
  moveIcon.setAttribute("width", "0.16");
  moveIcon.setAttribute("height", "0.16");
  moveIcon.setAttribute("material", "shader: flat; transparent: true");
  moveButton.appendChild(moveIcon);
    
    // Add buttons to container
    buttonContainer.appendChild(editButton);
    buttonContainer.appendChild(moveButton);
    hotspotEl.appendChild(buttonContainer);
    
    // EDIT BUTTON EVENTS
    editButton.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      console.log("🔧 Edit button clicked for hotspot:", data.id);
      this.showEditHotspotDialog(data.id);
    });
    
    editButton.addEventListener("mouseenter", (e) => {
      e.stopPropagation();
      editButton.setAttribute("animation__scale", {
        property: "scale",
        to: "1.3 1.3 1.3",
        dur: 150,
        easing: "easeOutQuad"
      });
    });
    
    editButton.addEventListener("mouseleave", (e) => {
      e.stopPropagation();
      editButton.setAttribute("animation__scale", {
        property: "scale",
        to: "1 1 1",
        dur: 150,
        easing: "easeOutQuad"
      });
    });
    
    // MOVE BUTTON EVENTS
    moveButton.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      console.log("� Move button clicked for hotspot:", data.id);
      this.startReposition(data.id);
    });
    
    moveButton.addEventListener("mouseenter", (e) => {
      e.stopPropagation();
      moveButton.setAttribute("animation__scale", {
        property: "scale",
        to: "1.3 1.3 1.3",
        dur: 150,
        easing: "easeOutQuad"
      });
    });
    
    moveButton.addEventListener("mouseleave", (e) => {
      e.stopPropagation();
      moveButton.setAttribute("animation__scale", {
        property: "scale",
        to: "1 1 1",
        dur: 150,
        easing: "easeOutQuad"
      });
    });
    
    // Store reference for easy access
    hotspotEl.inSceneButtonContainer = buttonContainer;
    
    // Show/hide buttons based on edit mode
    const showButtons = () => {
      console.log("🔧 Showing buttons, editMode:", this.editMode, "navigationMode:", this.navigationMode);
      if (!this.navigationMode) {
        buttonContainer.setAttribute("visible", "true");
      }
    };
    
    const hideButtons = () => {
      console.log("🔧 Hiding buttons");
      if (this.navigationMode) {
        buttonContainer.setAttribute("visible", "false");
      }
    };
    
    // Add hover listeners to main hotspot element
    const mainElement = hotspotEl.querySelector(".clickable") || hotspotEl;
    mainElement.addEventListener("mouseenter", (e) => {
      console.log("🖱️ Hotspot hover enter, calling showButtons");
      showButtons();
    });
    
    hotspotEl.addEventListener("mouseleave", (e) => {
      console.log("🖱️ Hotspot hover leave");
      // Don't hide immediately, let user move to buttons
      setTimeout(() => {
        if (!buttonContainer.matches(':hover')) {
          hideButtons();
        }
      }, 200);
    });
    
    // Update visibility when edit mode changes
    hotspotEl.updateEditButtonVisibility = () => {
      console.log("🔧 Updating button visibility, editMode:", this.editMode, "navigationMode:", this.navigationMode);
      if (!this.navigationMode) {
        buttonContainer.setAttribute("visible", "true");
      } else {
        buttonContainer.setAttribute("visible", "false");
      }
    };
    
    // Initial visibility setup
    showButtons();
  }

  updateHotspotList() {
    const listContainer = document.getElementById("hotspot-list");
    // Prevent horizontal overflow regardless of content length
    if (listContainer) {
      listContainer.style.overflowX = "hidden";
      listContainer.style.maxWidth = "100%";
    }

    if (this.hotspots.length === 0) {
      listContainer.innerHTML =
        '<div style="color: #888; text-align: center; padding: 20px;">No hotspots created yet</div>';
      return;
    }

    listContainer.innerHTML = "";

    this.hotspots.forEach((hotspot) => {
      const item = document.createElement("div");
      item.className = "hotspot-item";
      item.setAttribute("data-hotspot-id", hotspot.id);

      const typeIcon =
        hotspot.type === "text"
          ? "📝"
          : hotspot.type === "audio"
          ? "🔊"
          : hotspot.type === "text-audio"
          ? "🎵📝"
          : "🚪";

      let displayName = "";
      if (hotspot.type === "text" || hotspot.type === "text-audio") {
        displayName = hotspot.text
          ? hotspot.text.length > 30
            ? hotspot.text.substring(0, 30) + "..."
            : hotspot.text
          : "Text Hotspot";
      } else if (hotspot.type === "audio") {
        displayName = "Audio Hotspot";
      } else if (hotspot.type === "navigation") {
        if (hotspot.navigationTarget) {
          const targetScene = this.scenes[hotspot.navigationTarget];
          const targetLabel = targetScene?.name || hotspot.navigationTarget;
          displayName = `Portal to ${targetLabel}`;
        } else {
          displayName = "Navigation Portal";
        }
      } else {
        displayName = "Hotspot";
      }

      item.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; max-width:100%;">
          <div style="flex: 1; min-width:0; overflow:hidden;">
            <div style="max-width:100%;">
              <strong style="display:block; max-width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${typeIcon} ${this._escapeHTML(
        displayName
      )}</strong>
            </div>
            <div style="font-size: 12px; color: #ccc; overflow-wrap:anywhere;">Type: ${
              hotspot.type
            }</div>
            <div style="font-size: 11px; color: #999; overflow-wrap:anywhere;">Position: ${
              hotspot.position
            }</div>
          </div>
          <div style="display:flex; gap:6px; flex:0 0 auto;">
            <button class="edit-hotspot-btn" data-hotspot-id="${
              hotspot.id
            }" style="
              background: #6a1b9a; color: white; border: none; border-radius: 6px; width: 28px; height: 28px;
              cursor: pointer; font-size: 14px; display:flex; align-items:center; justify-content:center;"
              title="Edit hotspot">📝</button>
            <button class="move-hotspot-btn" data-hotspot-id="${
              hotspot.id
            }" style="
              background: #1e88e5; color: white; border: none; border-radius: 6px; width: 28px; height: 28px;
              cursor: pointer; font-size: 14px; display:flex; align-items:center; justify-content:center;"
              title="Move hotspot">📍</button>
            <button class="delete-hotspot-btn" data-hotspot-id="${
              hotspot.id
            }" style="
              background: #f44336; color: white; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 12px;"
              title="Delete hotspot">✕</button>
          </div>
        </div>
      `;

      // Click to select/highlight hotspot (but not on delete button)
      item.addEventListener("click", (e) => {
        if (!e.target.classList.contains("delete-hotspot-btn")) {
          this.selectHotspot(hotspot.id);
        }
      });

      // Individual delete button
      const deleteBtn = item.querySelector(".delete-hotspot-btn");
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.deleteHotspot(hotspot.id);
      });
      // Edit button
      const editBtn = item.querySelector(".edit-hotspot-btn");
      editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.showEditHotspotDialog(hotspot.id);
      });
      // Move button
      const moveBtn = item.querySelector(".move-hotspot-btn");
      moveBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.startReposition(hotspot.id);
      });

      // Hover effect for delete button
      deleteBtn.addEventListener("mouseenter", () => {
        deleteBtn.style.background = "#da190b";
      });

      deleteBtn.addEventListener("mouseleave", () => {
        deleteBtn.style.background = "#f44336";
      });

      listContainer.appendChild(item);
    });
  }

  showEditHotspotDialog(id) {
    const hotspot = this.hotspots.find((h) => h.id === id);
    if (!hotspot) return;

    const isNav = hotspot.type === "navigation";
    const isAudioType =
      hotspot.type === "audio" || hotspot.type === "text-audio";
    const isTextType = hotspot.type === "text" || hotspot.type === "text-audio";

    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 10002;
      display: flex; align-items: center; justify-content: center; font-family: Arial;
    `;

    const dialog = document.createElement("div");
    dialog.style.cssText = `background: #2a2a2a; color: white; width: 520px; max-width: 90vw; border-radius: 10px; padding: 20px;`;
    dialog.innerHTML = `
      <h3 style="margin: 0 0 10px; color: #4CAF50;">Edit Hotspot</h3>
      <div style="display:flex; flex-direction: column; gap: 10px;">
        ${
          isTextType
            ? `
          <label style="font-size: 12px; color:#ccc;">Description
            <textarea id="edit-text" rows="4" style="width:100%; padding:8px; border-radius:6px; border:1px solid #555; background:#1f1f1f; color:#fff;">${this._escapeHTML(
              hotspot.text || ""
            )}</textarea>
          </label>

          <div style="display:flex; gap:10px;">
            <label style="flex:1; font-size:12px; color:#ccc;">Popup Width
              <input id="edit-popup-width" type="number" min="2" max="10" step="0.25" value="${
                typeof hotspot.popupWidth === "number" ? hotspot.popupWidth : 4
              }" style="width:100%; padding:8px; border-radius:6px; border:1px solid #555; background:#1f1f1f; color:#fff;" />
              <input id="edit-popup-width-range" type="range" min="2" max="10" step="0.1" value="${
                typeof hotspot.popupWidth === "number" ? hotspot.popupWidth : 4
              }" style="width:100%; margin-top:6px;" />
            </label>
            <label style="flex:1; font-size:12px; color:#ccc;">Popup Height
              <input id="edit-popup-height" type="number" min="1.5" max="10" step="0.25" value="${
                typeof hotspot.popupHeight === "number"
                  ? hotspot.popupHeight
                  : 2.5
              }" style="width:100%; padding:8px; border-radius:6px; border:1px solid #555; background:#1f1f1f; color:#fff;" />
              <input id="edit-popup-height-range" type="range" min="1.5" max="10" step="0.1" value="${
                typeof hotspot.popupHeight === "number"
                  ? hotspot.popupHeight
                  : 2.5
              }" style="width:100%; margin-top:6px;" />
            </label>
          </div>
        `
            : ""
        }
        ${
          isAudioType
            ? `
          <div>
            <div style="font-size: 12px; color:#ccc; margin-bottom:6px;">Audio</div>
            <input id="edit-audio-file" type="file" accept="audio/*" style="display:block; margin-bottom:6px; color:#ddd;">
            <input id="edit-audio-url" type="url" placeholder="https://example.com/audio.mp3" value="${
              typeof hotspot.audio === "string"
                ? this._escapeAttr(hotspot.audio)
                : ""
            }" style="width:100%; padding:8px; border-radius:6px; border:1px solid #555; background:#1f1f1f; color:#fff;">
            <div style="font-size:11px; color:#999; margin-top:4px;">Choose a file or enter a URL. Leaving both empty removes audio.</div>
          </div>
        `
            : ""
        }
        ${
          isNav
            ? `
          <label style="font-size: 12px; color:#ccc;">Navigation Target
            <select id="edit-nav-target" style="width:100%; padding:8px; border-radius:6px; border:1px solid #555; background:#1f1f1f; color:#fff;"></select>
          </label>
        `
            : ""
        }
        <div style="display:flex; gap:8px; justify-content:flex-end; margin-top: 10px;">
          <button id="edit-cancel" style="background:#666; color:#fff; border:none; padding:8px 12px; border-radius:6px; cursor:pointer;">Cancel</button>
          <button id="edit-save" style="background:#4CAF50; color:#fff; border:none; padding:8px 12px; border-radius:6px; cursor:pointer;">Save</button>
        </div>
      </div>
    `;
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Wire up audio coordination inside dialog
    const fileInput = dialog.querySelector("#edit-audio-file");
    const urlInput = dialog.querySelector("#edit-audio-url");
    if (fileInput && urlInput) {
      fileInput.addEventListener("change", () => {
        if (fileInput.files.length > 0) urlInput.value = "";
      });
      urlInput.addEventListener("input", () => {
        if (urlInput.value.trim()) fileInput.value = "";
      });
    }

    // Populate navigation targets if needed
    if (isNav) {
      const sel = dialog.querySelector("#edit-nav-target");
      if (sel) {
        sel.innerHTML = "";
        Object.keys(this.scenes).forEach((sceneId) => {
          if (sceneId !== this.currentScene) {
            const opt = document.createElement("option");
            opt.value = sceneId;
            opt.textContent = this.scenes[sceneId].name;
            if (sceneId === (hotspot.navigationTarget || ""))
              opt.selected = true;
            sel.appendChild(opt);
          }
        });
      }
    }

    // Live preview for popup sizing while editing (text/text-audio)
    if (isTextType) {
      const wInput = dialog.querySelector("#edit-popup-width");
      const hInput = dialog.querySelector("#edit-popup-height");
      const wRange = dialog.querySelector("#edit-popup-width-range");
      const hRange = dialog.querySelector("#edit-popup-height-range");
      const applyLive = () => {
        const w = parseFloat(wInput?.value || "");
        const h = parseFloat(hInput?.value || "");
        const width = isNaN(w)
          ? typeof hotspot.popupWidth === "number"
            ? hotspot.popupWidth
            : 4
          : Math.min(10, Math.max(2, w));
        const height = isNaN(h)
          ? typeof hotspot.popupHeight === "number"
            ? hotspot.popupHeight
            : 2.5
          : Math.min(10, Math.max(1.5, h));
        const el = document.getElementById(`hotspot-${hotspot.id}`);
        if (!el) return;
        const bg = el.querySelector(".popup-bg");
        const txt = el.querySelector(".popup-text");
        const closeBtn = el.querySelector(".popup-close");
        if (bg) {
          bg.setAttribute("width", width);
          bg.setAttribute("height", height);
        }
        if (txt) {
          txt.setAttribute("wrap-count", Math.floor(width * 8));
          txt.setAttribute("width", (width - 0.4).toString());
        }
        if (closeBtn) {
          const margin = 0.3;
          closeBtn.setAttribute(
            "position",
            `${width / 2 - margin} ${height / 2 - margin} 0.1`
          );
        }
        // keep ranges in sync when preview clamps values
        if (wRange) wRange.value = String(width);
        if (hRange) hRange.value = String(height);
      };
      if (wInput)
        wInput.addEventListener("input", () => {
          // clamp into range and sync slider
          const v = Math.min(10, Math.max(2, parseFloat(wInput.value || "")));
          if (!isNaN(v)) {
            wInput.value = String(v);
            if (wRange) wRange.value = String(v);
          }
          applyLive();
        });
      if (hInput)
        hInput.addEventListener("input", () => {
          const v = Math.min(10, Math.max(1.5, parseFloat(hInput.value || "")));
          if (!isNaN(v)) {
            hInput.value = String(v);
            if (hRange) hRange.value = String(v);
          }
          applyLive();
        });
      if (wRange)
        wRange.addEventListener("input", () => {
          wInput.value = String(wRange.value);
          applyLive();
        });
      if (hRange)
        hRange.addEventListener("input", () => {
          hInput.value = String(hRange.value);
          applyLive();
        });
    }

    const close = () => {
      if (overlay && overlay.parentNode)
        overlay.parentNode.removeChild(overlay);
    };
    dialog.querySelector("#edit-cancel").onclick = close;

    dialog.querySelector("#edit-save").onclick = () => {
      // Collect values
      const newText = isTextType
        ? (dialog.querySelector("#edit-text")?.value || "").trim()
        : hotspot.text;
      let newAudio = hotspot.audio;
      if (isAudioType) {
        const f = dialog.querySelector("#edit-audio-file");
        const u = dialog.querySelector("#edit-audio-url");
        const file = f && f.files ? f.files[0] : null;
        const url = u ? u.value.trim() : "";
        if (url) newAudio = url;
        else if (file) newAudio = file;
        else newAudio = null;
      }
      const newNavTarget = isNav
        ? dialog.querySelector("#edit-nav-target")?.value || ""
        : hotspot.navigationTarget;

      // Popup sizing (for text-based hotspots)
      let newPopupWidth = hotspot.popupWidth;
      let newPopupHeight = hotspot.popupHeight;
      if (isTextType) {
        const w = parseFloat(
          dialog.querySelector("#edit-popup-width")?.value || ""
        );
        const h = parseFloat(
          dialog.querySelector("#edit-popup-height")?.value || ""
        );
        // apply defaults if missing
        newPopupWidth = isNaN(w)
          ? typeof hotspot.popupWidth === "number"
            ? hotspot.popupWidth
            : 4
          : w;
        newPopupHeight = isNaN(h)
          ? typeof hotspot.popupHeight === "number"
            ? hotspot.popupHeight
            : 2.5
          : h;
        // clamp ranges
        newPopupWidth = Math.min(10, Math.max(2, newPopupWidth));
        newPopupHeight = Math.min(10, Math.max(1.5, newPopupHeight));
      }

      // Validate
      const v = this._validateHotspotValues(hotspot.type, {
        text: newText,
        audio: newAudio,
        navigationTarget: newNavTarget,
      });
      if (!v.valid) {
        alert(v.message);
        return;
      }

      // Apply to data structures
      if (isTextType) {
        hotspot.text = newText;
        hotspot.popupWidth = newPopupWidth;
        hotspot.popupHeight = newPopupHeight;
      }
      if (isAudioType) hotspot.audio = newAudio;
      if (isNav) hotspot.navigationTarget = newNavTarget;

      // Update scene-specific copy
      const sceneHotspot = (this.scenes[this.currentScene].hotspots || []).find(
        (h) => h.id === id
      );
      if (sceneHotspot) {
        if (isTextType) {
          sceneHotspot.text = hotspot.text;
          sceneHotspot.popupWidth = hotspot.popupWidth;
          sceneHotspot.popupHeight = hotspot.popupHeight;
        }
        if (isAudioType) sceneHotspot.audio = hotspot.audio;
        if (isNav) sceneHotspot.navigationTarget = hotspot.navigationTarget;
      }

      // Rebuild entity for simplicity
      this._refreshHotspotEntity(hotspot);
      this.updateHotspotList();
      this.saveScenesData(); // Save after updating hotspot
      close();
      this.showStartingPointFeedback("Hotspot updated");
    };
  }

  _validateHotspotValues(type, { text, audio, navigationTarget }) {
    switch (type) {
      case "text":
        if (!text)
          return {
            valid: false,
            message: "Text popup type requires description text.",
          };
        return { valid: true };
      case "audio":
        if (!audio)
          return {
            valid: false,
            message: "Audio-only hotspot requires an audio file or URL.",
          };
        return { valid: true };
      case "text-audio":
        if (!text || !audio)
          return {
            valid: false,
            message: "Text + Audio hotspot requires both text and audio.",
          };
        return { valid: true };
      case "navigation":
        if (!navigationTarget)
          return {
            valid: false,
            message: "Please choose a navigation target.",
          };
        return { valid: true };
      default:
        return { valid: true };
    }
  }

  _refreshHotspotEntity(hotspot) {
    const el = document.getElementById(`hotspot-${hotspot.id}`);
    if (el && el.parentNode) el.parentNode.removeChild(el);
    // Ensure position persists
    const dataCopy = { ...hotspot };
    this.createHotspotElement(dataCopy);
  }

  _escapeAttr(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  }

  _escapeHTML(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  }

  // ===== Inline SVG icon helpers (reliable in A-Frame) =====
  _getEditIconDataURI() {
    // White pencil icon sized to fit inside 0.12 radius circle
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <g fill="none" stroke="white" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 110l18-4 60-60c4-4 4-10 0-14l-0.5-0.5c-4-4-10-4-14 0l-60 60-3.5 19.5z" fill="white" stroke="none"/>
    <path d="M82 22l24 24" stroke="white"/>
  </g>
  <rect x="0" y="0" width="128" height="128" fill="none"/>
  <title>edit</title>
  <desc>pencil</desc>
  <metadata>inline</metadata>
  <style></style>
</svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  _getMoveIconDataURI() {
    // White pin/locator icon
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <g fill="white">
    <path d="M64 10c-20 0-36 16-36 36 0 26 36 72 36 72s36-46 36-72c0-20-16-36-36-36zm0 52a16 16 0 1 1 0-32 16 16 0 0 1 0 32z"/>
  </g>
  <rect x="0" y="0" width="128" height="128" fill="none"/>
  <title>move</title>
  <desc>pin</desc>
</svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  startReposition(id) {
    this.repositioningHotspotId = id;
    this.showRepositionNotice();
    this._setHotspotTranslucent(id, true);
  }

  showRepositionNotice() {
    // Simple inline notice under instructions
    const existing = document.getElementById("reposition-notice");
    if (existing) return;
    const n = document.createElement("div");
    n.id = "reposition-notice";
    n.style.cssText =
      "position:fixed; top:20px; right:380px; background: rgba(33,150,243,0.95); color:white; padding:8px 12px; border-radius:6px; z-index:10001; font-family:Arial; font-size:12px;";
    n.textContent =
      "Reposition mode: click on the 360° image to set new position • Press ESC to cancel";
    document.body.appendChild(n);
    // esc to cancel
    this._escCancelReposition = (e) => {
      if (e.key === "Escape") this.cancelReposition();
    };
    window.addEventListener("keydown", this._escCancelReposition);
  }

  hideRepositionNotice() {
    const n = document.getElementById("reposition-notice");
    if (n && n.parentNode) n.parentNode.removeChild(n);
    if (this._escCancelReposition) {
      window.removeEventListener("keydown", this._escCancelReposition);
      this._escCancelReposition = null;
    }
  }

  applyReposition(evt) {
    const id = this.repositioningHotspotId;
    if (!id) return;
    const hotspot = this.hotspots.find((h) => h.id === id);
    if (!hotspot) {
      this.cancelReposition();
      return;
    }

    const intersection = evt.detail.intersection;
    if (!intersection) return;
    const camera = document.querySelector("#cam");
    const pos = this.calculateOptimalPosition(intersection, camera);
    const newPos = `${pos.x.toFixed(2)} ${pos.y.toFixed(2)} ${pos.z.toFixed(
      2
    )}`;

    // Update data
    hotspot.position = newPos;
    const sceneHotspot = (this.scenes[this.currentScene].hotspots || []).find(
      (h) => h.id === id
    );
    if (sceneHotspot) sceneHotspot.position = newPos;

    // Update entity
    const el = document.getElementById(`hotspot-${id}`);
    if (el) el.setAttribute("position", newPos);

    this.saveScenesData(); // Save after moving hotspot
    this._setHotspotTranslucent(id, false);
    this.repositioningHotspotId = null;
    this.hideRepositionNotice();
    this.updateHotspotList();
    this.showStartingPointFeedback("Hotspot moved");
  }

  cancelReposition() {
    if (this.repositioningHotspotId) {
      this._setHotspotTranslucent(this.repositioningHotspotId, false);
    }
    this.repositioningHotspotId = null;
    this.hideRepositionNotice();
  }

  _setHotspotTranslucent(id, on) {
    const el = document.getElementById(`hotspot-${id}`);
    if (!el) return;
    try {
      if (on) {
        // Keep the main invisible plane completely invisible during repositioning
        el.setAttribute("material", {
          transparent: true,
          opacity: 0, // Keep invisible plane invisible
        });
        
        // Find and make only the visible info button semi-transparent
        const infoButton = el.querySelector('a-entity[geometry*="circle"][material*="color"]');
        if (infoButton) {
          const currentMaterial = infoButton.getAttribute("material") || {};
          // Store original material for restoration
          this._repositionPrevMaterial = { 
            id, 
            infoButtonMaterial: { ...currentMaterial }
          };
          
          // Make info button semi-transparent for visual feedback
          infoButton.setAttribute("material", {
            ...currentMaterial,
            opacity: 0.55,
            transparent: true
          });
        }
        
        // Add subtle pulse animation to the entire hotspot for attention
        el.setAttribute("animation__pulse", {
          property: "scale",
          from: "1 1 1",
          to: "1.1 1.1 1.1",
          dur: 600,
          dir: "alternate",
          loop: true,
          easing: "easeInOutSine",
        });
      } else {
        // Restore invisible plane to completely invisible
        el.setAttribute("material", { 
          transparent: true, 
          opacity: 0 
        });
        
        // Restore info button to original appearance
        const infoButton = el.querySelector('a-entity[geometry*="circle"][material*="color"]');
        if (infoButton && this._repositionPrevMaterial && this._repositionPrevMaterial.id === id) {
          const originalMaterial = this._repositionPrevMaterial.infoButtonMaterial || {
            color: "#4A90E2",
            opacity: 0.9,
            transparent: true
          };
          infoButton.setAttribute("material", originalMaterial);
        } else if (infoButton) {
          // Fallback to default info button appearance
          infoButton.setAttribute("material", {
            color: "#4A90E2",
            opacity: 0.9,
            transparent: true
          });
        }
        
        // Remove pulse animation
        el.removeAttribute("animation__pulse");
      }
    } catch (e) {
      if (!on) {
        // Error recovery: ensure invisible plane stays invisible
        el.setAttribute("material", { transparent: true, opacity: 0 });
        el.removeAttribute("animation__pulse");
        
        // Restore info button if possible
        const infoButton = el.querySelector('a-entity[geometry*="circle"][material*="color"]');
        if (infoButton) {
          infoButton.setAttribute("material", {
            color: "#4A90E2",
            opacity: 0.9,
            transparent: true
          });
        }
      }
    }
  }

  selectHotspot(id) {
    // Remove previous selection
    document.querySelectorAll(".hotspot-item").forEach((item) => {
      item.classList.remove("selected");
    });

    // Add selection to current item
    const item = document.querySelector(`[data-hotspot-id="${id}"]`);
    if (item) {
      item.classList.add("selected");
      this.selectedHotspotId = id;

      // Highlight the hotspot in the scene
      const hotspotEl = document.getElementById(`hotspot-${id}`);
      if (hotspotEl) {
        // Add a temporary highlight effect
        hotspotEl.emit("highlight");
      }
    }
  }

  deleteHotspot(id) {
    const hotspot = this.hotspots.find((h) => h.id === id);
    if (!hotspot) return;

    if (confirm(`Delete this hotspot?`)) {
      // Remove from array
      this.hotspots = this.hotspots.filter((h) => h.id !== id);

      // Remove from scene
      const hotspotEl = document.getElementById(`hotspot-${id}`);
      if (hotspotEl) {
        hotspotEl.remove();
      }

      this.updateHotspotList();
      this.saveScenesData(); // Save after deleting hotspot
    }
  }

  clearAllHotspots() {
    if (this.hotspots.length === 0) return;

    if (confirm("Clear all hotspots?")) {
      this.hotspots.forEach((hotspot) => {
        const hotspotEl = document.getElementById(`hotspot-${hotspot.id}`);
        if (hotspotEl) {
          hotspotEl.remove();
        }
      });

      this.hotspots = [];
      this.updateHotspotList();
      this.saveScenesData(); // Save after clearing all hotspots
    }
  }

  async saveTemplate() {
    const templateName =
      document.getElementById("template-name").value ||
      `hotspot-project-${Date.now()}`;

    // Show options dialog
    const exportType = await this.showExportDialog();

    if (exportType === "json") {
      this.saveAsJSON(templateName);
    } else if (exportType === "project") {
      this.saveAsCompleteProject(templateName);
    }
  }

  showExportDialog() {
    return new Promise((resolve) => {
      const dialog = document.createElement("div");
      dialog.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.8); z-index: 10000; display: flex; 
        align-items: center; justify-content: center; font-family: Arial;
      `;

      dialog.innerHTML = `
        <div style="background: #2a2a2a; padding: 30px; border-radius: 10px; color: white; max-width: 500px;">
          <h3 style="margin-top: 0; color: #4CAF50;">Export Options</h3>
          <p>Choose how you want to save your hotspot project:</p>
          
          <div style="margin: 20px 0;">
            <button id="export-json" style="
              background: #4CAF50; color: white; border: none; padding: 15px 25px;
              border-radius: 6px; cursor: pointer; margin: 5px; width: 200px;
              font-size: 14px; font-weight: bold;
            ">📄 JSON Template</button>
            <div style="font-size: 12px; color: #ccc; margin-left: 5px;">
              Save configuration only (requires existing project files)
            </div>
          </div>
          
          <div style="margin: 20px 0;">
            <button id="export-project" style="
              background: #2196F3; color: white; border: none; padding: 15px 25px;
              border-radius: 6px; cursor: pointer; margin: 5px; width: 200px;
              font-size: 14px; font-weight: bold;
            ">📦 Complete Project</button>
            <div style="font-size: 12px; color: #ccc; margin-left: 5px;">
              Save everything as standalone project folder
            </div>
          </div>
          
          <button id="export-cancel" style="
            background: #666; color: white; border: none; padding: 10px 20px;
            border-radius: 4px; cursor: pointer; margin-top: 10px;
          ">Cancel</button>
        </div>
      `;

      document.body.appendChild(dialog);

      document.getElementById("export-json").onclick = () => {
        document.body.removeChild(dialog);
        resolve("json");
      };

      document.getElementById("export-project").onclick = () => {
        document.body.removeChild(dialog);
        resolve("project");
      };

      document.getElementById("export-cancel").onclick = () => {
        document.body.removeChild(dialog);
        resolve(null);
      };
    });
  }

  saveAsJSON(templateName) {
    const template = {
      name: templateName,
      created: new Date().toISOString(),
      scenes: this.scenes, // Save all scenes instead of just hotspots
      currentScene: this.getFirstSceneId(), // Use first scene as starting scene
      hotspots: this.hotspots, // Keep for backwards compatibility
      customStyles: this.customStyles, // Include custom CSS styles
    };

    // Create download link
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(template, null, 2));
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${templateName}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();

    alert(`JSON template "${templateName}" saved!`);
  }

  async saveAsCompleteProject(templateName) {
    try {
      // Show progress
      const progressDiv = this.showProgress("Creating complete project...");

      // Create JSZip instance
      const JSZip = window.JSZip || (await this.loadJSZip());
      const zip = new JSZip();

      // Get current skybox image - handle both data URLs and file paths
      const skyboxImg = document.querySelector("#main-panorama");
      const skyboxSrc = skyboxImg ? skyboxImg.src : "";

      // Create project structure with all scenes
      await this.addFilesToZip(zip, templateName, skyboxSrc);

      // Generate and download ZIP
      const content = await zip.generateAsync({ type: "blob" });
      this.downloadBlob(content, `${templateName}.zip`);

      this.hideProgress(progressDiv);
      alert(
        `Complete project "${templateName}.zip" created! Extract and open index.html to run.`
      );
    } catch (error) {
      alert(`Error creating project: ${error.message}`);
    }
  }

  async loadJSZip() {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
      script.onload = () => resolve(window.JSZip);
      script.onerror = () => reject(new Error("Failed to load JSZip"));
      document.head.appendChild(script);
    });
  }

  async addFilesToZip(zip, templateName, skyboxSrc) {
    // Add main HTML file
    const htmlContent = this.generateCompleteHTML(templateName);
    zip.file("index.html", htmlContent);

    // Add JavaScript file
    const jsContent = this.generateCompleteJS();
    zip.file("script.js", jsContent);

    // Add CSS file
    const cssContent = this.generateCSS();
    zip.file("style.css", cssContent);

    // Create folders
    const imagesFolder = zip.folder("images");
    const audioFolder = zip.folder("audio");

    // Add real assets from current project
    await this.addRealAssets(imagesFolder, audioFolder);

    // Add all scene images
    await this.addSceneImages(imagesFolder);

    // Add configuration with all scenes and hotspots (with corrected image/audio paths)
    const scenes = await this.normalizeScenePathsForExport(audioFolder);
    const config = {
      name: templateName,
      created: new Date().toISOString(),
      scenes,
      currentScene: this.getFirstSceneId(), // Use first scene as starting scene
      version: "1.0",
    };
    zip.file("config.json", JSON.stringify(config, null, 2));

    // Add README
    const readmeContent = `# VR Hotspot Project: ${templateName}

## How to Use
1. Open index.html in a web browser
2. Click on hotspots to interact with content
3. Use mouse to look around the 360° environment
4. Compatible with VR headsets

## Files Structure
- index.html - Main project file
- script.js - Project functionality
- style.css - Styling
- config.json - Project configuration with all scenes
- images/ - Image assets including scene panoramas
- audio/ - Audio assets

## Requirements
- Modern web browser
- Internet connection (for A-Frame library)

Generated by VR Hotspot Editor on ${new Date().toLocaleDateString()}
`;
    zip.file("README.md", readmeContent);
  }

  async addSceneImages(imagesFolder) {
    for (const [sceneId, scene] of Object.entries(this.scenes)) {
      if (scene.image.startsWith("data:")) {
        // Convert data URL to blob
        const response = await fetch(scene.image);
        const blob = await response.blob();
        imagesFolder.file(`${sceneId}.jpg`, blob);
      } else if (scene.image.startsWith("./images/")) {
        // Copy existing image files
        try {
          const response = await fetch(scene.image);
          if (response.ok) {
            const blob = await response.blob();
            const filename = scene.image.split("/").pop();
            imagesFolder.file(filename, blob);
          }
        } catch (e) {
          console.warn(`Could not copy scene image: ${scene.image}`);
        }
      }
    }
  }

  async normalizeScenePathsForExport(audioFolder) {
    const normalizedScenes = {};

    for (const [sceneId, scene] of Object.entries(this.scenes)) {
      // Create new scene object without deep copying to preserve File objects
      const newScene = {
        name: scene.name,
        image: this.getExportImagePath(scene.image, sceneId),
        hotspots: [],
        startingPoint: scene.startingPoint,
        globalSound: null,
      };

      // Handle global sound
      if (scene.globalSound && scene.globalSound.enabled) {
        const globalAudio = scene.globalSound.audio;
        let normalizedAudio = null;

        if (globalAudio instanceof File) {
          // It's a File object, save to audio folder
          const fileName = `global_${sceneId}_${globalAudio.name}`;
          if (audioFolder) {
            audioFolder.file(fileName, globalAudio);
          }
          normalizedAudio = `./audio/${fileName}`;
        } else if (typeof globalAudio === "string") {
          // It's a URL string, keep as-is
          normalizedAudio = globalAudio;
        }

        if (normalizedAudio) {
          newScene.globalSound = {
            audio: normalizedAudio,
            volume: scene.globalSound.volume || 0.5,
            enabled: true,
          };
        }
      }

      // Process each hotspot, handling File objects properly
      if (Array.isArray(scene.hotspots)) {
        for (const origHotspot of scene.hotspots) {
          const newHotspot = {
            id: origHotspot.id,
            type: origHotspot.type,
            position: origHotspot.position,
            text: origHotspot.text,
            scene: origHotspot.scene,
            navigationTarget: origHotspot.navigationTarget,
            audio: null,
          };

          // Handle audio properly
          if (origHotspot.audio && origHotspot.audio instanceof File) {
            // It's a File object, save to audio folder and update path
            const fileName = `${sceneId}_${origHotspot.id}_${origHotspot.audio.name}`;
            if (audioFolder) {
              audioFolder.file(fileName, origHotspot.audio);
            }
            newHotspot.audio = `./audio/${fileName}`;
          } else if (typeof origHotspot.audio === "string") {
            // It's a URL string, keep as-is
            newHotspot.audio = origHotspot.audio;
          } else {
            // null or undefined
            newHotspot.audio = null;
          }

          // Preserve popup sizing for text-based hotspots in export
          if (
            origHotspot.type === "text" ||
            origHotspot.type === "text-audio"
          ) {
            if (typeof origHotspot.popupWidth === "number") {
              newHotspot.popupWidth = Math.min(
                10,
                Math.max(2, origHotspot.popupWidth)
              );
            }
            if (typeof origHotspot.popupHeight === "number") {
              newHotspot.popupHeight = Math.min(
                10,
                Math.max(1.5, origHotspot.popupHeight)
              );
            }
          }

          newScene.hotspots.push(newHotspot);
        }
      }

      normalizedScenes[sceneId] = newScene;
    }
    return normalizedScenes;
  }

  getExportImagePath(imagePath, sceneId) {
    // If it's a URL (http:// or https://), use it directly
    if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
      return imagePath;
    }
    // For uploaded scenes (data URLs), save as sceneId.jpg
    else if (imagePath.startsWith("data:")) {
      return `./images/${sceneId}.jpg`;
    }
    // If it's already a proper path starting with ./images/, keep as-is
    else if (imagePath.startsWith("./images/")) {
      return imagePath;
    }
    // Fallback - assume it's a filename and prepend the images path
    else {
      return `./images/${imagePath}`;
    }
  }

  loadTemplate() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.zip";

    input.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (file.name.endsWith(".json")) {
        this.loadJSONTemplate(file);
      } else if (file.name.endsWith(".zip")) {
        alert(
          "ZIP project loading will extract to your downloads. Open the index.html file from the extracted folder."
        );
        // For ZIP files, user needs to extract manually and open index.html
        // This is the simplest approach for now
      } else {
        alert("Please select a JSON template file or ZIP project file.");
      }
    });

    input.click();
  }

  loadJSONTemplate(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const template = JSON.parse(e.target.result);
        this.clearAllHotspots();

        // Handle new format with scenes
        if (template.scenes) {
          this.scenes = template.scenes;
          this.currentScene = template.currentScene || "scene1";
          this.updateSceneDropdown();
          this.loadCurrentScene();
        }
        // Handle legacy format
        else if (template.hotspots) {
          template.hotspots.forEach((hotspotData) => {
            this.createHotspotElement(hotspotData);
            this.hotspots.push(hotspotData);
          });
          this.hotspotIdCounter = Math.max(
            ...this.hotspots.map((h) => h.id),
            0
          );
        }

        // Load custom styles if included
        if (template.customStyles) {
          this.customStyles = template.customStyles;
          this.saveCSSToLocalStorage(); // Save to localStorage
          this.applyStylesToExistingElements(); // Apply to current elements
        }

        this.updateHotspotList();
        this.updateNavigationTargets();
        this.updateStartingPointInfo();

        alert(`Template "${template.name}" loaded successfully!`);
      } catch (error) {
        alert("Error loading template file");
      }
    };
    reader.readAsText(file);
  }

  // CSS Customization Methods
  openStyleEditor() {
    // Persist current work before navigating away
    // 1) Save scenes/hotspots so a just-loaded template or recent edits aren't lost
    try {
      this.saveScenesData();
    } catch (e) {
      console.warn(
        "Failed to save scenes data before opening style editor:",
        e
      );
    }

    // 2) Save current styles to localStorage before opening editor
    this.saveCSSToLocalStorage();

    // Open style editor without large URL parameters
    window.location.href = "style-editor.html";
  }

  checkForStyleUpdates() {
    const urlParams = new URLSearchParams(window.location.search);
    const stylesUpdated = urlParams.get("stylesUpdated");

    if (stylesUpdated === "true") {
      try {
        // Load styles from localStorage when returning from style editor
        this.loadCSSFromLocalStorage();

        // Apply styles to existing elements WITHOUT clearing anything
        this.refreshAllHotspotStyles();

        // Clean up URL parameters
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );

        // Show success message
        setTimeout(() => {
          alert("✅ Visual styles updated successfully!");
        }, 500);
      } catch (error) {
        console.warn("Failed to load styles from URL:", error);
      }
    }
  }

  applyStylesToExistingElements() {
    const styles = this.customStyles;

    // Update existing info buttons
    document
      .querySelectorAll(
        'a-entity[geometry*="primitive: plane"][material*="color"]'
      )
      .forEach((infoButton) => {
        const geometry = infoButton.getAttribute("geometry");
        if (
          geometry &&
          geometry.includes("width: 4") &&
          geometry.includes("height: 0.5")
        ) {
          // This is likely an info button
          infoButton.setAttribute(
            "material",
            `color: ${styles.hotspot.infoButton.backgroundColor}`
          );
          const textAttr = infoButton.getAttribute("text");
          if (textAttr) {
            infoButton.setAttribute("text", {
              value: styles.hotspot.infoButton.text,
              align: "center",
              color: styles.hotspot.infoButton.textColor,
              width: styles.hotspot.infoButton.fontSize,
              font: "roboto",
            });
          }
        }
      });

    // Update existing popups
    document.querySelectorAll("a-plane[width][height]").forEach((popup) => {
      const width = popup.getAttribute("width");
      const height = popup.getAttribute("height");
      if (width >= 3 && height >= 2) {
        // Likely a popup background
        popup.setAttribute("color", styles.hotspot.popup.backgroundColor);
        popup.setAttribute("opacity", styles.hotspot.popup.opacity);
      }
    });

    // Update popup text
    document.querySelectorAll("a-text[wrap-count]").forEach((textEl) => {
      if (textEl.getAttribute("wrap-count") === "35") {
        // Likely popup text
        textEl.setAttribute("color", styles.hotspot.popup.textColor);
      }
    });

    // Navigation portal styling removed - portals keep their default appearance

    // Update button images
    if (styles.buttonImages) {
      // Update navigation portal images
      document
        .querySelectorAll('a-image[src="#hotspot"], a-image[src*="up-arrow"]')
        .forEach((portal) => {
          portal.setAttribute("src", styles.buttonImages.portal);
        });

      // Update play button images
      document
        .querySelectorAll('a-image[src="#play"], a-image[src*="play.png"]')
        .forEach((playBtn) => {
          playBtn.setAttribute("src", styles.buttonImages.play);
        });

      // Update pause button images
      document
        .querySelectorAll('a-image[src="#pause"], a-image[src*="pause.png"]')
        .forEach((pauseBtn) => {
          pauseBtn.setAttribute("src", styles.buttonImages.pause);
        });
    }

    // Update audio control buttons
    document.querySelectorAll(".audio-control").forEach((audioBtn) => {
      audioBtn.setAttribute("material", `color: ${styles.audio.buttonColor}`);
      audioBtn.setAttribute("opacity", styles.audio.buttonOpacity);
    });

    console.log("✅ Applied custom styles to existing elements");
  }

  refreshAllHotspotStyles() {
    console.log("🎨 Refreshing all hotspot styles");

    // Refresh styles for all existing hotspots
    this.applyStylesToExistingElements();

    // Also refresh any in-memory hotspot data
    // Apply navigation ring customizations to existing navigation hotspots
    const navStyles = (this.customStyles && this.customStyles.navigation) || {};
    const ringOuter =
      typeof navStyles.ringOuterRadius === "number"
        ? navStyles.ringOuterRadius
        : 0.6;
    const ringThickness =
      typeof navStyles.ringThickness === "number"
        ? navStyles.ringThickness
        : 0.02;
    const ringInner = Math.max(0.001, ringOuter - ringThickness);
    const ringColor = navStyles.ringColor || "rgb(0, 85, 0)";

    this.hotspots.forEach((hotspot) => {
      if (hotspot.type !== "navigation") return;
      const el = document.getElementById(`hotspot-${hotspot.id}`);
      if (!el) return;

      // Update ring element
      const ringEl = el.querySelector(".nav-ring");
      if (ringEl) {
        ringEl.setAttribute(
          "geometry",
          `primitive: ring; radiusInner: ${ringInner}; radiusOuter: ${ringOuter}`
        );
        ringEl.setAttribute(
          "material",
          `color: ${ringColor}; opacity: 1; transparent: true; shader: flat`
        );
      }

      // Update preview circle
      const previewEl = el.querySelector(".nav-preview-circle");
      if (previewEl) {
        previewEl.setAttribute(
          "geometry",
          `primitive: circle; radius: ${ringInner}`
        );
      }

      // Update collider (assumes first child is collider)
      const colliderEl = el.querySelector('[geometry*="primitive: circle"]');
      if (colliderEl) {
        colliderEl.setAttribute(
          "geometry",
          `primitive: circle; radius: ${ringOuter}`
        );
      }
    });

    console.log("✅ Refreshed all hotspot styles");
  }

  saveCSSToLocalStorage() {
    localStorage.setItem(
      "vr-hotspot-css-styles",
      JSON.stringify(this.customStyles)
    );
  }

  saveScenesData() {
    // Save current scene hotspots before saving all data (only if current scene exists)
    if (this.scenes[this.currentScene]) {
      this.scenes[this.currentScene].hotspots = [...this.hotspots];
    }

    const scenesData = {
      scenes: this.scenes,
      currentScene: this.currentScene,
      hotspots: this.hotspots,
    };

    localStorage.setItem("vr-hotspot-scenes-data", JSON.stringify(scenesData));
    console.log("✅ Saved scenes data to localStorage");
  }

  loadScenesData() {
    const saved = localStorage.getItem("vr-hotspot-scenes-data");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.scenes = data.scenes || this.scenes;
        this.currentScene = data.currentScene || this.currentScene;
        this.hotspots = data.hotspots || [];

        // Clean up orphaned navigation hotspots
        this.cleanupOrphanedNavigationHotspots();

        // Ensure hotspot IDs are present and unique across all scenes
        this.ensureUniqueHotspotIds();

        console.log("✅ Loaded scenes data from localStorage");
        return true;
      } catch (error) {
        console.warn("Failed to load scenes data from localStorage:", error);
        return false;
      }
    }
    console.log("ℹ️ No saved scenes data found in localStorage");
    return false;
  }

  // Ensure each hotspot has a numeric unique id and sync the id counter
  ensureUniqueHotspotIds() {
    const seen = new Set();
    let maxId = 0;

    const fix = (hsArr) => {
      if (!Array.isArray(hsArr)) return;
      for (let i = 0; i < hsArr.length; i++) {
        const h = hsArr[i] || {};
        // Assign id if missing or invalid
        if (typeof h.id !== "number" || !isFinite(h.id) || h.id <= 0) {
          h.id = ++maxId || 1; // will be re-evaluated below
        }
        maxId = Math.max(maxId, h.id);
      }
    };

    // First pass: determine maxId and fill missing ids
    Object.values(this.scenes).forEach((sc) => fix(sc.hotspots));
    fix(this.hotspots);

    // Second pass: reassign duplicates
    const reassignIfDup = (hsArr) => {
      if (!Array.isArray(hsArr)) return;
      for (let i = 0; i < hsArr.length; i++) {
        const h = hsArr[i];
        if (!h) continue;
        if (seen.has(h.id)) {
          h.id = ++maxId;
        }
        seen.add(h.id);
      }
    };

    Object.values(this.scenes).forEach((sc) => reassignIfDup(sc.hotspots));
    reassignIfDup(this.hotspots);

    // Sync the editor's hotspot array with the current scene to reflect new ids
    if (this.scenes[this.currentScene]) {
      this.hotspots = [...this.scenes[this.currentScene].hotspots];
    }

    // Update the counter so new hotspots always get a fresh id
    this.hotspotIdCounter = Math.max(this.hotspotIdCounter || 0, maxId);

    // Persist any fixes
    this.saveScenesData();
  }

  cleanupOrphanedNavigationHotspots() {
    let cleanupCount = 0;

    // Get list of valid scene IDs
    const validSceneIds = Object.keys(this.scenes);

    // Clean up each scene's hotspots
    Object.keys(this.scenes).forEach((sceneId) => {
      const scene = this.scenes[sceneId];
      const originalCount = scene.hotspots.length;

      scene.hotspots = scene.hotspots.filter((hotspot) => {
        if (hotspot.type === "navigation" && hotspot.navigationTarget) {
          const isValid = validSceneIds.includes(hotspot.navigationTarget);
          if (!isValid) {
            console.warn(
              `🗑️ Removing orphaned navigation hotspot in scene "${scene.name}" - target scene "${hotspot.navigationTarget}" no longer exists`
            );
            cleanupCount++;
          }
          return isValid;
        }
        return true; // Keep non-navigation hotspots
      });
    });

    // Also clean up current hotspots array if we're in a scene
    if (this.currentScene && this.scenes[this.currentScene]) {
      this.hotspots = this.hotspots.filter((hotspot) => {
        if (hotspot.type === "navigation" && hotspot.navigationTarget) {
          const isValid = validSceneIds.includes(hotspot.navigationTarget);
          if (!isValid) {
            console.warn(
              `🗑️ Removing orphaned navigation hotspot from current scene - target "${hotspot.navigationTarget}" no longer exists`
            );
            cleanupCount++;
          }
          return isValid;
        }
        return true;
      });
    }

    if (cleanupCount > 0) {
      console.log(`🧹 Cleaned up ${cleanupCount} orphaned navigation hotspots`);
      // Save the cleaned data
      this.saveScenesData();
    }
  }

  loadCSSFromLocalStorage() {
    const saved = localStorage.getItem("vr-hotspot-css-styles");
    if (saved) {
      try {
        const loadedStyles = JSON.parse(saved);

        // Ensure buttonImages exists for backward compatibility
        if (!loadedStyles.buttonImages) {
          loadedStyles.buttonImages = {
            portal: "images/up-arrow.png",
            play: "images/play.png",
            pause: "images/pause.png",
          };
        }

        // Ensure navigation ring defaults exist
        if (!loadedStyles.navigation) loadedStyles.navigation = {};
        if (loadedStyles.navigation.ringColor === undefined)
          loadedStyles.navigation.ringColor = "#005500";
        if (loadedStyles.navigation.ringOuterRadius === undefined)
          loadedStyles.navigation.ringOuterRadius = 0.6;
        if (loadedStyles.navigation.ringThickness === undefined)
          loadedStyles.navigation.ringThickness = 0.02;

        this.customStyles = loadedStyles;
        console.log(
          "✅ Loaded custom styles from localStorage",
          this.customStyles
        );
        console.log("🎨 Button images:", this.customStyles.buttonImages);
      } catch (error) {
        console.warn("Failed to load saved CSS styles, using defaults");
      }
    } else {
      console.log("ℹ️ No saved styles found in localStorage, using defaults");
    }
  }

  getCustomStyles() {
    return this.customStyles;
  }

  // Project export helper methods
  showProgress(message) {
    const progressDiv = document.createElement("div");
    progressDiv.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.9); color: white; padding: 20px;
      border-radius: 8px; z-index: 10001; font-family: Arial;
    `;
    progressDiv.innerHTML = `<div style="text-align: center;">${message}<br><div style="margin-top: 10px;">⏳ Please wait...</div></div>`;
    document.body.appendChild(progressDiv);
    return progressDiv;
  }

  hideProgress(progressDiv) {
    if (progressDiv && progressDiv.parentNode) {
      progressDiv.parentNode.removeChild(progressDiv);
    }
  }

  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  generateCompleteHTML(templateName) {
    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${templateName} - VR Hotspot Experience</title>
    <meta name="description" content="Interactive VR Hotspot Experience" />
    <script src="https://aframe.io/releases/1.7.0/aframe.min.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/c-frame/aframe-extras@7.5.4/dist/aframe-extras.min.js"></script>
    <script src="script.js"></script>
    <link rel="stylesheet" href="style.css">
  </head>
  
  <body>
    <div id="project-info">
      <h1>${templateName}</h1>
      <p>Interactive VR Experience • Click on hotspots to explore</p>
    </div>

    <!-- Global Sound Control -->
    <div id="global-sound-control">
      <button id="global-sound-toggle" class="sound-btn">🔊 Sound: ON</button>
      <div id="audio-progress-container" class="audio-progress-container" style="display: none;">
        <div class="audio-info">
          <span id="current-time">0:00</span>
          <div class="progress-bar-container">
            <div class="progress-bar" id="progress-bar">
              <div class="progress-fill" id="progress-fill"></div>
              <div class="progress-handle" id="progress-handle"></div>
            </div>
          </div>
          <span id="total-time">0:00</span>
        </div>
      </div>
    </div>

    <a-scene background="color: #1a1a2e" id="main-scene">
      <a-entity
        laser-controls="hand: right"
        raycaster="objects: .clickable, .audio-control"
      ></a-entity>
      <a-entity
        laser-controls="hand: left"
        raycaster="objects: .clickable, .audio-control"
      ></a-entity>

      <a-assets>
        <img id="main-panorama" src="./images/scene1.jpg" />
        <img id="hotspot" src="./images/up-arrow.png" />
        <audio id="default-audio" src="./audio/music.mp3"></audio>
        <img id="close" src="./images/close.png" />
        <img id="play" src="./images/play.png" />
        <img id="pause" src="./images/pause.png" />
      </a-assets>

      <a-entity id="hotspot-container"></a-entity>
      
      <!-- Initial loading environment -->
      <a-entity id="loading-environment" visible="true">
        <!-- Starfield background -->
        <a-entity position="0 0 0">
          <a-entity geometry="primitive: sphere; radius: 100" 
                   material="color: #0f0f23; transparent: true; opacity: 0.8"></a-entity>
        </a-entity>
        
        <!-- Floating orbs for visual interest -->
        <a-entity id="loading-orb-1" 
                 geometry="primitive: sphere; radius: 0.3" 
                 material="color: #4CAF50; emissive: #4CAF50; emissiveIntensity: 0.5"
                 position="3 2 -5"
                 animation="property: rotation; to: 360 360 0; dur: 8000; easing: linear; loop: true">
        </a-entity>
        
        <a-entity id="loading-orb-2" 
                 geometry="primitive: sphere; radius: 0.2" 
                 material="color: #2196F3; emissive: #2196F3; emissiveIntensity: 0.4"
                 position="-4 1 -3"
                 animation="property: rotation; to: -360 180 360; dur: 6000; easing: linear; loop: true">
        </a-entity>
        
        <a-entity id="loading-orb-3" 
                 geometry="primitive: sphere; radius: 0.15" 
                 material="color: #FF9800; emissive: #FF9800; emissiveIntensity: 0.3"
                 position="2 -1 -4"
                 animation="property: rotation; to: 180 -360 180; dur: 10000; easing: linear; loop: true">
        </a-entity>
        
   <!-- Central loading text -->
        <a-text id="loading-text" 
               value="Loading VR Experience..." 
               position="0 0 -3" 
               align="center" 
               color="#000"
     font="dejavu"
     material="transparent: true; opacity: 0"
               animation="property: rotation; to: 0 5 0; dur: 3000; easing: easeInOutSine; loop: true; dir: alternate">
        </a-text>
        
        <!-- Animated loading dots -->
        <a-text id="loading-dots" 
               value="●○○" 
               position="0 -0.5 -3" 
               align="center" 
               color="#4CAF50"
               font="dejavu"
               animation__dots="property: opacity; to: 0.3; dur: 800; easing: easeInOutSine; loop: true; dir: alternate">
        </a-text>
      </a-entity>
      
      <!-- Actual scene skybox - initially hidden -->
      <a-sky id="skybox" src="#main-panorama" visible="false"></a-sky>

      <a-entity id="cam" camera position="0 1.6 0" look-controls>
        <!-- Mouse-based cursor for non-VR mode -->
        <a-entity 
          cursor="rayOrigin: mouse; fuse: false"
          raycaster="objects: .clickable, .audio-control"
          id="mouse-cursor"
          visible="true">
        </a-entity>
        
        <!-- Gaze-based cursor for VR mode -->
        <a-entity
          cursor="fuse: true; fuseTimeout: 1500"
          raycaster="objects: .clickable, .audio-control"
          position="0 0 -1"
          geometry="primitive: ring; radiusInner: 0.005; radiusOuter: 0.01"
          material="color: white; shader: flat; opacity: 0.8"
          id="gaze-cursor"
          visible="true"
          animation__mouseenter="property: geometry.radiusOuter; to: 0.015; startEvents: mouseenter; dur: 1500; easing: easeInQuad"
          animation__mouseleave="property: geometry.radiusOuter; to: 0.01; startEvents: mouseleave; dur: 300; easing: easeOutQuad"
          animation__click="property: scale; to: 1.2 1.2 1.2; startEvents: click; dur: 150; easing: easeInOutQuad"
          animation__fusing="property: scale; to: 1.2 1.2 1.2; startEvents: fusing; dur: 1500; easing: easeInQuad"
          animation__fusecomplete="property: scale; to: 1 1 1; startEvents: click; dur: 150; easing: easeOutQuad">
        </a-entity>
      </a-entity>
    </a-scene>
  </body>
</html>`;
  }

  generateCSS() {
    return `/* VR Hotspot Project Styles */
body {
  margin: 0;
  font-family: Arial, sans-serif;
  background: #000;
}

#project-info {
  position: fixed;
  top: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 15px;
  border-radius: 8px;
  z-index: 999;
  max-width: 300px;
}

#project-info h1 {
  margin: 0 0 5px 0;
  font-size: 18px;
  color: #4CAF50;
}

#project-info p {
  margin: 0;
  font-size: 12px;
  color: #ccc;
}

/* Global Sound Control */
#global-sound-control {
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 1000;
  margin-top: 120px; /* Below project info */
}

.sound-btn {
  background: rgba(0, 0, 0, 0.8);
  color: white;
  border: 2px solid #4CAF50;
  padding: 10px 15px;
  border-radius: 8px;
  cursor: pointer;
  font-family: Arial, sans-serif;
  font-size: 14px;
  font-weight: bold;
  transition: all 0.3s ease;
  user-select: none;
  display: block;
  margin-bottom: 10px;
}

.sound-btn:hover {
  background: rgba(76, 175, 80, 0.2);
  border-color: #66BB6A;
  transform: translateY(-2px);
}

.sound-btn.muted {
  border-color: #f44336;
  color: #f44336;
}

.sound-btn.muted:hover {
  background: rgba(244, 67, 54, 0.2);
  border-color: #ef5350;
}

/* Audio Progress Bar */
.audio-progress-container {
  background: rgba(0, 0, 0, 0.8);
  border: 2px solid #4CAF50;
  border-radius: 8px;
  padding: 10px;
  min-width: 250px;
  font-family: Arial, sans-serif;
  color: white;
}

.audio-info {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}

.progress-bar-container {
  flex: 1;
  position: relative;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
  position: relative;
  cursor: pointer;
}

.progress-fill {
  height: 100%;
  background: #4CAF50;
  border-radius: 3px;
  width: 0%;
  transition: width 0.1s ease;
}

.progress-handle {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 14px;
  height: 14px;
  background: #4CAF50;
  border: 2px solid white;
  border-radius: 50%;
  cursor: pointer;
  left: 0%;
  transition: left 0.1s ease;
  opacity: 0;
}

.progress-bar:hover .progress-handle {
  opacity: 1;
}

.progress-handle:hover {
  transform: translate(-50%, -50%) scale(1.2);
}

#current-time, #total-time {
  min-width: 35px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

/* Hotspot animations */
.clickable {
  cursor: pointer;
}

/* Animation for gaze feedback */
@keyframes hotspotPulse {
  0% { opacity: 0.8; }
  50% { opacity: 1.0; }
  100% { opacity: 0.8; }
}

.hotspot-animation {
  animation: hotspotPulse 2s infinite;
}

/* Navigation feedback animation */
@keyframes fadeInOut {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
  20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
}

/* Responsive design */
@media (max-width: 768px) {
  #project-info {
    position: static;
    margin: 10px;
  }
  
  #global-sound-control {
    position: static;
    margin: 10px;
    text-align: center;
  }
  
  .audio-progress-container {
    min-width: auto;
    width: 100%;
  }
  
  .audio-info {
    flex-direction: column;
    gap: 8px;
  }
  
  .progress-bar-container {
    width: 100%;
  }
}`;
  }

  generateCompleteJS() {
    // Include custom styles in the generated code
    const customStylesJson = JSON.stringify(this.customStyles, null, 2);

    return `// VR Hotspot Project - Standalone Version
// Generated from VR Hotspot Editor

// Custom Styles Configuration
const CUSTOM_STYLES = ${customStylesJson};

// Face camera component
AFRAME.registerComponent("face-camera", {
  init: function () {
    this.cameraObj = document.querySelector("[camera]").object3D;
  },
  tick: function () {
    if (this.cameraObj) {
      this.el.object3D.lookAt(this.cameraObj.position);
    }
  },
});

// Hotspot component for standalone projects
AFRAME.registerComponent("hotspot", {
  schema: {
    label: { type: "string", default: "" },
    audio: { type: "string", default: "" },
    popup: { type: "string", default: "" },
    popupWidth: { type: "number", default: 3 },
    popupHeight: { type: "number", default: 2 },
    popupColor: { type: "color", default: "#333333" },
  },

  init: function () {
    const data = this.data;
    const el = this.el;

    // REMOVED: Main element hover animations to prevent conflicts with popup elements

    // Add popup functionality
    if (data.popup) {
      this.createPopup(data);
    }

    // Add audio functionality
    if (data.audio) {
      this.createAudio(data);
    }
  },

  createPopup: function(data) {
    const el = this.el;

    const infoIcon = document.createElement("a-entity");
    // Create circular info icon instead of banner
    const iconSize = CUSTOM_STYLES.hotspot.infoButton.size || 0.4;
    infoIcon.setAttribute("geometry", "primitive: circle; radius: " + iconSize);
    
    // Use custom styles
    const infoBgColor = CUSTOM_STYLES.hotspot.infoButton.backgroundColor;
    const infoTextColor = CUSTOM_STYLES.hotspot.infoButton.textColor;
    const infoFontSize = CUSTOM_STYLES.hotspot.infoButton.fontSize;
    
    infoIcon.setAttribute("material", "color: " + infoBgColor + "; opacity: " + CUSTOM_STYLES.hotspot.infoButton.opacity);
    infoIcon.setAttribute("text", "value: i; align: center; color: " + infoTextColor + "; width: " + infoFontSize + "; font: roboto");
    infoIcon.setAttribute("position", "0 0.8 0");
    infoIcon.classList.add("clickable");
    
    // Add hover animations to info icon for better UX
    infoIcon.setAttribute("animation__hover_in", {
      property: "scale",
      to: "1.1 1.1 1",
      dur: 200,
      easing: "easeOutQuad",
      startEvents: "mouseenter",
    });

    infoIcon.setAttribute("animation__hover_out", {
      property: "scale",
      to: "1 1 1",
      dur: 200,
      easing: "easeOutQuad",
      startEvents: "mouseleave",
    });
    
    el.appendChild(infoIcon);

    const popup = document.createElement("a-entity");
    popup.setAttribute("visible", "false");
    popup.setAttribute("position", "0 1.5 0.2"); // Move forward to avoid z-fighting with info icon
    popup.setAttribute("look-at", "#cam");

    const background = document.createElement("a-plane");
    background.setAttribute("color", CUSTOM_STYLES.hotspot.popup.backgroundColor);
    background.setAttribute("width", data.popupWidth);
    background.setAttribute("height", data.popupHeight);
    background.setAttribute("opacity", CUSTOM_STYLES.hotspot.popup.opacity);
    popup.appendChild(background);

    const text = document.createElement("a-text");
    text.setAttribute("value", data.popup);
    text.setAttribute("wrap-count", Math.floor(data.popupWidth * 8)); // Dynamic wrap based on popup width
    text.setAttribute("color", CUSTOM_STYLES.hotspot.popup.textColor);
    text.setAttribute("position", "0 0 0.05"); // Increased z-spacing to prevent z-fighting
    text.setAttribute("align", "center");
    text.setAttribute("width", (data.popupWidth - 0.4).toString()); // Constrain to popup width with padding
    text.setAttribute("font", "roboto");
    popup.appendChild(text);

    const closeButton = document.createElement("a-image");
    closeButton.setAttribute("position", data.popupWidth/2-0.3 + " " + (data.popupHeight/2-0.3) + " 0.1"); // Increased z-spacing
    closeButton.setAttribute("src", "#close");
    closeButton.setAttribute("width", CUSTOM_STYLES.hotspot.closeButton.size.toString());
    closeButton.setAttribute("height", CUSTOM_STYLES.hotspot.closeButton.size.toString());
    closeButton.setAttribute("opacity", CUSTOM_STYLES.hotspot.closeButton.opacity.toString());
    closeButton.classList.add("clickable");
    
    // Add hover animations to close button for better UX
    closeButton.setAttribute("animation__hover_in", {
      property: "scale",
      to: "1.2 1.2 1",
      dur: 200,
      easing: "easeOutQuad",
      startEvents: "mouseenter",
    });

    closeButton.setAttribute("animation__hover_out", {
      property: "scale",
      to: "1 1 1",
      dur: 200,
      easing: "easeOutQuad",
      startEvents: "mouseleave",
    });
    
    popup.appendChild(closeButton);

    infoIcon.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      popup.setAttribute("visible", true);
      infoIcon.setAttribute("visible", false); // Hide info icon when popup is open
    });

    closeButton.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      popup.setAttribute("visible", false);
      setTimeout(() => {
        infoIcon.setAttribute("visible", true); // Show info icon when popup is closed
      }, 250);
    });

    el.appendChild(popup);
  },


  createAudio: function(data) {
    const el = this.el;
    const audioEl = document.createElement("a-sound");
    audioEl.setAttribute("src", data.audio);
    audioEl.setAttribute("autoplay", "false");
    audioEl.setAttribute("loop", "true");
    el.appendChild(audioEl);

    const btn = document.createElement("a-image");
    btn.setAttribute("class", "clickable");
    
    // Use custom play button image if available
    const playImage = CUSTOM_STYLES?.buttonImages?.play || "#play";
    btn.setAttribute("src", playImage);
    
    // Use custom audio button styles
    btn.setAttribute("width", "0.5");
    btn.setAttribute("height", "0.5");
    btn.setAttribute("material", "color: " + CUSTOM_STYLES.audio.buttonColor);
    btn.setAttribute("opacity", CUSTOM_STYLES.audio.buttonOpacity.toString());
    btn.setAttribute("position", "0 -1 0.02");
    el.appendChild(btn);

    let isPlaying = false;

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (audioEl.components.sound) {
        if (isPlaying) {
          audioEl.components.sound.stopSound();
          const playImage = CUSTOM_STYLES?.buttonImages?.play || "#play";
          btn.setAttribute("src", playImage);
        } else {
          audioEl.components.sound.playSound();
          const pauseImage = CUSTOM_STYLES?.buttonImages?.pause || "#pause";
          btn.setAttribute("src", pauseImage);
        }
        isPlaying = !isPlaying;
      }
    });
  }
});

// Project loader
// Project loader
class HotspotProject {
  constructor() {
    this.scenes = {};
    this.currentScene = 'scene1';
    this.globalSoundEnabled = true;
    this.currentGlobalAudio = null;
    this.isDragging = false;
    this.progressUpdateInterval = null;
    this.crossfadeEl = null; // overlay for crossfade
    this.loadProject();
  }

  async loadProject() {
    try {
      const response = await fetch('./config.json');
      const config = await response.json();
      
      console.log('Loaded config:', config);
      
      if (config.scenes) {
        // New format with scenes
        this.scenes = config.scenes;
        this.currentScene = config.currentScene || 'scene1';
        console.log('Using new format with scenes:', this.scenes);
        this.setupScenes();
      } else if (config.hotspots) {
        // Legacy format - single scene
        this.scenes = {
          'scene1': {
            name: 'Scene 1',
            image: './images/scene1.jpg',
            hotspots: config.hotspots
          }
        };
        this.currentScene = 'scene1';
        console.log('Using legacy format, created single scene');
        this.setupScenes();
      }
    } catch (error) {
      console.warn('No config.json found, using empty project');
      this.scenes = {
        'scene1': {
          name: 'Scene 1', 
          image: './images/scene1.jpg',
          hotspots: []
        }
      };
      this.setupScenes();
    }
  }

  setupScenes() {
    // Setup global sound control first
    this.setupGlobalSoundControl();

    // Show loading UI and preload all scene images so nav previews/skyboxes are instant
    this.showLoadingIndicator();
    this.preloadAllSceneImages({ updateUI: true, timeoutMs: 20000 })
      .catch(() => {})
      .finally(() => {
        this.loadScene(this.currentScene);
      });
  }

  loadScene(sceneId) {
    if (!this.scenes[sceneId]) {
      console.warn(\`Scene \${sceneId} not found\`);
      return;
    }
    const scene = this.scenes[sceneId];
    const skybox = document.getElementById('skybox');
    
    console.log(\`Loading scene: \${sceneId}\`, scene);
    
    // Show a loading indicator
    this.showLoadingIndicator();

    // (runtime) no editor hotspot list or id counter to manage
    
    // Prefer preloaded asset if available for instant swap
    const preloadedId = 'asset-panorama-' + sceneId;
    const preImg = document.getElementById(preloadedId);
    
    // Update scene image (fallback path)
    const imagePath = this.getSceneImagePath(scene.image, sceneId);
  console.log('Setting panorama src to: ' + (preImg ? ('#' + preloadedId) : imagePath));
    
    if (preImg) {
      // Use the preloaded asset without network load
      skybox.setAttribute('visible', 'false');
      setTimeout(() => {
        skybox.setAttribute('src', '#' + preloadedId);
        const loadingEnvironment = document.getElementById('loading-environment');
        if (loadingEnvironment) {
          loadingEnvironment.setAttribute('visible', 'false');
        }
        skybox.setAttribute('visible', 'true');
        
  // (runtime) do not persist scenes to localStorage

        console.log('Skybox texture updated from preloaded asset:', preloadedId);
        
        // Create hotspots after skybox is updated
        const container = document.getElementById('hotspot-container');
        container.innerHTML = '';
        this.createHotspots(scene.hotspots);
        console.log('Hotspots created');
        
        // Apply starting point if available
        setTimeout(() => {
          this.applyStartingPoint(scene);
          
          // Play global sound for this scene
          setTimeout(() => {
            this.playCurrentGlobalSound();
          }, 500);
        }, 100);
        
        // Notify listeners that the scene finished loading (for transitions)
        try { const ev = new CustomEvent('vrhotspots:scene-loaded'); window.dispatchEvent(ev); } catch(e) {}

        // Hide the loading indicator
        this.hideLoadingIndicator();
      }, 100);
      
      this.currentScene = sceneId;
      return;
    }
    
    // Use a timestamp as a cache buster
    const cacheBuster = Date.now();
    const imagePathWithCache = imagePath + '?t=' + cacheBuster;
    
    // Create a new unique ID for this panorama
    const uniqueId = 'panorama-' + cacheBuster;
    
    // Create a completely new method that's more reliable across browsers
    // First, create a new image element that's not attached to the DOM yet
    const preloadImage = new Image();
    
    // Set up loading handlers before setting src
    preloadImage.onload = () => {
      console.log('New panorama loaded successfully');
      
      // Now we know the image is loaded, create the actual element for A-Frame
      const newPanorama = document.createElement('img');
      newPanorama.id = uniqueId;
      newPanorama.src = imagePathWithCache;
      newPanorama.crossOrigin = 'anonymous'; // Important for some browsers
      
      // Get the assets container
      const assets = document.querySelector('a-assets');
      
      // Add new panorama element to assets
      assets.appendChild(newPanorama);
      
      // Temporarily hide the skybox while changing its texture
      skybox.setAttribute('visible', 'false');
      
      // Force A-Frame to recognize the asset change
      setTimeout(() => {
        // Update to new texture
        skybox.setAttribute('src', '#' + uniqueId);
        
        // Hide loading environment and show the actual scene
        const loadingEnvironment = document.getElementById('loading-environment');
        if (loadingEnvironment) {
          loadingEnvironment.setAttribute('visible', 'false');
        }
        skybox.setAttribute('visible', 'true');
        
        console.log('Skybox texture updated with ID:', uniqueId);
        
        // Create hotspots after skybox is updated
        const container = document.getElementById('hotspot-container');
        container.innerHTML = '';
        this.createHotspots(scene.hotspots);
        console.log('Hotspots created');
        
        // Apply starting point if available
        setTimeout(() => {
          this.applyStartingPoint(scene);
          
          // Play global sound for this scene
          setTimeout(() => {
            this.playCurrentGlobalSound();
          }, 500);
        }, 100);
        
        // Notify listeners that the scene finished loading (for transitions)
        try { const ev = new CustomEvent('vrhotspots:scene-loaded'); window.dispatchEvent(ev); } catch(e) {}

        // Hide the loading indicator
        this.hideLoadingIndicator();
      }, 100);
    };
    
    // Handle load errors
    preloadImage.onerror = () => {
      console.error(\`Failed to load panorama: \${imagePath}\`);
      this.showErrorMessage(\`Failed to load scene image for "\${scene.name}". Please check if the image exists at \${imagePath}\`);
      
      // Hide loading environment and show fallback
      const loadingEnvironment = document.getElementById('loading-environment');
      if (loadingEnvironment) {
        loadingEnvironment.setAttribute('visible', 'false');
      }
      
      // Fallback to default image
      skybox.setAttribute('src', '#main-panorama');
      skybox.setAttribute('visible', 'true');
      this.hideLoadingIndicator();
    };
    
    // Start loading the image
    preloadImage.src = imagePathWithCache;
    
    // We've replaced this with the preloadImage.onerror handler above
    
    this.currentScene = sceneId;
  }

  getSceneImagePath(imagePath, sceneId) {
    // If it's a URL (http:// or https://), use it directly
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    // If it's already a proper path starting with ./images/, use it directly
    else if (imagePath.startsWith('./images/')) {
      return imagePath;
    } 
    // For uploaded scenes (data URLs in config), look for the saved file
    else if (imagePath.startsWith('data:')) {
      return \`./images/\${sceneId}.jpg\`;
    }
    // Fallback - assume it's a filename and prepend the images path
    else {
      return \`./images/\${imagePath}\`;
    }
  }

  createHotspots(hotspots) {
    const container = document.getElementById('hotspot-container');
    

    hotspots.forEach(hotspot => {
      let hotspotEl;
      if (hotspot.type === 'navigation') {
        hotspotEl = document.createElement('a-entity');
        hotspotEl.setAttribute('face-camera', '');

        // Transparent circle collider for interactions
        const collider = document.createElement('a-entity');
        const navStyles = (typeof CUSTOM_STYLES !== 'undefined' && CUSTOM_STYLES.navigation) ? CUSTOM_STYLES.navigation : {};
        const ringOuter = (typeof navStyles.ringOuterRadius === 'number') ? navStyles.ringOuterRadius : 0.6;
  const ringThickness = (typeof navStyles.ringThickness === 'number') ? navStyles.ringThickness : 0.02;
        const ringInner = Math.max(0.001, ringOuter - ringThickness);
        const ringColor = navStyles.ringColor || 'rgb(0, 85, 0)';
        collider.setAttribute('geometry', 'primitive: circle; radius: ' + ringOuter);
        collider.setAttribute('material', 'opacity: 0; transparent: true');
        collider.classList.add('clickable');
        hotspotEl.appendChild(collider);

  // Thin green border ring (~3px) with transparent center
  const ring = document.createElement('a-entity');
  ring.setAttribute('geometry', 'primitive: ring; radiusInner: ' + ringInner + '; radiusOuter: ' + ringOuter);
  ring.setAttribute('material', 'color: ' + ringColor + '; opacity: 1; transparent: true; shader: flat');
  ring.setAttribute('position', '0 0 0.002');
  ring.classList.add('nav-ring');
  hotspotEl.appendChild(ring);

  // Inline preview circle (hidden by default), shows destination scene image inside the ring
  const preview = document.createElement('a-entity');
  preview.setAttribute('geometry', 'primitive: circle; radius: ' + ringInner);
  preview.setAttribute('material', 'transparent: true; opacity: 1');
  preview.setAttribute('visible', 'false');
  preview.setAttribute('position', '0 0 0.001');
  preview.setAttribute('scale', '0.01 0.01 0.01');
  preview.classList.add('nav-preview-circle');
  hotspotEl.appendChild(preview);
      } else {
        hotspotEl = document.createElement('a-entity');
        hotspotEl.setAttribute('geometry', 'primitive: plane; width: 0.7; height: 0.7');
        hotspotEl.setAttribute('material', 'opacity: 0; transparent: true');
        hotspotEl.setAttribute('face-camera', '');
      }
      hotspotEl.setAttribute('position', hotspot.position);
      hotspotEl.setAttribute('class', 'clickable');
      
      let config = "type:" + hotspot.type;
      
        if (hotspot.type === 'text' || hotspot.type === 'text-audio') {
        const pw = (typeof hotspot.popupWidth === 'number') ? hotspot.popupWidth : 4;
        const ph = (typeof hotspot.popupHeight === 'number') ? hotspot.popupHeight : 2.5;
        config += ";popup:" + hotspot.text + ";popupWidth:" + pw + ";popupHeight:" + ph + ";popupColor:#333333";
      }
      
      if (hotspot.type === 'audio' || hotspot.type === 'text-audio') {
        // Use custom audio URL if available, otherwise use default
        const audioSrc = hotspot.audio || "#default-audio";
        config += ";audio:" + audioSrc;
      }
      
      if (hotspot.type === 'navigation') {
        config += ";navigation:" + hotspot.navigationTarget;
        
        // Add navigation click handler on the collider area
        const targetEl = hotspotEl.querySelector('.clickable') || hotspotEl;
        targetEl.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          this.navigateToScene(hotspot.navigationTarget);
        });

        // Hover preview inside the circle
        const previewEl = hotspotEl.querySelector('.nav-preview-circle');
        targetEl.addEventListener('mouseenter', () => {
          if (previewEl) {
            const src = this._getExportPreviewSrc(hotspot.navigationTarget);
            if (src) {
              previewEl.setAttribute('material', 'src: ' + src + '; transparent: true; opacity: 1');
            }
            previewEl.setAttribute('visible', 'true');
            previewEl.removeAttribute('animation__shrink');
            previewEl.setAttribute('scale', '0.01 0.01 0.01');
            previewEl.setAttribute('animation__grow', { property: 'scale', to: '1 1 1', dur: 180, easing: 'easeOutCubic' });
          }
        });
        targetEl.addEventListener('mouseleave', () => {
          if (previewEl) {
            previewEl.removeAttribute('animation__grow');
            previewEl.setAttribute('animation__shrink', { property: 'scale', to: '0.01 0.01 0.01', dur: 120, easing: 'easeInCubic' });
            setTimeout(() => { previewEl.setAttribute('visible', 'false'); }, 130);
          }
        });
        
        // Optional: subtle pulsing ring effect (guard if ring exists)
        const ringEl = hotspotEl.querySelector('.nav-ring');
        if (ringEl) ringEl.setAttribute('animation__pulse', {
          property: 'scale',
          from: '1 1 1',
          to: '1.03 1.03 1',
          dur: 1200,
          dir: 'alternate',
          loop: true,
          easing: 'easeInOutSine'
        });
      }
      
      hotspotEl.setAttribute('hotspot', config);
      container.appendChild(hotspotEl);
    });
  }
  
  navigateToScene(sceneId) {
    if (!this.scenes[sceneId]) {
      console.warn(\`Scene \${sceneId} not found\`);
      return;
    }
    
    // Stop current global sound before switching
    this.stopCurrentGlobalSound();
    
    // Show navigation feedback
    this.showNavigationFeedback(this.scenes[sceneId].name);

    // Crossfade transition into next scene
    this._startCrossfadeOverlay(() => {
      // End overlay when scene reports loaded
      const onLoaded = () => {
        window.removeEventListener('vrhotspots:scene-loaded', onLoaded);
        this._endCrossfadeOverlay();
      };
      window.addEventListener('vrhotspots:scene-loaded', onLoaded, { once: true });
      // Safety timeout
      setTimeout(() => {
        window.removeEventListener('vrhotspots:scene-loaded', onLoaded);
        this._endCrossfadeOverlay();
      }, 1500);

      this.loadScene(sceneId);
    });
  }
  
  showNavigationFeedback(sceneName) {
    const feedback = document.createElement('div');
    feedback.style.cssText = \`
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: rgba(76, 175, 80, 0.9); color: white; padding: 15px 25px;
      border-radius: 8px; font-weight: bold; z-index: 10001;
      font-family: Arial; animation: fadeInOut 2s ease-in-out;
    \`;
    feedback.innerHTML = \`Navigated to: \${sceneName}\`;
    
    document.body.appendChild(feedback);
    setTimeout(() => {
      if (feedback.parentNode) {
        feedback.parentNode.removeChild(feedback);
      }
    }, 2000);
  }
  
  showErrorMessage(message) {
    const errorBox = document.createElement("div");
    errorBox.style.cssText = \`
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: rgba(244, 67, 54, 0.9); color: white; padding: 20px 30px;
      border-radius: 8px; font-weight: bold; z-index: 10001;
      font-family: Arial; max-width: 80%;
    \`;
    errorBox.innerHTML = \`<div style="text-align:center">⚠️ Error</div><div style="margin-top:10px">\${message}</div>\`;
    
    // Add a close button
    const closeBtn = document.createElement("button");
    closeBtn.innerText = "Close";
    closeBtn.style.cssText = \`
      background: white; color: #f44336; border: none; padding: 8px 15px;
      border-radius: 4px; margin-top: 15px; cursor: pointer; font-weight: bold;
      display: block; margin-left: auto; margin-right: auto;
    \`;
    
    closeBtn.onclick = () => {
      if (errorBox.parentNode) {
        errorBox.parentNode.removeChild(errorBox);
      }
    };
    
    errorBox.appendChild(closeBtn);
    document.body.appendChild(errorBox);
  }
  
  showLoadingIndicator() {
    // Remove any existing loading indicator
    this.hideLoadingIndicator();
    
    // Create a more immersive loading indicator that matches the 3D environment
    const loadingEl = document.createElement('div');
    loadingEl.id = 'scene-loading-indicator';
    loadingEl.style.cssText = \`
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, rgba(26, 26, 46, 0.95), rgba(15, 15, 35, 0.95));
      color: white;
      padding: 30px 50px;
      border-radius: 15px;
      font-family: 'Arial', sans-serif;
      font-size: 16px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(76, 175, 80, 0.3);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    \`;
    
    // Add spinning orb animation (matching the 3D scene)
    const spinner = document.createElement('div');
    spinner.style.cssText = \`
      width: 50px;
      height: 50px;
      margin-bottom: 20px;
      position: relative;
    \`;
    
    // Create multiple spinning rings
    for (let i = 0; i < 3; i++) {
      const ring = document.createElement('div');
      ring.style.cssText = \`
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border: 3px solid transparent;
        border-top: 3px solid \${i === 0 ? '#4CAF50' : i === 1 ? '#2196F3' : '#FF9800'};
        border-radius: 50%;
        animation: spin-\${i} \${1 + i * 0.3}s linear infinite;
        transform: rotate(\${i * 45}deg);
      \`;
      spinner.appendChild(ring);
    }
    
    // Add enhanced keyframes for spinner animation
    const style = document.createElement('style');
    style.textContent = \`
      @keyframes spin-0 {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes spin-1 {
        0% { transform: rotate(45deg); }
        100% { transform: rotate(405deg); }
      }
      @keyframes spin-2 {
        0% { transform: rotate(90deg); }
        100% { transform: rotate(450deg); }
      }
      @keyframes pulse-text {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.7; transform: scale(1.05); }
      }
    \`;
    document.head.appendChild(style);
    
    // Main loading text
    const text = document.createElement('div');
    text.textContent = 'Entering Virtual Reality...';
    text.style.cssText = \`
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 10px;
      color: #4CAF50;
      animation: pulse-text 2s ease-in-out infinite;
    \`;
    
    // Subtitle text
  const subtitle = document.createElement('div');
  subtitle.id = 'scene-loading-subtitle';
    subtitle.textContent = 'Loading immersive experience';
    subtitle.style.cssText = \`
      font-size: 14px;
      color: #cccccc;
      opacity: 0.8;
    \`;
    
    loadingEl.appendChild(spinner);
    loadingEl.appendChild(text);
    loadingEl.appendChild(subtitle);
    document.body.appendChild(loadingEl);
  }
  
  hideLoadingIndicator() {
    const loadingEl = document.getElementById('scene-loading-indicator');
    if (loadingEl && loadingEl.parentNode) {
      loadingEl.parentNode.removeChild(loadingEl);
    }
  }

  // Preload all scenes' images into <a-assets> so skybox changes and portal previews are instant
  preloadAllSceneImages(options = {}) {
    const { updateUI = false, timeoutMs = 15000 } = options;
    const assets = document.querySelector('a-assets');
    if (!assets) return Promise.resolve();

    const ids = Object.keys(this.scenes || {});
    const total = ids.length;
    if (total === 0) return Promise.resolve();

    const updateSubtitle = (done) => {
      if (!updateUI) return;
      const subEl = document.getElementById('scene-loading-subtitle');
      if (subEl) subEl.textContent = 'Preparing scenes (' + done + '/' + total + ')';
    };

    let done = 0;
    updateSubtitle(0);

    const loaders = ids.map((id) => {
      const sc = this.scenes[id];
      const src = this.getSceneImagePath(sc.image, id);
      const assetId = 'asset-panorama-' + id;
      if (document.getElementById(assetId)) { done++; updateSubtitle(done); return Promise.resolve(); }
      return new Promise((resolve) => {
        const img = document.createElement('img');
        img.id = assetId;
        img.crossOrigin = 'anonymous';
        img.addEventListener('load', () => { done++; updateSubtitle(done); resolve(); });
        img.addEventListener('error', () => { done++; updateSubtitle(done); resolve(); });
        img.src = src; // allow browser cache
        assets.appendChild(img);
      });
    });

    const timeout = new Promise((resolve) => setTimeout(resolve, timeoutMs));
    return Promise.race([Promise.allSettled(loaders), timeout]);
  }

  // ===== Navigation Preview (Export viewer) =====
  _ensureNavPreview() {
    if (!this._navBox) {
      const box = document.createElement('div');
      box.id = 'nav-preview';
      box.style.cssText = 'position:fixed;top:0;left:0;transform:translate(12px,12px);display:none;pointer-events:none;z-index:100001;background:rgba(0,0,0,0.9);color:#fff;border:1px solid #4CAF50;border-radius:8px;overflow:hidden;width:220px;box-shadow:0 8px 24px rgba(0,0,0,0.4);font-family:Arial,sans-serif;backdrop-filter:blur(2px);';
      const img = document.createElement('img');
      img.id = 'nav-preview-img';
      img.style.cssText = 'display:block;width:100%;height:120px;object-fit:cover;background:#111;';
      const cap = document.createElement('div');
      cap.id = 'nav-preview-caption';
      cap.style.cssText = 'padding:8px 10px;font-size:12px;color:#ddd;border-top:1px solid rgba(255,255,255,0.08);';
      box.appendChild(img); box.appendChild(cap);
      document.body.appendChild(box);
      this._navBox = box;
    }
    return this._navBox;
  }

  _positionNavPreview(x,y){
    const box = this._ensureNavPreview();
    const rectW = box.offsetWidth || 220; const rectH = box.offsetHeight || 160; const pad = 12;
    const maxX = window.innerWidth - rectW - pad; const maxY = window.innerHeight - rectH - pad;
    const nx = Math.min(Math.max(x+12, pad), maxX); const ny = Math.min(Math.max(y+12, pad), maxY);
    box.style.left = nx+'px'; box.style.top = ny+'px';
  }

  _getExportPreviewSrc(sceneId){
    // Prefer preloaded <a-assets> image if available
    const preId = 'asset-panorama-' + sceneId;
    const preEl = document.getElementById(preId);
    if (preEl) return '#' + preId;
    const sc = this.scenes[sceneId]; if (!sc) return null; const img = sc.image||'';
    if (img.startsWith('http://')||img.startsWith('https://')) return img;
    if (img.startsWith('./images/')) return img;
    if (img.startsWith('data:')) return './images/' + sceneId + '.jpg';
    return './images/' + img;
  }

  _showNavPreview(sceneId){
    const box = this._ensureNavPreview();
    const img = document.getElementById('nav-preview-img');
    const cap = document.getElementById('nav-preview-caption');
    const sc = this.scenes[sceneId]; if (!sc) return;
  const src = this._getExportPreviewSrc(sceneId); if (src) img.src = src;
  cap.textContent = 'Go to: ' + (sc.name || sceneId);
    box.style.display = 'block';
    if (!this._navMove){ this._navMove = (e)=> this._positionNavPreview((e.clientX||0),(e.clientY||0)); }
    window.addEventListener('mousemove', this._navMove);
  }

  _hideNavPreview(){
    const box = this._ensureNavPreview();
    box.style.display = 'none';
    if (this._navMove){ window.removeEventListener('mousemove', this._navMove); }
  }

  // ===== Crossfade helpers (Export viewer) =====
  _ensureCrossfadeOverlay() {
    if (!this.crossfadeEl) {
      const overlay = document.createElement('div');
      overlay.id = 'scene-crossfade';
      overlay.style.cssText = 'position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;transition:opacity 300ms ease;z-index:100000;';
      document.body.appendChild(overlay);
      this.crossfadeEl = overlay;
    }
    return this.crossfadeEl;
  }

  _startCrossfadeOverlay(run) {
    const overlay = this._ensureCrossfadeOverlay();
    requestAnimationFrame(() => {
      overlay.style.pointerEvents = 'auto';
      overlay.style.opacity = '1';
      setTimeout(() => { try { run && run(); } catch(e) {} }, 320);
    });
  }

  _endCrossfadeOverlay() {
    const overlay = this._ensureCrossfadeOverlay();
    overlay.style.opacity = '0';
    setTimeout(() => { overlay.style.pointerEvents = 'none'; }, 320);
  }
  
  applyStartingPoint(scene) {
    if (!scene.startingPoint || !scene.startingPoint.rotation) return;
    
    const camera = document.getElementById('cam');
    const rotation = scene.startingPoint.rotation;
    
    // Temporarily disable look-controls to allow rotation setting
    const lookControls = camera.components['look-controls'];
    if (lookControls) {
      lookControls.pause();
    }
    
    // Apply the stored rotation to the camera
    camera.setAttribute('rotation', \`\${rotation.x} \${rotation.y} \${rotation.z}\`);
    
    // Force the look-controls to sync with the new rotation
    if (lookControls) {
      // Update the look-controls internal state to match our rotation
      lookControls.pitchObject.rotation.x = THREE.MathUtils.degToRad(rotation.x);
      lookControls.yawObject.rotation.y = THREE.MathUtils.degToRad(rotation.y);
      
      // Re-enable look-controls after a short delay
      setTimeout(() => {
        lookControls.play();
      }, 100);
    }
    
    console.log(\`Applied starting point rotation: X:\${rotation.x}° Y:\${rotation.y}° Z:\${rotation.z}°\`);
  }
  
  setupGlobalSoundControl() {
    const soundBtn = document.getElementById('global-sound-toggle');
    if (!soundBtn) return;
    
    soundBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleGlobalSound();
    });
    
    this.setupProgressBar();
    this.updateGlobalSoundButton();
  }
  
  setupProgressBar() {
    const progressBar = document.getElementById('progress-bar');
    const progressHandle = document.getElementById('progress-handle');
    
    if (!progressBar || !progressHandle) return;
    
    // Click on progress bar to seek
    progressBar.addEventListener('click', (e) => {
      if (this.isDragging) return;
      this.seekToPosition(e);
    });
    
    // Drag functionality
    progressHandle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.isDragging = true;
      document.addEventListener('mousemove', this.handleProgressDrag.bind(this));
      document.addEventListener('mouseup', this.handleProgressDragEnd.bind(this));
    });
    
    // Touch support for mobile
    progressHandle.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.isDragging = true;
      document.addEventListener('touchmove', this.handleProgressTouchDrag.bind(this));
      document.addEventListener('touchend', this.handleProgressDragEnd.bind(this));
    });
  }
  
  handleProgressDrag(e) {
    if (!this.isDragging || !this.currentGlobalAudio) return;
    e.preventDefault();
    this.seekToPosition(e);
  }
  
  handleProgressTouchDrag(e) {
    if (!this.isDragging || !this.currentGlobalAudio) return;
    e.preventDefault();
    const touch = e.touches[0];
    this.seekToPosition(touch);
  }
  
  handleProgressDragEnd() {
    this.isDragging = false;
    document.removeEventListener('mousemove', this.handleProgressDrag);
    document.removeEventListener('mouseup', this.handleProgressDragEnd);
    document.removeEventListener('touchmove', this.handleProgressTouchDrag);
    document.removeEventListener('touchend', this.handleProgressDragEnd);
  }
  
  seekToPosition(e) {
    if (!this.currentGlobalAudio) return;
    
    const progressBar = document.getElementById('progress-bar');
    const rect = progressBar.getBoundingClientRect();
    const clickX = (e.clientX || e.pageX) - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    
    const newTime = percentage * this.currentGlobalAudio.duration;
    this.currentGlobalAudio.currentTime = newTime;
    
    this.updateProgressDisplay();
  }
  
  updateProgressDisplay() {
    if (!this.currentGlobalAudio) return;
    
    const progressFill = document.getElementById('progress-fill');
    const progressHandle = document.getElementById('progress-handle');
    const currentTimeEl = document.getElementById('current-time');
    const totalTimeEl = document.getElementById('total-time');
    
    if (!progressFill || !progressHandle || !currentTimeEl || !totalTimeEl) return;
    
    const currentTime = this.currentGlobalAudio.currentTime;
    const duration = this.currentGlobalAudio.duration;
    
    if (isNaN(duration)) return;
    
    const percentage = (currentTime / duration) * 100;
    
    progressFill.style.width = percentage + '%';
    progressHandle.style.left = percentage + '%';
    
    currentTimeEl.textContent = this.formatTime(currentTime);
    totalTimeEl.textContent = this.formatTime(duration);
  }
  
  formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return \`\${minutes}:\${remainingSeconds.toString().padStart(2, '0')}\`;
  }
  
  showProgressBar() {
    const container = document.getElementById('audio-progress-container');
    if (container) {
      container.style.display = 'block';
    }
  }
  
  hideProgressBar() {
    const container = document.getElementById('audio-progress-container');
    if (container) {
      container.style.display = 'none';
    }
  }
  
  toggleGlobalSound() {
    this.globalSoundEnabled = !this.globalSoundEnabled;
    
    if (this.globalSoundEnabled) {
      this.playCurrentGlobalSound();
    } else {
      this.stopCurrentGlobalSound();
    }
    
    this.updateGlobalSoundButton();
  }
  
  updateGlobalSoundButton() {
    const soundBtn = document.getElementById('global-sound-toggle');
    if (!soundBtn) return;
    
    if (this.globalSoundEnabled) {
      soundBtn.textContent = '🔊 Sound: ON';
      soundBtn.classList.remove('muted');
    } else {
      soundBtn.textContent = '🔇 Sound: OFF';
      soundBtn.classList.add('muted');
    }
  }
  
  playCurrentGlobalSound() {
    if (!this.globalSoundEnabled) return;
    
    const scene = this.scenes[this.currentScene];
    if (!scene || !scene.globalSound || !scene.globalSound.enabled) {
      this.hideProgressBar();
      return;
    }
    
    this.stopCurrentGlobalSound();
    
    const globalSound = scene.globalSound;
    this.currentGlobalAudio = new Audio();
    this.currentGlobalAudio.src = globalSound.audio;
    this.currentGlobalAudio.loop = true;
    this.currentGlobalAudio.volume = globalSound.volume || 0.5;
    
    // Set up progress tracking
    this.currentGlobalAudio.addEventListener('loadedmetadata', () => {
      this.showProgressBar();
      this.updateProgressDisplay();
      this.startProgressTracking();
    });
    
    this.currentGlobalAudio.addEventListener('timeupdate', () => {
      if (!this.isDragging) {
        this.updateProgressDisplay();
      }
    });
    
    this.currentGlobalAudio.addEventListener('ended', () => {
      // This shouldn't happen with loop=true, but just in case
      this.updateProgressDisplay();
    });
    
    // Try to play audio, handle autoplay restrictions gracefully
    this.currentGlobalAudio.play().catch(e => {
      console.log('Audio autoplay blocked - will start on first user interaction');
      this.hideProgressBar();
      
      // Set up one-time event listener for first user interaction
      const enableAudioOnInteraction = () => {
        this.currentGlobalAudio.play().then(() => {
          console.log('Audio enabled after user interaction');
          this.showProgressBar();
          this.updateProgressDisplay();
          this.startProgressTracking();
        }).catch(e => {
          console.warn('Audio still cannot play:', e);
        });
        
        // Remove the event listener after first use
        document.removeEventListener('click', enableAudioOnInteraction);
        document.removeEventListener('touchstart', enableAudioOnInteraction);
        document.removeEventListener('keydown', enableAudioOnInteraction);
      };
      
      // Listen for any user interaction
      document.addEventListener('click', enableAudioOnInteraction, { once: true });
      document.addEventListener('touchstart', enableAudioOnInteraction, { once: true });
      document.addEventListener('keydown', enableAudioOnInteraction, { once: true });
    });
  }
  
  startProgressTracking() {
    // Clear any existing interval
    if (this.progressUpdateInterval) {
      clearInterval(this.progressUpdateInterval);
    }
    
    // Update progress display every 100ms for smooth animation
    this.progressUpdateInterval = setInterval(() => {
      if (this.currentGlobalAudio && !this.isDragging) {
        this.updateProgressDisplay();
      }
    }, 100);
  }
  
  stopProgressTracking() {
    if (this.progressUpdateInterval) {
      clearInterval(this.progressUpdateInterval);
      this.progressUpdateInterval = null;
    }
  }
  
  stopCurrentGlobalSound() {
    this.stopProgressTracking();
    
    if (this.currentGlobalAudio) {
      this.currentGlobalAudio.pause();
      this.currentGlobalAudio.currentTime = 0;
      this.currentGlobalAudio = null;
    }
    
    this.hideProgressBar();
  }

  getCustomStyles() {
    // For exported projects, return the embedded custom styles
    // This method is needed for compatibility with createHotspots method
    return CUSTOM_STYLES || {
      hotspot: {
        infoButton: {
          backgroundColor: "#4A90E2", // Blue background for i icon
          textColor: "#FFFFFF",
          fontSize: 12, // Larger font for i icon
          opacity: 0.9,
          size: 0.4, // Size of the i icon circle
        },
        popup: {
          backgroundColor: "#333333",
          textColor: "#FFFFFF",
          borderColor: "#555555",
          borderWidth: 0,
          borderRadius: 0,
          opacity: 0.95,
          fontSize: 1,
          padding: 0.2,
        },
        closeButton: {
          size: 0.4,
          opacity: 1.0,
        },
      },
      audio: {
        buttonColor: "#FFFFFF",
        buttonOpacity: 1.0,
      },
      buttonImages: {
        portal: "images/up-arrow.png",
        play: "images/play.png",
        pause: "images/pause.png",
      },
    };
  }
}

// Initialize project
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    new HotspotProject();
  }, 1000);
});`;
  }

  async addRealAssets(imagesFolder, audioFolder) {
    try {
      // Fetch real assets from the current project
      const assetsToFetch = [
        { path: "./images/up-arrow.png", filename: "up-arrow.png" },
        { path: "./images/close.png", filename: "close.png" },
        { path: "./images/play.png", filename: "play.png" },
        { path: "./images/pause.png", filename: "pause.png" },
        { path: "./images/scene1.jpg", filename: "scene1.jpg" }, // Default panorama
      ];

      for (const asset of assetsToFetch) {
        try {
          const response = await fetch(asset.path);
          if (response.ok) {
            const blob = await response.blob();
            imagesFolder.file(asset.filename, blob);
          } else {
            // If can't fetch, create a proper placeholder
            await this.createProperPlaceholder(imagesFolder, asset.filename);
          }
        } catch (error) {
          console.warn(`Could not fetch ${asset.path}, creating placeholder`);
          await this.createProperPlaceholder(imagesFolder, asset.filename);
        }
      }

      // Try to fetch audio
      try {
        const audioResponse = await fetch("./audio/music.mp3");
        if (audioResponse.ok) {
          const audioBlob = await audioResponse.blob();
          audioFolder.file("music.mp3", audioBlob);
        }
      } catch (error) {
        console.warn("Could not fetch audio file");
      }
    } catch (error) {
      console.warn("Error adding assets:", error);
      // Fallback to creating all placeholders
      await this.createAllPlaceholders(imagesFolder);
    }
  }

  async createProperPlaceholder(imagesFolder, filename) {
    return new Promise((resolve) => {
      // Create a proper minimal PNG instead of SVG
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext("2d");

      // Create different icons based on filename
      if (filename.includes("up-arrow") || filename.includes("hotspot")) {
        // Arrow up icon
        ctx.fillStyle = "#4CAF50";
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = "white";
        ctx.font = "bold 24px Arial";
        ctx.textAlign = "center";
        ctx.fillText("↑", 32, 40);
      } else if (filename.includes("close")) {
        // Close icon
        ctx.fillStyle = "#f44336";
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = "white";
        ctx.font = "bold 20px Arial";
        ctx.textAlign = "center";
        ctx.fillText("✕", 32, 40);
      } else if (filename.includes("play")) {
        // Play icon
        ctx.fillStyle = "#2196F3";
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = "white";
        ctx.font = "bold 20px Arial";
        ctx.textAlign = "center";
        ctx.fillText("▶", 32, 40);
      } else if (filename.includes("pause")) {
        // Pause icon
        ctx.fillStyle = "#FF9800";
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = "white";
        ctx.font = "bold 20px Arial";
        ctx.textAlign = "center";
        ctx.fillText("⏸", 32, 40);
      } else {
        // Default placeholder
        ctx.fillStyle = "#9E9E9E";
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = "white";
        ctx.font = "bold 12px Arial";
        ctx.textAlign = "center";
        ctx.fillText("IMG", 32, 40);
      }

      // Convert to blob and add to zip
      canvas.toBlob((blob) => {
        imagesFolder.file(filename, blob);
        resolve();
      }, "image/png");
    });
  }

  async createAllPlaceholders(imagesFolder) {
    const placeholders = [
      "up-arrow.png",
      "close.png",
      "play.png",
      "pause.png",
      "scene1.jpg",
    ];
    for (const filename of placeholders) {
      await this.createProperPlaceholder(imagesFolder, filename);
    }
  }

  // Enhanced coordinate calculation methods
  calculateSphericalPosition(intersection, camera) {
    // Convert cartesian coordinates to spherical coordinates for better 360° positioning
    const cameraPos = camera.getAttribute("position");

    // Calculate relative position from camera
    const relativePos = {
      x: intersection.point.x - cameraPos.x,
      y: intersection.point.y - cameraPos.y,
      z: intersection.point.z - cameraPos.z,
    };

    // Calculate spherical coordinates
    const radius = 8; // Fixed radius for consistency
    const theta = Math.atan2(relativePos.x, relativePos.z); // Horizontal angle
    const phi = Math.acos(
      relativePos.y /
        Math.sqrt(
          relativePos.x * relativePos.x +
            relativePos.y * relativePos.y +
            relativePos.z * relativePos.z
        )
    ); // Vertical angle

    // Convert back to cartesian with fixed radius
    return {
      x: cameraPos.x + radius * Math.sin(phi) * Math.sin(theta),
      y: cameraPos.y + radius * Math.cos(phi),
      z: cameraPos.z + radius * Math.sin(phi) * Math.cos(theta),
    };
  }

  calculateOptimalPosition(intersection, camera) {
    // This method provides the most optimal positioning for 360° panoramas
    const cameraPos = camera.getAttribute("position");

    // Get the direction vector from camera to intersection
    const direction = new THREE.Vector3(
      intersection.point.x - cameraPos.x,
      intersection.point.y - cameraPos.y,
      intersection.point.z - cameraPos.z
    );

    // Normalize to unit vector
    direction.normalize();

    // Apply optimal distance based on 360° panorama best practices
    const optimalDistance = 7.5; // Sweet spot for visibility and interaction

    return {
      x: cameraPos.x + direction.x * optimalDistance,
      y: cameraPos.y + direction.y * optimalDistance,
      z: cameraPos.z + direction.z * optimalDistance,
    };
  }

  // Scene Management Methods
  setupSceneManagement() {
    this.updateSceneDropdown();
    this.updateNavigationTargets();
    this.updateModeIndicator();
    this.updateStartingPointInfo();
  }

  // Starting Point Management
  setStartingPoint() {
    const camera = document.getElementById("cam");
    const rotation = camera.getAttribute("rotation");

    // Store the current camera rotation as the starting point
    this.scenes[this.currentScene].startingPoint = {
      rotation: {
        x: rotation.x,
        y: rotation.y,
        z: rotation.z,
      },
    };

    this.updateStartingPointInfo();

    // Show feedback
    this.showStartingPointFeedback("Starting point set to current view");
  }

  clearStartingPoint() {
    this.scenes[this.currentScene].startingPoint = null;
    this.updateStartingPointInfo();
    this.showStartingPointFeedback(
      "Starting point cleared - will use default view"
    );
  }

  updateStartingPointInfo() {
    const infoDiv = document.getElementById("starting-point-info");
    const currentScene = this.scenes[this.currentScene];

    if (currentScene.startingPoint) {
      const rotation = currentScene.startingPoint.rotation;
      infoDiv.innerHTML = `📍 Set: X:${rotation.x.toFixed(
        0
      )}° Y:${rotation.y.toFixed(0)}° Z:${rotation.z.toFixed(0)}°`;
      infoDiv.style.background = "#1B5E20";
      infoDiv.style.color = "#4CAF50";
    } else {
      infoDiv.innerHTML = "No starting point set";
      infoDiv.style.background = "#333";
      infoDiv.style.color = "#ccc";
    }
  }

  showStartingPointFeedback(message) {
    const feedback = document.createElement("div");
    feedback.style.cssText = `
      position: fixed; top: 20px; right: 380px; 
      background: rgba(76, 175, 80, 0.9); color: white; padding: 10px 15px;
      border-radius: 6px; font-weight: bold; z-index: 10001;
      font-family: Arial; font-size: 12px;
    `;
    feedback.innerHTML = `📍 ${message}`;

    document.body.appendChild(feedback);
    setTimeout(() => {
      if (feedback.parentNode) {
        feedback.parentNode.removeChild(feedback);
      }
    }, 3000);
  }

  applyStartingPoint() {
    const currentScene = this.scenes[this.currentScene];
    if (!currentScene.startingPoint) return;

    const camera = document.getElementById("cam");
    const rotation = currentScene.startingPoint.rotation;

    // Temporarily disable look-controls to allow rotation setting
    const lookControls = camera.components["look-controls"];
    if (lookControls) {
      lookControls.pause();
    }

    // Apply the stored rotation to the camera
    camera.setAttribute(
      "rotation",
      `${rotation.x} ${rotation.y} ${rotation.z}`
    );

    // Force the look-controls to sync with the new rotation
    if (lookControls) {
      // Update the look-controls internal state to match our rotation
      lookControls.pitchObject.rotation.x = THREE.MathUtils.degToRad(
        rotation.x
      );
      lookControls.yawObject.rotation.y = THREE.MathUtils.degToRad(rotation.y);

      // Re-enable look-controls after a short delay
      setTimeout(() => {
        lookControls.play();
      }, 100);
    }

    console.log(
      `Applied starting point rotation: X:${rotation.x}° Y:${rotation.y}° Z:${rotation.z}°`
    );
  }

  updateSceneDropdown() {
    const dropdown = document.getElementById("current-scene");
    dropdown.innerHTML = "";

    Object.keys(this.scenes).forEach((sceneId) => {
      const option = document.createElement("option");
      option.value = sceneId;
      option.textContent = this.scenes[sceneId].name;
      if (sceneId === this.currentScene) {
        option.selected = true;
      }
      dropdown.appendChild(option);
    });
  }

  updateNavigationTargets() {
    const dropdown = document.getElementById("navigation-target");
    dropdown.innerHTML = '<option value="">Select target scene...</option>';

    Object.keys(this.scenes).forEach((sceneId) => {
      if (sceneId !== this.currentScene) {
        // Don't allow navigation to current scene
        const option = document.createElement("option");
        option.value = sceneId;
        option.textContent = this.scenes[sceneId].name;
        dropdown.appendChild(option);
      }
    });
  }

  // Helper function to get the first scene ID for consistent starting point
  getFirstSceneId() {
    const sceneIds = Object.keys(this.scenes);
    return sceneIds.length > 0 ? sceneIds[0] : "scene1";
  }

  // Global Sound Management
  toggleGlobalSoundControls(enabled) {
    const controls = document.getElementById("global-sound-controls");
    controls.style.display = enabled ? "block" : "none";

    if (!enabled) {
      // Clear global sound when disabled
      this.scenes[this.currentScene].globalSound = null;
      this.stopGlobalSound();
    }
  }

  updateGlobalSound() {
    const enabled = document.getElementById("global-sound-enabled").checked;
    if (!enabled) return;

    const file = document.getElementById("global-sound-file").files[0];
    const url = document.getElementById("global-sound-url").value.trim();
    const volume = parseFloat(
      document.getElementById("global-sound-volume").value
    );

    let audio = null;
    if (url) {
      audio = url;
    } else if (file) {
      audio = file;
    }

    if (audio) {
      this.scenes[this.currentScene].globalSound = {
        audio: audio,
        volume: volume,
        enabled: true,
      };
    } else {
      this.scenes[this.currentScene].globalSound = null;
    }
  }

  loadGlobalSoundControls() {
    const scene = this.scenes[this.currentScene];
    const globalSound = scene.globalSound;

    if (globalSound && globalSound.enabled) {
      document.getElementById("global-sound-enabled").checked = true;
      document.getElementById("global-sound-volume").value =
        globalSound.volume || 0.5;
      this.toggleGlobalSoundControls(true);

      // If it's a URL, populate the URL field
      if (typeof globalSound.audio === "string") {
        document.getElementById("global-sound-url").value = globalSound.audio;
        document.getElementById("global-sound-file").value = "";
      } else {
        // It's a File object, we can't restore file input, but show it's set
        document.getElementById("global-sound-url").value = "";
        // Note: Can't restore file input for security reasons
      }
    } else {
      document.getElementById("global-sound-enabled").checked = false;
      document.getElementById("global-sound-url").value = "";
      document.getElementById("global-sound-file").value = "";
      document.getElementById("global-sound-volume").value = 0.5;
      this.toggleGlobalSoundControls(false);
    }

    // Update editor sound button state
    this.updateEditorSoundButton();
  }

  playGlobalSound() {
    const scene = this.scenes[this.currentScene];
    if (!scene.globalSound || !scene.globalSound.enabled) return;

    this.stopGlobalSound(); // Stop any existing global sound

    const audio = scene.globalSound.audio;
    const volume = scene.globalSound.volume || 0.5;

    // Create global audio element
    this.globalAudioElement = document.createElement("audio");
    this.globalAudioElement.loop = true;
    this.globalAudioElement.volume = volume;

    if (typeof audio === "string") {
      this.globalAudioElement.src = audio;
    } else if (audio instanceof File) {
      this.globalAudioElement.src = URL.createObjectURL(audio);
    }

    this.globalAudioElement.play().catch((e) => {
      console.warn("Could not play global sound:", e);
    });
  }

  stopGlobalSound() {
    if (this.globalAudioElement) {
      this.globalAudioElement.pause();
      this.globalAudioElement.currentTime = 0;
      if (this.globalAudioElement.src.startsWith("blob:")) {
        URL.revokeObjectURL(this.globalAudioElement.src);
      }
      this.globalAudioElement = null;
    }
  }

  // Editor Global Sound Management
  toggleEditorGlobalSound() {
    console.log(
      "🔘 TOGGLE BUTTON CLICKED - Current state:",
      this.editorGlobalSoundEnabled
    );
    this.editorGlobalSoundEnabled = !this.editorGlobalSoundEnabled;
    console.log("🔘 TOGGLE - New state:", this.editorGlobalSoundEnabled);

    if (this.editorGlobalSoundEnabled) {
      console.log("🔘 TOGGLE - Starting audio");
      this.playEditorGlobalSound();
    } else {
      console.log("🔘 TOGGLE - Stopping audio");
      this.stopEditorGlobalSound();
    }

    this.updateEditorSoundButton();
    console.log("🔘 TOGGLE - Button updated");
  }

  updateEditorSoundButton() {
    console.log(
      "🔘 UPDATE BUTTON - State:",
      this.editorGlobalSoundEnabled ? "ENABLED" : "DISABLED"
    );
    const btn = document.getElementById("editor-sound-control");
    if (!btn) {
      console.log("🔘 UPDATE BUTTON - ERROR: Button not found!");
      return;
    }

    if (this.editorGlobalSoundEnabled) {
      btn.textContent = "🎵 Scene Audio: ON";
      btn.classList.remove("muted");
      console.log("🔘 UPDATE BUTTON - Set to ON");
    } else {
      btn.textContent = "🔇 Scene Audio: OFF";
      btn.classList.add("muted");
      console.log("🔘 UPDATE BUTTON - Set to OFF");
    }
  }

  playEditorGlobalSound() {
    console.log(
      "🎵 PLAY - Called, enabled state:",
      this.editorGlobalSoundEnabled
    );
    if (!this.editorGlobalSoundEnabled) {
      console.log("🎵 PLAY - BLOCKED: Editor sound is disabled");
      return;
    }

    const scene = this.scenes[this.currentScene];
    if (!scene || !scene.globalSound || !scene.globalSound.enabled) {
      console.log(
        "🎵 PLAY - BLOCKED: No global sound configured for scene:",
        this.currentScene
      );
      this.hideEditorProgressBar();
      return;
    }

    console.log("🎵 PLAY - Starting audio for scene:", this.currentScene);
    this.stopEditorGlobalSound();

    const globalSound = scene.globalSound;
    this.editorGlobalAudio = document.createElement("audio");
    this.editorGlobalAudio.loop = true;
    this.editorGlobalAudio.volume = globalSound.volume || 0.5;

    if (typeof globalSound.audio === "string") {
      this.editorGlobalAudio.src = globalSound.audio;
    } else if (globalSound.audio instanceof File) {
      this.editorGlobalAudio.src = URL.createObjectURL(globalSound.audio);
    }

    // Set up progress tracking for editor
    this.editorGlobalAudio.addEventListener("loadedmetadata", () => {
      this.showEditorProgressBar();
      this.updateEditorProgressDisplay();
      this.startEditorProgressTracking();
    });

    this.editorGlobalAudio.addEventListener("timeupdate", () => {
      this.updateEditorProgressDisplay();
    });

    this.editorGlobalAudio.play().catch((e) => {
      console.warn("Could not play editor global sound:", e);
      this.hideEditorProgressBar();
    });
  }

  stopEditorGlobalSound() {
    console.log("🎵 STOP: Stopping editor audio");
    this.stopEditorProgressTracking();

    if (this.editorGlobalAudio) {
      console.log("🎵 STOP: Audio element exists, pausing and cleaning up");
      this.editorGlobalAudio.pause();
      this.editorGlobalAudio.currentTime = 0;
      if (
        this.editorGlobalAudio.src &&
        this.editorGlobalAudio.src.startsWith("blob:")
      ) {
        URL.revokeObjectURL(this.editorGlobalAudio.src);
      }
      this.editorGlobalAudio = null;
    } else {
      console.log("🎵 STOP: No audio element to stop");
    }

    this.hideEditorProgressBar();
  }

  setupEditorProgressBar() {
    const progressBar = document.getElementById("editor-progress-bar");
    const progressHandle = document.getElementById("editor-progress-handle");

    if (!progressBar || !progressHandle) return;

    // Click on progress bar to seek
    progressBar.addEventListener("click", (e) => {
      this.seekEditorToPosition(e);
    });

    // Drag functionality for editor
    progressHandle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      this.editorIsDragging = true;
      document.addEventListener(
        "mousemove",
        this.handleEditorProgressDrag.bind(this)
      );
      document.addEventListener(
        "mouseup",
        this.handleEditorProgressDragEnd.bind(this)
      );
    });
  }

  handleEditorProgressDrag(e) {
    if (!this.editorIsDragging || !this.editorGlobalAudio) return;
    e.preventDefault();
    this.seekEditorToPosition(e);
  }

  handleEditorProgressDragEnd() {
    this.editorIsDragging = false;
    document.removeEventListener("mousemove", this.handleEditorProgressDrag);
    document.removeEventListener("mouseup", this.handleEditorProgressDragEnd);
  }

  seekEditorToPosition(e) {
    if (!this.editorGlobalAudio) return;

    const progressBar = document.getElementById("editor-progress-bar");
    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));

    const newTime = percentage * this.editorGlobalAudio.duration;
    this.editorGlobalAudio.currentTime = newTime;

    this.updateEditorProgressDisplay();
  }

  updateEditorProgressDisplay() {
    if (!this.editorGlobalAudio) return;

    const progressFill = document.getElementById("editor-progress-fill");
    const progressHandle = document.getElementById("editor-progress-handle");
    const currentTimeEl = document.getElementById("editor-current-time");
    const totalTimeEl = document.getElementById("editor-total-time");

    if (!progressFill || !progressHandle || !currentTimeEl || !totalTimeEl)
      return;

    const currentTime = this.editorGlobalAudio.currentTime;
    const duration = this.editorGlobalAudio.duration;

    if (isNaN(duration)) return;

    const percentage = (currentTime / duration) * 100;

    progressFill.style.width = percentage + "%";
    progressHandle.style.left = percentage + "%";

    currentTimeEl.textContent = this.formatTime(currentTime);
    totalTimeEl.textContent = this.formatTime(duration);
  }

  // Format time helper for editor functions
  formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }

  startEditorProgressTracking() {
    if (this.editorProgressInterval) {
      clearInterval(this.editorProgressInterval);
    }

    this.editorProgressInterval = setInterval(() => {
      if (this.editorGlobalAudio && !this.editorIsDragging) {
        this.updateEditorProgressDisplay();
      }
    }, 100);
  }

  stopEditorProgressTracking() {
    if (this.editorProgressInterval) {
      clearInterval(this.editorProgressInterval);
      this.editorProgressInterval = null;
    }
  }

  showEditorProgressBar() {
    const container = document.getElementById("editor-progress-container");
    if (container) {
      container.style.display = "block";
    }
  }

  hideEditorProgressBar() {
    const container = document.getElementById("editor-progress-container");
    if (container) {
      container.style.display = "none";
    }
  }

  updateModeIndicator() {
    const editModeIndicator = document.getElementById("edit-indicator");
    const instructions = document.getElementById("instructions");

    if (this.navigationMode) {
      editModeIndicator.style.display = "none";
      instructions.innerHTML =
        '<strong>Navigation Mode:</strong><br>• Click navigation portals (🚪) to move between scenes<br>• Use mouse/touch to look around 360°<br>• Toggle "Edit Mode" to modify hotspots<br><br><strong style="color: #4caf50;">💡 Pro Tip:</strong><br><span style="font-size: 12px;">First scene will be the starting point when you save/export!</span>';

      // Do NOT auto-play global sound - let editor audio button control it
      // The editor audio controls should be the only way to play sound
    } else {
      // In edit mode, stop the navigation sound but keep editor sound if enabled
      this.stopGlobalSound();

      // Edit mode (whether actively placing or not)
      if (this.editMode) {
        editModeIndicator.style.display = "block";
        instructions.innerHTML =
          '<strong>🎯 PLACING HOTSPOT:</strong><br>• Click anywhere on the 360° image to place<br>• Use mouse to rotate view first if needed<br>• Hotspot will appear with selected type<br><br><strong style="color: #2196F3;">ℹ️ Tip:</strong><br><span style="font-size: 12px;">Position carefully - you can move it later with 📍</span>';
      } else {
        editModeIndicator.style.display = "none";
        instructions.innerHTML =
          '<strong>🛠️ Edit Mode:</strong><br>1. 📝 Select hotspot type (Text/Audio/Portal)<br>2. 🎯 Click "Add Hotspot" to start placing<br>3. 📍 Click on 360° image to position<br>4. Use Edit (📝) to modify content<br>5. Use Move (📍) to reposition<br>6. 🧭 Uncheck "Edit Mode" to navigate<br><br><strong style="color: #4caf50;">💡 Pro Tip:</strong><br><span style="font-size: 12px;">First scene will be the starting point on export!</span>';
      }
    }
    
    // Update visibility of all in-scene edit buttons
    this.updateInSceneEditButtons();
  }

  updateInSceneEditButtons() {
    // Update all hotspot edit button visibility based on current mode
    document.querySelectorAll("#hotspot-container [id^='hotspot-']").forEach(hotspotEl => {
      if (hotspotEl.updateEditButtonVisibility) {
        hotspotEl.updateEditButtonVisibility();
      }
    });
  }

  loadCurrentScene() {
    const scene = this.scenes[this.currentScene];
    const skybox = document.getElementById("skybox");

    console.log(`Loading scene: ${this.currentScene}`, scene); // Debug log

    // Create a unique asset ID for this scene load
    const uniqueId = `panorama-${this.currentScene}-${Date.now()}`;

    // Create a new panorama asset element
    const newPanorama = document.createElement("img");
    newPanorama.id = uniqueId;
    newPanorama.crossOrigin = "anonymous"; // Important for URL images

    // Handle both URL and data URL images
    if (
      scene.image.startsWith("data:") ||
      scene.image.startsWith("http://") ||
      scene.image.startsWith("https://")
    ) {
      newPanorama.src = scene.image;
    } else {
      // For relative paths, ensure proper formatting
      newPanorama.src = scene.image.startsWith("./")
        ? scene.image
        : `./${scene.image}`;
    }

    // Get the assets container and add the new panorama
    const assets = document.querySelector("a-assets");

    // Remove any old panorama assets to prevent memory leaks
    const oldPanoramas = assets.querySelectorAll("img[id^='panorama-']");
    oldPanoramas.forEach((img) => {
      if (img.id !== uniqueId) {
        img.remove();
      }
    });

    assets.appendChild(newPanorama);

    // Set up loading handlers
    newPanorama.onload = () => {
      console.log("New panorama loaded successfully:", scene.image);

      // Temporarily hide skybox to avoid flicker
      skybox.setAttribute("visible", "false");

      // Update skybox to use the new asset
      setTimeout(() => {
        skybox.setAttribute("src", `#${uniqueId}`);
        skybox.setAttribute("visible", "true");

        console.log("Skybox updated with new image");

        // Apply starting point after scene loads
        setTimeout(() => {
          this.applyStartingPoint();
        }, 200);
      }, 100);
    };

    newPanorama.onerror = () => {
      console.error("Failed to load panorama:", scene.image);
      alert(
        `Failed to load scene image: ${scene.image}\nPlease check if the URL is accessible and is a valid image.`
      );

      // Fallback to default image
      skybox.setAttribute("src", "#main-panorama");
      skybox.setAttribute("visible", "true");
    };

    // If the image is already cached and complete, trigger onload immediately
    if (newPanorama.complete) {
      newPanorama.onload();
    }

    // Clear existing hotspots
    const container = document.getElementById("hotspot-container");
    container.innerHTML = "";

    // Load hotspots for current scene
    this.hotspots = [...scene.hotspots];
    scene.hotspots.forEach((hotspot) => {
      this.createHotspotElement(hotspot);
    });

    // Apply custom styles to ensure portal colors and other customizations are maintained
    this.refreshAllHotspotStyles();

    this.updateHotspotList();
    this.updateStartingPointInfo();
    this.updateInSceneEditButtons(); // Update edit button visibility for new scene
    this.loadGlobalSoundControls();

    // Audio is now controlled ONLY by the editor audio button
    // No auto-play in navigation mode

    // Handle editor sound based on current state (independent of navigation mode)
    setTimeout(() => {
      console.log(
        "🎵 SCENE_LOAD: Timeout triggered, checking editor sound state:",
        this.editorGlobalSoundEnabled
      );
      // Double-check the state in case it changed during the delay
      if (this.editorGlobalSoundEnabled) {
        console.log("🎵 SCENE_LOAD: Enabled - playing editor sound");
        this.playEditorGlobalSound();
      } else {
        console.log("🎵 SCENE_LOAD: Disabled - stopping editor sound");
        // If editor sound is disabled, make sure to stop any playing audio
        this.stopEditorGlobalSound();
      }
    }, 500);

    // Notify listeners that the scene finished loading (for transitions)
    try {
      this._dispatchSceneLoaded && this._dispatchSceneLoaded();
    } catch (e) {
      // no-op
    }
  }

  switchToScene(sceneId) {
    console.log(
      "🏠 SWITCH: Switching from",
      this.currentScene,
      "to",
      sceneId,
      "| Editor sound enabled:",
      this.editorGlobalSoundEnabled
    );
    if (!this.scenes[sceneId]) return;
    this._startCrossfadeOverlay()
      .then(() => {
        // Save current scene hotspots and global sound
        this.scenes[this.currentScene].hotspots = [...this.hotspots];
        this.updateGlobalSound(); // Save current global sound settings
        this.saveScenesData(); // Save when switching scenes

        // Stop current global sound and editor sound
        this.stopGlobalSound();
        this.stopEditorGlobalSound();

        // Switch to new scene
        this.currentScene = sceneId;

        // End overlay when scene reports loaded
        const onLoaded = () => {
          window.removeEventListener("vrhotspots:scene-loaded", onLoaded);
          this._endCrossfadeOverlay();
        };
        window.addEventListener("vrhotspots:scene-loaded", onLoaded, {
          once: true,
        });

        // Safety timeout
        setTimeout(() => {
          window.removeEventListener("vrhotspots:scene-loaded", onLoaded);
          this._endCrossfadeOverlay();
        }, 1500);

        this.loadCurrentScene();
        this.updateNavigationTargets();
      })
      .catch(() => {
        // Fallback to direct switch
        this.scenes[this.currentScene].hotspots = [...this.hotspots];
        this.updateGlobalSound();
        this.saveScenesData();
        this.stopGlobalSound();
        this.stopEditorGlobalSound();
        this.currentScene = sceneId;
        this.loadCurrentScene();
        this.updateNavigationTargets();
      });
  }

  navigateToScene(sceneId) {
    if (!this.scenes[sceneId]) return;

    // Update the dropdown to reflect the change
    document.getElementById("current-scene").value = sceneId;
    this.switchToScene(sceneId);

    // Show a brief navigation indicator
    this.showNavigationFeedback(this.scenes[sceneId].name);
  }

  showNavigationFeedback(sceneName) {
    const feedback = document.createElement("div");
    feedback.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: rgba(76, 175, 80, 0.9); color: white; padding: 15px 25px;
      border-radius: 8px; font-weight: bold; z-index: 10001;
      font-family: Arial; animation: fadeInOut 2s ease-in-out;
    `;
    feedback.innerHTML = `Navigated to: ${sceneName}`;

    // Add CSS animation
    const style = document.createElement("style");
    style.textContent = `
      @keyframes fadeInOut {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(feedback);
    setTimeout(() => {
      if (feedback.parentNode) {
        feedback.parentNode.removeChild(feedback);
      }
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    }, 2000);
  }

  addNewScene() {
    const name = prompt("Enter scene name:");
    if (!name) return;

    // Show dialog for choosing between file upload or URL
    const dialog = document.createElement("div");
    dialog.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
      background: rgba(0,0,0,0.8); z-index: 10000; display: flex; 
      align-items: center; justify-content: center; font-family: Arial;
    `;

    dialog.innerHTML = `
      <div style="background: #2a2a2a; padding: 30px; border-radius: 10px; color: white; max-width: 500px;">
        <h3 style="margin-top: 0; color: #4CAF50;">Add Scene Image</h3>
        <p>Choose how you want to add the 360° image for "${name}":</p>
        
        <div style="margin: 20px 0;">
          <button id="upload-file" style="
            background: #4CAF50; color: white; border: none; padding: 15px 25px;
            border-radius: 6px; cursor: pointer; margin: 5px; width: 200px;
            font-size: 14px; font-weight: bold;
          ">📁 Upload Image File</button>
          <div style="font-size: 12px; color: #ccc; margin-left: 5px;">
            Upload an image from your computer
          </div>
        </div>
        
        <div style="margin: 20px 0;">
          <button id="use-url" style="
            background: #2196F3; color: white; border: none; padding: 15px 25px;
            border-radius: 6px; cursor: pointer; margin: 5px; width: 200px;
            font-size: 14px; font-weight: bold;
          ">🌐 Use Image URL</button>
          <div style="font-size: 12px; color: #ccc; margin-left: 5px;">
            Use an image from the internet
          </div>
        </div>
        
        <button id="cancel-scene" style="
          background: #666; color: white; border: none; padding: 10px 20px;
          border-radius: 4px; cursor: pointer; margin-top: 10px;
        ">Cancel</button>
      </div>
    `;

    document.body.appendChild(dialog);

    document.getElementById("upload-file").onclick = () => {
      document.body.removeChild(dialog);
      this.addSceneFromFile(name);
    };

    document.getElementById("use-url").onclick = () => {
      document.body.removeChild(dialog);
      this.addSceneFromURL(name);
    };

    document.getElementById("cancel-scene").onclick = () => {
      document.body.removeChild(dialog);
    };
  }

  addSceneFromFile(name) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const sceneId = `scene_${Date.now()}`;
        this.scenes[sceneId] = {
          name: name,
          image: e.target.result, // Use data URL for uploaded images
          hotspots: [],
          startingPoint: null,
          globalSound: null,
        };

        this.finalizeNewScene(sceneId, name);
      };
      reader.readAsDataURL(file);
    });

    input.click();
  }

  addSceneFromURL(name) {
    const url = prompt(
      "Enter the URL of the 360° image:\n(Make sure it's a direct link to an image file)",
      "https://"
    );
    if (!url || url === "https://") return;

    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      alert("Please enter a valid URL");
      return;
    }

    // Show loading indicator
    this.showLoadingIndicator("Loading image from URL...");

    // Test if the image loads
    const testImg = new Image();
    testImg.crossOrigin = "anonymous";

    testImg.onload = () => {
      const sceneId = `scene_${Date.now()}`;
      this.scenes[sceneId] = {
        name: name,
        image: url, // Use URL directly for online images
        hotspots: [],
        startingPoint: null,
        globalSound: null,
      };

      // Hide loading indicator
      this.hideLoadingIndicator();
      
      this.finalizeNewScene(sceneId, name);
    };

    testImg.onerror = () => {
      // Hide loading indicator
      this.hideLoadingIndicator();
      
      alert(
        "Failed to load image from URL. Please check:\n1. The URL is correct\n2. The image exists\n3. The server allows cross-origin requests"
      );
    };

    testImg.src = url;
  }

  finalizeNewScene(sceneId, name) {
    this.updateSceneDropdown();
    this.updateNavigationTargets();

    // Save the new scene data
    this.saveScenesData();

    // Switch to new scene with a small delay to ensure UI is updated
    setTimeout(() => {
      document.getElementById("current-scene").value = sceneId;
      this.switchToScene(sceneId);
      alert(`Scene "${name}" added successfully!`);
    }, 100);
  }

  showSceneManager() {
    const dialog = document.createElement("div");
    dialog.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
      background: rgba(0,0,0,0.8); z-index: 10000; display: flex; 
      align-items: center; justify-content: center; font-family: Arial;
    `;

    let sceneListHTML = "";
    Object.keys(this.scenes).forEach((sceneId) => {
      const scene = this.scenes[sceneId];
      const hotspotCount = scene.hotspots.length;
      const imageSource = scene.image.startsWith("http")
        ? "Online"
        : scene.image.startsWith("data:")
        ? "Uploaded"
        : "File";
      sceneListHTML += `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; margin: 5px 0; background: #333; border-radius: 6px;">
          <div style="flex: 1;">
            <strong>${scene.name}</strong><br>
            <small style="color: #ccc;">${hotspotCount} hotspot(s) • ${imageSource} image</small>
          </div>
          <div style="display: flex; gap: 6px;">
            <button onclick="window.hotspotEditor.editSceneImage('${sceneId}')" style="
              background: #2196F3; color: white; border: none; padding: 6px 12px;
              border-radius: 4px; cursor: pointer; font-size: 12px;" title="Change scene image">
              🖼️ Edit Image
            </button>
            <button onclick="window.hotspotEditor.deleteScene('${sceneId}')" style="
              background: #f44336; color: white; border: none; padding: 6px 12px;
              border-radius: 4px; cursor: pointer; font-size: 12px;" ${
                sceneId === "scene1"
                  ? 'disabled title="Cannot delete default scene"'
                  : ""
              }>
              🗑️ Delete
            </button>
          </div>
        </div>
      `;
    });

    dialog.innerHTML = `
      <div style="background: #2a2a2a; padding: 30px; border-radius: 10px; color: white; max-width: 600px; max-height: 80vh; overflow-y: auto;">
        <h3 style="margin-top: 0; color: #4CAF50;">🎬 Scene Manager</h3>
        <p style="margin: 0 0 20px; color: #ccc; font-size: 14px;">Manage your 360° scenes and images</p>
        <div style="margin: 20px 0;">
          ${sceneListHTML}
        </div>
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: #666; color: white; border: none; padding: 12px 20px;
          border-radius: 6px; cursor: pointer; width: 100%; font-weight: bold;
        ">Close Manager</button>
      </div>
    `;

    document.body.appendChild(dialog);
  }

  editSceneImage(sceneId) {
    const scene = this.scenes[sceneId];
    if (!scene) return;

    // Close current scene manager
    document.querySelectorAll("div").forEach((div) => {
      if (div.style.position === "fixed" && div.style.zIndex === "10000") {
        div.remove();
      }
    });

    const dialog = document.createElement("div");
    dialog.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
      background: rgba(0,0,0,0.8); z-index: 10000; display: flex; 
      align-items: center; justify-content: center; font-family: Arial;
    `;

    dialog.innerHTML = `
      <div style="background: #2a2a2a; padding: 30px; border-radius: 10px; color: white; max-width: 500px;">
        <h3 style="margin-top: 0; color: #4CAF50;">🖼️ Change Scene Image</h3>
        <p style="color: #ccc;">Update the 360° image for "${scene.name}":</p>
        
        <div style="margin: 20px 0;">
          <button id="upload-new-file" style="
            background: #4CAF50; color: white; border: none; padding: 15px 25px;
            border-radius: 6px; cursor: pointer; margin: 5px; width: 200px;
            font-size: 14px; font-weight: bold;
          ">📁 Upload New Image</button>
          <div style="font-size: 12px; color: #ccc; margin-left: 5px;">
            Upload a new image from your computer
          </div>
        </div>
        
        <div style="margin: 20px 0;">
          <button id="use-new-url" style="
            background: #2196F3; color: white; border: none; padding: 15px 25px;
            border-radius: 6px; cursor: pointer; margin: 5px; width: 200px;
            font-size: 14px; font-weight: bold;
          ">🌐 Use Image URL</button>
          <div style="font-size: 12px; color: #ccc; margin-left: 5px;">
            Use an image from the internet
          </div>
        </div>
        
        <div style="display: flex; gap: 8px; margin-top: 20px;">
          <button id="cancel-edit" style="
            background: #666; color: white; border: none; padding: 10px 20px;
            border-radius: 4px; cursor: pointer; flex: 1;
          ">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    const close = () => {
      if (dialog && dialog.parentNode) dialog.parentNode.removeChild(dialog);
      // Reopen scene manager
      setTimeout(() => this.showSceneManager(), 100);
    };

    dialog.querySelector("#cancel-edit").onclick = close;

    dialog.querySelector("#upload-new-file").onclick = () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
          scene.image = e.target.result;
          if (sceneId === this.currentScene) {
            this.loadCurrentScene();
          }
          close();
          this.showStartingPointFeedback(`Updated image for "${scene.name}"`);
        };
        reader.readAsDataURL(file);
      };
      input.click();
    };

    dialog.querySelector("#use-new-url").onclick = () => {
      const url = prompt(
        `Enter the URL of the new 360° image for "${scene.name}":\n(Make sure it's a direct link to an image file)`,
        scene.image.startsWith("http") ? scene.image : "https://"
      );
      if (!url || url === "https://") return;

      try {
        new URL(url);
      } catch (e) {
        alert("Please enter a valid URL");
        return;
      }

      // Show loading indicator
      this.showLoadingIndicator("Loading new image...");

      const testImg = new Image();
      testImg.crossOrigin = "anonymous";
      testImg.onload = () => {
        scene.image = url;
        if (sceneId === this.currentScene) {
          this.loadCurrentScene();
        }
        
        // Hide loading indicator
        this.hideLoadingIndicator();
        
        close();
        this.showStartingPointFeedback(`Updated image for "${scene.name}"`);
      };
      testImg.onerror = () => {
        // Hide loading indicator
        this.hideLoadingIndicator();
        
        alert(
          "Failed to load image from URL. Please check the URL is correct and accessible."
        );
      };
      testImg.src = url;
    };
  }

  deleteScene(sceneId) {
    if (sceneId === "scene1") {
      alert("Cannot delete the default scene.");
      return;
    }

    if (!confirm(`Delete scene "${this.scenes[sceneId].name}"?`)) return;

    delete this.scenes[sceneId];

    // Track if we switched scenes
    let switchedScenes = false;

    // If we're currently on the deleted scene, switch to scene1 first
    if (this.currentScene === sceneId) {
      this.currentScene = "scene1";
      document.getElementById("current-scene").value = "scene1";
      this.loadCurrentScene();
      switchedScenes = true;
    }

    // Clean up navigation hotspots that pointed to the deleted scene (after scene switch)
    this.cleanupOrphanedNavigationHotspots();

    // If we didn't switch scenes, refresh the current scene to remove stale portals
    if (!switchedScenes) {
      console.log(
        "🔄 Refreshing current scene to remove stale navigation portals"
      );
      this.loadCurrentScene();
    }

    this.updateSceneDropdown();
    this.updateNavigationTargets();

    // Close and reopen scene manager to refresh the list
    document.querySelectorAll("div").forEach((div) => {
      if (div.style.position === "fixed" && div.style.zIndex === "10000") {
        div.remove();
      }
    });
    this.showSceneManager();
  }
}

// Modified spot component for editor
AFRAME.registerComponent("editor-spot", {
  schema: {
    label: { type: "string", default: "" },
    audio: { type: "string", default: "" },
    labelBackground: { type: "color", default: "#333333" },
    labelPadding: { type: "number", default: 0.2 },
    popup: { type: "string", default: "" },
    popupWidth: { type: "number", default: 3 },
    popupHeight: { type: "number", default: 2 },
    popupColor: { type: "color", default: "#333333" },
    navigation: { type: "string", default: "" },
  },

  init: function () {
    const data = this.data;
    const el = this.el;

    // Don't override the src - let createHotspotElement set the appropriate icon
    // el.setAttribute("src", "#hotspot"); // REMOVED - was overriding icon choice
    el.setAttribute("class", "clickable");

    // Add highlight animation
    el.setAttribute("animation__highlight", {
      property: "scale",
      from: "1 1 1",
      to: "1.5 1.5 1.5",
      dur: 500,
      easing: "easeInOutQuad",
      startEvents: "highlight",
      autoplay: false,
      loop: 2,
      dir: "alternate",
    });

    // REMOVED: Main element hover animations to prevent inheritance by popup children

    /******************  POPUP  ******************/
    if (data.popup) {
      // Get custom styles from the editor instance
      const editor = window.hotspotEditor;
      const styles = editor ? editor.customStyles : null;

      /* info icon */
      const infoIcon = document.createElement("a-entity");
      // Create circular info icon instead of banner
      const iconSize = styles ? styles.hotspot.infoButton.size : 0.4;
      infoIcon.setAttribute(
        "geometry",
        "primitive: circle; radius: " + iconSize
      );

      // Use custom styles if available
      const infoBgColor = styles
        ? styles.hotspot.infoButton.backgroundColor
        : "#4A90E2";
      const infoTextColor = styles
        ? styles.hotspot.infoButton.textColor
        : "#FFFFFF";
      const infoOpacity = styles ? styles.hotspot.infoButton.opacity : 0.9;
      const infoFontSize = styles ? styles.hotspot.infoButton.fontSize : 12;

      infoIcon.setAttribute(
        "material",
        "color: " + infoBgColor + "; opacity: " + infoOpacity
      );
      infoIcon.setAttribute(
        "text",
        "value: i; align: center; color: " +
          infoTextColor +
          "; width: " +
          infoFontSize +
          "; font: roboto"
      );
      infoIcon.setAttribute("position", "0 0.8 0");
      infoIcon.classList.add("clickable");
      // Add hover animations specifically to info icon only (not inherited by popup)
      infoIcon.setAttribute("animation__hover_in", {
        property: "scale",
        to: "1.1 1.1 1",
        dur: 200,
        easing: "easeOutQuad",
        startEvents: "mouseenter",
      });

      infoIcon.setAttribute("animation__hover_out", {
        property: "scale",
        to: "1 1 1",
        dur: 200,
        easing: "easeOutQuad",
        startEvents: "mouseleave",
      });
      el.appendChild(infoIcon);

      /* popup container */
      const popup = document.createElement("a-entity");
      popup.setAttribute("visible", "false");
      popup.classList.add("popup-container");
      // Move popup significantly forward on z-axis to avoid z-fighting with info icon
      popup.setAttribute("position", "0 1.5 0.2");
      popup.setAttribute("look-at", "#cam");
      // REMOVED: Popup scale animations to prevent conflicts with close button interactions

      /* background */
      const background = document.createElement("a-plane");

      // Use custom styles if available
      const popupBgColor = styles
        ? styles.hotspot.popup.backgroundColor
        : data.popupColor;
      const popupOpacity = styles ? styles.hotspot.popup.opacity : 1;

      background.setAttribute("color", popupBgColor);
      background.setAttribute("opacity", popupOpacity);
      background.setAttribute("width", data.popupWidth);
      background.setAttribute("height", data.popupHeight);
      background.classList.add("popup-bg");
      popup.appendChild(background);

      /* text */
      const text = document.createElement("a-text");

      // Use custom text color if available
      const popupTextColor = styles ? styles.hotspot.popup.textColor : "white";

      text.setAttribute("value", data.popup);
      text.setAttribute("wrap-count", Math.floor(data.popupWidth * 8)); // Dynamic wrap based on popup width
      text.setAttribute("color", popupTextColor);
      text.setAttribute("position", "0 0 0.05"); // Increased z-spacing to prevent z-fighting
      text.setAttribute("align", "center");
      text.setAttribute("width", (data.popupWidth - 0.4).toString()); // Constrain to popup width with padding
      text.setAttribute("font", "roboto");
      text.classList.add("popup-text");
      popup.appendChild(text);

      /* close button */
      const closeButton = document.createElement("a-image");
      const margin = 0.3;
      closeButton.setAttribute(
        "position",
        `${data.popupWidth / 2 - margin} ${data.popupHeight / 2 - margin} 0.1` // Increased z-spacing
      );
      closeButton.setAttribute("src", "#close");
      closeButton.setAttribute("width", "0.4");
      closeButton.setAttribute("height", "0.4");
      closeButton.classList.add("clickable");
      closeButton.classList.add("popup-close");

      // Add hover animations to close button for better UX
      closeButton.setAttribute("animation__hover_in", {
        property: "scale",
        to: "1.2 1.2 1",
        dur: 200,
        easing: "easeOutQuad",
        startEvents: "mouseenter",
      });

      closeButton.setAttribute("animation__hover_out", {
        property: "scale",
        to: "1 1 1",
        dur: 200,
        easing: "easeOutQuad",
        startEvents: "mouseleave",
      });

      popup.appendChild(closeButton);

      /* event wiring */
      infoIcon.addEventListener("click", function (e) {
        e.stopPropagation();
        popup.setAttribute("visible", true);
        infoIcon.setAttribute("visible", false); // Hide info icon when popup is open
      });

      // REMOVED: Close button hover animations to prevent conflicts with popup scaling
      closeButton.addEventListener("click", (e) => {
        e.stopPropagation();
        popup.setAttribute("visible", false);
        infoIcon.setAttribute("visible", true); // Show info icon when popup is closed
      });

      el.appendChild(popup);
    }

    /******************  AUDIO  ******************/
    if (data.audio) {
      const audioEl = document.createElement("a-sound");
      audioEl.setAttribute("src", data.audio);
      audioEl.setAttribute("autoplay", "false");
      audioEl.setAttribute("loop", "true");
      el.appendChild(audioEl);

      const btn = document.createElement("a-image");
      btn.setAttribute("class", "clickable audio-control");

      // Use custom styles if available
      const editor = window.hotspotEditor;
      const styles = editor ? editor.customStyles : null;
      const playImage = styles?.buttonImages?.play || "#play";
      const pauseImage = styles?.buttonImages?.pause || "#pause";
      btn.setAttribute("src", playImage);

      const buttonColor = styles ? styles.audio.buttonColor : "#FFFFFF";
      const buttonOpacity = styles ? styles.audio.buttonOpacity : 1.0;

      btn.setAttribute("width", "0.5");
      btn.setAttribute("height", "0.5");
      btn.setAttribute("material", `color: ${buttonColor}`);
      btn.setAttribute("opacity", buttonOpacity.toString());
  // Position the audio control near the hotspot center
  btn.setAttribute("position", "0 0 0.02");
      el.appendChild(btn);

      let audioReady = false;
      let isPlaying = false;

      const toggleAudio = () => {
        if (!audioReady) return;

        if (isPlaying) {
          audioEl.components.sound.stopSound();
          btn.emit("fadeout");
          setTimeout(() => {
            btn.setAttribute("src", playImage);
            btn.emit("fadein");
          }, 200);
        } else {
          audioEl.components.sound.playSound();
          btn.emit("fadeout");
          setTimeout(() => {
            btn.setAttribute("src", pauseImage);
            btn.emit("fadein");
          }, 200);
        }

        isPlaying = !isPlaying;
      };

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!audioEl.components.sound) return;
        toggleAudio();
      });

      btn.addEventListener("triggerdown", (e) => {
        e.stopPropagation();
        if (!audioEl.components.sound) return;
        toggleAudio();
      });

      btn.setAttribute("animation__hover_in", {
        property: "scale",
        to: "1.2 1.2 1",
        dur: 200,
        easing: "easeOutQuad",
        startEvents: "mouseenter",
      });

      btn.setAttribute("animation__hover_out", {
        property: "scale",
        to: "1 1 1",
        dur: 200,
        easing: "easeOutQuad",
        startEvents: "mouseleave",
      });

      btn.setAttribute("animation__fadeout", {
        property: "material.opacity",
        to: 0,
        dur: 200,
        easing: "easeInQuad",
        startEvents: "fadeout",
      });

      btn.setAttribute("animation__fadein", {
        property: "material.opacity",
        to: 1,
        dur: 200,
        easing: "easeOutQuad",
        startEvents: "fadein",
      });

      audioEl.addEventListener("sound-loaded", () => {
        audioReady = true;
        audioEl.components.sound.stopSound();
      });
    }

    /******************  NAVIGATION  ******************/
    if (data.navigation) {
      // Navigation hotspots keep their default appearance (no custom color)

      // Add portal effect
      el.setAttribute("animation__portal_rotate", {
        property: "rotation",
        to: "0 360 0",
        dur: 4000,
        easing: "linear",
        loop: true,
      });

      // Add pulsing effect
      el.setAttribute("animation__portal_pulse", {
        property: "scale",
        from: "1 1 1",
        to: "1.1 1.1 1.1",
        dur: 2000,
        easing: "easeInOutSine",
        loop: true,
        dir: "alternate",
      });
    }
  },
});

// Student submission functionality
class StudentSubmission {
  static showSubmissionDialog() {
    const dialog = document.createElement("div");
    dialog.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
      background: rgba(0,0,0,0.8); z-index: 10000; display: flex; 
      align-items: center; justify-content: center; font-family: Arial;
    `;

    dialog.innerHTML = `
      <div style="background: #2a2a2a; padding: 30px; border-radius: 10px; color: white; max-width: 500px;">
        <h3 style="margin-top: 0; color: #4CAF50;">📤 Submit Your VR Project</h3>
        <p style="color: #ccc;">Submit your VR hotspot project to your professor:</p>
        
        <div style="margin: 20px 0;">
          <label style="display: block; margin-bottom: 5px; color: #ccc;">Student Name:</label>
          <input type="text" id="student-name" style="
            width: 100%; padding: 10px; border: 1px solid #555; 
            background: #333; color: white; border-radius: 4px;
          " placeholder="Enter your full name">
        </div>
        
        <div style="margin: 25px 0; text-align: center;">
          <button id="submit-project-btn" style="
            background: #4CAF50; color: white; border: none; padding: 15px 25px;
            border-radius: 6px; cursor: pointer; margin: 5px; font-weight: bold;
          ">📤 Submit Project</button>
          <button id="cancel-submission-btn" style="
            background: #666; color: white; border: none; padding: 15px 25px;
            border-radius: 6px; cursor: pointer; margin: 5px;
          ">Cancel</button>
        </div>
        
        <div id="submission-status" style="margin-top: 20px; text-align: center;"></div>
      </div>
    `;

    document.body.appendChild(dialog);

    // Add event listeners
    document
      .getElementById("submit-project-btn")
      .addEventListener("click", () => {
        StudentSubmission.submitProject(
          document.getElementById("student-name").value
        );
      });

    document
      .getElementById("cancel-submission-btn")
      .addEventListener("click", () => {
        dialog.remove();
      });
  }

  static async submitProject(studentName) {
    if (!studentName || !studentName.trim()) {
      alert("Please enter your name!");
      return;
    }

    const statusDiv = document.getElementById("submission-status");
    statusDiv.innerHTML =
      '<p style="color: #4CAF50;">📦 Generating project...</p>';

    try {
      // Generate the complete project using existing export functionality
      if (!window.hotspotEditor) {
        throw new Error("Editor not initialized");
      }

      // Create a simple project name from student name and timestamp
      const projectName = `${studentName.replace(
        /[^a-zA-Z0-9]/g,
        "_"
      )}_VR_Project`;

      // Create the project zip using the existing method
      const JSZip = window.JSZip || (await window.hotspotEditor.loadJSZip());
      const zip = new JSZip();

      // Get current skybox image
      const skyboxImg = document.querySelector("#main-panorama");
      const skyboxSrc = skyboxImg ? skyboxImg.src : "";

      // Add files to zip using existing method
      await window.hotspotEditor.addFilesToZip(zip, projectName, skyboxSrc);

      // Generate blob
      const content = await zip.generateAsync({ type: "blob" });

      // Create form data
      const formData = new FormData();
      formData.append("project", content, `${projectName}.zip`);
      formData.append("studentName", studentName);
      formData.append("projectName", projectName);

      statusDiv.innerHTML =
        '<p style="color: #4CAF50;">📤 Submitting to server...</p>';

      // Submit to server
      const response = await fetch("/submit-project", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        statusDiv.innerHTML = `
          <p style="color: #4CAF50;">✅ Project submitted successfully!</p>
          <p style="color: #ccc; font-size: 0.9em;">File: ${result.fileName}</p>
          <button id="close-submission-dialog" style="
            background: #4CAF50; color: white; border: none; padding: 10px 20px;
            border-radius: 4px; cursor: pointer; margin-top: 10px;
          ">Close</button>
        `;

        // Add event listener for the close button
        document
          .getElementById("close-submission-dialog")
          .addEventListener("click", function () {
            // Find and remove the submission dialog
            const dialog = this.closest('[style*="position: fixed"]');
            if (dialog) dialog.remove();
          });
      } else {
        throw new Error(result.message || "Submission failed");
      }
    } catch (error) {
      console.error("Submission error:", error);
      statusDiv.innerHTML = `
        <p style="color: #f44336;">❌ Submission failed</p>
        <p style="color: #ccc; font-size: 0.9em;">${error.message}</p>
        <p style="color: #ccc; font-size: 0.8em;">Make sure the server is running!</p>
      `;
    }
  }
}

// Clear localStorage function
function clearLocalStorage() {
  try {
    // Clear VR Hotspots specific data
    localStorage.removeItem("vr-hotspot-scenes-data");
    localStorage.removeItem("vr-hotspot-css-styles");
    console.log("✅ Cleared VR Hotspots localStorage data");

    // Show notification to user
    alert("Data cleared! The page will reload with fresh data.");
    window.location.reload();
  } catch (error) {
    console.error("Failed to clear localStorage:", error);
  }
}

// Initialize the editor when the page loads
document.addEventListener("DOMContentLoaded", () => {
  // Wait for A-Frame to be ready
  setTimeout(() => {
    window.hotspotEditor = new HotspotEditor();
  }, 1000);
});
