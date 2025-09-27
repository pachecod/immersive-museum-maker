/*
Immersive Museum Maker - A tool that helps people create immersive storytelling worlds using the A-Frame open source library. Output is optimized for mobile phones, desktop (WASD keys) and the Meta Quest headset browser.

Copyright (C) 2025  Dan Pacheco

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License in the LICENSE file of this repository for more details.
*/
// Agriquest Vegetable Museum - Main Script
// Generated from Immersive Museum Architecture

// Museum Configuration
let museumConfig = null;


// Custom Components
AFRAME.registerSystem('loading-manager', {
  init: function () {
    this.loadingOverlay = document.createElement('div');
    this.loadingOverlay.className = 'loading-overlay';
    
    this.loadingText = document.createElement('div');
    this.loadingText.className = 'loading-text';
    this.loadingText.textContent = 'Loading Immersive Museum...';
    
    this.progressContainer = document.createElement('div');
    this.progressContainer.className = 'loading-progress';
    
    this.progressBar = document.createElement('div');
    this.progressBar.className = 'loading-bar';
    
    this.progressContainer.appendChild(this.progressBar);
    this.loadingOverlay.appendChild(this.loadingText);
    this.loadingOverlay.appendChild(this.progressContainer);
    
    document.body.appendChild(this.loadingOverlay);
    
    this.totalAssets = 0;
    this.loadedAssets = 0;
    
    // Count all assets to load
    const assets = document.querySelector('a-assets');
    if (assets) {
      this.totalAssets = assets.querySelectorAll('*').length;
    }
    
    this.setupEventListeners();
  },
  
  setupEventListeners: function() {
    const assets = document.querySelector('a-assets');
    if (assets) {
      assets.addEventListener('loaded', this.onAssetsLoaded.bind(this));
      
      const assetItems = assets.querySelectorAll('*');
      assetItems.forEach(item => {
        item.addEventListener('loaded', this.onAssetLoaded.bind(this));
      });
    }
    
    this.sceneEl.addEventListener('loaded', this.checkAllLoaded.bind(this));
  },
  
  onAssetLoaded: function() {
    this.loadedAssets++;
    const progress = (this.loadedAssets / this.totalAssets) * 100;
    this.progressBar.style.width = progress + '%';
  },
  
  onAssetsLoaded: function() {
    this.progressBar.style.width = '100%';
    this.checkAllLoaded();
  },
  
  checkAllLoaded: function() {
    if (this.sceneEl.hasLoaded && this.progressBar.style.width === '100%') {
      setTimeout(() => {
        this.loadingOverlay.style.opacity = '0';
        this.loadingOverlay.style.transition = 'opacity 1s ease';
        setTimeout(() => {
          this.loadingOverlay.style.display = 'none';
        }, 1000);
      }, 500);
    }
  }
});

// Face-camera component to keep elements facing the camera
AFRAME.registerComponent("face-camera", {
  schema: {
    preserveY: { type: "boolean", default: false }
  },
  tick: function () {
    var camera = document.querySelector("[camera]");
    if (!camera) return;
    
    if (this.data.preserveY) {
      // Billboard behavior that only rotates around Y axis (for hotspots)
      var cameraPosition = camera.object3D.position.clone();
      var objPosition = this.el.object3D.position.clone();
      
      cameraPosition.y = objPosition.y;
      this.el.object3D.lookAt(cameraPosition);
    } else {
      // Full billboard behavior (for image panels)
      this.el.object3D.lookAt(camera.object3D.position);
    }
  }
});

// Spot component for hotspot behavior with enhanced functionality
AFRAME.registerComponent("spot", {
  schema: {
    linkto: { type: "string", default: "" },
    spotgroup: { type: "string", default: "" },
    label: { type: "string", default: "" },
    audio: { type: "selector", default: null },
    labelBackground: { type: "string", default: "#000000" },
    info: { type: "string", default: "" },
    vegetableModel: { type: "string", default: "" },
    revealAnimation: { type: "boolean", default: false }
  },
  init: function () {
    var data = this.data;
    var el = this.el;
    
    // Check if this element already has hotspot visuals to prevent duplication
    if (el.hasAttribute('geometry') && el.getAttribute('geometry').primitive === 'circle') {
      console.log('Spot component already initialized for element:', el.id);
      return;
    }
    
    console.log('Initializing spot component for element:', el.id);
    
    // Create hotspot visual
    el.setAttribute("geometry", { primitive: "circle", radius: 0.5 });
    el.setAttribute("material", {
      color: "#FFFFFF",
      opacity: 0.6,
      transparent: true,
      src: museumConfig?.assets?.images?.hotspot || '',
    });
    
    // Add pulse animation
    el.setAttribute("animation__pulse", {
      property: "scale",
      dir: "alternate",
      dur: 1000,
      easing: "easeInOutSine",
      loop: true,
      to: "1.1 1.1 1.1"
    });
    
    // Set up audio controls
    this.isPlaying = false;
    this.gazeTimeout = null;
    this.gazeThreshold = 1500; // 1.5 seconds gaze to activate
    
    // Create audio control buttons (only if not already created)
    if (data.audio && !el.querySelector('.audio-controls')) {
      this.createAudioControls(data);
    }
    
    // Create label if provided (only if not already created)
    if (data.label && !el.querySelector('a-text')) {
      this.createLabel(data);
    }
    
    // Set up click event
    el.addEventListener("click", () => {
      this.handleClick(data);
    });
  },
  
  createAudioControls: function(data) {
    // Container for audio controls
    this.audioControls = document.createElement("a-entity");
    this.audioControls.classList.add('audio-controls');
    this.audioControls.setAttribute("position", "0 -0.8 0");
    
    // Play button
    this.playButton = document.createElement("a-entity");
    this.playButton.setAttribute("geometry", "primitive: circle; radius: 0.25");
    this.playButton.setAttribute("material", "color: #4CAF50; opacity: 0.9");
    this.playButton.setAttribute("position", "-0.3 0 0");
    this.playButton.setAttribute("class", "clickable");
    
    // Play icon (triangle)
    const playIcon = document.createElement("a-entity");
    playIcon.setAttribute("geometry", "primitive: triangle; vertexA: 0.15 0 0; vertexB: -0.05 0.1 0; vertexC: -0.05 -0.1 0");
    playIcon.setAttribute("material", "color: white; shader: flat");
    playIcon.setAttribute("position", "-0.05 0 0.01");
    this.playButton.appendChild(playIcon);
    
    // Pause button
    this.pauseButton = document.createElement("a-entity");
    this.pauseButton.setAttribute("geometry", "primitive: circle; radius: 0.25");
    this.pauseButton.setAttribute("material", "color: #F44336; opacity: 0.9");
    this.pauseButton.setAttribute("position", "0.3 0 0");
    this.pauseButton.setAttribute("class", "clickable");
    
    // Pause icon (two rectangles)
    const pauseBarLeft = document.createElement("a-entity");
    pauseBarLeft.setAttribute("geometry", "primitive: box; width: 0.06; height: 0.15; depth: 0.01");
    pauseBarLeft.setAttribute("material", "color: white; shader: flat");
    pauseBarLeft.setAttribute("position", "-0.04 0 0.01");
    this.pauseButton.appendChild(pauseBarLeft);
    
    const pauseBarRight = document.createElement("a-entity");
    pauseBarRight.setAttribute("geometry", "primitive: box; width: 0.06; height: 0.15; depth: 0.01");
    pauseBarRight.setAttribute("material", "color: white; shader: flat");
    pauseBarRight.setAttribute("position", "0.04 0 0.01");
    this.pauseButton.appendChild(pauseBarRight);
    
    // Add audio progress indicator
    this.progressBar = document.createElement("a-entity");
    this.progressBar.setAttribute("geometry", "primitive: plane; width: 0.8; height: 0.1");
    this.progressBar.setAttribute("material", "color: #333333; opacity: 0.8");
    this.progressBar.setAttribute("position", "0 -0.4 0");
    
    this.progressIndicator = document.createElement("a-entity");
    this.progressIndicator.setAttribute("geometry", "primitive: plane; width: 0.01; height: 0.1");
    this.progressIndicator.setAttribute("material", "color: #FFFFFF; opacity: 1");
    this.progressIndicator.setAttribute("position", "-0.4 0 0.01");
    this.progressBar.appendChild(this.progressIndicator);
    
    // Add all controls to container
    this.audioControls.appendChild(this.playButton);
    this.audioControls.appendChild(this.pauseButton);
    this.audioControls.appendChild(this.progressBar);
    this.el.appendChild(this.audioControls);
    
    // Initially hide controls
    this.audioControls.setAttribute("visible", false);
    
    // Set up event listeners for audio buttons
    this.playButton.addEventListener("click", () => {
      this.playAudio();
    });
    
    this.pauseButton.addEventListener("click", () => {
      this.pauseAudio();
    });
    
    // Set up audio time update handler
    if (data.audio) {
      data.audio.addEventListener("timeupdate", () => {
        if (this.isPlaying && data.audio.duration) {
          const progress = data.audio.currentTime / data.audio.duration;
          const position = -0.4 + (progress * 0.8);
          this.progressIndicator.setAttribute("position", `${position} 0 0.01`);
        }
      });
      
      data.audio.addEventListener("ended", () => {
        this.isPlaying = false;
        this.progressIndicator.setAttribute("position", "-0.4 0 0.01");
      });
    }
    
    // Setup gaze tracking for controls
    this.el.addEventListener("mouseenter", () => {
      if (data.audio) {
        this.audioControls.setAttribute("visible", true);
        
        this.gazeTimeout = setTimeout(() => {
          if (this.isPlaying) {
            this.pauseAudio();
          } else {
            this.playAudio();
          }
        }, this.gazeThreshold);
      }
    });
    
    this.el.addEventListener("mouseleave", () => {
      setTimeout(() => {
        if (data.audio && !this.isPlaying) {
          this.audioControls.setAttribute("visible", false);
        }
      }, 1000);
      
      if (this.gazeTimeout) {
        clearTimeout(this.gazeTimeout);
        this.gazeTimeout = null;
      }
    });
  },
  
  createLabel: function(data) {
    var textEntity = document.createElement("a-text");
    textEntity.setAttribute("value", data.label);
    textEntity.setAttribute("align", "center");
    textEntity.setAttribute("position", "0 0.6 0");
    textEntity.setAttribute("scale", "0.5 0.5 0.5");
    textEntity.setAttribute("color", "#FFFFFF");
    
    var bgEntity = document.createElement("a-plane");
    bgEntity.setAttribute("color", data.labelBackground);
    bgEntity.setAttribute("position", "0 0.6 -0.01");
    bgEntity.setAttribute("width", data.label.length * 0.15 + 0.2);
    bgEntity.setAttribute("height", "0.3");
    bgEntity.setAttribute("opacity", "0.8");
    
    this.el.appendChild(bgEntity);
    this.el.appendChild(textEntity);
  },
  
  handleClick: function(data) {
    // Handle group visibility if specified
    if (data.spotgroup) {
      var allGroups = document.querySelectorAll('[id^="group-"]');
      allGroups.forEach(function (group) {
        group.setAttribute("visible", false);
      });
      var targetGroup = document.querySelector("#" + data.spotgroup);
      if (targetGroup) {
        targetGroup.setAttribute("visible", true);
      }
    }
    
    // Show info panel if specified
    if (data.info) {
      const infoPanel = document.querySelector('.museum-info');
      if (infoPanel) {
        infoPanel.textContent = data.info;
        infoPanel.style.display = 'block';
        
        setTimeout(() => {
          infoPanel.style.display = 'none';
        }, 10000);
      }
    }
    
    // Handle 3D model animation if specified
    if (data.vegetableModel) {
      const model = document.querySelector('#' + data.vegetableModel);
      if (model && data.revealAnimation) {
        const originalPosition = model.getAttribute("position");
        
        // Handle position as object or string
        let posX, posY, posZ;
        if (typeof originalPosition === 'string') {
          const posArray = originalPosition.split(' ');
          posX = parseFloat(posArray[0]) || 0;
          posY = parseFloat(posArray[1]) || 0;
          posZ = parseFloat(posArray[2]) || 0;
        } else if (originalPosition && typeof originalPosition === 'object') {
          posX = originalPosition.x || 0;
          posY = originalPosition.y || 0;
          posZ = originalPosition.z || 0;
        } else {
          console.error('Invalid position format:', originalPosition);
          return;
        }
        
        // Clear any existing animations first
        model.removeAttribute("animation__reveal");
        model.removeAttribute("animation__spin");
        model.removeAttribute("animation__return");
        
        // Remove any existing animation event listeners
        model.removeEventListener('animationcomplete', this.handleAnimationComplete);
        
        // Reset to original position before starting new animation
        model.setAttribute("position", `${posX} ${posY} ${posZ}`);
        
        // Store original position for return animation
        this.originalPosition = `${posX} ${posY} ${posZ}`;
        
        // Start new animations
        model.setAttribute("animation__reveal", {
          property: "position",
          to: `${posX} ${posY + 1} ${posZ}`,
          dur: 1000,
          easing: "easeOutElastic"
        });
        model.setAttribute("animation__spin", {
          property: "rotation",
          to: "0 360 0",
          loop: 1,
          dur: 2000,
          easing: "easeOutQuad"
        });
        
        // Set up animation complete handler
        this.handleAnimationComplete = (event) => {
          if (event.detail.name === 'animation__reveal') {
            // Start return animation
            model.setAttribute("animation__return", {
              property: "position",
              to: this.originalPosition,
              dur: 1000,
              easing: "easeInOutQuad"
            });
          }
        };
        
        // Listen for the reveal animation to complete
        model.addEventListener('animationcomplete', this.handleAnimationComplete);
      }
    }

    // Teleport if linkto is specified
    if (data.linkto && data.linkto !== "") {
      var targetPoint = document.querySelector(data.linkto);
      if (targetPoint) {
        document.querySelector('a-scene').setAttribute('animation__flash', {
          property: 'background.color',
          from: '#000',
          to: '#fff',
          dur: 100,
          dir: 'alternate',
          loop: 2
        });
        
        setTimeout(() => {
          var cameraRig = document.querySelector("#cameraRig");
          cameraRig.setAttribute("position", targetPoint.getAttribute("position"));
        }, 200);
      }
    }
  },
  
  playAudio: function() {
    if (this.data.audio) {
      // Stop any other playing audio
      document.querySelectorAll('audio').forEach(audio => {
        if (audio !== this.data.audio) {
          audio.pause();
          audio.currentTime = 0;
          
          document.querySelectorAll('[spot]').forEach(spot => {
            if (spot !== this.el && spot.components.spot) {
              spot.components.spot.isPlaying = false;
            }
          });
        }
      });
      
      // Play this audio
      this.data.audio.play();
      this.isPlaying = true;
      
      // Visual feedback for playing state
      this.playButton.setAttribute("material", "opacity", 0.4);
      this.pauseButton.setAttribute("material", "opacity", 0.9);
      
      this.el.setAttribute("animation__playing", {
        property: "material.emissive",
        to: "#4CAF50",
        dur: 500
      });
      
      this.showNotification('Playing Audio', 'rgba(76, 175, 80, 0.8)');
    }
  },
  
  pauseAudio: function() {
    if (this.data.audio) {
      this.data.audio.pause();
      this.isPlaying = false;
      
      this.playButton.setAttribute("material", "opacity", 0.9);
      this.pauseButton.setAttribute("material", "opacity", 0.4);
      
      this.el.setAttribute("animation__playing", {
        property: "material.emissive",
        to: "#000000",
        dur: 500
      });
      
      this.showNotification('Audio Paused', 'rgba(244, 67, 54, 0.8)');
    }
  },
  
  showNotification: function(text, backgroundColor) {
    const notification = document.createElement('div');
    notification.textContent = text;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.backgroundColor = backgroundColor;
    notification.style.color = 'white';
    notification.style.padding = '10px 15px';
    notification.style.borderRadius = '5px';
    notification.style.fontFamily = 'Arial, sans-serif';
    notification.style.zIndex = '100';
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.5s ease';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 500);
    }, 2000);
  }
});

// Enhanced mobile movement with better controls
AFRAME.registerComponent("enhanced-mobile-controls", {
  schema: {
    speed: { type: "number", default: 2 }
  },
  init: function () {
    var self = this;
    this.numFingers = 0;
    this.verticalMovementLocked = true;
    
    this.updateTouches = function (event) {
      event.preventDefault();
      self.numFingers = event.touches.length;
    };
    
    this.clearTouches = function (event) {
      event.preventDefault();
      self.numFingers = (event.touches && event.touches.length) || 0;
    };
    
    this.el.sceneEl.addEventListener("renderstart", function () {
      var canvas = self.el.sceneEl.canvas;
      canvas.addEventListener("touchstart", self.updateTouches, { passive: false });
      canvas.addEventListener("touchmove", self.updateTouches, { passive: false });
      canvas.addEventListener("touchend", self.clearTouches, { passive: false });
      canvas.addEventListener("touchcancel", self.clearTouches, { passive: false });
    });
    
    if (AFRAME.utils.device.isMobile()) {
      var leftCtrl = document.querySelector("#left-controller");
      var rightCtrl = document.querySelector("#right-controller");
      if (leftCtrl) {
        leftCtrl.removeAttribute("blink-controls");
      }
      if (rightCtrl) {
        rightCtrl.removeAttribute("blink-controls");
      }
    }
    
    const controlsGuide = document.createElement('div');
    controlsGuide.className = 'controls-guide';
    controlsGuide.innerHTML = 'Touch screen to move:<br>• One finger - Move forward<br>• Two fingers - Move backward<br>• Look around to change direction';
    document.body.appendChild(controlsGuide);
    
    setTimeout(() => {
      controlsGuide.style.opacity = '0';
      controlsGuide.style.transition = 'opacity 1s ease';
      setTimeout(() => {
        controlsGuide.style.display = 'none';
      }, 1000);
    }, 5000);
  },
  tick: function (time, deltaTime) {
    if (this.numFingers === 0) {
      return;
    }
    
    var distance = this.data.speed * (deltaTime / 1000);
    var moveMultiplier = this.numFingers === 1 ? -1 : 1;
    
    var cameraEl = this.el.querySelector("[camera]");
    if (cameraEl) {
      var direction = new THREE.Vector3();
      cameraEl.object3D.getWorldDirection(direction);
      
      if (this.verticalMovementLocked) {
        direction.y = 0;
        direction.normalize();
      }
      
      direction.multiplyScalar(distance * moveMultiplier);
      this.el.object3D.position.add(direction);
      this.el.object3D.position.y = 0;
    }
  },
  remove: function () {
    var canvas = this.el.sceneEl.canvas;
    canvas.removeEventListener("touchstart", this.updateTouches);
    canvas.removeEventListener("touchmove", this.updateTouches);
    canvas.removeEventListener("touchend", this.clearTouches);
    canvas.removeEventListener("touchcancel", this.clearTouches);
  }
});

// Sound effect component
AFRAME.registerComponent('sound-effects', {
  init: function() {
    const config = museumConfig;
    this.sounds = {};
    
    console.log('🔊 Initializing sound-effects component...');
    console.log('  Config:', config);
    console.log('  Audio assets:', config?.assets?.audio);
    console.log('  Sound effects config:', config?.soundEffects);
    
    if (config?.assets?.audio) {
      if (config.assets.audio.ambient) {
        console.log('  Creating ambient sound:', config.assets.audio.ambient);
        this.sounds.ambient = new Howl({
          src: [config.assets.audio.ambient],
          loop: true,
          volume: 0.3,
          autoplay: false
        });
      }
      
      if (config.assets.audio.click) {
        console.log('  Creating click sound:', config.assets.audio.click);
        this.sounds.click = new Howl({
          src: [config.assets.audio.click],
          volume: 0.5
        });
      }
      
      if (config.assets.audio.teleport) {
        console.log('  Creating teleport sound:', config.assets.audio.teleport);
        this.sounds.teleport = new Howl({
          src: [config.assets.audio.teleport],
          volume: 0.7
        });
      }
    }
    
    // Only play ambient audio if enabled
    if (config?.soundEffects?.ambientAudioEnabled && this.sounds.ambient) {
      console.log('  Ambient audio enabled, will play after delay:', config.soundEffects.ambientDelay || 2000);
      setTimeout(() => {
        console.log('  Playing ambient audio...');
        this.sounds.ambient.play();
      }, config.soundEffects.ambientDelay || 2000);
    } else {
      console.log('  Ambient audio disabled or not available');
    }
    
    // Add click sound to all clickable elements, but prevent duplicates
    const clickableElements = document.querySelectorAll('.clickable');
    console.log('  Found clickable elements:', clickableElements.length);
    
    clickableElements.forEach((el, index) => {
      // Check if this element already has a click sound listener
      if (!el.hasAttribute('data-click-sound-added')) {
        console.log(`  Adding click sound to element ${index}:`, el);
        el.addEventListener('click', () => {
          console.log('  Click sound triggered!');
          if (this.sounds.click) {
            this.sounds.click.play();
          } else {
            console.log('  No click sound available');
          }
        });
        el.setAttribute('data-click-sound-added', 'true');
      }
    });
    
    console.log('🔊 Sound-effects component initialized');
  },
  
  // Method to reinitialize when config becomes available
  reinitialize: function() {
    console.log('🔊 Reinitializing sound-effects component...');
    const config = museumConfig;
    
    if (!config?.assets?.audio) {
      console.log('  No audio config available yet');
      return;
    }
    
    // Clear existing sounds
    if (this.sounds.ambient) {
      this.sounds.ambient.unload();
    }
    if (this.sounds.click) {
      this.sounds.click.unload();
    }
    if (this.sounds.teleport) {
      this.sounds.teleport.unload();
    }
    
    this.sounds = {};
    
    // Recreate sounds with new config
    if (config.assets.audio.ambient) {
      console.log('  Recreating ambient sound:', config.assets.audio.ambient);
      this.sounds.ambient = new Howl({
        src: [config.assets.audio.ambient],
        loop: true,
        volume: 0.3,
        autoplay: false
      });
    }
    
    if (config.assets.audio.click) {
      console.log('  Recreating click sound:', config.assets.audio.click);
      this.sounds.click = new Howl({
        src: [config.assets.audio.click],
        volume: 0.5
      });
    }
    
    if (config.assets.audio.teleport) {
      console.log('  Recreating teleport sound:', config.assets.audio.teleport);
      this.sounds.teleport = new Howl({
        src: [config.assets.audio.teleport],
        volume: 0.7
      });
    }
    
    // Play ambient audio if enabled
    if (config?.soundEffects?.ambientAudioEnabled && this.sounds.ambient) {
      console.log('  Playing ambient audio after reinit...');
      setTimeout(() => {
        this.sounds.ambient.play();
      }, config.soundEffects.ambientDelay || 2000);
    }
    
    // Re-add click sound to all clickable elements
    const clickableElements = document.querySelectorAll('.clickable');
    console.log('  Re-adding click sounds to', clickableElements.length, 'elements');
    
    clickableElements.forEach((el, index) => {
      // Remove existing listener if any
      el.removeAttribute('data-click-sound-added');
      
      // Add new listener
      if (!el.hasAttribute('data-click-sound-added')) {
        el.addEventListener('click', () => {
          console.log('  Click sound triggered!');
          if (this.sounds.click) {
            this.sounds.click.play();
          } else {
            console.log('  No click sound available');
          }
        });
        el.setAttribute('data-click-sound-added', 'true');
      }
    });
    
    console.log('🔊 Sound-effects component reinitialized');
  }
});

// Static skybox component - always shows the configured skybox
AFRAME.registerComponent('static-skybox', {
  init: function() {
    this.sky = document.querySelector('a-sky');
    const config = museumConfig;
    
    // Set the skybox to the configured sky image and keep it static
    const skyImage = config?.environment?.sky?.day || config?.assets?.images?.sky || '';
    
    if (this.sky) {
      this.sky.setAttribute('material', {
        src: skyImage,
        opacity: 1.0
      });
      console.log('Static skybox set to:', skyImage);
    }
    
    // Create a static directional light (no movement)
    this.sunLight = document.createElement('a-entity');
    this.sunLight.setAttribute('light', {
      type: 'directional',
      color: '#FFF',
      intensity: 0.8
    });
    this.sunLight.setAttribute('position', '0 10 0');
    this.el.sceneEl.appendChild(this.sunLight);
  }
});

// Museum Project Class
class MuseumProject {
  constructor() {
    this.config = null;
    this.currentImageIndex = 0;
    this.init();
  }

  async init() {
    try {
      // Determine template from URL
      const template = this.getTemplateFromURL();
      console.log('Detected template from URL:', template);
      
      let config;
      if (template) {
        // Load template-specific config
        const response = await fetch(`templates/${template}.json`);
        if (!response.ok) {
          throw new Error(`Failed to load template config: ${response.status}`);
        }
        config = await response.json();
        console.log(`Loaded template config for: ${template}`, config);
      } else {
        // Load default config
        const response = await fetch('./config.json');
        if (!response.ok) {
          throw new Error(`Failed to load config: ${response.status}`);
        }
        config = await response.json();
        console.log('Loaded default config:', config);
      }
      
      this.config = config;
      museumConfig = this.config; // Make available globally
      
      // Ensure there's always a default template
      if (!museumConfig.template) {
        museumConfig.template = {
          id: template || 'outdoor-exploration',
          name: template ? this.getTemplateDisplayName(template) : 'Outdoor Exploration'
        };
      }
      
      console.log('Loaded museum config:', this.config);
      // Update template display as soon as config is available
      const editor = window.modelEditor;
      if (editor && typeof editor.updateCurrentTemplateDisplay === 'function') {
        editor.updateCurrentTemplateDisplay();
      }
      
      // Reinitialize sound effects now that config is available
      const soundEffectsEntity = document.querySelector('[sound-effects]');
      if (soundEffectsEntity && soundEffectsEntity.components['sound-effects']) {
        soundEffectsEntity.components['sound-effects'].reinitialize();
      }
      this.setupMuseum();
    } catch (error) {
      console.error('Failed to load museum config:', error);
      this.showErrorMessage('Failed to load museum configuration. Please check that the template exists.');
    }
  }

  getTemplateFromURL() {
    const path = window.location.pathname;
    const segments = path.split('/').filter(segment => segment.length > 0);
    
    // If we're at root, no template
    if (segments.length === 0) {
      return null;
    }
    
    // First segment should be the template name
    const template = segments[0];
    
    // Handle template aliases
    const templateAliases = {
      'house': 'house-template',
      'outdoor': 'outdoor-exploration',
      'classroom': 'classroom'
    };
    
    const actualTemplate = templateAliases[template] || template;
    
    // Validate template name (basic check)
    if (/^[a-zA-Z0-9_-]+$/.test(actualTemplate)) {
      return actualTemplate;
    }
    
    return null;
  }

  getTemplateDisplayName(templateId) {
    const displayNames = {
      'outdoor-exploration': 'Outdoor Exploration',
      'house': 'House Template',
      'house-template': 'House Template',
      'outdoor': 'Outdoor Exploration'
    };
    return displayNames[templateId] || templateId;
  }

  setupMuseum() {
    console.log('Setting up museum with config:', this.config);
    
    // Create environment first to ensure basic scene structure
    this.createEnvironmentSafe();
    
    // Create assets
    this.createAssets();
    
    // Create info display
    this.createInfoDisplay();
    
    // Create exhibits immediately - don't wait for assets to load
    // The assets will load in the background and models will appear when ready
    console.log('Creating exhibits immediately...');
    this.createExhibits();
    
    this.setupEventListeners();
    this.setupVRToggle();
    console.log('Museum setup complete');
    
    // Reinitialize sound effects after all elements are created
    const soundEffectsEntity = document.querySelector('[sound-effects]');
    if (soundEffectsEntity && soundEffectsEntity.components['sound-effects']) {
      soundEffectsEntity.components['sound-effects'].reinitialize();
    }
    
    // Add a fallback check to ensure scene is visible
    setTimeout(() => {
      this.ensureSceneVisibility();
    }, 2000);
  }

  createEnvironmentSafe() {
    try {
      if (!this.config || !this.config.environment) {
        console.warn('Environment config missing; rendering minimal fallback environment');
        const scene = document.querySelector('a-scene');
        if (scene) {
          const ambient = document.createElement('a-entity');
          ambient.setAttribute('light', { type: 'ambient', color: '#BBB', intensity: 1 });
          scene.appendChild(ambient);
          const sky = document.createElement('a-sky');
          sky.setAttribute('color', '#222');
          scene.appendChild(sky);
        }
        return;
      }
      this.createEnvironment();
    } catch (error) {
      console.error('Error creating environment, using fallback:', error);
      const scene = document.querySelector('a-scene');
      if (scene) {
        const ambient = document.createElement('a-entity');
        ambient.setAttribute('light', { type: 'ambient', color: '#BBB', intensity: 1 });
        scene.appendChild(ambient);
        const sky = document.createElement('a-sky');
        sky.setAttribute('color', '#222');
        scene.appendChild(sky);
        const ground = document.createElement('a-plane');
        ground.setAttribute('width', 50);
        ground.setAttribute('height', 50);
        ground.setAttribute('rotation', '-90 0 0');
        ground.setAttribute('color', '#3a3a3a');
        ground.classList.add('ground');
        scene.appendChild(ground);
      }
    }
  }

  // Helper function to set material with a small delay to avoid texture warnings
  setMaterialWhenAssetReady(element, assetId, additionalProps = '') {
    // Set material immediately
    const materialProps = `src: ${assetId}; ${additionalProps}`;
    element.setAttribute('material', materialProps);
    console.log(`✅ Set material for ${element.id} with ${assetId}`);
  }

  createAssets() {
    const assets = document.querySelector('a-assets');
    if (!assets) {
      console.error('❌ No a-assets element found!');
      return;
    }
    
    console.log('\n=== CREATING MUSEUM ASSETS ===');
    
    // === IMAGE ASSETS ===
    // UI images, textures, and visual elements
    if (this.config.assets.images) {
      console.log('📸 Loading image assets...');
      Object.entries(this.config.assets.images).forEach(([id, src]) => {
        if (src) {
          const img = document.createElement('img');
          img.id = id;
          img.src = src;
          img.crossOrigin = 'anonymous';
          img.setAttribute('data-asset-type', 'image');
          assets.appendChild(img);
          console.log(`   ✅ Image: ${id} -> ${src}`);
        }
      });
    }
    
    // === 3D MODEL ASSETS ===
    // GLTF/GLB models for the vegetable and garden tool exhibits
    if (this.config.assets.models) {
      console.log('🎯 Loading 3D model assets...');
      Object.entries(this.config.assets.models).forEach(([id, src]) => {
        if (src && !src.includes('bench.glb') && src.trim() !== '') { // Skip local files that don't exist and empty sources
          const model = document.createElement('a-asset-item');
          model.id = id;
          model.src = src;
          model.setAttribute('type', 'gltf');
          model.setAttribute('data-asset-type', '3d-model');
          model.setAttribute('data-model-category', id === 'wheelbarrow' ? 'garden-tool' : 'vegetable');
          
          // Add event listeners for asset loading
          model.addEventListener('loaded', () => {
            console.log(`   ✅ 3D Model loaded: ${id} (${src})`);
          });
          
          model.addEventListener('error', (e) => {
            console.error(`   ❌ 3D Model failed: ${id} (${src})`);
            console.error(`      Error: ${e.detail}`);
          });
          
          // Validate the source URL before adding
          if (src.startsWith('http') || src.startsWith('https') || src.startsWith('#')) {
            assets.appendChild(model);
            console.log(`   📦 Added model asset: ${id}`);
            
            // Debug: Check if asset was added
            const addedAsset = assets.querySelector(`#${id}`);
            console.log(`   DEBUG: Asset in DOM:`, !!addedAsset);
            if (addedAsset) {
              console.log(`   DEBUG: Asset attributes:`, {
                id: addedAsset.id,
                src: addedAsset.src,
                tagName: addedAsset.tagName
              });
            }
          } else {
            console.warn(`   ⚠️ Skipping invalid model source: ${id} -> ${src}`);
          }
        }
      });
    }
    
    // === EXHIBIT MODEL ASSETS ===
    // Create assets for any model URLs found in exhibits
    if (this.config.exhibits) {
      console.log('🎯 Loading exhibit model assets...');
      this.config.exhibits.forEach(exhibit => {
        if (exhibit.model && exhibit.model.src && exhibit.model.src.startsWith('http')) {
          const assetId = exhibit.model.id;
          const modelUrl = exhibit.model.src;
          
          // Check if asset already exists
          const existingAsset = assets.querySelector(`#${assetId}`);
          if (!existingAsset) {
            console.log(`   📦 Creating asset for exhibit model: ${assetId} -> ${modelUrl}`);
            
            const model = document.createElement('a-asset-item');
            model.id = assetId;
            model.src = modelUrl;
            model.setAttribute('type', 'gltf');
            model.setAttribute('data-asset-type', '3d-model');
            model.setAttribute('data-model-category', 'exhibit-model');
            
            // Add event listeners for asset loading
            model.addEventListener('loaded', () => {
              console.log(`   ✅ Exhibit model loaded: ${assetId} (${modelUrl})`);
            });
            
            model.addEventListener('error', (e) => {
              console.error(`   ❌ Exhibit model failed: ${assetId} (${modelUrl})`);
              console.error(`      Error: ${e.detail}`);
            });
            
            assets.appendChild(model);
          } else {
            console.log(`   📦 Asset already exists for exhibit model: ${assetId}`);
          }
        }
      });
    }
    
    // === AUDIO ASSETS ===
    // Sound effects and ambient audio
    if (this.config.assets.audio) {
      console.log('🔊 Loading audio assets...');
      Object.entries(this.config.assets.audio).forEach(([id, src]) => {
        if (src) {
          const audio = document.createElement('audio');
          audio.id = id;
          audio.src = src;
          audio.preload = 'auto';
          audio.crossOrigin = 'anonymous';
          audio.setAttribute('data-asset-type', 'audio');
          assets.appendChild(audio);
          console.log(`   ✅ Audio: ${id} -> ${src}`);
        }
      });
    }
    
    console.log('=== ASSETS CREATION COMPLETE ===\n');
  }

  createEnvironment() {
    const scene = document.querySelector('a-scene');
    
    // Clear existing environment elements first to prevent duplication
    const existingGround = scene.querySelector('a-plane.ground');
    if (existingGround) {
      console.log('Clearing existing ground');
      existingGround.remove();
    }
    
    const existingSky = scene.querySelector('a-sky');
    if (existingSky) {
      console.log('Clearing existing sky');
      existingSky.remove();
    }
    
    // Lighting
    const ambientLight = document.createElement('a-entity');
    ambientLight.setAttribute('light', {
      type: 'ambient',
      color: this.config.environment.lighting.ambient.color,
      intensity: this.config.environment.lighting.ambient.intensity
    });
    scene.appendChild(ambientLight);
    
    const directionalLight = document.createElement('a-entity');
    directionalLight.setAttribute('light', {
      type: 'directional',
      color: this.config.environment.lighting.directional.color,
      intensity: this.config.environment.lighting.directional.intensity,
      castShadow: this.config.environment.lighting.directional.castShadow
    });
    directionalLight.setAttribute('position', this.config.environment.lighting.directional.position);
    scene.appendChild(directionalLight);
    
    // Ground
    const ground = document.createElement('a-plane');
    ground.setAttribute('width', this.config.environment.ground.size.split(' ')[0]);
    ground.setAttribute('height', this.config.environment.ground.size.split(' ')[1]);
    ground.setAttribute('rotation', '-90 0 0');
    // Set material directly instead of using asset system
    if (this.config.environment.ground.texture) {
      ground.setAttribute('material', `src: ${this.config.environment.ground.texture}; repeat: ${this.config.environment.ground.repeat}; transparent: false; opacity: 1; normalTextureRepeat: ${this.config.environment.ground.repeat}; roughness: 0.8`);
    }
    ground.setAttribute('shadow', 'cast: false; receive: true');
    ground.classList.add('ground', 'clickable');
    scene.appendChild(ground);
    
    // Sky
    const sky = document.createElement('a-sky');
    // Set material directly instead of using asset system
    if (this.config.environment.sky.day) {
      sky.setAttribute('material', 'src', this.config.environment.sky.day);
    }
    scene.appendChild(sky);
    
    console.log('Environment created:', { ground, sky, ambientLight, directionalLight });
    
    // A-Frame is working, removed test box
    
    // Physics boundaries (simplified without physics system)
    const floor = document.createElement('a-box');
    floor.classList.add('collision');
    floor.setAttribute('position', this.config.environment.physics.floor.position);
    floor.setAttribute('width', this.config.environment.physics.floor.size.split(' ')[0]);
    floor.setAttribute('height', this.config.environment.physics.floor.size.split(' ')[1]);
    floor.setAttribute('depth', this.config.environment.physics.floor.size.split(' ')[2]);
    floor.setAttribute('visible', this.config.environment.physics.floor.visible);
    scene.appendChild(floor);
    
    const ceiling = document.createElement('a-box');
    ceiling.classList.add('collision');
    ceiling.setAttribute('position', this.config.environment.physics.ceiling.position);
    ceiling.setAttribute('width', this.config.environment.physics.ceiling.size.split(' ')[0]);
    ceiling.setAttribute('height', this.config.environment.physics.ceiling.size.split(' ')[1]);
    ceiling.setAttribute('depth', this.config.environment.physics.ceiling.size.split(' ')[2]);
    ceiling.setAttribute('visible', this.config.environment.physics.ceiling.visible);
    scene.appendChild(ceiling);
    
    // Create walls and ceilings from config
    this.createWallsAndCeilings();
  }

  createWallsAndCeilings() {
    const scene = document.querySelector('a-scene');
    
    // Clear existing walls and ceilings first to prevent duplication
    const existingWalls = scene.querySelectorAll('.wall-element');
    const existingCeilings = scene.querySelectorAll('.ceiling-element');
    existingWalls.forEach(wall => wall.remove());
    existingCeilings.forEach(ceiling => ceiling.remove());
    
    // Create walls
    if (this.config.walls && Array.isArray(this.config.walls)) {
      this.config.walls.forEach(wall => {
        this.createWallEntity(wall);
      });
    }
    
    // Create ceilings
    if (this.config.ceilings && Array.isArray(this.config.ceilings)) {
      this.config.ceilings.forEach(ceiling => {
        this.createCeilingEntity(ceiling);
      });
    }
  }

  createWallEntity(wall) {
    const scene = document.querySelector('a-scene');
    if (!scene) return;

    const wallEntity = document.createElement('a-plane');
    wallEntity.setAttribute('id', `wall-${wall.id}`);
    wallEntity.setAttribute('position', `${wall.position.x} ${wall.position.y} ${wall.position.z}`);
    wallEntity.setAttribute('rotation', `${wall.rotation.x} ${wall.rotation.y} ${wall.rotation.z}`);
    wallEntity.setAttribute('width', wall.width);
    wallEntity.setAttribute('height', wall.height);
    wallEntity.setAttribute('geometry', `primitive: plane; width: ${wall.width}; height: ${wall.height}`);
    const tilingX = wall.tilingX || 1;
    const tilingY = wall.tilingY || 1;
    const brightness = wall.brightness || 1;
    const color = wall.color || '#cccccc';
    
    if (wall.texture) {
      const opacity = wall.transparent ? 0.3 : brightness;
      this.setMaterialWhenAssetReady(wallEntity, wall.texture, `side: double; repeat: ${tilingX} ${tilingY}; opacity: ${opacity}; depthTest: true; depthWrite: true; transparent: ${wall.transparent || false}`);
    } else {
      const opacity = wall.transparent ? 0.3 : 1;
      wallEntity.setAttribute('material', `color: ${color}; side: double; depthTest: true; depthWrite: true; transparent: ${wall.transparent || false}; opacity: ${opacity}`);
    }
    wallEntity.setAttribute('visible', wall.visible);
    if (wall.renderOrder !== undefined) {
      wallEntity.setAttribute('render-order', wall.renderOrder);
    } else {
      wallEntity.setAttribute('render-order', -1); // Default to render behind other objects
    }
    wallEntity.classList.add('wall-element');

    // Add manipulation gizmo for editor mode
    if (window.modelEditor) {
      this.createWallGizmo(wall);
    }

    scene.appendChild(wallEntity);
  }

  createCeilingEntity(ceiling) {
    const scene = document.querySelector('a-scene');
    if (!scene) return;

    const ceilingEntity = document.createElement('a-plane');
    ceilingEntity.setAttribute('id', `ceiling-${ceiling.id}`);
    ceilingEntity.setAttribute('position', `${ceiling.position.x} ${ceiling.position.y} ${ceiling.position.z}`);
    ceilingEntity.setAttribute('rotation', `${ceiling.rotation.x} ${ceiling.rotation.y} ${ceiling.rotation.z}`);
    ceilingEntity.setAttribute('width', ceiling.width);
    ceilingEntity.setAttribute('height', ceiling.height);
    ceilingEntity.setAttribute('geometry', `primitive: plane; width: ${ceiling.width}; height: ${ceiling.height}`);
    const tilingX = ceiling.tilingX || 1;
    const tilingY = ceiling.tilingY || 1;
    const brightness = ceiling.brightness || 1;
    const color = ceiling.color || '#ffffff';
    
    if (ceiling.texture) {
      const opacity = ceiling.transparent ? 0.3 : brightness;
      this.setMaterialWhenAssetReady(ceilingEntity, ceiling.texture, `side: double; repeat: ${tilingX} ${tilingY}; opacity: ${opacity}; depthTest: true; depthWrite: true; transparent: ${ceiling.transparent || false}`);
    } else {
      const opacity = ceiling.transparent ? 0.3 : 1;
      ceilingEntity.setAttribute('material', `color: ${color}; side: double; depthTest: true; depthWrite: true; transparent: ${ceiling.transparent || false}; opacity: ${opacity}`);
    }
    ceilingEntity.setAttribute('visible', ceiling.visible);
    if (ceiling.renderOrder !== undefined) {
      ceilingEntity.setAttribute('render-order', ceiling.renderOrder);
    } else {
      ceilingEntity.setAttribute('render-order', -1); // Default to render behind other objects
    }
    ceilingEntity.classList.add('ceiling-element');

    // Add manipulation gizmo for editor mode
    if (window.modelEditor) {
      this.createCeilingGizmo(ceiling);
    }

    scene.appendChild(ceilingEntity);
  }

  createInfoDisplay() {
    const scene = document.querySelector('a-scene');
    
    // Clear existing info display first to prevent duplication
    const existingInfoDisplay = scene.querySelector('#info-display');
    if (existingInfoDisplay) {
      console.log('Clearing existing info display');
      existingInfoDisplay.remove();
    }
    
    const infoDisplay = document.createElement('a-entity');
    infoDisplay.id = 'info-display';
    infoDisplay.setAttribute('position', this.config.infoDisplay.position);
    
    // Main display panel container
    const panelContainer = document.createElement('a-entity');
    panelContainer.id = 'image-panel-container';
    panelContainer.setAttribute('face-camera', '');
    panelContainer.setAttribute('position', this.config.infoDisplay.panel.position);
    
    // Image panel
    const imagePanel = document.createElement('a-plane');
    imagePanel.id = 'image-panel';
    imagePanel.setAttribute('position', '0 0 0');
    imagePanel.setAttribute('width', this.config.infoDisplay.panel.size.split(' ')[0]);
    imagePanel.setAttribute('height', this.config.infoDisplay.panel.size.split(' ')[1]);
    // Set material after ensuring asset is loaded
    this.setMaterialWhenAssetReady(imagePanel, '#image1', 'side: double; shader: flat');
    imagePanel.setAttribute('visible', 'true');
    imagePanel.classList.add('clickable');
    panelContainer.appendChild(imagePanel);
    
    // Navigation arrows
    this.createNavigationArrow(panelContainer, 'left', this.config.infoDisplay.navigation.left);
    this.createNavigationArrow(panelContainer, 'right', this.config.infoDisplay.navigation.right);
    
    // Information text
    const infoText = document.createElement('a-entity');
    infoText.id = 'info-text';
    infoText.setAttribute('position', this.config.infoDisplay.text.position);
    infoText.setAttribute('text', {
      value: this.config.infoDisplay.text.content.default,
      width: this.config.infoDisplay.text.size.split(' ')[0],
      color: '#FFFFFF',
      align: 'center'
    });
    infoText.setAttribute('geometry', `primitive: plane; width: ${this.config.infoDisplay.text.size.split(' ')[0]}; height: ${this.config.infoDisplay.text.size.split(' ')[1]}`);
    infoText.setAttribute('material', 'color: #333333; opacity: 0.8; shader: flat');
    panelContainer.appendChild(infoText);
    
    infoDisplay.appendChild(panelContainer);
    scene.appendChild(infoDisplay);
  }

  addModelLabel(modelEntity, labelText) {
    // === MODEL LABEL SYSTEM ===
    // Creates a floating label above each model for easy identification
    
    // Label container - positioned above the model
    const labelContainer = document.createElement('a-entity');
    labelContainer.id = `${modelEntity.id}-label-container`;
    labelContainer.setAttribute('position', '0 3 0'); // 3 units above the model
    labelContainer.setAttribute('face-camera', 'preserveY: true'); // Always face camera
    labelContainer.setAttribute('data-label-type', 'model-identifier');
    labelContainer.setAttribute('data-model-name', labelText);
    
    // Background panel for text readability
    const labelBackground = document.createElement('a-plane');
    labelBackground.id = `${modelEntity.id}-label-background`;
    labelBackground.setAttribute('width', '3');
    labelBackground.setAttribute('height', '0.8');
    labelBackground.setAttribute('color', '#000000');
    labelBackground.setAttribute('opacity', '0.7');
    labelBackground.setAttribute('material', 'shader: flat');
    labelBackground.setAttribute('position', '0 0 -0.01');
    labelBackground.setAttribute('data-background-type', 'label-background');
    labelContainer.appendChild(labelBackground);
    
    // Text label displaying the model name
    const labelTextEntity = document.createElement('a-text');
    labelTextEntity.id = `${modelEntity.id}-label-text`;
    labelTextEntity.setAttribute('value', labelText);
    labelTextEntity.setAttribute('align', 'center');
    labelTextEntity.setAttribute('color', '#FFFFFF');
    labelTextEntity.setAttribute('width', '6');
    labelTextEntity.setAttribute('position', '0 0 0');
    labelTextEntity.setAttribute('font', 'kelsonsans');
    labelTextEntity.setAttribute('data-text-type', 'model-label');
    labelContainer.appendChild(labelTextEntity);
    
    // Add label container to the model
    modelEntity.appendChild(labelContainer);
    
    // === VISUAL INDICATOR ===
    // Small pulsing sphere at model base for easy identification
    const indicator = document.createElement('a-sphere');
    indicator.id = `${modelEntity.id}-indicator`;
    indicator.setAttribute('radius', '0.1');
    indicator.setAttribute('color', '#4CAF50');
    indicator.setAttribute('opacity', '0.8');
    indicator.setAttribute('position', '0 0 0');
    indicator.setAttribute('animation__pulse', 'property: scale; to: 1.2 1.2 1.2; dir: alternate; dur: 2000; loop: true');
    indicator.setAttribute('data-indicator-type', 'model-marker');
    modelEntity.appendChild(indicator);
    
    console.log(`🏷️ Added label system for model: ${modelEntity.id}`);
    console.log(`   Label text: "${labelText}"`);
    console.log(`   Label container: ${labelContainer.id}`);
    console.log(`   Visual indicator: ${indicator.id}`);
  }

  createNavigationArrow(container, direction, config) {
    const arrowContainer = document.createElement('a-entity');
    arrowContainer.id = `nav-${direction}`;
    arrowContainer.setAttribute('position', config.position);
    arrowContainer.classList.add('clickable');
    
    const arrowImage = document.createElement('a-image');
    const arrowSrc = `#arrow${direction.charAt(0).toUpperCase() + direction.slice(1)}`;
    arrowImage.setAttribute('src', arrowSrc);
    arrowImage.setAttribute('position', '0 0 0.01');
    arrowImage.setAttribute('scale', '0.5 0.5 0.5');
    arrowImage.classList.add('clickable');
    arrowImage.setAttribute('animation__hover', 'property: scale; to: 0.6 0.6 0.6; startEvents: mouseenter; endEvents: mouseleave; dir: alternate; dur: 300');
    
    // Add event listeners for image loading
    arrowImage.addEventListener('loaded', () => {
      console.log('Arrow image loaded successfully:', arrowSrc);
    });
    
    arrowImage.addEventListener('error', (e) => {
      console.error('Arrow image failed to load:', arrowSrc, e.detail);
    });
    
    arrowContainer.appendChild(arrowImage);
    console.log('Created arrow:', direction, 'with src:', arrowSrc);
    
    const background = document.createElement('a-plane');
    background.setAttribute('width', config.size.split(' ')[0]);
    background.setAttribute('height', config.size.split(' ')[1]);
    background.setAttribute('color', '#333333');
    background.setAttribute('opacity', '0.7');
    background.setAttribute('material', 'shader: flat');
    arrowContainer.appendChild(background);
    
    container.appendChild(arrowContainer);
  }

  createExhibits() {
    const scene = document.querySelector('a-scene');
    
    // Always clear existing exhibits first to prevent duplication
    const existingExhibits = scene.querySelectorAll('[id*="-exhibit"]');
    if (existingExhibits.length > 0) {
      console.log(`Clearing ${existingExhibits.length} existing exhibits before creating new ones`);
      existingExhibits.forEach(exhibit => exhibit.remove());
    }
    
    // Check if assets are loaded
    const assets = document.querySelector('a-assets');
    const modelAssets = assets.querySelectorAll('a-asset-item');
    console.log('Found model assets:', modelAssets.length);
    modelAssets.forEach(asset => {
      console.log('Asset:', asset.id, 'loaded:', asset.hasAttribute('loaded'));
    });
    
    // Create all museum exhibits from configuration
    this.config.exhibits.forEach((exhibit, index) => {
      console.log(`\n=== Creating Exhibit ${index + 1}: ${exhibit.name} ===`);
      
      // === EXHIBIT CONTAINER ===
      // Main container entity that holds all exhibit components
      const exhibitEntity = document.createElement('a-entity');
      exhibitEntity.id = exhibit.id; // e.g., "vegetablesalad-exhibit"
      exhibitEntity.setAttribute('position', exhibit.position);
      exhibitEntity.setAttribute('data-exhibit-name', exhibit.name);
      exhibitEntity.setAttribute('data-exhibit-type', exhibit.id.includes('wheelbarrow') ? 'garden-tool-exhibit' : 'vegetable-exhibit');
      console.log(`Created exhibit container: ${exhibit.id} at position ${exhibit.position}`);
      
      // === 3D MODEL ENTITY ===
      // The main 3D model (GLTF) that represents the vegetable or garden tool
      const model = document.createElement('a-entity');
      model.id = exhibit.model.id; // e.g., "vegetablesalad-model"
      
      // Debug: Check the model source
      console.log(`   DEBUG: Model source for ${exhibit.name}:`, exhibit.model.src);
      console.log(`   DEBUG: Model object:`, exhibit.model);
      
      // Try using direct URL instead of asset reference
      let modelSrc = exhibit.model.src;
      if (modelSrc.startsWith('#')) {
        // Convert asset reference to direct URL
        const assetId = modelSrc.substring(1);
        const assetElement = document.querySelector(`#${assetId}`);
        if (assetElement && assetElement.src) {
          modelSrc = assetElement.src;
          console.log(`   DEBUG: Converted asset reference to direct URL: ${modelSrc}`);
        } else {
          console.warn(`   DEBUG: Asset element not found for ${assetId}`);
        }
      }
      
      // Add cache-busting parameter to force reload
      if (modelSrc.startsWith('http')) {
        const separator = modelSrc.includes('?') ? '&' : '?';
        modelSrc = `${modelSrc}${separator}t=${Date.now()}`;
        console.log(`   DEBUG: Added cache-busting parameter: ${modelSrc}`);
      }
      
      model.setAttribute('gltf-model', modelSrc);
      model.setAttribute('position', exhibit.model.position);
      model.setAttribute('scale', exhibit.model.scale);
      model.setAttribute('rotation', exhibit.model.rotation);
      model.setAttribute('shadow', `cast: ${exhibit.model.castShadow}; receive: true`);
      
      console.log(`   DEBUG: Set gltf-model to: ${modelSrc}`);
      console.log(`   DEBUG: Model entity ID: ${model.id}`);
      console.log(`   DEBUG: Model entity attributes:`, {
        'gltf-model': model.getAttribute('gltf-model'),
        'position': model.getAttribute('position'),
        'scale': model.getAttribute('scale'),
        'rotation': model.getAttribute('rotation')
      });
      model.setAttribute('data-model-type', exhibit.id.includes('wheelbarrow') ? 'garden-tool-model' : 'vegetable-model');
      model.setAttribute('data-model-name', exhibit.name);
      console.log(`Created 3D model: ${exhibit.model.id} (${exhibit.name})`);
      
      // Add a visible label above the model for easy identification (if labels are enabled)
      if (this.labelsVisible === true) {
        this.addModelLabel(model, exhibit.name || exhibit.id);
      }
      
      // === MODEL LOADING EVENT HANDLERS ===
      // Handle successful model loading
      model.addEventListener('model-loaded', () => {
        console.log(`✅ Model loaded successfully: ${exhibit.model.id} (${exhibit.name})`);
        console.log(`   Position: ${model.getAttribute('position')}`);
        console.log(`   Scale: ${model.getAttribute('scale')}`);
        console.log(`   Rotation: ${model.getAttribute('rotation')}`);
        
        // Fix transparency issues that sometimes occur with GLTF models
        const mesh = model.getObject3D('mesh');
        if (mesh) {
          mesh.traverse((node) => {
            if (node.isMesh) {
              // Ensure materials are properly configured
              if (node.material) {
                node.material.transparent = false;
                node.material.opacity = 1.0;
                node.material.needsUpdate = true;
              }
            }
          });
        }
        
        // Add a temporary position marker for debugging (red sphere)
        const positionMarker = document.createElement('a-sphere');
        positionMarker.id = `${exhibit.model.id}-position-marker`;
        positionMarker.setAttribute('position', exhibit.model.position);
        positionMarker.setAttribute('radius', '0.3');
        positionMarker.setAttribute('color', '#ff0000');
        positionMarker.setAttribute('opacity', '0.6');
        positionMarker.setAttribute('data-marker-type', 'position-debug');
        exhibitEntity.appendChild(positionMarker);
        console.log(`   Added position marker for debugging`);
      });
      
      // Handle model loading errors
      model.addEventListener('model-error', (e) => {
        console.error(`❌ Model failed to load: ${exhibit.model.id} (${exhibit.name})`);
        console.error(`   Error details:`, e.detail);
        console.error(`   Model source: ${exhibit.model.src}`);
      });
      
      // Timeout check for model loading
      setTimeout(() => {
        const modelElement = document.querySelector(`#${exhibit.model.id}`);
        if (modelElement && !modelElement.getObject3D('mesh')) {
          console.warn(`⚠️ Model loading timeout: ${exhibit.model.id} (${exhibit.name})`);
          console.warn(`   Source: ${exhibit.model.src}`);
        }
      }, 10000);
      
      // Add model to exhibit container
      exhibitEntity.appendChild(model);
      console.log(`   Model added to exhibit container`);
      
      // Debug: Check if model was actually added
      const addedModel = exhibitEntity.querySelector(`#${exhibit.model.id}`);
      console.log(`   DEBUG: Model in DOM:`, !!addedModel);
      if (addedModel) {
        console.log(`   DEBUG: Model attributes:`, {
          id: addedModel.id,
          gltfModel: addedModel.getAttribute('gltf-model'),
          position: addedModel.getAttribute('position'),
          scale: addedModel.getAttribute('scale')
        });
      }
      
      // === EXHIBIT ENVIRONMENT ===
      // Base platform/stand for the exhibit
      const environment = document.createElement('a-entity');
      environment.id = `${exhibit.id}-environment`;
      environment.setAttribute('geometry', exhibit.environment.geometry);
      environment.setAttribute('position', exhibit.environment.position);
      environment.setAttribute('material', exhibit.environment.material);
      environment.setAttribute('data-environment-type', 'exhibit-base');
      exhibitEntity.appendChild(environment);
      console.log(`Created environment base for ${exhibit.name}`);
      
      // === INTERACTION HOTSPOT ===
      // Clickable area for user interaction and information display
      const hotspot = document.createElement('a-entity');
      hotspot.id = exhibit.hotspot.id; // e.g., "vegetablesalad-hotspot"
      hotspot.setAttribute('face-camera', 'preserveY: true');
      hotspot.classList.add('clickable');
      hotspot.setAttribute('spot', {
        label: exhibit.hotspot.label,
        audio: exhibit.hotspot.audio,
        labelBackground: '#333333',
        info: exhibit.hotspot.info,
        vegetableModel: exhibit.hotspot.vegetableModel,
        revealAnimation: exhibit.hotspot.revealAnimation
      });
      hotspot.setAttribute('position', exhibit.hotspot.position);
      hotspot.setAttribute('data-hotspot-type', 'information-hotspot');
      hotspot.setAttribute('data-hotspot-label', exhibit.hotspot.label);
      exhibitEntity.appendChild(hotspot);
      console.log(`Created interaction hotspot: ${exhibit.hotspot.label}`);
      
      // Add complete exhibit to scene
      scene.appendChild(exhibitEntity);
      console.log(`✅ Complete exhibit added to scene: ${exhibit.name}`);
      console.log(`   Exhibit ID: ${exhibit.id}`);
      console.log(`   Model ID: ${exhibit.model.id}`);
      console.log(`   Hotspot ID: ${exhibit.hotspot.id}`);
      
      // Debug: Verify exhibit was added to scene
      const sceneExhibit = scene.querySelector(`#${exhibit.id}`);
      console.log(`   DEBUG: Exhibit in scene:`, !!sceneExhibit);
      if (sceneExhibit) {
        const modelInScene = sceneExhibit.querySelector(`#${exhibit.model.id}`);
        console.log(`   DEBUG: Model in scene:`, !!modelInScene);
        console.log(`   DEBUG: All children in exhibit:`, sceneExhibit.children.length);
      }
      
      console.log(`=== End Exhibit ${index + 1} ===\n`);
    });
  }

  setupEventListeners() {
    // Image slideshow functionality
    const images = this.config.infoDisplay.panel.images;
    const imagePanel = document.querySelector("#image-panel");
    
    const updatePanelImage = () => {
      // Set material after ensuring asset is loaded
      this.setMaterialWhenAssetReady(imagePanel, images[this.currentImageIndex], 'side: double; shader: flat');
      
      const infoText = document.querySelector("#info-text");
      const content = this.config.infoDisplay.text.content;
      let textContent = content.default;
      
      switch(this.currentImageIndex) {
        case 0:
          textContent = content.slide1 || "Slide 1";
          break;
        case 1:
          textContent = content.slide2 || "Slide 2";
          break;
        case 2:
          textContent = content.slide3 || "Slide 3";
          break;
      }
      
      infoText.setAttribute("text", "value", textContent);
    };
    
    document.querySelector("#nav-left").addEventListener("click", () => {
      this.currentImageIndex = (this.currentImageIndex - 1 + images.length) % images.length;
      updatePanelImage();
      this.playClickSound();
    });
    
    document.querySelector("#nav-right").addEventListener("click", () => {
      this.currentImageIndex = (this.currentImageIndex + 1) % images.length;
      updatePanelImage();
      this.playClickSound();
    });
    
    // Update hotspots to use preserveY option
    document.querySelectorAll('[face-camera]').forEach(el => {
      if (el.hasAttribute('spot')) {
        el.setAttribute('face-camera', 'preserveY', true);
      }
    });
    
    // Device-specific controls
    setTimeout(() => {
      const controlsGuide = document.querySelector('.controls-guide');
      if (AFRAME.utils.device.isMobile()) {
        controlsGuide.innerHTML = 'Touch screen to move:<br>• One finger - Move forward<br>• Two fingers - Move backward<br>• Look around to change direction';
      } else {
        controlsGuide.innerHTML = 'Desktop Controls:<br>• WASD/Arrow Keys - Move<br>• Mouse - Look around<br>• Click - Interact with hotspots';
      }
    }, 1000);
  }

  setupVRToggle() {
    const vrToggle = document.createElement('div');
    vrToggle.className = 'vr-toggle';
    vrToggle.textContent = 'Enter VR';
    document.body.appendChild(vrToggle);
    
    vrToggle.addEventListener('click', () => {
      const scene = document.querySelector('a-scene');
      if (scene.is('vr-mode')) {
        scene.exitVR();
        vrToggle.textContent = 'Enter VR';
      } else {
        scene.enterVR();
        vrToggle.textContent = 'Exit VR';
      }
    });
  }

  playClickSound() {
    const soundEffects = document.querySelector('[sound-effects]');
    if (soundEffects && soundEffects.components['sound-effects'].sounds.click) {
      soundEffects.components['sound-effects'].sounds.click.play();
    }
  }

  showErrorMessage(message) {
    const errorBox = document.createElement("div");
    errorBox.className = 'error-message';
    errorBox.innerHTML = `<div style="text-align:center">⚠️ Error</div><div style="margin-top:10px">${message}</div>`;
    
    const closeBtn = document.createElement("button");
    closeBtn.className = 'error-close-btn';
    closeBtn.innerText = "Close";
    closeBtn.onclick = () => {
      if (errorBox.parentNode) {
        errorBox.parentNode.removeChild(errorBox);
      }
    };
    
    errorBox.appendChild(closeBtn);
    document.body.appendChild(errorBox);
  }
}

// Model Editor Class
class ModelEditor {
  constructor(museumProject) {
    this.museumProject = museumProject;
    this.currentModel = null;
    this.originalConfig = null;
    this.isRefreshing = false;
    this.init();
  }

  init() {
    this.labelsVisible = false; // Labels are hidden by default
    this.realtimeUpdatesEnabled = false; // Start with updates disabled
    this.setupEventListeners();
    this.populateModelSelector();
    this.startConfigMonitoring();
    this.lastConfigHash = JSON.stringify(museumConfig);
    
    // Initialize walls and ceilings functionality
    this.initWallsAndCeilings();
    
    // Disable gaze cursor in editor mode for better mouse interaction
    this.disableGazeCursorInEditor();
    
    // Load environment config after museum project is fully initialized
    setTimeout(() => {
      this.loadEnvironmentFromConfig();
    }, 1000);
    
    // Ensure template display initializes promptly even if config loads later
    setTimeout(() => {
      if (typeof this.updateCurrentTemplateDisplay === 'function') {
        this.updateCurrentTemplateDisplay();
      }
    }, 500);
    setTimeout(() => {
      if (typeof this.updateCurrentTemplateDisplay === 'function') {
        this.updateCurrentTemplateDisplay();
      }
    }, 2000);

    // Enable real-time updates after a delay to allow initial setup to complete
    setTimeout(() => {
      this.realtimeUpdatesEnabled = true;
      console.log('Real-time updates enabled after initial setup');
    }, 3000);
  }

  setupEventListeners() {
    // Toggle editor panel
    document.getElementById('toggle-editor').addEventListener('click', () => {
      this.togglePanel();
    });

    // Floating toggle to reopen editor when hidden
    const floatingToggle = document.getElementById('editor-toggle-floating');
    if (floatingToggle) {
      floatingToggle.addEventListener('click', () => {
        const panel = document.getElementById('editor-panel');
        panel.classList.remove('hidden');
        document.getElementById('toggle-editor').textContent = 'Hide';
        floatingToggle.style.display = 'none';
      });
    }

    // Model selection
    document.getElementById('model-selector').addEventListener('change', (e) => {
      this.selectModel(e.target.value);
    });

    // Update model button
    document.getElementById('update-model').addEventListener('click', () => {
      this.updateModel();
    });

    // Reset model button
    document.getElementById('reset-model').addEventListener('click', () => {
      this.resetModel();
    });

    // Delete model button
    document.getElementById('delete-model').addEventListener('click', () => {
      this.deleteModel();
    });

    // Load model button
    document.getElementById('load-model').addEventListener('click', () => {
      this.loadNewModel();
    });

    document.getElementById('preview-url').addEventListener('click', () => {
      this.previewModelUrl();
    });

    // Configuration management
    document.getElementById('save-config').addEventListener('click', () => {
      this.saveConfiguration();
    });

    document.getElementById('load-config').addEventListener('click', () => {
      this.loadConfiguration();
    });

    document.getElementById('reload-config').addEventListener('click', () => {
      this.reloadConfigurationFromServer();
    });

    document.getElementById('refresh-interface').addEventListener('click', () => {
      this.manualRefresh();
    });

    document.getElementById('export-config').addEventListener('click', () => {
      this.exportConfiguration();
    });

    // Compile Scene button
    document.getElementById('compile-scene').addEventListener('click', () => {
      this.compileNewScene();
    });

    // Save Public Scene button
    document.getElementById('save-public-scene').addEventListener('click', () => {
      this.savePublicScene();
    });

    // Load Compiled Scene button - load from extracted directory
    document.getElementById('load-compiled-scene').addEventListener('click', () => {
      document.getElementById('compiled-scene-dir-input').click();
    });

    document.getElementById('import-config').addEventListener('click', () => {
      document.getElementById('config-file-input').click();
    });

    document.getElementById('config-file-input').addEventListener('change', (e) => {
      this.importConfiguration(e.target.files[0]);
    });

    // Load compiled scene from directory
    document.getElementById('compiled-scene-dir-input').addEventListener('change', (e) => {
      const files = e.target.files;
      if (files.length > 0) {
        this.loadCompiledSceneFromDirectory(files);
      }
    });

    // Quick actions
    document.getElementById('center-model').addEventListener('click', () => {
      this.centerModel();
    });

    document.getElementById('fit-to-ground').addEventListener('click', () => {
      this.fitToGround();
    });

    document.getElementById('duplicate-model').addEventListener('click', () => {
      this.duplicateModel();
    });

    document.getElementById('force-refresh').addEventListener('click', () => {
      this.forceSceneRefresh();
    });

    document.getElementById('toggle-labels').addEventListener('click', () => {
      this.toggleModelLabels();
    });

    document.getElementById('refresh-debug').addEventListener('click', () => {
      this.updateDebugInfo();
    });

    // Debug label update button
    document.getElementById('debug-label-update').addEventListener('click', () => {
      if (this.currentModel) {
        console.log('=== DEBUG LABEL UPDATE ===');
        console.log('Current model:', this.currentModel);
        console.log('Exhibit:', this.currentModel.exhibit);
        this.updateModelLabelInScene(this.currentModel.exhibit);
        this.showNotification('Debug label update triggered - check console', 'info');
      } else {
        this.showNotification('Please select a model first', 'error');
      }
    });

    // Real-time updates for position, scale, rotation
    const vectorInputs = ['pos', 'scale', 'rot', 'exhibit-pos', 'hotspot-pos'];
    vectorInputs.forEach(prefix => {
      ['x', 'y', 'z'].forEach(axis => {
        const input = document.getElementById(`${prefix}-${axis}`);
        if (input) {
          input.addEventListener('input', () => {
            // Handle scale locking
            if (prefix === 'scale' && document.getElementById('scale-lock').checked) {
              this.syncScaleValues(axis);
            }
            this.updateModelPreview();
          });
        }
      });
    });

    // Scale lock checkbox
    document.getElementById('scale-lock').addEventListener('change', (e) => {
      if (e.target.checked) {
        // When locking, sync all values to the first non-empty value
        this.syncScaleValues('x');
      }
    });

    // Slideshow controls
    document.getElementById('update-slideshow').addEventListener('click', () => {
      this.updateSlideshow();
    });

    document.getElementById('reset-slideshow').addEventListener('click', () => {
      this.resetSlideshow();
    });

    // Image preview buttons
    document.getElementById('preview-image1').addEventListener('click', () => {
      this.previewImage(1);
    });

    document.getElementById('preview-image2').addEventListener('click', () => {
      this.previewImage(2);
    });

    document.getElementById('preview-image3').addEventListener('click', () => {
      this.previewImage(3);
    });

    // Text inputs
    document.getElementById('model-name').addEventListener('input', () => {
      this.updateModelPreview();
    });

    // Model URL changes
    document.getElementById('model-url').addEventListener('input', () => {
      this.updateModelPreview();
    });

    // Model Asset ID changes
    document.getElementById('model-asset-id').addEventListener('input', () => {
      this.updateModelPreview();
    });

    // Slideshow text inputs - prevent real-time updates from interfering
    const slideshowInputs = [
      'slideshow-image1', 'slideshow-image2', 'slideshow-image3',
      'slideshow-slide1-text', 'slideshow-slide2-text', 'slideshow-slide3-text'
    ];
    
    slideshowInputs.forEach(inputId => {
      const input = document.getElementById(inputId);
      if (input) {
        input.addEventListener('input', () => {
          // Mark this input as manually edited to prevent auto-reset
          input.setAttribute('data-manually-edited', 'true');
        });
      }
    });

    document.getElementById('hotspot-label').addEventListener('input', () => {
      this.updateModelPreview();
    });

    document.getElementById('hotspot-info').addEventListener('input', () => {
      this.updateModelPreview();
    });

    // Environment controls
    document.getElementById('upload-panorama').addEventListener('click', () => {
      this.uploadPanoramaImage();
    });

    document.getElementById('preview-panorama').addEventListener('click', () => {
      this.previewPanoramaImage();
    });

    document.getElementById('preview-ground').addEventListener('click', () => {
      this.previewGroundTexture();
    });

    document.getElementById('preview-ambient-audio').addEventListener('click', () => {
      this.previewAmbientAudio();
    });

    document.getElementById('preview-click-sound').addEventListener('click', () => {
      this.previewClickSound();
    });

    // Add event listeners for base audio previews
    document.getElementById('preview-audio1').addEventListener('click', () => {
      this.previewBaseAudio('audio1-url', 'Audio1 (Tomato Exhibit)');
    });

    document.getElementById('preview-audiocarrots').addEventListener('click', () => {
      this.previewBaseAudio('audiocarrots-url', 'AudioCarrots (Eggplant Exhibit)');
    });

    document.getElementById('preview-audioonion').addEventListener('click', () => {
      this.previewBaseAudio('audioonion-url', 'AudioOnion (Onion Exhibit)');
    });

    // Add event listeners for audio URL changes
    document.getElementById('audio1-url').addEventListener('input', () => {
      this.forceUpdateEnvironmentFromForm();
    });

    document.getElementById('audiocarrots-url').addEventListener('input', () => {
      this.forceUpdateEnvironmentFromForm();
    });

    document.getElementById('audioonion-url').addEventListener('input', () => {
      this.forceUpdateEnvironmentFromForm();
    });

    // Audio testing buttons
    document.getElementById('test-ambient-audio').addEventListener('click', () => {
      this.testAmbientAudio();
    });

    document.getElementById('test-click-sound').addEventListener('click', () => {
      this.testClickSound();
    });

    document.getElementById('test-teleport-sound').addEventListener('click', () => {
      this.testTeleportSound();
    });

    document.getElementById('update-environment').addEventListener('click', () => {
      this.updateEnvironment();
    });

    document.getElementById('reset-environment').addEventListener('click', () => {
      this.resetEnvironment();
    });

    // Ambient audio control
    document.getElementById('ambient-audio-enabled').addEventListener('change', (e) => {
      this.updateAmbientAudioSetting(e.target.checked);
    });

    // File input for panorama upload
    document.getElementById('panorama-file-input').addEventListener('change', (e) => {
      this.handlePanoramaFileUpload(e);
    });

    // Add real-time event listeners for environment settings
    this.setupEnvironmentEventListeners();
    
    // Add real-time event listeners for slideshow settings
    this.setupSlideshowEventListeners();

    // Load environment settings from config
    this.loadEnvironmentFromConfig();
    
    // Load slideshow settings from config
    this.loadSlideshowFromConfig();
    
    // Update template display on initialization
    this.updateCurrentTemplateDisplay();
  }

  setupEnvironmentEventListeners() {
    // Real-time updates for environment settings
    document.getElementById('panorama-image-url').addEventListener('input', () => {
      this.forceUpdateEnvironmentFromForm();
    });

    document.getElementById('ground-texture-url').addEventListener('input', () => {
      this.forceUpdateEnvironmentFromForm();
    });

    document.getElementById('ambient-audio-url').addEventListener('input', () => {
      this.forceUpdateEnvironmentFromForm();
    });

    document.getElementById('click-sound-url').addEventListener('input', () => {
      this.forceUpdateEnvironmentFromForm();
    });

    // Base audio URLs also need real-time updates
    document.getElementById('audio1-url').addEventListener('input', () => {
      this.forceUpdateEnvironmentFromForm();
    });

    document.getElementById('audiocarrots-url').addEventListener('input', () => {
      this.forceUpdateEnvironmentFromForm();
    });

    document.getElementById('audioonion-url').addEventListener('input', () => {
      this.forceUpdateEnvironmentFromForm();
    });

    console.log('Environment real-time event listeners set up');
  }

  setupSlideshowEventListeners() {
    // Real-time updates for slideshow image URLs
    document.getElementById('slideshow-image1').addEventListener('input', () => {
      this.forceUpdateSlideshowFromForm();
    });

    document.getElementById('slideshow-image2').addEventListener('input', () => {
      this.forceUpdateSlideshowFromForm();
    });

    document.getElementById('slideshow-image3').addEventListener('input', () => {
      this.forceUpdateSlideshowFromForm();
    });

    // Real-time updates for slideshow text content
    document.getElementById('slideshow-slide1-text').addEventListener('input', () => {
      this.forceUpdateSlideshowFromForm();
    });

    document.getElementById('slideshow-slide2-text').addEventListener('input', () => {
      this.forceUpdateSlideshowFromForm();
    });

    document.getElementById('slideshow-slide3-text').addEventListener('input', () => {
      this.forceUpdateSlideshowFromForm();
    });

    // Real-time updates for slideshow position
    document.getElementById('slideshow-position-x').addEventListener('input', () => {
      this.forceUpdateSlideshowFromForm();
    });

    document.getElementById('slideshow-position-y').addEventListener('input', () => {
      this.forceUpdateSlideshowFromForm();
    });

    document.getElementById('slideshow-position-z').addEventListener('input', () => {
      this.forceUpdateSlideshowFromForm();
    });

    // Real-time updates for slideshow rotation
    document.getElementById('slideshow-rotation-x').addEventListener('input', () => {
      this.forceUpdateSlideshowFromForm();
    });

    document.getElementById('slideshow-rotation-y').addEventListener('input', () => {
      this.forceUpdateSlideshowFromForm();
    });

    document.getElementById('slideshow-rotation-z').addEventListener('input', () => {
      this.forceUpdateSlideshowFromForm();
    });

    console.log('Slideshow real-time event listeners set up');
  }

  togglePanel() {
    const panel = document.getElementById('editor-panel');
    const toggleBtn = document.getElementById('toggle-editor');
    const floatingToggle = document.getElementById('editor-toggle-floating');
    
    if (panel.classList.contains('hidden')) {
      panel.classList.remove('hidden');
      toggleBtn.textContent = 'Hide';
      if (floatingToggle) floatingToggle.style.display = 'none';
    } else {
      panel.classList.add('hidden');
      toggleBtn.textContent = 'Show';
      if (floatingToggle) floatingToggle.style.display = 'block';
    }
  }

  populateModelSelector() {
    const selector = document.getElementById('model-selector');
    selector.innerHTML = '<option value="">Choose Scene...</option>';
    
    if (museumConfig && museumConfig.exhibits) {
      museumConfig.exhibits.forEach((exhibit, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = exhibit.name || `Exhibit ${index + 1}`;
        selector.appendChild(option);
      });
    }
    
    // Don't reload slideshow settings here - preserve current form values
    // this.loadSlideshowFromConfig();
    
    // Don't reload environment settings here - preserve current form values
    // this.loadEnvironmentFromConfig();
  }

  selectModel(exhibitIndex) {
    if (exhibitIndex === '' || !museumConfig || !museumConfig.exhibits[exhibitIndex]) {
      document.getElementById('model-properties').style.display = 'none';
      document.getElementById('model-audio-section').style.display = 'none';
      this.currentModel = null;
      return;
    }

    const exhibit = museumConfig.exhibits[exhibitIndex];
    this.currentModel = { exhibit, index: parseInt(exhibitIndex) };
    this.originalConfig = JSON.parse(JSON.stringify(exhibit)); // Deep copy
    
    this.populateForm(exhibit);
    this.showAppropriateAudioSection(exhibit);
    document.getElementById('model-properties').style.display = 'block';
    this.updateDebugInfo();
    
    // Don't reload environment settings when switching models - preserve current form values
    
    // Ensure real-time updates are enabled when a model is selected
    setTimeout(() => {
      this.realtimeUpdatesEnabled = true;
      console.log('Real-time updates enabled for selected model');
    }, 500);
  }

  showAppropriateAudioSection(exhibit) {
    // Hide all audio sections first
    document.getElementById('tomato-audio-section').style.display = 'none';
    document.getElementById('eggplant-audio-section').style.display = 'none';
    document.getElementById('onion-audio-section').style.display = 'none';
    
    // Show the main audio section
    document.getElementById('model-audio-section').style.display = 'block';
    
    // Determine which audio section to show based on the exhibit's audio reference
    const hotspotAudio = exhibit.hotspot?.audio;
    
    if (hotspotAudio === '#audio1' || exhibit.id === 'tomato-exhibit') {
      document.getElementById('tomato-audio-section').style.display = 'block';
      console.log('Showing tomato audio section for exhibit:', exhibit.id);
    } else if (hotspotAudio === '#audiocarrots' || exhibit.id === 'eggplant-exhibit') {
      document.getElementById('eggplant-audio-section').style.display = 'block';
      console.log('Showing eggplant audio section for exhibit:', exhibit.id);
    } else if (hotspotAudio === '#audioonion' || exhibit.id === 'onion-exhibit') {
      document.getElementById('onion-audio-section').style.display = 'block';
      console.log('Showing onion audio section for exhibit:', exhibit.id);
    } else {
      // Default fallback - hide the entire audio section if we can't determine which one to show
      document.getElementById('model-audio-section').style.display = 'none';
      console.log('No appropriate audio section found for exhibit:', exhibit.id, 'audio:', hotspotAudio);
    }
  }

  populateForm(exhibit) {
    // Temporarily disable real-time updates to prevent interference
    const wasEnabled = this.realtimeUpdatesEnabled;
    this.realtimeUpdatesEnabled = false;
    
    // Basic info
    document.getElementById('model-name').value = exhibit.name || '';
    
    // Handle model asset ID and URL separately
    const modelSrc = exhibit.model?.src || '';
    if (modelSrc.startsWith('#')) {
      // It's an asset reference - extract the ID
      const assetId = modelSrc.substring(1);
      document.getElementById('model-asset-id').value = assetId;
      // Find the actual URL from the asset
      const assetElement = document.querySelector(`#${assetId}`);
      document.getElementById('model-url').value = assetElement ? assetElement.src : '';
    } else if (modelSrc.startsWith('http')) {
      // It's a direct URL - we need to find the asset ID
      const assetId = exhibit.model?.id || '';
      document.getElementById('model-asset-id').value = assetId;
      document.getElementById('model-url').value = modelSrc;
    } else {
      // Fallback
      document.getElementById('model-asset-id').value = exhibit.model?.id || '';
      document.getElementById('model-url').value = modelSrc;
    }

    // Model position
    const modelPos = exhibit.model?.position?.split(' ') || ['0', '0', '0'];
    document.getElementById('pos-x').value = modelPos[0] || '0';
    document.getElementById('pos-y').value = modelPos[1] || '0';
    document.getElementById('pos-z').value = modelPos[2] || '0';

    // Model scale
    const modelScale = exhibit.model?.scale?.split(' ') || ['1', '1', '1'];
    document.getElementById('scale-x').value = modelScale[0] || '1';
    document.getElementById('scale-y').value = modelScale[1] || '1';
    document.getElementById('scale-z').value = modelScale[2] || '1';

    // Model rotation
    const modelRot = exhibit.model?.rotation?.split(' ') || ['0', '0', '0'];
    document.getElementById('rot-x').value = modelRot[0] || '0';
    document.getElementById('rot-y').value = modelRot[1] || '0';
    document.getElementById('rot-z').value = modelRot[2] || '0';

    // Exhibit position
    const exhibitPos = exhibit.position?.split(' ') || ['0', '0', '0'];
    document.getElementById('exhibit-pos-x').value = exhibitPos[0] || '0';
    document.getElementById('exhibit-pos-y').value = exhibitPos[1] || '0';
    document.getElementById('exhibit-pos-z').value = exhibitPos[2] || '0';

    // Hotspot position
    const hotspotPos = exhibit.hotspot?.position?.split(' ') || ['0', '0', '0'];
    document.getElementById('hotspot-pos-x').value = hotspotPos[0] || '0';
    document.getElementById('hotspot-pos-y').value = hotspotPos[1] || '0';
    document.getElementById('hotspot-pos-z').value = hotspotPos[2] || '0';

    // Hotspot text
    document.getElementById('hotspot-label').value = exhibit.hotspot?.label || '';
    document.getElementById('hotspot-info').value = exhibit.hotspot?.info || '';
    
    // Re-enable real-time updates if they were enabled before
    if (wasEnabled) {
      setTimeout(() => {
        this.realtimeUpdatesEnabled = true;
        console.log('Real-time updates re-enabled after form population');
      }, 100);
    }
  }

  updateModelPreview() {
    if (!this.currentModel || !this.realtimeUpdatesEnabled) {
      console.log('updateModelPreview blocked:', { currentModel: !!this.currentModel, realtimeEnabled: this.realtimeUpdatesEnabled });
      return;
    }

    // Debounce rapid calls to prevent excessive model reloading
    if (this.updateModelPreviewTimeout) {
      clearTimeout(this.updateModelPreviewTimeout);
    }
    
    this.updateModelPreviewTimeout = setTimeout(() => {
      console.log('updateModelPreview called - applying form values to scene');
    const exhibit = this.currentModel.exhibit;

    // Update model properties
    if (exhibit.model) {
      exhibit.model.position = `${document.getElementById('pos-x').value} ${document.getElementById('pos-y').value} ${document.getElementById('pos-z').value}`;
      exhibit.model.scale = `${document.getElementById('scale-x').value} ${document.getElementById('scale-y').value} ${document.getElementById('scale-z').value}`;
      exhibit.model.rotation = `${document.getElementById('rot-x').value} ${document.getElementById('rot-y').value} ${document.getElementById('rot-z').value}`;
      
      // Handle model URL changes
      const newUrl = document.getElementById('model-url').value;
      const newAssetId = document.getElementById('model-asset-id').value;
      
      // Only update if we have valid values
      if (newUrl && newUrl.trim() !== '' && newUrl !== exhibit.model.src) {
        // Update the asset in the DOM
        const assetId = exhibit.model.id;
        const assetElement = document.querySelector(`#${assetId}`);
        if (assetElement) {
          assetElement.src = newUrl;
          console.log(`Updated asset ${assetId} URL to:`, newUrl);
        }
        
        // Update the config
        exhibit.model.src = newUrl;
        console.log(`Updated config model.src to:`, newUrl);
        
        // Force reload the model in the scene
        this.reloadModelInScene(exhibit);
      }
      
      // Handle asset ID changes
      if (newAssetId && newAssetId.trim() !== '' && newAssetId !== exhibit.model.id) {
        // Update the config
        exhibit.model.id = newAssetId;
        console.log(`Updated config model.id to:`, newAssetId);
        
        // Force reload the model in the scene
        this.reloadModelInScene(exhibit);
      }
    }

    // Update exhibit position
    exhibit.position = `${document.getElementById('exhibit-pos-x').value} ${document.getElementById('exhibit-pos-y').value} ${document.getElementById('exhibit-pos-z').value}`;

    // Update hotspot properties
    if (exhibit.hotspot) {
      exhibit.hotspot.position = `${document.getElementById('hotspot-pos-x').value} ${document.getElementById('hotspot-pos-y').value} ${document.getElementById('hotspot-pos-z').value}`;
      exhibit.hotspot.label = document.getElementById('hotspot-label').value;
      exhibit.hotspot.info = document.getElementById('hotspot-info').value;
    }

    // Update exhibit name
    exhibit.name = document.getElementById('model-name').value;

    // Update model label in 3D scene
    this.updateModelLabelInScene(exhibit);

    this.applyChangesToScene();
    this.refreshInterface(); // Refresh the UI after changes
    }, 300); // 300ms debounce delay
  }

  updateModelLabelInScene(exhibit) {
    if (!exhibit || !exhibit.model) {
      console.log('updateModelLabelInScene: Missing exhibit or model');
      return;
    }

    console.log(`updateModelLabelInScene: Looking for exhibit ${exhibit.id}, model ${exhibit.model.id}, name: ${exhibit.name}`);
    
    const exhibitEntity = document.getElementById(exhibit.id);
    if (!exhibitEntity) {
      console.log('updateModelLabelInScene: Exhibit entity not found');
      return;
    }

    // Find any label container in the exhibit (since the model ID might have changed)
    const allLabelContainers = exhibitEntity.querySelectorAll('[id$="-label-container"]');
    console.log('Found label containers:', Array.from(allLabelContainers).map(el => el.id));
    
    if (allLabelContainers.length > 0) {
      // Use the first (and likely only) label container
      const labelContainer = allLabelContainers[0];
      console.log('updateModelLabelInScene: Using label container:', labelContainer.id);
      
      const labelText = labelContainer.querySelector('a-text');
      console.log('updateModelLabelInScene: Label text element found:', !!labelText);
      
      if (labelText) {
        const oldValue = labelText.getAttribute('value');
        labelText.setAttribute('value', exhibit.name);
        console.log(`Updated model label from "${oldValue}" to "${exhibit.name}"`);
      } else {
        console.log('updateModelLabelInScene: No a-text element found in label container');
      }
    } else {
      console.log('updateModelLabelInScene: No label containers found in exhibit');
    }
  }

  reloadModelInScene(exhibit) {
    if (!exhibit || !exhibit.model) return;
    
    console.log('=== RELOADING MODEL IN SCENE ===');
    console.log('Exhibit ID:', exhibit.id);
    console.log('Model ID:', exhibit.model.id);
    console.log('Model src:', exhibit.model.src);
    
    // Find the exhibit entity
    const exhibitEntity = document.getElementById(exhibit.id);
    console.log('Exhibit entity found:', !!exhibitEntity);
    if (!exhibitEntity) {
      console.warn('Exhibit entity not found:', exhibit.id);
      return;
    }
    
    // Remove old position markers to prevent duplication
    const oldMarkers = exhibitEntity.querySelectorAll('[data-marker-type="position-debug"]');
    oldMarkers.forEach(marker => {
      marker.remove();
      console.log('Removed old position marker:', marker.id);
    });
    
    // List all children of the exhibit
    console.log('Exhibit children:', Array.from(exhibitEntity.children).map(child => ({
      tagName: child.tagName,
      id: child.id,
      className: child.className
    })));
    
    // Find the model entity - try both old and new IDs
    let modelEntity = exhibitEntity.querySelector(`#${exhibit.model.id}`);
    console.log('Model entity found by ID:', !!modelEntity);
    
    if (!modelEntity) {
      // Try to find by data attributes as fallback
      modelEntity = exhibitEntity.querySelector('[data-model-name]');
      console.log('Model entity found by data attribute:', !!modelEntity);
    }
    
    if (!modelEntity) {
      console.warn('Model entity not found:', exhibit.model.id);
      console.log('Available model entities:', exhibitEntity.querySelectorAll('[data-model-name]'));
      return;
    }
    
    console.log('Found model entity:', modelEntity);
    console.log('Current gltf-model attribute:', modelEntity.getAttribute('gltf-model'));
    
    // Update the gltf-model attribute to force reload
    let newSrc = exhibit.model.src;
    
    // Ensure the source is properly formatted
    if (newSrc && !newSrc.startsWith('#') && !newSrc.startsWith('http')) {
      newSrc = `#${exhibit.model.id}`;
    } else if (!newSrc || newSrc.trim() === '') {
      console.warn('No valid model source found, skipping reload');
      return;
    }
    
    console.log('New source will be:', newSrc);
    
    // Check if the asset exists
    const assetElement = document.querySelector(`#${exhibit.model.id}`);
    console.log('Asset element found:', !!assetElement);
    if (assetElement) {
      console.log('Asset src:', assetElement.src);
    }
    
    // Only proceed if we have a valid source
    if (newSrc && newSrc.trim() !== '') {
      // Remove the old gltf-model attribute first
      modelEntity.removeAttribute('gltf-model');
      console.log('Removed old gltf-model attribute');
      
      // Force a small delay to ensure the attribute is removed
      setTimeout(() => {
        modelEntity.setAttribute('gltf-model', newSrc);
        console.log('Set new gltf-model attribute:', newSrc);
        
        // Add event listeners for model loading
        modelEntity.addEventListener('model-loaded', () => {
          console.log('✅ Model loaded successfully:', newSrc);
        });
        
        modelEntity.addEventListener('model-error', (e) => {
          console.error('❌ Model failed to load:', newSrc, e.detail);
          console.error('Error details:', e);
        });
        
        // Also listen for the asset loading
        const assetElement = document.querySelector(`#${exhibit.model.id}`);
        if (assetElement) {
          assetElement.addEventListener('loaded', () => {
            console.log('✅ Asset loaded successfully:', exhibit.model.id);
          });
          
          assetElement.addEventListener('error', (e) => {
            console.error('❌ Asset failed to load:', exhibit.model.id, e);
          });
        }
      }, 100);
    }
  }

  applyChangesToScene() {
    if (!this.currentModel) return;

    const exhibitIndex = this.currentModel.index;
    const exhibit = this.currentModel.exhibit;
    const exhibitEntity = document.getElementById(exhibit.id);

    console.log('Applying changes to scene for exhibit:', exhibit.id);
    console.log('Exhibit entity found:', !!exhibitEntity);

    if (exhibitEntity) {
      // Remove old position markers to prevent duplication
      const oldMarkers = exhibitEntity.querySelectorAll('[data-marker-type="position-debug"]');
      oldMarkers.forEach(marker => {
        marker.remove();
        console.log('Removed old position marker:', marker.id);
      });
      // Update exhibit position
      exhibitEntity.setAttribute('position', exhibit.position);
      console.log('Updated exhibit position to:', exhibit.position);

      // Update model - try multiple ways to find the model entity
      let modelEntity = exhibitEntity.querySelector(`#${exhibit.model.id}`);
      
      // If not found, try with the old model ID pattern
      if (!modelEntity) {
        modelEntity = exhibitEntity.querySelector(`#${exhibit.model.id}-model`);
      }
      
      // If not found by ID, try to find by data attribute
      if (!modelEntity) {
        modelEntity = exhibitEntity.querySelector('[data-model-name]');
      }
      
      // If still not found, try to find any entity with gltf-model
      if (!modelEntity) {
        modelEntity = exhibitEntity.querySelector('[gltf-model]');
      }

      console.log('Model entity found:', !!modelEntity);
      if (modelEntity) {
        console.log('Updating model with:', {
          position: exhibit.model.position,
          scale: exhibit.model.scale,
          rotation: exhibit.model.rotation
        });
        
        modelEntity.setAttribute('position', exhibit.model.position);
        modelEntity.setAttribute('scale', exhibit.model.scale);
        modelEntity.setAttribute('rotation', exhibit.model.rotation);
        
        // Force A-Frame to update the model
        modelEntity.emit('componentchanged', { component: 'position' });
        modelEntity.emit('componentchanged', { component: 'scale' });
        modelEntity.emit('componentchanged', { component: 'rotation' });
      } else {
        console.warn('Model entity not found for:', exhibit.model.id);
        // Try to find all entities in the exhibit to debug
        const allEntities = exhibitEntity.querySelectorAll('*');
        console.log('All entities in exhibit:', Array.from(allEntities).map(el => ({ id: el.id, tagName: el.tagName, attributes: Array.from(el.attributes).map(attr => `${attr.name}="${attr.value}"`).join(' ') })));
      }

      // Update hotspot
      let hotspotEntity = exhibitEntity.querySelector(`#${exhibit.hotspot.id}`);
      
      // If not found by ID, try to find by spot component
      if (!hotspotEntity) {
        hotspotEntity = exhibitEntity.querySelector('[spot]');
      }

      console.log('Hotspot entity found:', !!hotspotEntity);
      if (hotspotEntity) {
        hotspotEntity.setAttribute('position', exhibit.hotspot.position);
        console.log('Updated hotspot position to:', exhibit.hotspot.position);
        
        // Update hotspot component data
        const spotComponent = hotspotEntity.components.spot;
        if (spotComponent) {
          spotComponent.data.label = exhibit.hotspot.label;
          spotComponent.data.info = exhibit.hotspot.info;
          
          // Recreate label if it exists
          const existingLabel = hotspotEntity.querySelector('a-text');
          const existingBg = hotspotEntity.querySelector('a-plane');
          if (existingLabel) existingLabel.remove();
          if (existingBg) existingBg.remove();
          
          if (exhibit.hotspot.label) {
            spotComponent.createLabel(spotComponent.data);
          }
        }
      } else {
        console.warn('Hotspot entity not found for:', exhibit.hotspot.id);
      }
    } else {
      console.error('Exhibit entity not found:', exhibit.id);
    }
  }

  updateModel() {
    if (!this.currentModel) return;

    this.updateModelPreview();
    
    // Force update the model label in 3D scene
    this.updateModelLabelInScene(this.currentModel.exhibit);
    
    this.showNotification('Model updated successfully!', 'success');
    this.refreshInterface(); // Use the new refresh method
  }

  resetModel() {
    if (!this.currentModel || !this.originalConfig) return;

    // Restore original configuration
    Object.assign(this.currentModel.exhibit, this.originalConfig);
    this.populateForm(this.currentModel.exhibit);
    this.applyChangesToScene();
    this.refreshInterface(); // Refresh interface after reset
    this.showNotification('Model reset to original state', 'success');
  }

  deleteModel() {
    if (!this.currentModel) return;

    if (confirm('Are you sure you want to delete this model? This action cannot be undone.')) {
      const exhibitIndex = this.currentModel.index;
      
      // Remove from scene
      const exhibitEntity = document.getElementById(this.currentModel.exhibit.id);
      if (exhibitEntity) {
        exhibitEntity.remove();
      }

      // Remove from config
      museumConfig.exhibits.splice(exhibitIndex, 1);
      
      // Reset UI
      document.getElementById('model-properties').style.display = 'none';
      this.currentModel = null;
      this.refreshInterface(); // Use refresh method
      
      this.showNotification('Model deleted successfully', 'success');
    }
  }

  loadNewModel() {
    const url = document.getElementById('model-url').value;
    const newAssetId = document.getElementById('model-asset-id').value;
    const oldAssetId = this.currentModel.exhibit.model.id;
    
    if (!url) {
      this.showNotification('Please enter a model URL', 'error');
      return;
    }

    if (!this.currentModel) {
      this.showNotification('Please select a model first', 'error');
      return;
    }

    if (!newAssetId) {
      this.showNotification('Asset ID is missing', 'error');
      return;
    }

    // Check if we need to create a new asset or update existing one
    let assetElement = document.querySelector(`#${newAssetId}`);
    
    if (!assetElement) {
      // Create new asset if it doesn't exist
      assetElement = document.createElement('a-asset-item');
      assetElement.id = newAssetId;
      assetElement.setAttribute('type', 'gltf');
      assetElement.setAttribute('data-asset-type', '3d-model');
      
      // Add to assets container
      const assets = document.querySelector('a-assets');
      if (assets) {
        assets.appendChild(assetElement);
        console.log(`Created new asset: ${newAssetId}`);
        
        // Add event listeners for the new asset
        assetElement.addEventListener('loaded', () => {
          console.log('✅ New asset loaded successfully:', newAssetId, url);
        });
        
        assetElement.addEventListener('error', (e) => {
          console.error('❌ New asset failed to load:', newAssetId, url, e);
        });
      } else {
        this.showNotification('Assets container not found', 'error');
        return;
      }
    }
    
    // Update the asset URL
    assetElement.src = url;
    console.log(`Updated asset ${newAssetId} URL to:`, url);
    
    // If asset ID changed, we need to update the model entity ID
    if (newAssetId !== oldAssetId) {
      const exhibitEntity = document.getElementById(this.currentModel.exhibit.id);
      
      // Remove old position markers to prevent duplication
      const oldMarkers = exhibitEntity.querySelectorAll('[data-marker-type="position-debug"]');
      oldMarkers.forEach(marker => {
        marker.remove();
        console.log('Removed old position marker:', marker.id);
      });
      
      const modelEntity = exhibitEntity.querySelector(`#${oldAssetId}`);
      if (modelEntity) {
        modelEntity.id = newAssetId;
        console.log(`Updated model entity ID from ${oldAssetId} to ${newAssetId}`);
      } else {
        // Try to find by data attribute as fallback
        const fallbackModel = exhibitEntity.querySelector('[data-model-name]');
        if (fallbackModel) {
          fallbackModel.id = newAssetId;
          console.log(`Updated fallback model entity ID to ${newAssetId}`);
        }
      }
    }

    // Update the config to use the asset reference
    const modelSrc = `#${newAssetId}`;

    // Update the model source
    this.currentModel.exhibit.model.src = modelSrc;
    
    // Force reload the model in the scene
    this.reloadModelInScene(this.currentModel.exhibit);
    
    // Apply all changes to the scene
    this.applyChangesToScene();
    this.refreshInterface();
    
    // Check if model loads within 5 seconds
    setTimeout(() => {
      const modelEntity = document.querySelector(`#${newAssetId}`);
      if (modelEntity && modelEntity.getAttribute('gltf-model')) {
        console.log('Model entity found with gltf-model attribute');
        this.showNotification('Model loaded successfully', 'success');
      } else {
        console.warn('Model may not have loaded properly');
        this.showNotification('Model loading - check console for details', 'warning');
      }
    }, 2000);
  }

  addModelAsset(url) {
    // Generate a unique ID for the new asset
    const assetId = `model_${Date.now()}`;
    
    // Add the asset to the assets section
    const assets = document.querySelector('a-assets');
    if (assets) {
      const newAsset = document.createElement('a-asset-item');
      newAsset.id = assetId;
      newAsset.src = url;
      
      // Add event listeners for asset loading
      newAsset.addEventListener('loaded', () => {
        console.log('New model asset loaded successfully:', assetId, url);
        this.showNotification('New model loaded successfully!', 'success');
      });
      
      newAsset.addEventListener('error', (e) => {
        console.error('New model asset failed to load:', assetId, url, e.detail);
        this.showNotification('Failed to load model: ' + e.detail, 'error');
      });
      
      assets.appendChild(newAsset);
      this.showNotification('Adding new model asset...', 'success');
    }
    
    return `#${assetId}`;
  }

  previewModelUrl() {
    const url = document.getElementById('model-url').value;
    if (!url) {
      this.showNotification('Please enter a model URL first', 'error');
      return;
    }

    // Create a temporary preview model in the center of the scene
    const scene = document.querySelector('a-scene');
    
    // Remove any existing preview model
    const existingPreview = document.getElementById('url-preview-model');
    if (existingPreview) {
      existingPreview.remove();
    }

    // Create new preview model
    const previewModel = document.createElement('a-entity');
    previewModel.id = 'url-preview-model';
    
    // Determine the source
    let modelSrc;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      modelSrc = this.addModelAsset(url);
    } else if (url.startsWith('#')) {
      modelSrc = url;
    } else {
      modelSrc = `#${url}`;
    }
    
    previewModel.setAttribute('gltf-model', modelSrc);
    previewModel.setAttribute('position', '0 2 0');
    previewModel.setAttribute('scale', '2 2 2');
    previewModel.setAttribute('rotation', '0 0 0');
    
    // Add a preview label
    // Add label to preview model (always show for previews)
    this.addModelLabel(previewModel, 'PREVIEW: ' + url.split('/').pop());
    
    // Add event listeners
    previewModel.addEventListener('model-loaded', () => {
      this.showNotification('Model preview loaded successfully!', 'success');
    });
    
    previewModel.addEventListener('model-error', (e) => {
      this.showNotification('Model preview failed to load: ' + e.detail, 'error');
    });
    
    scene.appendChild(previewModel);
    this.showNotification('Loading model preview...', 'success');
    
    // Auto-remove preview after 10 seconds
    setTimeout(() => {
      if (previewModel.parentNode) {
        previewModel.remove();
        this.showNotification('Preview model removed', 'success');
      }
    }, 10000);
  }

  centerModel() {
    if (!this.currentModel) return;

    document.getElementById('pos-x').value = '0';
    document.getElementById('pos-y').value = '0';
    document.getElementById('pos-z').value = '0';
    this.updateModelPreview();
    this.showNotification('Model centered', 'success');
  }

  fitToGround() {
    if (!this.currentModel) return;

    document.getElementById('pos-y').value = '0';
    this.updateModelPreview();
    this.showNotification('Model positioned on ground', 'success');
  }

  syncScaleValues(changedAxis) {
    if (!this.currentModel) return;

    const scaleX = document.getElementById('scale-x');
    const scaleY = document.getElementById('scale-y');
    const scaleZ = document.getElementById('scale-z');
    
    // Get the value from the changed axis
    const changedValue = document.getElementById(`scale-${changedAxis}`).value;
    
    // If the changed value is empty or invalid, don't sync
    if (!changedValue || isNaN(parseFloat(changedValue))) return;
    
    // Sync all other axes to the changed value
    if (changedAxis !== 'x') scaleX.value = changedValue;
    if (changedAxis !== 'y') scaleY.value = changedValue;
    if (changedAxis !== 'z') scaleZ.value = changedValue;
  }

  duplicateModel() {
    if (!this.currentModel) return;

    const originalExhibit = this.currentModel.exhibit;
    const newExhibit = JSON.parse(JSON.stringify(originalExhibit));
    
    // Generate new IDs
    const timestamp = Date.now();
    newExhibit.id = `${originalExhibit.id}-copy-${timestamp}`;
    newExhibit.model.id = `${originalExhibit.model.id}-copy-${timestamp}`;
    newExhibit.hotspot.id = `${originalExhibit.hotspot.id}-copy-${timestamp}`;
    
    // Offset position
    const offsetX = parseFloat(newExhibit.position.split(' ')[0]) + 5;
    const pos = newExhibit.position.split(' ');
    newExhibit.position = `${offsetX} ${pos[1]} ${pos[2]}`;
    
    // Add to config
    museumConfig.exhibits.push(newExhibit);
    
    // Recreate exhibits in scene
    this.museumProject.createExhibits();
    
    this.refreshInterface(); // Use refresh method
    this.showNotification('Model duplicated successfully', 'success');
  }

  forceUpdateAllModelsFromScene() {
    // Update ALL models from their current state in the 3D scene
    console.log('Force updating ALL models from scene state...');
    
    const scene = document.querySelector('a-scene');
    if (!scene || !museumConfig || !museumConfig.exhibits) return;
    
    museumConfig.exhibits.forEach(exhibit => {
      const exhibitEntity = document.getElementById(exhibit.id);
      if (!exhibitEntity) return;
      
      // Find the model entity within this exhibit
      const modelEntity = exhibitEntity.querySelector('[gltf-model]');
      if (!modelEntity) return;
      
      // Update model properties from the scene
      const position = modelEntity.getAttribute('position');
      const scale = modelEntity.getAttribute('scale');
      const rotation = modelEntity.getAttribute('rotation');
      const gltfModel = modelEntity.getAttribute('gltf-model');
      
      // Convert A-Frame vector objects to strings
      if (position) {
        if (typeof position === 'object' && position.x !== undefined) {
          exhibit.model.position = `${position.x} ${position.y} ${position.z}`;
        } else {
          exhibit.model.position = position;
        }
      }
      if (scale) {
        if (typeof scale === 'object' && scale.x !== undefined) {
          exhibit.model.scale = `${scale.x} ${scale.y} ${scale.z}`;
        } else {
          exhibit.model.scale = scale;
        }
      }
      if (rotation) {
        if (typeof rotation === 'object' && rotation.x !== undefined) {
          exhibit.model.rotation = `${rotation.x} ${rotation.y} ${rotation.z}`;
        } else {
          exhibit.model.rotation = rotation;
        }
      }
      if (gltfModel) exhibit.model.src = gltfModel;
      
      // Also update the assets.models section if this is a direct URL
      if (gltfModel && !gltfModel.startsWith('#')) {
        const modelId = exhibit.model.id || exhibit.id.replace('-exhibit', '');
        if (!museumConfig.assets.models) {
          museumConfig.assets.models = {};
        }
        museumConfig.assets.models[modelId] = gltfModel;
        console.log(`Added model to assets: ${modelId} -> ${gltfModel}`);
      }
      
      console.log(`Updated exhibit ${exhibit.id} from scene:`, {
        position, scale, rotation, src: gltfModel
      });
    });
    
    console.log('All models updated from scene state');
  }

  forceUpdateConfigFromForm() {
    if (!this.currentModel) return;
    
    const exhibit = this.currentModel.exhibit;
    console.log('Force updating config from form values...');
    
    // Update model properties
    if (exhibit.model) {
      exhibit.model.position = `${document.getElementById('pos-x').value} ${document.getElementById('pos-y').value} ${document.getElementById('pos-z').value}`;
      exhibit.model.scale = `${document.getElementById('scale-x').value} ${document.getElementById('scale-y').value} ${document.getElementById('scale-z').value}`;
      exhibit.model.rotation = `${document.getElementById('rot-x').value} ${document.getElementById('rot-y').value} ${document.getElementById('rot-z').value}`;
      
      // Handle model URL and asset ID changes
      const newUrl = document.getElementById('model-url').value;
      const newAssetId = document.getElementById('model-asset-id').value;
      
      // Determine if this should be an asset reference or direct URL
      if (newAssetId && newAssetId.trim() !== '') {
        // Check if this asset ID exists in the config's assets.models
        const assetExists = museumConfig?.assets?.models?.[newAssetId];
        
        if (assetExists) {
          // Use asset reference since the asset exists in config
          exhibit.model.src = `#${newAssetId}`;
          exhibit.model.id = `${newAssetId}-model`;
          console.log(`Updated config to use asset reference: #${newAssetId}`);
        } else {
          // Use direct URL since asset doesn't exist in config
          exhibit.model.src = newUrl || '';
          exhibit.model.id = `${newAssetId}-model`;
          console.log(`Updated config to use direct URL: ${newUrl}`);
        }
        
        // Update exhibit ID and hotspot ID to match the new model ID
        const newExhibitId = `${newAssetId}-exhibit`;
        const newHotspotId = `${newAssetId}-hotspot`;
        
        // Update exhibit ID
        exhibit.id = newExhibitId;
        console.log(`Updated config exhibit.id to:`, newExhibitId);
        
        // Update hotspot ID and related fields
        if (exhibit.hotspot) {
          exhibit.hotspot.id = newHotspotId;
          exhibit.hotspot.vegetableModel = `${newAssetId}-model`; // Update vegetableModel reference
          console.log(`Updated config hotspot.id to:`, newHotspotId);
          console.log(`Updated config hotspot.vegetableModel to:`, `${newAssetId}-model`);
        }
      } else if (newUrl && newUrl.trim() !== '') {
        // Fallback to direct URL if no asset ID provided
        exhibit.model.src = newUrl;
        console.log(`Updated config model.src to direct URL:`, newUrl);
      }
    }
    
    // Update exhibit position
    exhibit.position = `${document.getElementById('exhibit-pos-x').value} ${document.getElementById('exhibit-pos-y').value} ${document.getElementById('exhibit-pos-z').value}`;
    
    // Update hotspot properties
    if (exhibit.hotspot) {
      exhibit.hotspot.position = `${document.getElementById('hotspot-pos-x').value} ${document.getElementById('hotspot-pos-y').value} ${document.getElementById('hotspot-pos-z').value}`;
      exhibit.hotspot.label = document.getElementById('hotspot-label').value;
      exhibit.hotspot.info = document.getElementById('hotspot-info').value;
    }
    
    // Update exhibit name
    exhibit.name = document.getElementById('model-name').value;
    
    // Update hotspot label to match the new exhibit name
    if (exhibit.hotspot) {
      exhibit.hotspot.label = exhibit.name;
      console.log(`Updated hotspot label to match exhibit name:`, exhibit.name);
    }
    
    console.log('Config updated from form values:', exhibit);
  }

  forceUpdateEnvironmentFromForm() {
    if (!museumConfig) return;
    
    const panoramaUrl = document.getElementById('panorama-image-url').value;
    const groundUrl = document.getElementById('ground-texture-url').value;
    const ambientAudioUrl = document.getElementById('ambient-audio-url').value;
    
    console.log('🔧 forceUpdateEnvironmentFromForm - Form values:');
    console.log('  Panorama URL:', panoramaUrl);
    console.log('  Ground URL:', groundUrl);
    console.log('  Ambient Audio URL:', ambientAudioUrl);
    
    // Update panorama image in config
    if (panoramaUrl) {
      if (!museumConfig.environment) museumConfig.environment = {};
      if (!museumConfig.environment.sky) museumConfig.environment.sky = {};
      
      // Update both day and night sky to the same image
      museumConfig.environment.sky.day = panoramaUrl;
      museumConfig.environment.sky.night = panoramaUrl;
      
      // Also update in assets for backward compatibility
      if (!museumConfig.assets) museumConfig.assets = {};
      if (!museumConfig.assets.images) museumConfig.assets.images = {};
      museumConfig.assets.images.sky = panoramaUrl;
    }
    
    // Update ground texture in config
    if (groundUrl) {
      if (!museumConfig.environment) museumConfig.environment = {};
      if (!museumConfig.environment.ground) museumConfig.environment.ground = {};
      
      museumConfig.environment.ground.texture = groundUrl;
      
      // Also update in assets for backward compatibility
      if (!museumConfig.assets) museumConfig.assets = {};
      if (!museumConfig.assets.images) museumConfig.assets.images = {};
      museumConfig.assets.images.ground = groundUrl;
    }
    
    // Update ambient audio URL in config
    console.log('🔍 Form ambient-audio-url value:', ambientAudioUrl);
    if (ambientAudioUrl) {
      if (!museumConfig.assets) museumConfig.assets = {};
      if (!museumConfig.assets.audio) museumConfig.assets.audio = {};
      
      museumConfig.assets.audio.ambient = ambientAudioUrl;
      console.log('✅ Ambient audio URL saved:', ambientAudioUrl);
    } else {
      console.log('⚠️ Ambient audio URL is empty, keeping original:', museumConfig.assets?.audio?.ambient);
    }
    
    // Update click sound URL in config
    const clickSoundUrl = document.getElementById('click-sound-url').value;
    console.log('🔍 Form click-sound-url value:', clickSoundUrl);
    
    if (clickSoundUrl) {
      if (!museumConfig.assets) museumConfig.assets = {};
      if (!museumConfig.assets.audio) museumConfig.assets.audio = {};
      
      museumConfig.assets.audio.click = clickSoundUrl;
      console.log('✅ Click sound URL saved to config:', clickSoundUrl);
    } else {
      console.log('⚠️ Click sound URL is empty, keeping original:', museumConfig.assets?.audio?.click);
    }
    
    // Update ambient audio setting
    const ambientEnabled = document.getElementById('ambient-audio-enabled').checked;
    if (!museumConfig.soundEffects) museumConfig.soundEffects = {};
    museumConfig.soundEffects.ambientAudioEnabled = ambientEnabled;
    
    // Update base audio URLs
    if (!museumConfig.assets) museumConfig.assets = {};
    if (!museumConfig.assets.audio) museumConfig.assets.audio = {};
    
    // Update audio1 URL
    const audio1Url = document.getElementById('audio1-url').value;
    console.log('🔍 Form audio1-url value:', audio1Url);
    if (audio1Url) {
      museumConfig.assets.audio.audio1 = audio1Url;
      console.log('✅ Audio1 URL saved:', audio1Url);
    } else {
      console.log('⚠️ Audio1 URL is empty, keeping original:', museumConfig.assets.audio.audio1);
    }
    
    // Update audiocarrots URL
    const audiocarrotsUrl = document.getElementById('audiocarrots-url').value;
    console.log('🔍 Form audiocarrots-url value:', audiocarrotsUrl);
    if (audiocarrotsUrl) {
      museumConfig.assets.audio.audiocarrots = audiocarrotsUrl;
      console.log('✅ AudioCarrots URL saved:', audiocarrotsUrl);
    } else {
      console.log('⚠️ AudioCarrots URL is empty, keeping original:', museumConfig.assets.audio.audiocarrots);
    }
    
    // Update audioonion URL
    const audioonionUrl = document.getElementById('audioonion-url').value;
    console.log('🔍 Form audioonion-url value:', audioonionUrl);
    if (audioonionUrl) {
      museumConfig.assets.audio.audioonion = audioonionUrl;
      console.log('✅ AudioOnion URL saved:', audioonionUrl);
    } else {
      console.log('⚠️ AudioOnion URL is empty, keeping original:', museumConfig.assets.audio.audioonion);
    }
    
    // Update existing audio elements in DOM with new URLs
    this.updateAudioElementsInDOM();
    
    // Apply visual changes to the scene immediately
    this.applyEnvironmentChangesToScene();
    
    console.log('Environment settings updated from form values');
    console.log('🔧 Final config.assets.audio:', museumConfig.assets?.audio);
    console.log('🔧 Final config.assets.audio.audio1:', museumConfig.assets?.audio?.audio1);
    console.log('🔧 Final config.assets.audio.audiocarrots:', museumConfig.assets?.audio?.audiocarrots);
    console.log('🔧 Final config.assets.audio.audioonion:', museumConfig.assets?.audio?.audioonion);
  }

  updateAudioElementsInDOM() {
    if (!museumConfig?.assets?.audio) return;
    
    console.log('🔄 Updating audio elements in DOM with new URLs...');
    
    // Update each audio element in the DOM
    Object.entries(museumConfig.assets.audio).forEach(([id, newUrl]) => {
      if (newUrl) {
        const audioElement = document.getElementById(id);
        if (audioElement) {
          console.log(`  Updating audio element ${id}: ${audioElement.src} -> ${newUrl}`);
          audioElement.src = newUrl;
          // Reload the audio element to pick up the new source
          audioElement.load();
        } else {
          console.log(`  Audio element ${id} not found in DOM`);
        }
      }
    });
    
    console.log('✅ Audio elements updated in DOM');
  }

  applyEnvironmentChangesToScene() {
    if (!museumConfig) return;
    
    console.log('🎨 Applying environment changes to scene...');
    
    // Update skybox
    const skyImage = museumConfig.environment?.sky?.day || museumConfig.assets?.images?.sky || '';
    const sky = document.querySelector('a-sky');
    if (sky && skyImage) {
      sky.setAttribute('material', 'src', skyImage);
      console.log('✅ Skybox updated:', skyImage);
    }
    
    // Update ground texture
    const groundImage = museumConfig.environment?.ground?.texture || museumConfig.assets?.images?.ground || '';
    const ground = document.querySelector('a-plane.ground');
    if (ground && groundImage) {
      ground.setAttribute('material', 'src', groundImage);
      console.log('✅ Ground texture updated:', groundImage);
    } else if (ground) {
      // Update the material src even if groundImage is empty
      ground.setAttribute('material', 'src', groundImage);
      console.log('✅ Ground texture cleared:', groundImage);
    } else {
      console.log('❌ Ground element not found');
    }
    
    // Update sound effects
    this.refreshSoundEffects();
    
    console.log('🎨 Environment changes applied to scene');
  }

  forceUpdateSlideshowFromForm() {
    if (!museumConfig) return;
    
    const config = museumConfig;
    
    // Update image URLs in config
    if (!config.assets) config.assets = {};
    if (!config.assets.images) config.assets.images = {};
    
    config.assets.images.image1 = document.getElementById('slideshow-image1').value || config.assets.images.image1;
    config.assets.images.image2 = document.getElementById('slideshow-image2').value || config.assets.images.image2;
    config.assets.images.image3 = document.getElementById('slideshow-image3').value || config.assets.images.image3;
    
    // Update text content in config
    if (!config.infoDisplay) config.infoDisplay = {};
    if (!config.infoDisplay.text) config.infoDisplay.text = {};
    if (!config.infoDisplay.text.content) config.infoDisplay.text.content = {};
    
    config.infoDisplay.text.content.slide1 = document.getElementById('slideshow-slide1-text').value || config.infoDisplay.text.content.slide1;
    config.infoDisplay.text.content.slide2 = document.getElementById('slideshow-slide2-text').value || config.infoDisplay.text.content.slide2;
    config.infoDisplay.text.content.slide3 = document.getElementById('slideshow-slide3-text').value || config.infoDisplay.text.content.slide3;
    
    // Update slideshow position in config
    const posX = parseFloat(document.getElementById('slideshow-position-x').value);
    const posY = parseFloat(document.getElementById('slideshow-position-y').value);
    const posZ = parseFloat(document.getElementById('slideshow-position-z').value);
    
    if (!isNaN(posX) && !isNaN(posY) && !isNaN(posZ)) {
      config.infoDisplay.position = `${posX} ${posY} ${posZ}`;
    }
    
    // Update slideshow rotation in config
    const rotX = parseFloat(document.getElementById('slideshow-rotation-x').value);
    const rotY = parseFloat(document.getElementById('slideshow-rotation-y').value);
    const rotZ = parseFloat(document.getElementById('slideshow-rotation-z').value);
    
    if (!isNaN(rotX) && !isNaN(rotY) && !isNaN(rotZ)) {
      config.infoDisplay.rotation = `${rotX} ${rotY} ${rotZ}`;
    }
    
    console.log('Slideshow settings updated from form values');
    
    // Apply changes to the scene immediately
    this.applySlideshowChangesToScene();
  }

  applySlideshowChangesToScene() {
    if (!museumConfig) return;
    
    console.log('🎨 Applying slideshow changes to scene...');
    
    // Update image assets in the DOM
    const image1 = document.querySelector('#image1');
    const image2 = document.querySelector('#image2');
    const image3 = document.querySelector('#image3');
    
    if (image1 && museumConfig.assets?.images?.image1) {
      image1.src = museumConfig.assets.images.image1;
      console.log('✅ Image1 updated:', museumConfig.assets.images.image1);
    }
    
    if (image2 && museumConfig.assets?.images?.image2) {
      image2.src = museumConfig.assets.images.image2;
      console.log('✅ Image2 updated:', museumConfig.assets.images.image2);
    }
    
    if (image3 && museumConfig.assets?.images?.image3) {
      image3.src = museumConfig.assets.images.image3;
      console.log('✅ Image3 updated:', museumConfig.assets.images.image3);
    }
    
    // Update slideshow position and rotation in the scene
    const infoDisplay = document.querySelector('#info-display');
    if (infoDisplay) {
      if (museumConfig.infoDisplay?.position) {
        infoDisplay.setAttribute('position', museumConfig.infoDisplay.position);
        console.log('✅ Slideshow position updated:', museumConfig.infoDisplay.position);
      }
      if (museumConfig.infoDisplay?.rotation) {
        infoDisplay.setAttribute('rotation', museumConfig.infoDisplay.rotation);
        console.log('✅ Slideshow rotation updated:', museumConfig.infoDisplay.rotation);
      }
    }
    
    // Update text content in the scene
    const infoText = document.querySelector('#info-text');
    if (infoText && museumConfig.infoDisplay?.text?.content) {
      const content = museumConfig.infoDisplay.text.content;
      // Update the text content based on current slide
      const currentSlide = this.currentImageIndex || 0;
      const slideKeys = ['slide1', 'slide2', 'slide3'];
      const currentSlideKey = slideKeys[currentSlide];
      
      if (content[currentSlideKey]) {
        infoText.setAttribute('value', content[currentSlideKey]);
        console.log(`✅ Text content updated for ${currentSlideKey}:`, content[currentSlideKey]);
      }
    }
    
    console.log('🎨 Slideshow changes applied to scene');
  }

  saveConfiguration() {
    if (!museumConfig) return;

    console.log('Applying all form values to config before saving...');
    
    // Apply ALL model changes from scene to config before saving
    this.forceUpdateAllModelsFromScene();
    console.log('All model changes captured from scene');
    
    // Apply slideshow form values to config
    this.forceUpdateSlideshowFromForm();
    console.log('Slideshow form values applied to config');
    
    // Apply environment form values to config
    this.forceUpdateEnvironmentFromForm();
    console.log('Environment form values applied to config');

    // Download as file
    this.downloadConfiguration();
  }

  saveAsTemplateDefault() {
    try {
      // Get current template name from URL
      const template = museumProject.getTemplateFromURL();
      if (!template) {
        museumProject.showNotification('Cannot determine template name from URL', 'error');
        return;
      }

      // Send the updated config to the server
      fetch('/save-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template: template,
          config: museumConfig
        })
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          museumProject.showNotification(`Template "${template}" updated successfully!`, 'success');
        } else {
          museumProject.showNotification('Error saving template: ' + data.error, 'error');
        }
      })
      .catch(error => {
        museumProject.showNotification('Error saving template: ' + error.message, 'error');
      });
    } catch (error) {
      museumProject.showNotification('Error saving template: ' + error.message, 'error');
    }
  }

  downloadConfiguration() {
    // Prompt user for custom filename
    const defaultName = 'museum-config.json';
    const customName = prompt('Enter filename for the configuration:', defaultName);
    
    if (!customName) {
      museumProject.showNotification('Save cancelled', 'info');
      return;
    }
    
    // Ensure the filename has .json extension
    const filename = customName.endsWith('.json') ? customName : customName + '.json';

    try {
      const configStr = JSON.stringify(museumConfig, null, 2);
      const blob = new Blob([configStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      museumProject.showNotification(`Configuration saved as ${filename}`, 'success');
    } catch (error) {
      museumProject.showNotification('Error saving configuration: ' + error.message, 'error');
    }
  }

  loadConfiguration() {
    // Trigger file input
    document.getElementById('config-file-input').click();
  }

  reloadConfigurationFromServer() {
    // Reload the config from the server (config.json)
    fetch('./config.json')
      .then(response => response.json())
      .then(config => {
        museumConfig = config;
        
        // Ensure there's always a default template
        if (!museumConfig.template) {
          museumConfig.template = {
            id: 'outdoor-exploration',
            name: 'Outdoor Exploration'
          };
        }
        
        // Completely clear the scene of all exhibits
        const scene = document.querySelector('a-scene');
        const exhibits = scene.querySelectorAll('[id*="-exhibit"]');
        console.log(`Clearing ${exhibits.length} existing exhibits from scene`);
        exhibits.forEach(exhibit => {
          console.log(`Removing exhibit: ${exhibit.id}`);
          exhibit.remove();
        });
        
        // Clear all existing model assets to prevent conflicts
        const assets = document.querySelector('a-assets');
        const existingAssets = assets.querySelectorAll('a-asset-item[data-asset-type="3d-model"]');
        console.log(`Clearing ${existingAssets.length} existing model assets`);
        existingAssets.forEach(asset => {
          console.log(`Removing asset: ${asset.id}`);
          asset.remove();
        });
        
        // Recreate all assets from the new config
        console.log('Recreating all assets from server config...');
        this.museumProject.createAssets();
        
        // Recreate exhibits with the new config
        console.log('Recreating exhibits with server config...');
        this.museumProject.createExhibits();
        
        // Update UI
        this.refreshInterface();
        document.getElementById('model-properties').style.display = 'none';
        this.currentModel = null;
        
        // Load walls and ceilings from config
        this.loadWallsAndCeilingsFromConfig();
        
        // Rebuild scene from Model Editor fields after a delay to ensure everything is loaded
        setTimeout(() => {
          this.rebuildSceneFromEditorFields();
        }, 1000);
        
        // Update template display after config reload
        if (typeof this.updateCurrentTemplateDisplay === 'function') {
          this.updateCurrentTemplateDisplay();
        }
        
        this.showNotification('Configuration reloaded from server', 'success');
      })
      .catch(error => {
        this.showNotification('Error reloading configuration: ' + error.message, 'error');
      });
  }

  manualRefresh() {
    // Force a manual refresh of the interface
    this.refreshInterface();
    this.showNotification('Interface refreshed', 'success');
  }

  // Method to force refresh the scene if models aren't responding
  forceSceneRefresh() {
    if (!this.currentModel) {
      this.showNotification('Please select a model first', 'error');
      return;
    }

    const exhibit = this.currentModel.exhibit;
    const exhibitEntity = document.getElementById(exhibit.id);
    
    if (exhibitEntity) {
      // Force recreate the model entity
      const existingModel = exhibitEntity.querySelector('[gltf-model]');
      if (existingModel) {
        // Store current values
        const currentPos = exhibit.model.position;
        const currentScale = exhibit.model.scale;
        const currentRot = exhibit.model.rotation;
        const currentSrc = exhibit.model.src;
        
        // Remove and recreate the model
        existingModel.remove();
        
        // Create new model entity
        const newModel = document.createElement('a-entity');
        newModel.id = exhibit.model.id;
        newModel.setAttribute('gltf-model', currentSrc);
        newModel.setAttribute('position', currentPos);
        newModel.setAttribute('scale', currentScale);
        newModel.setAttribute('rotation', currentRot);
        newModel.setAttribute('shadow', `cast: ${exhibit.model.castShadow}; receive: true`);
        
        // Add label to the new model (respect current label visibility)
        if (this.labelsVisible === true) {
          this.addModelLabel(newModel, exhibit.name || exhibit.id);
        }
        
        // Add event listeners
        newModel.addEventListener('model-loaded', () => {
          console.log('Model reloaded successfully:', exhibit.model.id);
          this.showNotification('Model refreshed successfully!', 'success');
        });
        
        newModel.addEventListener('model-error', (e) => {
          console.error('Model failed to reload:', exhibit.model.id, e.detail);
          this.showNotification('Model reload failed', 'error');
        });
        
        exhibitEntity.appendChild(newModel);
        
        // Also update any existing labels
        this.updateModelLabelInScene(exhibit);
        
        this.showNotification('Refreshing model...', 'success');
      }
    }
  }

  toggleModelLabels() {
    const toggleBtn = document.getElementById('toggle-labels');
    const allLabels = document.querySelectorAll('[id$="-label-container"]');
    const allIndicators = document.querySelectorAll('a-sphere[animation__pulse]');
    
    if (this.labelsVisible === false) {
      // Show labels
      allLabels.forEach(label => label.setAttribute('visible', true));
      allIndicators.forEach(indicator => indicator.setAttribute('visible', true));
      toggleBtn.textContent = 'Hide Labels';
      this.labelsVisible = true;
      this.showNotification('Model labels shown', 'success');
    } else {
      // Hide labels
      allLabels.forEach(label => label.setAttribute('visible', false));
      allIndicators.forEach(indicator => indicator.setAttribute('visible', false));
      toggleBtn.textContent = 'Show Labels';
      this.labelsVisible = false;
      this.showNotification('Model labels hidden', 'success');
    }
  }

  exportConfiguration() {
    // Export as complete HTML file instead of just JSON
    this.exportAsHTML();
  }

  exportAsHTML() {
    if (!museumConfig) {
      this.showNotification('No configuration to export', 'error');
      return;
    }

    console.log('🚀 Starting export process...');
    
    // First, populate form fields with current config values
    console.log('🔄 Populating form fields with current config values...');
    this.loadEnvironmentFromConfig(museumConfig);
    
    console.log('📝 Form field values after population:');
    console.log('  Ambient Audio URL:', document.getElementById('ambient-audio-url').value);
    console.log('  Click Sound URL:', document.getElementById('click-sound-url').value);
    console.log('  Audio1 URL:', document.getElementById('audio1-url').value);
    console.log('  AudioCarrots URL:', document.getElementById('audiocarrots-url').value);
    console.log('  AudioOnion URL:', document.getElementById('audioonion-url').value);

    // Apply all current form values to config before exporting
    // Capture changes from ALL models, not just the currently selected one
    this.forceUpdateAllModelsFromScene();
    this.forceUpdateSlideshowFromForm();
    this.forceUpdateEnvironmentFromForm();

    // Prompt user for custom filename
    const defaultName = 'museum-scene.html';
    const customName = prompt('Enter filename for the exported scene:', defaultName);
    
    if (!customName) {
      this.showNotification('Export cancelled', 'info');
      return;
    }
    
    // Ensure the filename has .html extension
    const filename = customName.endsWith('.html') ? customName : customName + '.html';

    try {
      // Generate the complete HTML content
      const htmlContent = this.generateStandaloneHTML();
      
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.showNotification(`Scene exported as ${filename}`, 'success');
    } catch (error) {
      this.showNotification('Error exporting scene: ' + error.message, 'error');
    }
  }

  generateStandaloneHTML() {
    // Re-enable gaze cursor for exported scenes
    this.enableGazeCursorForExport();
    
    // Generate a complete HTML file with the 3D scene
    const config = museumConfig;
    
    console.log('🔧 generateStandaloneHTML - Using config:');
    console.log('  Audio1 URL:', config.assets?.audio?.audio1);
    console.log('  AudioCarrots URL:', config.assets?.audio?.audiocarrots);
    console.log('  AudioOnion URL:', config.assets?.audio?.audioonion);
    console.log('  Ambient URL:', config.assets?.audio?.ambient);
    console.log('  Click URL:', config.assets?.audio?.click);
    
    // Generate the A-Frame scene HTML
    let sceneHTML = `<!DOCTYPE html>
<html lang="en" class="a-fullscreen">
<head>
    <meta charset="UTF-8">
    <title>${config.name || 'Immersive Museum'}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <script src="https://aframe.io/releases/1.7.0/aframe.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/aframe-blink-controls/dist/aframe-blink-controls.min.js"></script>
    <script src="https://unpkg.com/aframe-thumb-controls-component@1.1.0/dist/aframe-thumb-controls-component.min.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/donmccurdy/aframe-extras@v6.1.1/dist/aframe-extras.min.js"></script>
    <script src="https://recast-api.donmccurdy.com/aframe-inspector-plugin-recast.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/howler/2.2.3/howler.min.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/donmccurdy/aframe-physics-system@v4.0.1/dist/aframe-physics-system.min.js"></script>
    
    <style>
        body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
        #scene { width: 100vw; height: 100vh; }
        .loading { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; }
        .museum-info {
            position: fixed;
            bottom: 20px;
            left: 20px;
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            font-family: Arial, sans-serif;
            max-width: 300px;
            z-index: 100;
            display: none;
        }
        .vr-toggle {
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            font-family: Arial, sans-serif;
            cursor: pointer;
            z-index: 100;
        }
    </style>

    <!-- Custom Components -->
    <script>
        // Face-camera component to keep elements facing the camera
        AFRAME.registerComponent("face-camera", {
            schema: {
                preserveY: { type: "boolean", default: false }
            },
            tick: function () {
                var camera = document.querySelector("[camera]");
                if (!camera) return;
                
                if (this.data.preserveY) {
                    var cameraPosition = camera.object3D.position.clone();
                    var objPosition = this.el.object3D.position.clone();
                    cameraPosition.y = objPosition.y;
                    this.el.object3D.lookAt(cameraPosition);
                } else {
                    this.el.object3D.lookAt(camera.object3D.position);
                }
            }
        });

        // Spot component for hotspot behavior with enhanced functionality
        AFRAME.registerComponent("spot", {
            schema: {
                linkto: { type: "string", default: "" },
                spotgroup: { type: "string", default: "" },
                label: { type: "string", default: "" },
                audio: { type: "selector", default: null },
                labelBackground: { type: "string", default: "#000000" },
                info: { type: "string", default: "" },
                vegetableModel: { type: "string", default: "" },
                revealAnimation: { type: "boolean", default: false }
            },
            init: function () {
                var data = this.data;
                var el = this.el;
                
                // Create hotspot visual
                el.setAttribute("geometry", { primitive: "circle", radius: 0.5 });
                el.setAttribute("material", {
                    color: "#FFFFFF",
                    opacity: 0.6,
                    transparent: true,
                    src: "",
                });
                
                // Add pulse animation
                el.setAttribute("animation__pulse", {
                    property: "scale",
                    dir: "alternate",
                    dur: 1000,
                    easing: "easeInOutSine",
                    loop: true,
                    to: "1.1 1.1 1.1"
                });
                
                // Set up audio controls
                this.isPlaying = false;
                this.gazeTimeout = null;
                this.gazeThreshold = 1500; // 1.5 seconds gaze to activate
                
                // Create audio control buttons (always create them)
                // Container for audio controls
                this.audioControls = document.createElement("a-entity");
                this.audioControls.setAttribute("position", "0 -0.8 0");
                
                // Play button
                this.playButton = document.createElement("a-entity");
                this.playButton.setAttribute("geometry", "primitive: circle; radius: 0.25");
                this.playButton.setAttribute("material", "color: #4CAF50; opacity: 0.9");
                this.playButton.setAttribute("position", "-0.3 0 0");
                this.playButton.setAttribute("class", "clickable");
                
                // Play icon (triangle)
                const playIcon = document.createElement("a-entity");
                playIcon.setAttribute("geometry", "primitive: triangle; vertexA: 0.15 0 0; vertexB: -0.05 0.1 0; vertexC: -0.05 -0.1 0");
                playIcon.setAttribute("material", "color: white; shader: flat");
                playIcon.setAttribute("position", "-0.05 0 0.01");
                this.playButton.appendChild(playIcon);
                
                // Pause button
                this.pauseButton = document.createElement("a-entity");
                this.pauseButton.setAttribute("geometry", "primitive: circle; radius: 0.25");
                this.pauseButton.setAttribute("material", "color: #F44336; opacity: 0.9");
                this.pauseButton.setAttribute("position", "0.3 0 0");
                this.pauseButton.setAttribute("class", "clickable");
                
                // Pause icon (two rectangles)
                const pauseBarLeft = document.createElement("a-entity");
                pauseBarLeft.setAttribute("geometry", "primitive: box; width: 0.06; height: 0.15; depth: 0.01");
                pauseBarLeft.setAttribute("material", "color: white; shader: flat");
                pauseBarLeft.setAttribute("position", "-0.04 0 0.01");
                this.pauseButton.appendChild(pauseBarLeft);
                
                const pauseBarRight = document.createElement("a-entity");
                pauseBarRight.setAttribute("geometry", "primitive: box; width: 0.06; height: 0.15; depth: 0.01");
                pauseBarRight.setAttribute("material", "color: white; shader: flat");
                pauseBarRight.setAttribute("position", "0.04 0 0.01");
                this.pauseButton.appendChild(pauseBarRight);
                
                // Add all controls to container
                this.audioControls.appendChild(this.playButton);
                this.audioControls.appendChild(this.pauseButton);
                el.appendChild(this.audioControls);
                
                // Initially hide controls
                this.audioControls.setAttribute("visible", false);
                
                // Set up event listeners for audio buttons
                this.playButton.addEventListener("click", () => {
                    console.log('Play button clicked, audio data:', data.audio);
                    if (data.audio) {
                        this.playAudio();
                    }
                });
                
                this.pauseButton.addEventListener("click", () => {
                    console.log('Pause button clicked, audio data:', data.audio);
                    if (data.audio) {
                        this.pauseAudio();
                    }
                });
                
                // Setup gaze tracking for controls (moved outside audio check)
                el.addEventListener("mouseenter", () => {
                    // Show controls on mouse enter
                    if (this.audioControls) {
                        this.audioControls.setAttribute("visible", true);
                        
                        // Set gaze timeout for audio if available
                        if (data.audio) {
                            this.gazeTimeout = setTimeout(() => {
                                // Toggle audio play/pause after threshold
                                if (this.isPlaying) {
                                    this.pauseAudio();
                                } else {
                                    this.playAudio();
                                }
                            }, this.gazeThreshold);
                        }
                    }
                });
                
                el.addEventListener("mouseleave", () => {
                    // Hide controls on mouse leave after delay
                    setTimeout(() => {
                        if (!this.isPlaying && this.audioControls) {
                            this.audioControls.setAttribute("visible", false);
                        }
                    }, 1000);
                    
                    // Clear gaze timeout
                    if (this.gazeTimeout) {
                        clearTimeout(this.gazeTimeout);
                        this.gazeTimeout = null;
                    }
                });
                
                // Create label if provided
                if (data.label) {
                    var textEntity = document.createElement("a-text");
                    textEntity.setAttribute("value", data.label);
                    textEntity.setAttribute("align", "center");
                    textEntity.setAttribute("position", "0 0.6 0");
                    textEntity.setAttribute("scale", "0.5 0.5 0.5");
                    textEntity.setAttribute("color", "#FFFFFF");
                    
                    var bgEntity = document.createElement("a-plane");
                    bgEntity.setAttribute("color", data.labelBackground);
                    bgEntity.setAttribute("position", "0 0.6 -0.01");
                    bgEntity.setAttribute("width", data.label.length * 0.15 + 0.2);
                    bgEntity.setAttribute("height", "0.3");
                    bgEntity.setAttribute("opacity", "0.8");
                    
                    el.appendChild(bgEntity);
                    el.appendChild(textEntity);
                }
                
                // Set up click event
                el.addEventListener("click", () => {
                    // Handle group visibility if specified
                    if (data.spotgroup) {
                        var allGroups = document.querySelectorAll('[id^="group-"]');
                        allGroups.forEach(function (group) {
                            group.setAttribute("visible", false);
                        });
                        var targetGroup = document.querySelector("#" + data.spotgroup);
                        if (targetGroup) {
                            targetGroup.setAttribute("visible", true);
                        }
                    }
                    
                    // Show info panel if specified
                    if (data.info) {
                        const infoPanel = document.querySelector('.museum-info');
                        if (infoPanel) {
                            infoPanel.textContent = data.info;
                            infoPanel.style.display = 'block';
                            
                            // Hide after 10 seconds
                            setTimeout(() => {
                                infoPanel.style.display = 'none';
                            }, 10000);
                        }
                    }
                    
                    // Handle 3D model animation if specified
                    if (data.vegetableModel) {
                        const model = document.querySelector(data.vegetableModel);
                        if (model && data.revealAnimation) {
                            // Check if already animating to prevent stacking
                            if (model.getAttribute("data-animating") === "true") {
                                return; // Already animating, don't start another
                            }
                            
                            // Mark as animating
                            model.setAttribute("data-animating", "true");
                            
                            // Remove any existing animations first
                            model.removeAttribute("animation__spin");
                            
                            // Create spin animation only
                            model.setAttribute("animation__spin", {
                                property: "rotation",
                                to: "0 360 0",
                                loop: 1,
                                dur: 2000,
                                easing: "easeOutQuad"
                            });
                            
                            // Reset animation state after spin completes
                            setTimeout(() => {
                                model.removeAttribute("animation__spin");
                                model.removeAttribute("data-animating");
                            }, 2000); // Wait for spin animation to complete
                        }
                    }

                    // Teleport if linkto is specified
                    if (data.linkto && data.linkto !== "") {
                        var targetPoint = document.querySelector(data.linkto);
                        if (targetPoint) {
                            // Add a flash effect before teleport
                            document.querySelector('a-scene').setAttribute('animation__flash', {
                                property: 'background.color',
                                from: '#000',
                                to: '#fff',
                                dur: 100,
                                dir: 'alternate',
                                loop: 2
                            });
                            
                            setTimeout(() => {
                                var cameraRig = document.querySelector("#cameraRig");
                                cameraRig.setAttribute("position", targetPoint.getAttribute("position"));
                            }, 200);
                        }
                    }
                });
            },
            
                playAudio: function() {
                    console.log('playAudio called, audio data:', this.data.audio);
                    if (this.data.audio) {
                        // In A-Frame, data.audio should be the actual element when using selector syntax
                        const audioElement = this.data.audio;
                        console.log('Audio element:', audioElement);
                        if (audioElement) {
                            // Check if audio is ready to play
                            if (audioElement.readyState >= 2) { // HAVE_CURRENT_DATA
                                // Stop any other playing audio
                                document.querySelectorAll('audio').forEach(audio => {
                                    if (audio !== audioElement) {
                                        audio.pause();
                                        audio.currentTime = 0;
                                        
                                        // Reset other hotspots' play state
                                        document.querySelectorAll('[spot]').forEach(spot => {
                                            if (spot !== this.el && spot.components.spot) {
                                                spot.components.spot.isPlaying = false;
                                            }
                                        });
                                    }
                                });
                                
                                // Play this audio
                                console.log('Attempting to play audio...');
                                audioElement.play().then(() => {
                                    console.log('Audio started playing successfully');
                                    this.isPlaying = true;
                                    
                                    // Visual feedback for playing state
                                    this.playButton.setAttribute("material", "opacity", 0.4);
                                    this.pauseButton.setAttribute("material", "opacity", 0.9);
                                }).catch(error => {
                                    console.error('Error playing audio:', error);
                                });
                            } else {
                                console.log('Audio not ready, waiting for load...');
                                audioElement.addEventListener('canplay', () => {
                                    console.log('Audio loaded, retrying play...');
                                    this.playAudio();
                                }, { once: true });
                            }
                        } else {
                            console.error('Audio element not found for:', this.data.audio);
                        }
                    } else {
                        console.log('No audio data available');
                    }
                },
                
                pauseAudio: function() {
                    if (this.data.audio) {
                        const audioElement = this.data.audio;
                        if (audioElement) {
                            audioElement.pause();
                            this.isPlaying = false;
                            
                            // Visual feedback for paused state
                            this.playButton.setAttribute("material", "opacity", 0.9);
                            this.pauseButton.setAttribute("material", "opacity", 0.4);
                        }
                    }
                }
        });

        // Sound effect component
        AFRAME.registerComponent('sound-effects', {
            init: function() {
                const config = ${JSON.stringify(config)};
                this.sounds = {
                    ambient: new Howl({
                        src: [config.assets?.audio?.ambient || ''],
                        loop: true,
                        volume: 0.3,
                        autoplay: false
                    }),
                    click: new Howl({
                        src: [config.assets?.audio?.click || ''],
                        volume: 0.5
                    }),
                    teleport: new Howl({
                        src: [config.assets?.audio?.teleport || ''],
                        volume: 0.7
                    })
                };
                
                // Only play ambient audio if enabled
                if (config.soundEffects?.ambientAudioEnabled) {
                    setTimeout(() => {
                        this.sounds.ambient.play();
                    }, config.soundEffects?.ambientDelay || 2000);
                }
                
                // Add click sound to all clickable elements, but prevent duplicates
                document.querySelectorAll('.clickable').forEach(el => {
                    // Check if this element already has a click sound listener
                    if (!el.hasAttribute('data-click-sound-added')) {
                        el.addEventListener('click', () => {
                            this.sounds.click.play();
                        });
                        el.setAttribute('data-click-sound-added', 'true');
                    }
                });
            }
        });
        
        // Static skybox component - always shows the configured skybox
        AFRAME.registerComponent('static-skybox', {
            init: function() {
                this.sky = document.querySelector('a-sky');
                const config = ${JSON.stringify(config)};
                
                // Set the skybox to the configured sky image and keep it static
                const skyImage = config.environment?.sky?.day || config.assets?.images?.sky || '';
                
                if (this.sky) {
                    this.sky.setAttribute('material', {
                        src: skyImage,
                        opacity: 1.0
                    });
                    console.log('Static skybox set to:', skyImage);
                }
                
                // Create a static directional light (no movement)
                this.sunLight = document.createElement('a-entity');
                this.sunLight.setAttribute('light', {
                    type: 'directional',
                    color: '#FFF',
                    intensity: 0.8
                });
                this.sunLight.setAttribute('position', '0 10 0');
                this.el.sceneEl.appendChild(this.sunLight);
            }
        });
    </script>
</head>

<body>
    <a-scene 
        cursor="rayOrigin: mouse" 
        sound-effects
        static-skybox>
        <!-- UI Overlays -->
        <div class="museum-info">Welcome to the ${config.name || 'Immersive Museum'}</div>
        
        <!-- Camera Rig with Enhanced Controls -->
        <a-entity
            id="cameraRig"
            movement-controls="fly: false; constrainToNavMesh: false;"
            navigator="cameraRig: #cameraRig; cameraHead: #head; collisionEntities: .collision; ignoreEntities: .clickable"
            position="0 0 0"
            rotation="0 0 0"
        >
            <a-entity
                id="head"
                camera="active: true"
                look-controls="pointerLockEnabled: true; reverseMouseDrag: false"
                wasd-controls="fly: false"
                position="0 1.6 0"
            >
                <a-cursor
                    fuse="true"
                    fuse-timeout="1500"
                    animation__click="property: scale; startEvents: click; easing: easeInCubic; dur: 150; from: 0.1 0.1 0.1; to: 1 1 1"
                    animation__fusing="property: scale; startEvents: fusing; easing: easeInCubic; dur: 1500; from: 1 1 1; to: 0.1 0.1 0.1"
                    animation__mouseleave="property: scale; startEvents: mouseleave; easing: easeInCubic; dur: 500; to: 1 1 1"
                    raycaster="objects: .clickable"
                ></a-cursor>
            </a-entity>

            <!-- Controllers with improved teleportation -->
            <a-entity
                id="left-controller"
                laser-controls="hand: left"
                raycaster="objects: .clickable, .ground"
                blink-controls="cameraRig: #cameraRig; teleportOrigin: #cameraRig; collisionEntities: .ground; landingMaxAngle: 45; buttonTopoOffset: 0.1"
                visible="true"
            ></a-entity>
            
            <a-entity
                id="right-controller"
                laser-controls="hand: right"
                raycaster="objects: .clickable, .ground"
                blink-controls="cameraRig: #cameraRig; teleportOrigin: #cameraRig; collisionEntities: .ground; landingMaxAngle: 45; buttonTopoOffset: 0.1"
                visible="true"
            ></a-entity>
        </a-entity>

        <!-- Assets -->
        <a-assets>
            <!-- Sky and Ground -->
            <img id="sky" src="${config.environment?.sky?.day || config.assets?.images?.sky || ''}" />
            <img id="ground" src="${config.environment?.ground?.texture || config.assets?.images?.ground || ''}" />
            
            <!-- Slideshow Images -->
            <img id="image1" src="${config.assets?.images?.image1 || ''}" />
            <img id="image2" src="${config.assets?.images?.image2 || ''}" />
            <img id="image3" src="${config.assets?.images?.image3 || ''}" />
            <img id="arrowLeft" src="${config.assets?.images?.arrowLeft || ''}" />
            <img id="arrowRight" src="${config.assets?.images?.arrowRight || ''}" />
            
            <!-- 3D Models -->
            ${this.generateAssetsHTML(config)}
        </a-assets>

        <!-- Environment -->
        <a-entity light="type: ambient; color: #BBB; intensity: 1"></a-entity>
        <a-entity light="type: directional; color: #FFF; intensity: 1; castShadow: true" position="-1 1 0"></a-entity>
        
        <a-plane
            width="100"
            height="100"
            rotation="-90 0 0"
            material="src: #ground; repeat:10 10; transparent: false; opacity: 1; normalTextureRepeat: 10 10; roughness: 0.8"
            shadow="cast: false; receive: true"
            class="ground clickable"
        ></a-plane>

        <a-sky src="#sky"></a-sky>
        
        <!-- Interactive Info Display -->
        <a-entity id="info-display" position="0 0 -5">
            <!-- Main Display Panel with billboard behavior -->
            <a-entity 
                id="image-panel-container"
                face-camera
                position="0 2.6 -4"
            >
                <a-plane
                    id="image-panel"
                    position="0 0 0"
                    width="4"
                    height="2.5"
                    material="src: #image1; side: double; shader: flat"
                    visible="true"
                    class="clickable"
                ></a-plane>
                
                <!-- Navigation Arrows with Improved Styling -->
                <a-entity 
                    id="nav-left" 
                    position="-2.3 0 0" 
                    class="clickable"
                >
                    <a-image
                        src="#arrowLeft"
                        position="0 0 0.01"
                        scale="0.5 0.5 0.5"
                        class="clickable"
                        animation__hover="property: scale; to: 0.6 0.6 0.6; startEvents: mouseenter; endEvents: mouseleave; dir: alternate; dur: 300"
                    ></a-image>
                    <a-plane
                        width="0.6"
                        height="0.6"
                        color="#333333"
                        opacity="0.7"
                        material="shader: flat"
                    ></a-plane>
                </a-entity>
                
                <a-entity 
                    id="nav-right" 
                    position="2.3 0 0" 
                    class="clickable"
                >
                    <a-image
                        src="#arrowRight"
                        position="0 0 0.01"
                        scale="0.5 0.5 0.5"
                        class="clickable"
                        animation__hover="property: scale; to: 0.6 0.6 0.6; startEvents: mouseenter; endEvents: mouseleave; dir: alternate; dur: 300"
                    ></a-image>
                    <a-plane
                        width="0.6"
                        height="0.6"
                        color="#333333"
                        opacity="0.7"
                        material="shader: flat"
                    ></a-plane>
                </a-entity>
                
                <!-- Information Display Text -->
                <a-entity
                    id="info-text"
                    position="0 -1.6 0"
                    text="value: Welcome to the ${config.name || 'Immersive Museum'}! Explore the world of exhibits in this interactive 3D experience. Click on the hotspots to learn more about each exhibit.; width: 3; color: #FFFFFF; align: center"
                    geometry="primitive: plane; width: 4; height: 0.8"
                    material="color: #333333; opacity: 0.8; shader: flat"
                ></a-entity>
            </a-entity>
        </a-entity>
        
        <!-- Create invisible floor collider -->
        <a-box
            class="collision"
            position="0 -0.1 0"
            width="100"
            height="0.2"
            depth="100"
            visible="false"
            static-body
        ></a-box>
        
        <!-- Walls and Ceilings -->
        ${this.generateWallsAndCeilingsHTML(config)}
        
        <!-- Exhibits -->
        ${this.generateExhibitsHTML(config)}
        
        <script>
           // Document ready handler
           document.addEventListener("DOMContentLoaded", () => {
               // Debug: Log all audio elements
               console.log('All audio elements in DOM:');
               document.querySelectorAll('audio').forEach((audio, index) => {
                   console.log(\`Audio \${index}:\`, audio.id, audio.src);
               });
               
               // Image slideshow functionality
                const images = ${JSON.stringify(config.infoDisplay?.panel?.images || ["#image1", "#image2", "#image3"])};
                let currentIndex = 0;
                const imagePanel = document.querySelector("#image-panel");
                
                function updatePanelImage() {
                    imagePanel.setAttribute("material", "src", images[currentIndex]);
                    
                    // Update info text based on current image
                    const infoText = document.querySelector("#info-text");
                    const content = ${JSON.stringify(config.infoDisplay?.text?.content || {})};
                    let textContent = content.default || "Welcome to the ${config.name || 'Immersive Museum'}!";
                    
                    switch(currentIndex) {
                        case 0:
                            textContent = content.slide1 || "Slide 1";
                            break;
                        case 1:
                            textContent = content.slide2 || "Slide 2";
                            break;
                        case 2:
                            textContent = content.slide3 || "Slide 3";
                            break;
                    }
                    
                    infoText.setAttribute("text", "value", textContent);
                }
                
                document.querySelector("#nav-left").addEventListener("click", () => {
                    currentIndex = (currentIndex - 1 + images.length) % images.length;
                    updatePanelImage();
                    // Play click sound if available
                    const soundEffects = document.querySelector('[sound-effects]');
                    if (soundEffects && soundEffects.components['sound-effects'].sounds.click) {
                        soundEffects.components['sound-effects'].sounds.click.play();
                    }
                });
                
                document.querySelector("#nav-right").addEventListener("click", () => {
                    currentIndex = (currentIndex + 1) % images.length;
                    updatePanelImage();
                    // Play click sound if available
                    const soundEffects = document.querySelector('[sound-effects]');
                    if (soundEffects && soundEffects.components['sound-effects'].sounds.click) {
                        soundEffects.components['sound-effects'].sounds.click.play();
                    }
                });
                
                // Update hotspots to use the preserveY option
                document.querySelectorAll('[face-camera]').forEach(el => {
                    // Check if this is a hotspot element (not the image panel)
                    if (el.hasAttribute('spot')) {
                        el.setAttribute('face-camera', 'preserveY', true);
                    }
                });
                
                // VR Mode toggle
                const vrToggle = document.createElement('div');
                vrToggle.className = 'vr-toggle';
                vrToggle.textContent = 'Enter VR';
                document.body.appendChild(vrToggle);
                
                vrToggle.addEventListener('click', () => {
                    const scene = document.querySelector('a-scene');
                    if (scene.is('vr-mode')) {
                        scene.exitVR();
                        vrToggle.textContent = 'Enter VR';
                    } else {
                        scene.enterVR();
                        vrToggle.textContent = 'Exit VR';
                    }
                });
                
                // Detect device capabilities
                setTimeout(() => {
                    if (AFRAME.utils.device.isMobile()) {
                        // Mobile controls guide would go here
                    } else {
                        // Desktop controls guide would go here
                    }
                }, 1000);
            });
        </script>
    </a-scene>
</body>
</html>`;

    return sceneHTML;
  }

  generateAssetsHTML(config) {
    let assetsHTML = '';
    const addedAssets = new Set(); // Track added assets to prevent duplicates
    
    // Add 3D model assets from config.assets.models
    if (config.assets?.models) {
      Object.entries(config.assets.models).forEach(([key, model]) => {
        if (!addedAssets.has(key)) {
          assetsHTML += `            <a-asset-item id="${key}" src="${model}" type="gltf"></a-asset-item>\n`;
          addedAssets.add(key);
        }
      });
    }

    // Add exhibit models that use direct URLs (not asset references)
    if (config.exhibits) {
      config.exhibits.forEach(exhibit => {
        if (exhibit.model && exhibit.model.src) {
          // If it's a direct URL (not an asset reference), add it as an asset
          if (!exhibit.model.src.startsWith('#')) {
            // Use a clean model ID without double suffixes
            let modelId = exhibit.model.id || exhibit.id.replace('-exhibit', '');
            if (modelId.endsWith('-model') && !modelId.includes('-model-model')) {
              modelId = modelId; // Keep as is if it already has proper -model suffix
            } else if (!modelId.endsWith('-model')) {
              modelId = modelId + '-model'; // Add -model suffix if missing
            }
            
            if (!addedAssets.has(modelId)) {
              assetsHTML += `            <a-asset-item id="${modelId}" src="${exhibit.model.src}" type="gltf"></a-asset-item>\n`;
              addedAssets.add(modelId);
            }
          }
          // If it's an asset reference, make sure the referenced asset exists
          else {
            const assetId = exhibit.model.src.substring(1); // Remove the #
            if (!config.assets?.models?.[assetId]) {
              console.warn(`Asset reference ${exhibit.model.src} not found in config.assets.models`);
            }
          }
        }
      });
    }

    // Add audio assets
    if (config.assets?.audio) {
      Object.entries(config.assets.audio).forEach(([key, audio]) => {
        if (!addedAssets.has(key)) {
          assetsHTML += `            <audio id="${key}" src="${audio}" preload="auto"></audio>\n`;
          addedAssets.add(key);
        }
      });
    }
    
    return assetsHTML;
  }

  generateWallsAndCeilingsHTML(config) {
    let wallsAndCeilingsHTML = '';
    
    // Generate walls
    if (config.walls && Array.isArray(config.walls)) {
      config.walls.forEach(wall => {
        const tilingX = wall.tilingX || 1;
        const tilingY = wall.tilingY || 1;
        const brightness = wall.brightness || 1;
        const color = wall.color || '#cccccc';
        const renderOrder = wall.renderOrder || -1;
        
        let materialProps = '';
        if (wall.texture) {
          const opacity = wall.transparent ? 0.3 : brightness;
          materialProps = `src: ${wall.texture}; side: double; repeat: ${tilingX} ${tilingY}; opacity: ${opacity}; depthTest: true; depthWrite: true; transparent: ${wall.transparent || false}`;
        } else {
          const opacity = wall.transparent ? 0.3 : 1;
          materialProps = `color: ${color}; side: double; depthTest: true; depthWrite: true; transparent: ${wall.transparent || false}; opacity: ${opacity}`;
        }
        
        wallsAndCeilingsHTML += `
        <a-plane
            id="wall-${wall.id}"
            position="${wall.position.x} ${wall.position.y} ${wall.position.z}"
            rotation="${wall.rotation.x} ${wall.rotation.y} ${wall.rotation.z}"
            width="${wall.width}"
            height="${wall.height}"
            geometry="primitive: plane; width: ${wall.width}; height: ${wall.height}"
            material="${materialProps}"
            visible="${wall.visible}"
            render-order="${renderOrder}"
            class="wall-element"
        ></a-plane>`;
      });
    }
    
    // Generate ceilings
    if (config.ceilings && Array.isArray(config.ceilings)) {
      config.ceilings.forEach(ceiling => {
        const tilingX = ceiling.tilingX || 1;
        const tilingY = ceiling.tilingY || 1;
        const brightness = ceiling.brightness || 1;
        const color = ceiling.color || '#ffffff';
        const renderOrder = ceiling.renderOrder || -1;
        
        let materialProps = '';
        if (ceiling.texture) {
          const opacity = ceiling.transparent ? 0.3 : brightness;
          materialProps = `src: ${ceiling.texture}; side: double; repeat: ${tilingX} ${tilingY}; opacity: ${opacity}; depthTest: true; depthWrite: true; transparent: ${ceiling.transparent || false}`;
        } else {
          const opacity = ceiling.transparent ? 0.3 : 1;
          materialProps = `color: ${color}; side: double; depthTest: true; depthWrite: true; transparent: ${ceiling.transparent || false}; opacity: ${opacity}`;
        }
        
        wallsAndCeilingsHTML += `
        <a-plane
            id="ceiling-${ceiling.id}"
            position="${ceiling.position.x} ${ceiling.position.y} ${ceiling.position.z}"
            rotation="${ceiling.rotation.x} ${ceiling.rotation.y} ${ceiling.rotation.z}"
            width="${ceiling.width}"
            height="${ceiling.height}"
            geometry="primitive: plane; width: ${ceiling.width}; height: ${ceiling.height}"
            material="${materialProps}"
            visible="${ceiling.visible}"
            render-order="${renderOrder}"
            class="ceiling-element"
        ></a-plane>`;
      });
    }
    
    return wallsAndCeilingsHTML;
  }

  generateExhibitsHTML(config) {
    let exhibitsHTML = '';
    
    if (config.exhibits) {
      config.exhibits.forEach(exhibit => {
        const position = exhibit.position || '0 0 0';
        
        // Fix model ID consistency - ensure it doesn't have double "model" suffix
        let modelId = exhibit.model?.id || exhibit.id.replace('-exhibit', '');
        if (modelId.endsWith('-model') && !modelId.includes('-model-model')) {
          modelId = modelId; // Keep as is if it already has proper -model suffix
        } else if (!modelId.endsWith('-model')) {
          modelId = modelId + '-model'; // Add -model suffix if missing
        }
        
        // Handle model source properly - resolve asset references to actual URLs
        let modelSrc = exhibit.model?.src || `#${modelId.replace('-model', '')}`;
        
        if (modelSrc.startsWith('#')) {
          // It's an asset reference, resolve it to the actual asset URL
          const assetId = modelSrc.substring(1);
          const assetUrl = config.assets?.models?.[assetId];
          
          if (assetUrl) {
            // Use the direct URL from the asset
            modelSrc = assetUrl;
            console.log(`Export: Resolved asset reference #${assetId} to URL: ${modelSrc}`);
          } else {
            // Asset not found, try to use the model ID as fallback
            console.warn(`Export: Asset reference #${assetId} not found, using model ID as fallback`);
            modelSrc = `#${assetId}`;
          }
        } else {
          // It's already a direct URL, use it as is
          modelSrc = modelSrc;
          console.log(`Export: Using direct URL for model: ${modelSrc}`);
        }
        
        // Debug logging for model source
        console.log(`Export: Exhibit ${exhibit.name} model ID: ${modelId}, source: ${modelSrc}`);
        
        const modelPosition = exhibit.model?.position || '0 1 0';
        const modelScale = exhibit.model?.scale || '1 1 1';
        const modelRotation = exhibit.model?.rotation || '0 0 0';
        const hotspotPosition = exhibit.hotspot?.position || '3 1.5 0';
        const hotspotLabel = exhibit.hotspot?.label || exhibit.name || 'Exhibit';
        const hotspotInfo = exhibit.hotspot?.info || exhibit.description || '';
        const audioRef = exhibit.hotspot?.audio || '';

        exhibitsHTML += `
        <!-- ${exhibit.name || 'Exhibit'} -->
        <a-entity id="${exhibit.id}" position="${position}">
            <!-- 3D Model -->
            <a-entity id="${modelId}-model" 
                      gltf-model="${modelSrc}" 
                      position="${modelPosition}" 
                      scale="${modelScale}" 
                      rotation="${modelRotation}"
                      shadow="cast: true; receive: true">
            </a-entity>
            
            <!-- Model Label -->
            <a-entity id="${modelId}-label-container" position="0 3 0" visible="false">
                <a-text value="${exhibit.name || 'Exhibit'}" 
                        align="center" 
                        color="white" 
                        position="0 0 0"
                        scale="2 2 2">
                </a-text>
            </a-entity>
            
            <!-- Hotspot -->
            <a-entity id="${exhibit.id}-hotspot" 
                      position="${hotspotPosition}"
                      face-camera="preserveY: true"
                      class="clickable"
                      spot="label: ${hotspotLabel}; info: ${hotspotInfo}; audio: #${audioRef.replace('#', '')}; vegetableModel: #${modelId}-model; revealAnimation: true">
            </a-entity>
        </a-entity>
`;
      });
    }
    
    return exhibitsHTML;
  }

  rebuildSceneFromEditorFields() {
    console.log('Rebuilding scene from Model Editor fields...');
    
    if (!museumConfig || !museumConfig.exhibits) {
      console.warn('No museum config or exhibits found');
      return;
    }
    
    // Clear the current scene
    const scene = document.querySelector('a-scene');
    const exhibits = scene.querySelectorAll('[id*="-exhibit"]');
    console.log(`Clearing ${exhibits.length} existing exhibits for rebuild`);
    exhibits.forEach(exhibit => exhibit.remove());
    
    // Clear existing model assets
    const assets = document.querySelector('a-assets');
    const existingAssets = assets.querySelectorAll('a-asset-item[data-asset-type="3d-model"]');
    console.log(`Clearing ${existingAssets.length} existing model assets for rebuild`);
    existingAssets.forEach(asset => asset.remove());
    
    // Recreate all assets from the current config
    console.log('Recreating all assets for rebuild...');
    this.museumProject.createAssets();
    
    // Recreate exhibits from the current config
    console.log('Recreating exhibits for rebuild...');
    this.museumProject.createExhibits();
    
    // Force update all exhibits with their current config values
    museumConfig.exhibits.forEach((exhibit, index) => {
      console.log(`Force updating exhibit ${index + 1}: ${exhibit.name}`);
      
      const exhibitEntity = document.getElementById(exhibit.id);
      if (exhibitEntity) {
        // Update exhibit position
        exhibitEntity.setAttribute('position', exhibit.position);
        exhibitEntity.setAttribute('data-exhibit-name', exhibit.name);
        
        // Update model entity
        const modelEntity = exhibitEntity.querySelector(`#${exhibit.model.id}`);
        if (modelEntity) {
          modelEntity.setAttribute('position', exhibit.model.position);
          modelEntity.setAttribute('scale', exhibit.model.scale);
          modelEntity.setAttribute('rotation', exhibit.model.rotation);
          modelEntity.setAttribute('data-model-name', exhibit.name);
          
          // Update model label
          const labelContainer = exhibitEntity.querySelector(`#${exhibit.model.id}-label-container`);
          if (labelContainer) {
            const labelText = labelContainer.querySelector('a-text');
            if (labelText) {
              labelText.setAttribute('value', exhibit.name);
            }
          }
        }
        
        // Update hotspot entity
        const hotspotEntity = exhibitEntity.querySelector(`#${exhibit.hotspot.id}`);
        if (hotspotEntity) {
          hotspotEntity.setAttribute('position', exhibit.hotspot.position);
        }
      }
    });
    
    console.log('Scene rebuild complete - all exhibits updated with current config values');
  }

  compileNewScene() {
    // First, ensure all current form values are saved to config
    this.forceUpdateAllModelsFromScene();
    this.forceUpdateSlideshowFromForm();
    this.forceUpdateEnvironmentFromForm();
    
    // Ask user for their name
    const userName = prompt('Enter your name for this scene:');
    if (!userName || userName.trim() === '') {
      this.showNotification('Scene compilation cancelled - no name provided', 'warning');
      return;
    }
    
    // Create timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const folderName = `${userName.trim()}-${timestamp}`;
    
    console.log(`Compiling new scene: ${folderName}`);
    this.showNotification(`Compiling scene: ${folderName}...`, 'info');
    
    // Create the scene compilation
    this.createCompiledScene(folderName);
  }

  savePublicScene() {
    // First, ensure all current form values are saved to config
    this.forceUpdateAllModelsFromScene();
    this.forceUpdateSlideshowFromForm();
    this.forceUpdateEnvironmentFromForm();
    
    // Ask user for a name for the public scene
    const sceneName = prompt('Enter a name for this public scene:');
    if (!sceneName || sceneName.trim() === '') {
      this.showNotification('Public scene save cancelled - no name provided', 'warning');
      return;
    }
    
    // Create timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const folderName = `public-${sceneName.trim().replace(/\s+/g, '-').toLowerCase()}-${timestamp}`;
    
    console.log(`Saving public scene: ${folderName}`);
    this.showNotification(`Saving public scene: ${folderName}...`, 'info');
    
    // Create the public scene
    this.createPublicScene(folderName, sceneName.trim());
  }

  async createCompiledScene(folderName) {
    try {
      console.log(`Creating compiled scene: ${folderName}`);
      
      // Read current files
      const htmlContent = await this.readFileContent('index.html');
      const cssContent = await this.readFileContent('style.css');
      const jsContent = await this.readFileContent('script.js');
      
      // Create compiled HTML (remove editor interface)
      const compiledHTML = this.createCompiledHTML(htmlContent);
      
      // Create compiled JS (remove editor functionality)
      const compiledJS = this.createCompiledJS(jsContent);
      
      // Create and download the zip file
      await this.writeCompiledFiles(folderName, compiledHTML, cssContent, compiledJS, museumConfig);
      
      this.showNotification(`Scene compiled successfully! Zip file downloaded: ${folderName}.zip`, 'success');
      
      // Show instructions for loading the scene
      const showInstructions = confirm('Scene compiled! Would you like to see instructions for loading it?');
      if (showInstructions) {
        alert(`To load this compiled scene:\n\n1. Extract the downloaded zip file to a folder\n2. Click "Load Compiled Scene" button\n3. Select the extracted folder\n\nYour scene is now ready to share!`);
      }
      
    } catch (error) {
      console.error('Error compiling scene:', error);
      this.showNotification(`Error compiling scene: ${error.message}`, 'error');
    }
  }

  async createPublicScene(folderName, sceneName) {
    try {
      console.log(`Creating public scene: ${folderName}`);
      
      // Read current files
      const htmlContent = await this.readFileContent('index.html');
      const cssContent = await this.readFileContent('style.css');
      const jsContent = await this.readFileContent('script.js');
      
      // Create public HTML (completely clean, no editor interface)
      const publicHTML = this.createPublicHTML(htmlContent, sceneName);
      
      // Create public JS (only museum functionality, no editor)
      const publicJS = this.createPublicJS(jsContent);
      
      // Create public CSS (clean styles, no editor styles)
      const publicCSS = this.createPublicCSS(cssContent);
      
      // Create and download the zip file
      await this.writePublicFiles(folderName, publicHTML, publicCSS, publicJS, museumConfig, sceneName);
      
      this.showNotification(`Public scene saved successfully! Zip file downloaded: ${folderName}.zip`, 'success');
      
      // Show instructions for the public scene
      const showInstructions = confirm('Public scene saved! Would you like to see instructions for using it?');
      if (showInstructions) {
        alert(`Your public scene is ready!\n\nTo use:\n1. Extract the zip file to a web server\n2. Open index.html in a web browser\n3. Share the URL with others\n\nThis is a clean, viewer-only experience with no editor interface!`);
      }
      
    } catch (error) {
      console.error('Error creating public scene:', error);
      this.showNotification(`Error creating public scene: ${error.message}`, 'error');
    }
  }

  createCompiledHTML(originalHTML) {
    // Remove the editor interface and keep only the A-Frame scene
    let compiledHTML = originalHTML;
    
    // Remove the editor panel
    compiledHTML = compiledHTML.replace(/<div class="editor-panel"[^>]*>[\s\S]*?<\/div>/g, '');
    
    // Remove editor-specific CSS and JS
    compiledHTML = compiledHTML.replace(/<link[^>]*editor[^>]*>/g, '');
    compiledHTML = compiledHTML.replace(/<script[^>]*editor[^>]*><\/script>/g, '');
    
    // Add a simple title
    const titleMatch = compiledHTML.match(/<title>(.*?)<\/title>/);
    if (titleMatch) {
      compiledHTML = compiledHTML.replace(/<title>.*?<\/title>/, `<title>Immersive Museum - Compiled Scene</title>`);
    }
    
    return compiledHTML;
  }

  createCompiledJS(originalJS) {
    // Remove editor-specific functions and keep only the museum functionality
    let compiledJS = originalJS;
    
    // Remove editor classes and functions
    compiledJS = compiledJS.replace(/class ModelEditor[\s\S]*?^}/gm, '');
    compiledJS = compiledJS.replace(/\/\/ Editor-specific functions[\s\S]*?^}/gm, '');
    
    // Keep only the essential museum functionality
    const essentialFunctions = [
      'class MuseumProject',
      'createAssets',
      'createExhibits',
      'createEnvironment',
      'createArrows',
      'setupEventListeners',
      'init'
    ];
    
    // This is a simplified version - in practice, you'd want more sophisticated filtering
    return compiledJS;
  }

  createPublicHTML(originalHTML, sceneName) {
    // Create a completely clean HTML file for public viewing
    let publicHTML = originalHTML;
    
    // Remove the entire editor panel
    publicHTML = publicHTML.replace(/<div class="editor-panel"[^>]*>[\s\S]*?<\/div>/g, '');
    
    // Remove editor-specific CSS and JS
    publicHTML = publicHTML.replace(/<link[^>]*editor[^>]*>/g, '');
    publicHTML = publicHTML.replace(/<script[^>]*editor[^>]*><\/script>/g, '');
    
    // Update title
    publicHTML = publicHTML.replace(/<title>.*?<\/title>/, `<title>${sceneName} - Immersive Museum</title>`);
    
    // Add a simple header for the public scene
    const headerHTML = `
    <div style="position: fixed; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.8); color: white; padding: 10px; text-align: center; z-index: 1000; font-family: Arial, sans-serif;">
      <h1 style="margin: 0; font-size: 24px;">${sceneName}</h1>
      <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.8;">Immersive Museum Experience</p>
    </div>
    `;
    
    // Insert header before the a-scene
    publicHTML = publicHTML.replace(/(<a-scene[^>]*>)/, headerHTML + '\n    $1');
    
    return publicHTML;
  }

  createPublicJS(originalJS) {
    // Create a minimal JS file with only museum functionality
    let publicJS = originalJS;
    
    // Remove all editor-related code
    publicJS = publicJS.replace(/class ModelEditor[\s\S]*?^}/gm, '');
    publicJS = publicJS.replace(/\/\/ Editor-specific functions[\s\S]*?^}/gm, '');
    publicJS = publicJS.replace(/\/\/ Editor event listeners[\s\S]*?^}/gm, '');
    
    // Remove editor initialization
    publicJS = publicJS.replace(/\/\/ Initialize editor[\s\S]*?^}/gm, '');
    publicJS = publicJS.replace(/\/\/ Editor initialization[\s\S]*?^}/gm, '');
    
    // For stability, just return the cleaned JS without embedding new template literals
    return publicJS;
  }

  createPublicCSS(originalCSS) {
    // Create clean CSS for public viewing
    let publicCSS = originalCSS;
    
    // Remove all editor-related styles
    publicCSS = publicCSS.replace(/\/\* Editor styles \*\/[\s\S]*?\/\* End Editor styles \*\//g, '');
    publicCSS = publicCSS.replace(/\.editor-panel[\s\S]*?^}/gm, '');
    publicCSS = publicCSS.replace(/\.editor-section[\s\S]*?^}/gm, '');
    publicCSS = publicCSS.replace(/\.config-actions[\s\S]*?^}/gm, '');
    publicCSS = publicCSS.replace(/\.primary-btn[\s\S]*?^}/gm, '');
    publicCSS = publicCSS.replace(/\.secondary-btn[\s\S]*?^}/gm, '');
    publicCSS = publicCSS.replace(/\.action-btn[\s\S]*?^}/gm, '');
    
    // Add clean public styles
    const publicStyles = `
/* Public Museum Scene Styles */
body {
  margin: 0;
  padding: 0;
  font-family: Arial, sans-serif;
  background: #000;
  overflow: hidden;
}

a-scene {
  width: 100vw;
  height: 100vh;
}

/* Clean, minimal styling for public viewing */
.clickable {
  cursor: pointer;
  transition: all 0.3s ease;
}

.clickable:hover {
  transform: scale(1.1);
}

/* Remove any editor-specific elements */
.editor-panel,
.editor-section,
.config-actions,
.primary-btn,
.secondary-btn,
.action-btn {
  display: none !important;
}
`;

    return publicStyles;
  }

  async writeCompiledFiles(folderName, html, css, js, config) {
    console.log(`Creating zip file: ${folderName}.zip`);
    
    // Create a zip file with all the compiled scene files
    const zip = new JSZip();
    
    // Add files to the zip
    zip.file("index.html", html);
    zip.file("style.css", css);
    zip.file("script.js", js);
    zip.file("config.json", JSON.stringify(config, null, 2));
    
    // Add a README file
    const readmeContent = `# Immersive Museum Scene

This is a compiled scene created with the Immersive Museum Editor.

## Files:
- index.html: The main scene file
- style.css: Styling for the scene
- script.js: JavaScript functionality
- config.json: Scene configuration

## How to use:
1. Extract all files to a web server
2. Open index.html in a web browser
3. Enjoy your immersive museum experience!

## To load back into the editor:
1. Extract this zip file to a folder
2. Use the "Load Compiled Scene" button in the editor
3. Select the extracted folder

Created: ${new Date().toLocaleString()}
`;
    zip.file("README.md", readmeContent);
    
    // Generate the zip file
    const zipBlob = await zip.generateAsync({type: "blob"});
    
    // Download the zip file
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${folderName}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log(`Zip file downloaded: ${folderName}.zip`);
  }

  async writePublicFiles(folderName, html, css, js, config, sceneName) {
    console.log(`Creating public scene zip file: ${folderName}.zip`);
    
    // Create a zip file with all the public scene files
    const zip = new JSZip();
    
    // Add files to the zip
    zip.file("index.html", html);
    zip.file("style.css", css);
    zip.file("script.js", js);
    zip.file("config.json", JSON.stringify(config, null, 2));
    
    // Add a README file for public scenes
    const readmeContent = `# ${sceneName} - Public Museum Scene

This is a public museum scene created with the Immersive Museum Editor.

## What's Included:
- **index.html**: The main scene file (viewer-only experience)
- **style.css**: Clean styling for public viewing
- **script.js**: Minimal JavaScript for museum functionality
- **config.json**: Scene configuration data

## How to Use:
1. Extract all files to a web server
2. Open index.html in a web browser
3. Share the URL with others to experience your museum!

## Features:
- ✅ Clean, professional appearance
- ✅ No editor interface - pure viewing experience
- ✅ Interactive hotspots for exhibit information
- ✅ Responsive design for all devices
- ✅ Ready for public sharing

## Technical Notes:
- This is a viewer-only version with no editing capabilities
- All editor functionality has been removed
- Optimized for public consumption
- Compatible with all modern web browsers

Created: ${new Date().toLocaleString()}
`;
    zip.file("README.md", readmeContent);
    
    // Generate the zip file
    const zipBlob = await zip.generateAsync({type: "blob"});
    
    // Download the zip file
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${folderName}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log(`Public scene zip file downloaded: ${folderName}.zip`);
  }

  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async readFileContent(filename) {
    // In a real implementation, this would read from the file system
    // For now, we'll return the content we have
    if (filename === 'index.html') {
      return document.documentElement.outerHTML;
    } else if (filename === 'style.css') {
      // Get CSS from style tag
      const styleTag = document.querySelector('style');
      return styleTag ? styleTag.textContent : '';
    } else if (filename === 'script.js') {
      // This is tricky - we'd need to get the current script content
      return '// Compiled JavaScript content would go here';
    }
    return '';
  }



  async loadCompiledSceneFromDirectory(files) {
    try {
      console.log(`Loading compiled scene from directory with ${files.length} files`);
      
      let configFile = null;
      let htmlFile = null;
      let cssFile = null;
      let jsFile = null;
      
      // Find the required files
      for (let file of files) {
        const fileName = file.webkitRelativePath || file.name;
        console.log(`Found file in directory: ${fileName}`);
        
        if (fileName.endsWith('config.json')) {
          configFile = file;
        } else if (fileName.endsWith('index.html')) {
          htmlFile = file;
        } else if (fileName.endsWith('style.css')) {
          cssFile = file;
        } else if (fileName.endsWith('script.js')) {
          jsFile = file;
        }
      }
      
      if (!configFile) {
        this.showNotification('No config.json found in selected directory', 'error');
        return;
      }
      
      // Read the config file
      const configText = await this.readFileAsText(configFile);
      const config = JSON.parse(configText);
      
      console.log('Loaded compiled scene config from directory:', config);
      
      // Update the current museum config
      Object.assign(museumConfig, config);
      
      // Clear current scene
      this.clearCurrentScene();
      
      // Recreate everything from the compiled config
      this.museumProject.createAssets();
      this.museumProject.createExhibits();
      
      // Update UI
      this.refreshInterface();
      document.getElementById('model-properties').style.display = 'none';
      this.currentModel = null;
      
      this.showNotification('Compiled scene loaded successfully from directory!', 'success');
      
    } catch (error) {
      console.error('Error loading compiled scene from directory:', error);
      this.showNotification(`Error loading compiled scene: ${error.message}`, 'error');
    }
  }

  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  }

  clearCurrentScene() {
    const scene = document.querySelector('a-scene');
    
    // Clear all exhibits
    const exhibits = scene.querySelectorAll('[id*="-exhibit"]');
    console.log(`Clearing ${exhibits.length} existing exhibits`);
    exhibits.forEach(exhibit => exhibit.remove());
    
    // Clear info display
    const infoDisplay = scene.querySelector('#info-display');
    if (infoDisplay) {
      console.log('Clearing info display');
      infoDisplay.remove();
    }
    
    // Clear environment elements (ground, sky, lights)
    const ground = scene.querySelector('a-plane.ground');
    if (ground) {
      console.log('Clearing ground');
      ground.remove();
    }
    
    const sky = scene.querySelector('a-sky');
    if (sky) {
      console.log('Clearing sky');
      sky.remove();
    }
    
    // Clear lights (but keep the default ones)
    const customLights = scene.querySelectorAll('a-entity[light]');
    customLights.forEach(light => {
      if (light.id && (light.id.includes('ambient') || light.id.includes('directional'))) {
        console.log(`Clearing custom light: ${light.id}`);
        light.remove();
      }
    });
    
    // Clear all model assets
    const assets = document.querySelector('a-assets');
    if (assets) {
      const existingAssets = assets.querySelectorAll('a-asset-item[data-asset-type="3d-model"]');
      console.log(`Clearing ${existingAssets.length} existing model assets`);
      existingAssets.forEach(asset => asset.remove());
    }
    
    console.log('Scene cleared completely');
  }

  addNewModelAssets(config) {
    console.log('Adding new model assets from imported config...');
    const assets = document.querySelector('a-assets');
    if (!assets) {
      console.error('No assets container found');
      return;
    }

    config.exhibits.forEach(exhibit => {
      if (exhibit.model && exhibit.model.src && exhibit.model.src.startsWith('http')) {
        const assetId = exhibit.model.id;
        const modelUrl = exhibit.model.src;
        
        // Check if asset already exists
        const existingAsset = assets.querySelector(`#${assetId}`);
        if (!existingAsset) {
          console.log(`Creating new asset for ${assetId}: ${modelUrl}`);
          
          const newAsset = document.createElement('a-asset-item');
          newAsset.id = assetId;
          newAsset.src = modelUrl;
          newAsset.setAttribute('type', 'gltf');
          newAsset.setAttribute('data-asset-type', '3d-model');
          
          // Add event listeners
          newAsset.addEventListener('loaded', () => {
            console.log(`✅ Imported model asset loaded: ${assetId}`);
          });
          
          newAsset.addEventListener('error', (e) => {
            console.error(`❌ Imported model asset failed: ${assetId}`, e);
          });
          
          assets.appendChild(newAsset);
        } else {
          console.log(`Asset ${assetId} already exists, updating URL if needed`);
          if (existingAsset.src !== modelUrl) {
            existingAsset.src = modelUrl;
            console.log(`Updated existing asset URL: ${assetId} -> ${modelUrl}`);
          }
        }
      }
    });
  }

  importConfiguration(file) {
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.json')) {
      this.showNotification('Please select a JSON file', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target.result);
        
        // Validate config structure
        if (config.exhibits && Array.isArray(config.exhibits)) {
          museumConfig = config;
          this.museumProject.config = config; // Update the museum project's config too
          
          // Completely clear the scene of all exhibits
          const scene = document.querySelector('a-scene');
          const exhibits = scene.querySelectorAll('[id*="-exhibit"]');
          console.log(`Clearing ${exhibits.length} existing exhibits from scene`);
          exhibits.forEach(exhibit => {
            console.log(`Removing exhibit: ${exhibit.id}`);
            exhibit.remove();
          });
          
          // Clear all existing model assets to prevent conflicts
          const assets = document.querySelector('a-assets');
          const existingAssets = assets.querySelectorAll('a-asset-item[data-asset-type="3d-model"]');
          console.log(`Clearing ${existingAssets.length} existing model assets`);
          existingAssets.forEach(asset => {
            console.log(`Removing asset: ${asset.id}`);
            asset.remove();
          });
          
          // Recreate all assets from the new config
          console.log('Recreating all assets from imported config...');
          this.museumProject.createAssets();
          
          // Recreate exhibits with the new config
          console.log('Recreating exhibits with new config...');
          this.museumProject.createExhibits();
          
          // Update UI
          this.refreshInterface(); // Use refresh method
          document.getElementById('model-properties').style.display = 'none';
          this.currentModel = null;
          
          // Load walls and ceilings from config
          this.loadWallsAndCeilingsFromConfig();
          
          // Rebuild scene from Model Editor fields after a delay to ensure everything is loaded
          setTimeout(() => {
            this.rebuildSceneFromEditorFields();
          }, 1000);
          
          this.showNotification(`Configuration loaded from ${file.name}`, 'success');
        } else {
          this.showNotification('Invalid configuration file format - missing exhibits array', 'error');
        }
      } catch (error) {
        this.showNotification(`Error loading ${file.name}: ${error.message}`, 'error');
      }
    };
    reader.readAsText(file);
  }

  refreshInterface() {
    this.showRefreshIndicator();
    
    // Refresh model selector with updated names
    this.populateModelSelector();
    
    // Update the current selection if we have a model selected
    if (this.currentModel) {
      const selector = document.getElementById('model-selector');
      selector.value = this.currentModel.index;
    }
    
    // Update asset references if model URL changed
    this.refreshAssetReferences();
    
    // Hide refresh indicator after a short delay
    setTimeout(() => {
      this.hideRefreshIndicator();
    }, 500);
  }

  showRefreshIndicator() {
    const indicator = document.getElementById('refresh-indicator');
    if (indicator) {
      indicator.style.display = 'flex';
    }
  }

  hideRefreshIndicator() {
    const indicator = document.getElementById('refresh-indicator');
    if (indicator) {
      indicator.style.display = 'none';
    }
  }

  refreshAssetReferences() {
    if (!this.currentModel) return;

    const exhibit = this.currentModel.exhibit;
    const modelUrl = document.getElementById('model-url').value;
    const assetId = document.getElementById('model-asset-id').value;
    
    if (modelUrl && exhibit.model && assetId && modelUrl.trim() !== '') {
      // Update the asset in the assets section if it exists
      const assets = document.querySelector('a-assets');
      if (assets) {
        const existingAsset = assets.querySelector(`#${assetId}`);
        if (!existingAsset && (modelUrl.startsWith('http') || modelUrl.startsWith('https'))) {
          // Add new asset if it's a valid URL and doesn't exist
          const newAsset = document.createElement('a-asset-item');
          newAsset.id = assetId;
          newAsset.src = modelUrl;
          newAsset.setAttribute('type', 'gltf');
          newAsset.setAttribute('data-asset-type', '3d-model');
          
          // Add event listeners for asset loading
          newAsset.addEventListener('loaded', () => {
            console.log('New model asset loaded successfully:', newAsset.id, modelUrl);
          });
          
          newAsset.addEventListener('error', (e) => {
            console.error('New model asset failed to load:', newAsset.id, modelUrl, e.detail);
          });
          
          assets.appendChild(newAsset);
          
          // Update the model source to reference the new asset
          exhibit.model.src = `#${newAsset.id}`;
          
          this.showNotification('New model asset added and loading...', 'success');
        } else if (existingAsset && modelUrl.startsWith('http')) {
          // Update existing asset URL
          existingAsset.src = modelUrl;
          exhibit.model.src = `#${assetId}`;
          console.log('Updated existing asset URL:', assetId, modelUrl);
        }
      }
    }
  }

  // Method to refresh from external config changes
  refreshFromConfig() {
    if (museumConfig && museumConfig.exhibits) {
      this.populateModelSelector();
      
      // If we have a current model selected, refresh its data
      if (this.currentModel && museumConfig.exhibits[this.currentModel.index]) {
        const updatedExhibit = museumConfig.exhibits[this.currentModel.index];
        this.currentModel.exhibit = updatedExhibit;
        this.populateForm(updatedExhibit);
      }
    }
  }

  // Method to monitor config changes
  startConfigMonitoring() {
    // Monitor for changes in the global config - much less frequent
    setInterval(() => {
      if (museumConfig && this.lastConfigHash !== JSON.stringify(museumConfig)) {
        this.lastConfigHash = JSON.stringify(museumConfig);
        console.log('Config change detected, refreshing interface...');
        this.refreshFromConfig();
      }
    }, 30000); // Check every 30 seconds (much less frequent)
    
    // Also monitor for changes in the DOM exhibits - much less frequent
    setInterval(() => {
      this.monitorSceneChanges();
    }, 60000); // Check every 60 seconds (much less frequent)
  }

  monitorSceneChanges() {
    const scene = document.querySelector('a-scene');
    if (!scene) return;
    
    const currentExhibits = scene.querySelectorAll('[id*="-exhibit"]');
    
    // Only refresh if there's a significant mismatch and we're not already refreshing
    if (museumConfig && museumConfig.exhibits && 
        Math.abs(currentExhibits.length - museumConfig.exhibits.length) > 0 &&
        !this.isRefreshing) {
      console.log('Scene exhibit count mismatch detected, refreshing interface...');
      this.isRefreshing = true;
      this.refreshInterface();
      
      // Reset the refresh flag after a delay
      setTimeout(() => {
        this.isRefreshing = false;
      }, 3000);
    }
  }

  updateDebugInfo() {
    const debugInfo = document.getElementById('debug-info');
    if (!debugInfo) return;

    if (!this.currentModel) {
      debugInfo.innerHTML = '<p>Select a model to see debug information...</p>';
      return;
    }

    const exhibit = this.currentModel.exhibit;
    const exhibitEntity = document.getElementById(exhibit.id);
    let debugHTML = '';

    // Exhibit info
    debugHTML += `<p><span class="debug-label">Exhibit ID:</span> <span class="debug-value">${exhibit.id}</span></p>`;
    debugHTML += `<p><span class="debug-label">Exhibit Entity Found:</span> <span class="debug-value">${exhibitEntity ? 'Yes' : 'No'}</span></p>`;
    
    if (exhibitEntity) {
      debugHTML += `<p><span class="debug-label">Exhibit Position:</span> <span class="debug-value">${exhibitEntity.getAttribute('position')}</span></p>`;
      
      // Model info
      const modelEntity = exhibitEntity.querySelector(`#${exhibit.model.id}`) || exhibitEntity.querySelector('[gltf-model]');
      debugHTML += `<p><span class="debug-label">Model Entity Found:</span> <span class="debug-value">${modelEntity ? 'Yes' : 'No'}</span></p>`;
      
      if (modelEntity) {
        debugHTML += `<p><span class="debug-label">Model Position:</span> <span class="debug-value">${modelEntity.getAttribute('position')}</span></p>`;
        debugHTML += `<p><span class="debug-label">Model Scale:</span> <span class="debug-value">${modelEntity.getAttribute('scale')}</span></p>`;
        debugHTML += `<p><span class="debug-label">Model Rotation:</span> <span class="debug-value">${modelEntity.getAttribute('rotation')}</span></p>`;
        debugHTML += `<p><span class="debug-label">GLTF Model:</span> <span class="debug-value">${modelEntity.getAttribute('gltf-model')}</span></p>`;
        
        // Check if model is loaded
        const mesh = modelEntity.getObject3D('mesh');
        debugHTML += `<p><span class="debug-label">Model Mesh:</span> <span class="debug-value">${mesh ? 'Loaded' : 'Not Loaded'}</span></p>`;
      }
      
      // Hotspot info
      const hotspotEntity = exhibitEntity.querySelector(`#${exhibit.hotspot.id}`) || exhibitEntity.querySelector('[spot]');
      debugHTML += `<p><span class="debug-label">Hotspot Entity Found:</span> <span class="debug-value">${hotspotEntity ? 'Yes' : 'No'}</span></p>`;
      
      if (hotspotEntity) {
        debugHTML += `<p><span class="debug-label">Hotspot Position:</span> <span class="debug-value">${hotspotEntity.getAttribute('position')}</span></p>`;
      }
    }

    // Config info
    debugHTML += `<p><span class="debug-label">Config Position:</span> <span class="debug-value">${exhibit.position}</span></p>`;
    debugHTML += `<p><span class="debug-label">Model Config Position:</span> <span class="debug-value">${exhibit.model.position}</span></p>`;
    debugHTML += `<p><span class="debug-label">Hotspot Config Position:</span> <span class="debug-value">${exhibit.hotspot.position}</span></p>`;

    debugInfo.innerHTML = debugHTML;
  }

  applyLoadedConfigDirectly(config) {
    console.log('Applying loaded config directly to scene...');
    
    // Disable real-time updates completely during config application
    this.realtimeUpdatesEnabled = false;
    
    // Apply each exhibit's config values directly to the scene
    config.exhibits.forEach((exhibit, index) => {
      const exhibitEntity = document.getElementById(exhibit.id);
      if (exhibitEntity) {
        console.log(`Applying config for ${exhibit.name}:`, {
          position: exhibit.position,
          modelPosition: exhibit.model.position,
          modelScale: exhibit.model.scale,
          modelRotation: exhibit.model.rotation
        });
        
        // Update exhibit position and name
        exhibitEntity.setAttribute('position', exhibit.position);
        exhibitEntity.setAttribute('data-exhibit-name', exhibit.name);
        
        // Update model entity
        const modelEntity = exhibitEntity.querySelector(`#${exhibit.model.id}`);
        if (modelEntity) {
          modelEntity.setAttribute('position', exhibit.model.position);
          modelEntity.setAttribute('scale', exhibit.model.scale);
          modelEntity.setAttribute('rotation', exhibit.model.rotation);
          modelEntity.setAttribute('data-model-name', exhibit.name);
          console.log(`Model ${exhibit.model.id} updated with loaded values`);
          
          // Update model label
          const labelContainer = exhibitEntity.querySelector(`#${exhibit.model.id}-label-container`);
          if (labelContainer) {
            const labelText = labelContainer.querySelector('a-text');
            if (labelText) {
              labelText.setAttribute('value', exhibit.name);
              console.log(`Updated model label to: ${exhibit.name}`);
            }
          }
        }
        
        // Update hotspot entity
        const hotspotEntity = exhibitEntity.querySelector(`#${exhibit.hotspot.id}`);
        if (hotspotEntity) {
          hotspotEntity.setAttribute('position', exhibit.hotspot.position);
          console.log(`Hotspot ${exhibit.hotspot.id} updated with loaded values`);
        }
      }
    });
    
    // Re-enable real-time updates after config is fully applied
    setTimeout(() => {
      this.realtimeUpdatesEnabled = true;
      console.log('Real-time updates re-enabled after direct config application');
    }, 2000);
    
    console.log('Loaded config applied directly to scene');
  }

  populateFormWithLoadedConfig() {
    // Disable real-time updates temporarily
    this.realtimeUpdatesEnabled = false;
    
    // Clear all form input values first
    const inputs = document.querySelectorAll('#model-properties input[type="text"], #model-properties input[type="number"]');
    inputs.forEach(input => {
      input.value = '';
    });
    
    // Clear textareas
    const textareas = document.querySelectorAll('#model-properties textarea');
    textareas.forEach(textarea => {
      textarea.value = '';
    });
    
    // Re-enable real-time updates after a short delay
    setTimeout(() => {
      this.realtimeUpdatesEnabled = true;
      console.log('Real-time updates re-enabled after config load');
    }, 1000);
    
    console.log('Form cleared and real-time updates temporarily disabled');
  }

  clearFormValues() {
    // Disable real-time updates temporarily
    this.realtimeUpdatesEnabled = false;
    
    // Clear all form input values to prevent conflicts with loaded config
    const inputs = document.querySelectorAll('#model-properties input[type="text"], #model-properties input[type="number"]');
    inputs.forEach(input => {
      input.value = '';
    });
    
    // Clear textareas
    const textareas = document.querySelectorAll('#model-properties textarea');
    textareas.forEach(textarea => {
      textarea.value = '';
    });
    
    // Re-enable real-time updates after a short delay
    setTimeout(() => {
      this.realtimeUpdatesEnabled = true;
      console.log('Real-time updates re-enabled after config load');
    }, 1000);
    
    console.log('Form values cleared and real-time updates temporarily disabled');
  }

  updateCurrentTemplateDisplay() {
    const nameEl = document.getElementById('current-template-name');
    const descEl = document.getElementById('current-template-description');
    
    if (nameEl && descEl) {
      const template = museumConfig?.template || { name: 'Outdoor Exploration', description: 'Open-air farm/field with exhibits and hotspots. Current default experience.' };
      
      nameEl.textContent = template.name || 'Outdoor Exploration';
      descEl.textContent = template.description || 'Open-air farm/field with exhibits and hotspots. Current default experience.';
      
      console.log('Updated template display:', template.name);
    }
  }

  showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  // Slideshow management methods
  loadSlideshowFromConfig() {
    if (!museumConfig?.assets?.images) {
      console.log('❌ No slideshow images in config');
      return;
    }
    
    const config = museumConfig;
    console.log('🔄 Loading slideshow from config...');
    
    // Only load if inputs haven't been manually edited
    const slideshowInputs = [
      'slideshow-image1', 'slideshow-image2', 'slideshow-image3',
      'slideshow-slide1-text', 'slideshow-slide2-text', 'slideshow-slide3-text'
    ];
    
    // Check if any slideshow input has been manually edited
    const hasManualEdits = slideshowInputs.some(inputId => {
      const input = document.getElementById(inputId);
      return input && input.getAttribute('data-manually-edited') === 'true';
    });
    
    // Only load from config if no manual edits have been made
    if (!hasManualEdits) {
      console.log('✅ Loading slideshow data from config (no manual edits detected)');
      
      // Temporarily disable real-time updates to prevent form reset
      const wasEnabled = this.realtimeUpdatesEnabled;
      this.realtimeUpdatesEnabled = false;
      
      // Load image URLs
      const image1 = config.assets.images.image1 || '';
      const image2 = config.assets.images.image2 || '';
      const image3 = config.assets.images.image3 || '';
      
      document.getElementById('slideshow-image1').value = image1;
      document.getElementById('slideshow-image2').value = image2;
      document.getElementById('slideshow-image3').value = image3;
      
      console.log('  Loaded image URLs:', { image1, image2, image3 });
      
      // Load text content
      if (config.infoDisplay?.text?.content) {
        const slide1 = config.infoDisplay.text.content.slide1 || '';
        const slide2 = config.infoDisplay.text.content.slide2 || '';
        const slide3 = config.infoDisplay.text.content.slide3 || '';
        
        document.getElementById('slideshow-slide1-text').value = slide1;
        document.getElementById('slideshow-slide2-text').value = slide2;
        document.getElementById('slideshow-slide3-text').value = slide3;
        
        console.log('  Loaded text content:', { slide1, slide2, slide3 });
      } else {
        console.log('  No text content found in config');
      }
      
      // Load slideshow position
      if (config.infoDisplay?.position) {
        const positionParts = config.infoDisplay.position.split(' ');
        if (positionParts.length === 3) {
          document.getElementById('slideshow-position-x').value = positionParts[0];
          document.getElementById('slideshow-position-y').value = positionParts[1];
          document.getElementById('slideshow-position-z').value = positionParts[2];
          console.log('  Loaded slideshow position:', config.infoDisplay.position);
        }
      } else {
        // Set default position if none exists
        document.getElementById('slideshow-position-x').value = '0';
        document.getElementById('slideshow-position-y').value = '0';
        document.getElementById('slideshow-position-z').value = '0';
        console.log('  Set default slideshow position: 0 0 0');
      }
      
      // Load slideshow rotation
      if (config.infoDisplay?.rotation) {
        const rotationParts = config.infoDisplay.rotation.split(' ');
        if (rotationParts.length === 3) {
          document.getElementById('slideshow-rotation-x').value = rotationParts[0];
          document.getElementById('slideshow-rotation-y').value = rotationParts[1];
          document.getElementById('slideshow-rotation-z').value = rotationParts[2];
          console.log('  Loaded slideshow rotation:', config.infoDisplay.rotation);
        }
      } else {
        // Set default rotation if none exists
        document.getElementById('slideshow-rotation-x').value = '0';
        document.getElementById('slideshow-rotation-y').value = '0';
        document.getElementById('slideshow-rotation-z').value = '0';
        console.log('  Set default slideshow rotation: 0 0 0');
      }
      
      // Re-enable real-time updates after a delay
      setTimeout(() => {
        this.realtimeUpdatesEnabled = true; // Always enable real-time updates
        console.log('Real-time updates re-enabled after slideshow config load');
      }, 100);
    } else {
      console.log('⚠️ Skipping slideshow config load - manual edits detected');
    }
  }

  updateSlideshow() {
    if (!this.museumProject?.config) {
      this.showNotification('No configuration loaded', 'error');
      return;
    }

    const config = this.museumProject.config;
    
    // Update image URLs in config
    if (!config.assets) config.assets = {};
    if (!config.assets.images) config.assets.images = {};
    
    config.assets.images.image1 = document.getElementById('slideshow-image1').value || config.assets.images.image1;
    config.assets.images.image2 = document.getElementById('slideshow-image2').value || config.assets.images.image2;
    config.assets.images.image3 = document.getElementById('slideshow-image3').value || config.assets.images.image3;
    
    // Update text content in config
    if (!config.infoDisplay) config.infoDisplay = {};
    if (!config.infoDisplay.text) config.infoDisplay.text = {};
    if (!config.infoDisplay.text.content) config.infoDisplay.text.content = {};
    
    config.infoDisplay.text.content.slide1 = document.getElementById('slideshow-slide1-text').value || config.infoDisplay.text.content.slide1;
    config.infoDisplay.text.content.slide2 = document.getElementById('slideshow-slide2-text').value || config.infoDisplay.text.content.slide2;
    config.infoDisplay.text.content.slide3 = document.getElementById('slideshow-slide3-text').value || config.infoDisplay.text.content.slide3;
    
    // Update the global config
    museumConfig = config;
    
    // Update image panel references in config
    if (!config.infoDisplay.panel) config.infoDisplay.panel = {};
    config.infoDisplay.panel.images = ["#image1", "#image2", "#image3"];
    
    // Update the actual image assets in the DOM
    this.updateImageAssets(config);
    
    // Refresh the slideshow display
    this.refreshSlideshowDisplay();
    
    // Update slideshow navigation to use new config
    this.updateSlideshowNavigation();
    
    // Clear manual edit flags since we've successfully updated
    this.clearSlideshowEditFlags();
    
    this.showNotification('Slideshow updated successfully!', 'success');
  }

  updateImageAssets(config) {
    // Update the actual image elements in the DOM
    const image1 = document.getElementById('image1');
    const image2 = document.getElementById('image2');
    const image3 = document.getElementById('image3');
    
    if (image1 && config.assets.images.image1) {
      image1.src = config.assets.images.image1;
    }
    if (image2 && config.assets.images.image2) {
      image2.src = config.assets.images.image2;
    }
    if (image3 && config.assets.images.image3) {
      image3.src = config.assets.images.image3;
    }
  }

  refreshSlideshowDisplay() {
    // Refresh the current slideshow display
    const imagePanel = document.querySelector("#image-panel");
    const infoText = document.querySelector("#info-text");
    
    if (imagePanel && this.museumProject) {
      const images = this.museumProject.config.infoDisplay.panel.images;
      const currentIndex = this.museumProject.currentImageIndex || 0;
      
      // Update the image
      imagePanel.setAttribute("material", "src", images[currentIndex]);
      
      // Update the text
      if (infoText) {
        const content = this.museumProject.config.infoDisplay.text.content;
        let textContent = content.default;
        
        switch(currentIndex) {
          case 0:
            textContent = content.slide1 || "Slide 1";
            break;
          case 1:
            textContent = content.slide2 || "Slide 2";
            break;
          case 2:
            textContent = content.slide3 || "Slide 3";
            break;
        }
        
        infoText.setAttribute("text", "value", textContent);
      }
    }
  }

  // Override the slideshow navigation to use updated config
  updateSlideshowNavigation() {
    if (!this.museumProject) return;
    
    // Simply update the config that the existing navigation uses
    // The existing navigation will automatically use the updated config
    // No need to touch the elements at all
    console.log('Slideshow navigation updated with new config');
  }

  clearSlideshowEditFlags() {
    const slideshowInputs = [
      'slideshow-image1', 'slideshow-image2', 'slideshow-image3',
      'slideshow-slide1-text', 'slideshow-slide2-text', 'slideshow-slide3-text'
    ];
    
    slideshowInputs.forEach(inputId => {
      const input = document.getElementById(inputId);
      if (input) {
        input.removeAttribute('data-manually-edited');
      }
    });
  }

  resetSlideshow() {
    // Reset to default values
    document.getElementById('slideshow-image1').value = '';
    document.getElementById('slideshow-image2').value = '';
    document.getElementById('slideshow-image3').value = '';
    
    document.getElementById('slideshow-slide1-text').value = 'Welcome to the Agriquest Garden Museum! Explore vegetables and garden tools in this interactive 3D exhibit. Click on the hotspots to learn more about each item.';
    document.getElementById('slideshow-slide2-text').value = 'Wheelbarrows are essential garden tools that make transporting soil, plants, and materials much easier. They help gardeners work more efficiently.';
    document.getElementById('slideshow-slide3-text').value = 'Onions add flavor to countless dishes worldwide. They contain compounds that may help reduce inflammation and promote heart health.';
    
    // Clear edit flags after reset
    this.clearSlideshowEditFlags();
    
    this.showNotification('Slideshow reset to defaults', 'success');
  }

  previewImage(imageNumber) {
    const inputId = `slideshow-image${imageNumber}`;
    const url = document.getElementById(inputId).value;
    
    if (!url || url.trim() === '') {
      this.showNotification('Please enter an image URL first', 'error');
      return;
    }
    
    // Create a preview window
    const previewWindow = window.open('', '_blank', 'width=600,height=400');
    previewWindow.document.write(`
      <html>
        <head>
          <title>Image Preview ${imageNumber}</title>
          <style>
            body { margin: 0; padding: 20px; background: #000; color: white; font-family: Arial, sans-serif; }
            img { max-width: 100%; max-height: 80vh; display: block; margin: 20px auto; }
            .info { text-align: center; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="info">
            <h2>Slideshow Image ${imageNumber} Preview</h2>
            <p>URL: ${url}</p>
          </div>
          <img src="${url}" alt="Preview Image ${imageNumber}" onload="window.focus()" onerror="document.body.innerHTML='<div style=\\"text-align:center;margin-top:50px;\\"><h2>Error loading image</h2><p>Could not load: ${url}</p></div>'">
        </body>
      </html>
    `);
    
    this.showNotification(`Opening preview for Image ${imageNumber}`, 'info');
  }

  // Environment Control Methods
  loadEnvironmentFromConfig(config = null) {
    // Use provided config or fall back to museumProject config
    const targetConfig = config || this.museumProject?.config;
    if (!targetConfig) return;
    
    const configToUse = targetConfig;
    console.log('🔄 Loading environment from config...');
    console.log('  Config audio assets:', configToUse.assets?.audio);
    
    // Load panorama image URL
    const panoramaUrl = configToUse.environment?.sky?.day || configToUse.assets?.images?.sky || '';
    document.getElementById('panorama-image-url').value = panoramaUrl;
    
    // Load ground texture URL
    const groundUrl = configToUse.environment?.ground?.texture || configToUse.assets?.images?.ground || '';
    document.getElementById('ground-texture-url').value = groundUrl;
    
    // Load ambient audio URL
    const ambientAudioUrl = configToUse.assets?.audio?.ambient || '';
    document.getElementById('ambient-audio-url').value = ambientAudioUrl;
    console.log('  Loaded ambient audio URL:', ambientAudioUrl);
    console.log('  Form field value after setting:', document.getElementById('ambient-audio-url').value);
    
    // Load click sound URL
    const clickSoundUrl = configToUse.assets?.audio?.click || '';
    document.getElementById('click-sound-url').value = clickSoundUrl;
    console.log('  Loaded click sound URL:', clickSoundUrl);
    
    // Load ambient audio setting
    const ambientEnabled = configToUse.soundEffects?.ambientAudioEnabled || false;
    document.getElementById('ambient-audio-enabled').checked = ambientEnabled;
    
    // Load base audio URLs
    if (configToUse.assets?.audio) {
      // Load audio1 URL
      if (configToUse.assets.audio.audio1) {
        document.getElementById('audio1-url').value = configToUse.assets.audio.audio1;
        console.log('  Loaded audio1 URL:', configToUse.assets.audio.audio1);
        console.log('  Form field value after setting:', document.getElementById('audio1-url').value);
      }
      
      // Load audiocarrots URL
      if (configToUse.assets.audio.audiocarrots) {
        document.getElementById('audiocarrots-url').value = configToUse.assets.audio.audiocarrots;
        console.log('  Loaded audiocarrots URL:', configToUse.assets.audio.audiocarrots);
        console.log('  Form field value after setting:', document.getElementById('audiocarrots-url').value);
      }
      
      // Load audioonion URL
      if (configToUse.assets.audio.audioonion) {
        document.getElementById('audioonion-url').value = configToUse.assets.audio.audioonion;
        console.log('  Loaded audioonion URL:', configToUse.assets.audio.audioonion);
        console.log('  Form field value after setting:', document.getElementById('audioonion-url').value);
      }
    }
  }

  uploadPanoramaImage() {
    document.getElementById('panorama-file-input').click();
  }

  handlePanoramaFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.showNotification('Please select a valid image file', 'error');
      return;
    }

    // Validate file size (max 50MB for 360 images)
    if (file.size > 50 * 1024 * 1024) {
      this.showNotification('File size too large. Please select an image smaller than 50MB', 'error');
      return;
    }

    // Create a FileReader to convert to data URL
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      document.getElementById('panorama-image-url').value = dataUrl;
      this.previewPanoramaImage();
      this.showNotification('Panorama image uploaded successfully!', 'success');
    };
    reader.onerror = () => {
      this.showNotification('Error reading file', 'error');
    };
    reader.readAsDataURL(file);
  }

  previewPanoramaImage() {
    const url = document.getElementById('panorama-image-url').value;
    
    if (!url || url.trim() === '') {
      this.showNotification('Please enter a panorama image URL first', 'error');
      return;
    }

    // Show preview in the preview container
    const previewContainer = document.getElementById('panorama-preview');
    const previewImg = document.getElementById('panorama-preview-img');
    
    previewImg.src = url;
    previewImg.onload = () => {
      previewContainer.style.display = 'block';
      this.showNotification('Panorama preview loaded', 'success');
    };
    previewImg.onerror = () => {
      previewContainer.style.display = 'none';
      this.showNotification('Error loading panorama preview', 'error');
    };
  }

  previewGroundTexture() {
    const url = document.getElementById('ground-texture-url').value;
    
    if (!url || url.trim() === '') {
      this.showNotification('Please enter a ground texture URL first', 'error');
      return;
    }
    
    // Create a preview window
    const previewWindow = window.open('', '_blank', 'width=600,height=400');
    previewWindow.document.write(`
      <html>
        <head>
          <title>Ground Texture Preview</title>
          <style>
            body { margin: 0; padding: 20px; background: #000; color: white; font-family: Arial, sans-serif; }
            img { max-width: 100%; max-height: 80vh; display: block; margin: 20px auto; }
            .info { text-align: center; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="info">
            <h2>Ground Texture Preview</h2>
            <p>URL: ${url}</p>
          </div>
          <img src="${url}" alt="Ground Texture Preview" onload="window.focus()" onerror="document.body.innerHTML='<div style=\\"text-align:center;margin-top:50px;\\"><h2>Error loading image</h2><p>Could not load: ${url}</p></div>'">
        </body>
      </html>
    `);
    
    this.showNotification('Opening ground texture preview', 'info');
  }

  previewAmbientAudio() {
    const url = document.getElementById('ambient-audio-url').value;
    
    if (!url || url.trim() === '') {
      this.showNotification('Please enter an ambient audio URL first', 'error');
      return;
    }
    
    // Create a preview window with audio player
    const previewWindow = window.open('', '_blank', 'width=600,height=400');
    previewWindow.document.write(`
      <html>
        <head>
          <title>Ambient Audio Preview</title>
          <style>
            body { margin: 0; padding: 20px; background: #000; color: white; font-family: Arial, sans-serif; text-align: center; }
            .info { margin-bottom: 30px; }
            audio { width: 100%; max-width: 500px; margin: 20px 0; }
            .controls { margin-top: 20px; }
            button { padding: 10px 20px; margin: 5px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; }
            button:hover { background: #0056b3; }
          </style>
        </head>
        <body>
          <div class="info">
            <h2>Ambient Audio Preview</h2>
            <p>URL: ${url}</p>
          </div>
          <audio controls preload="metadata">
            <source src="${url}" type="audio/mpeg">
            <source src="${url}" type="audio/wav">
            <source src="${url}" type="audio/ogg">
            Your browser does not support the audio element.
          </audio>
          <div class="controls">
            <button onclick="document.querySelector('audio').play()">Play</button>
            <button onclick="document.querySelector('audio').pause()">Pause</button>
            <button onclick="document.querySelector('audio').volume = Math.max(0, document.querySelector('audio').volume - 0.1)">Volume Down</button>
            <button onclick="document.querySelector('audio').volume = Math.min(1, document.querySelector('audio').volume + 0.1)">Volume Up</button>
          </div>
        </body>
      </html>
    `);
    
    this.showNotification('Opening ambient audio preview', 'info');
  }

  previewClickSound() {
    const url = document.getElementById('click-sound-url').value;
    
    if (!url || url.trim() === '') {
      this.showNotification('Please enter a click sound URL first', 'error');
      return;
    }
    
    // Create a preview window with audio player
    const previewWindow = window.open('', '_blank', 'width=600,height=400');
    previewWindow.document.write(`
      <html>
        <head>
          <title>Click Sound Preview</title>
          <style>
            body { margin: 0; padding: 20px; background: #000; color: white; font-family: Arial, sans-serif; text-align: center; }
            .info { margin-bottom: 30px; }
            audio { width: 100%; max-width: 500px; margin: 20px 0; }
            .controls { margin-top: 20px; }
            button { padding: 10px 20px; margin: 5px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; }
            button:hover { background: #0056b3; }
          </style>
        </head>
        <body>
          <div class="info">
            <h2>Click Sound Preview</h2>
            <p><strong>URL:</strong> ${url}</p>
          </div>
          <audio controls preload="auto">
            <source src="${url}" type="audio/mpeg">
            <source src="${url}" type="audio/wav">
            <source src="${url}" type="audio/ogg">
            Your browser does not support the audio element.
          </audio>
          <div class="controls">
            <button onclick="document.querySelector('audio').play()">Play</button>
            <button onclick="document.querySelector('audio').pause()">Pause</button>
            <button onclick="document.querySelector('audio').volume = Math.max(0, document.querySelector('audio').volume - 0.1)">Volume Down</button>
            <button onclick="document.querySelector('audio').volume = Math.min(1, document.querySelector('audio').volume + 0.1)">Volume Up</button>
          </div>
        </body>
      </html>
    `);
    
    this.showNotification('Opening click sound preview', 'info');
  }

  previewExhibitAudio(inputId, title) {
    const url = document.getElementById(inputId).value;
    
    if (!url || url.trim() === '') {
      this.showNotification('Please enter an audio URL first', 'error');
      return;
    }
    
    // Handle asset references (e.g., #audio1) by resolving them to actual URLs
    let audioUrl = url;
    if (url.startsWith('#')) {
      const assetId = url.substring(1);
      const audioElement = document.getElementById(assetId);
      if (audioElement && audioElement.src) {
        audioUrl = audioElement.src;
      } else {
        this.showNotification(`Asset reference ${url} not found`, 'error');
        return;
      }
    }
    
    // Create a preview window with audio player
    const previewWindow = window.open('', '_blank', 'width=600,height=400');
    previewWindow.document.write(`
      <html>
        <head>
          <title>${title} Preview</title>
          <style>
            body { margin: 0; padding: 20px; background: #000; color: white; font-family: Arial, sans-serif; text-align: center; }
            .info { margin-bottom: 30px; }
            audio { width: 100%; max-width: 500px; margin: 20px 0; }
            .controls { margin-top: 20px; }
            button { padding: 10px 20px; margin: 5px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; }
            button:hover { background: #0056b3; }
          </style>
        </head>
        <body>
          <div class="info">
            <h2>${title} Preview</h2>
            <p><strong>URL:</strong> ${audioUrl}</p>
            <p><strong>Original Input:</strong> ${url}</p>
          </div>
          <audio controls preload="auto">
            <source src="${audioUrl}" type="audio/mpeg">
            <source src="${audioUrl}" type="audio/wav">
            <source src="${audioUrl}" type="audio/ogg">
            Your browser does not support the audio element.
          </audio>
          <div class="controls">
            <button onclick="document.querySelector('audio').play()">Play</button>
            <button onclick="document.querySelector('audio').pause()">Pause</button>
            <button onclick="document.querySelector('audio').volume = Math.max(0, document.querySelector('audio').volume - 0.1)">Volume Down</button>
            <button onclick="document.querySelector('audio').volume = Math.min(1, document.querySelector('audio').volume + 0.1)">Volume Up</button>
          </div>
        </body>
      </html>
    `);
    
    this.showNotification(`Opening ${title.toLowerCase()} preview`, 'info');
  }

  previewBaseAudio(inputId, title) {
    const url = document.getElementById(inputId).value;
    
    if (!url || url.trim() === '') {
      this.showNotification('Please enter an audio URL first', 'error');
      return;
    }
    
    // Create a preview window with audio player
    const previewWindow = window.open('', '_blank', 'width=600,height=400');
    previewWindow.document.write(`
      <html>
        <head>
          <title>${title} Preview</title>
          <style>
            body { margin: 0; padding: 20px; background: #000; color: white; font-family: Arial, sans-serif; text-align: center; }
            .info { margin-bottom: 30px; }
            audio { width: 100%; max-width: 500px; margin: 20px 0; }
            .controls { margin-top: 20px; }
            button { padding: 10px 20px; margin: 5px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; }
            button:hover { background: #0056b3; }
          </style>
        </head>
        <body>
          <div class="info">
            <h2>${title} Preview</h2>
            <p><strong>URL:</strong> ${url}</p>
          </div>
          <audio controls preload="auto">
            <source src="${url}" type="audio/mpeg">
            <source src="${url}" type="audio/wav">
            <source src="${url}" type="audio/ogg">
            Your browser does not support the audio element.
          </audio>
          <div class="controls">
            <button onclick="document.querySelector('audio').play()">Play</button>
            <button onclick="document.querySelector('audio').pause()">Pause</button>
            <button onclick="document.querySelector('audio').volume = Math.max(0, document.querySelector('audio').volume - 0.1)">Volume Down</button>
            <button onclick="document.querySelector('audio').volume = Math.min(1, document.querySelector('audio').volume + 0.1)">Volume Up</button>
          </div>
        </body>
      </html>
    `);
    
    this.showNotification(`Opening ${title.toLowerCase()} preview`, 'info');
  }

  testAmbientAudio() {
    const audioUrl = document.getElementById('ambient-audio-url').value || 
                     (museumConfig?.assets?.audio?.ambient) || 
                     '';
    
    if (!audioUrl) {
      this.showNotification('No ambient audio URL available', 'error');
      return;
    }
    
    // Create a temporary audio element for testing
    const testAudio = new Audio(audioUrl);
    testAudio.volume = 0.3;
    testAudio.loop = true;
    
    testAudio.onloadeddata = () => {
      testAudio.play();
      this.showNotification('Playing ambient audio... (click again to stop)', 'info');
      
      // Stop after 5 seconds or when clicked again
      setTimeout(() => {
        testAudio.pause();
        testAudio.currentTime = 0;
      }, 5000);
    };
    
    testAudio.onerror = () => {
      this.showNotification('Error loading ambient audio', 'error');
    };
  }

  testClickSound() {
    const audioUrl = document.getElementById('click-sound-url').value || 
                     (museumConfig?.assets?.audio?.click) || 
                     '';
    
    // Create a temporary audio element for testing
    const testAudio = new Audio(audioUrl);
    testAudio.volume = 0.5;
    
    testAudio.onloadeddata = () => {
      testAudio.play();
      this.showNotification('Playing click sound', 'info');
    };
    
    testAudio.onerror = () => {
      this.showNotification('Error loading click sound', 'error');
    };
  }

  testTeleportSound() {
    const audioUrl = museumConfig?.assets?.audio?.teleport || 
                     '';
    
    // Create a temporary audio element for testing
    const testAudio = new Audio(audioUrl);
    testAudio.volume = 0.7;
    
    testAudio.onloadeddata = () => {
      testAudio.play();
      this.showNotification('Playing teleport sound', 'info');
    };
    
    testAudio.onerror = () => {
      this.showNotification('Error loading teleport sound', 'error');
    };
  }

  updateEnvironment() {
    if (!this.museumProject?.config) {
      this.showNotification('No configuration loaded', 'error');
      return;
    }

    const config = this.museumProject.config;
    const panoramaUrl = document.getElementById('panorama-image-url').value;
    const groundUrl = document.getElementById('ground-texture-url').value;
    const ambientAudioUrl = document.getElementById('ambient-audio-url').value;
    
    // Update panorama image in config
    if (panoramaUrl) {
      if (!config.environment) config.environment = {};
      if (!config.environment.sky) config.environment.sky = {};
      
      // Update both day and night sky to the same image
      config.environment.sky.day = panoramaUrl;
      config.environment.sky.night = panoramaUrl;
      
      // Also update in assets for backward compatibility
      if (!config.assets) config.assets = {};
      if (!config.assets.images) config.assets.images = {};
      config.assets.images.sky = panoramaUrl;
    }
    
    // Update ground texture in config
    if (groundUrl) {
      if (!config.environment) config.environment = {};
      if (!config.environment.ground) config.environment.ground = {};
      
      config.environment.ground.texture = groundUrl;
      
      // Also update in assets for backward compatibility
      if (!config.assets) config.assets = {};
      if (!config.assets.images) config.assets.images = {};
      config.assets.images.ground = groundUrl;
    }
    
    // Update ambient audio URL in config
    if (ambientAudioUrl) {
      if (!config.assets) config.assets = {};
      if (!config.assets.audio) config.assets.audio = {};
      
      config.assets.audio.ambient = ambientAudioUrl;
    }
    
    // Update the scene in real-time
    this.updateSceneEnvironment(panoramaUrl, groundUrl);
    
    // Refresh sound effects component with new audio URLs
    this.refreshSoundEffects();
    
    this.showNotification('Environment updated successfully!', 'success');
  }

  updateSceneEnvironment(panoramaUrl, groundUrl) {
    // Update the sky element
    if (panoramaUrl) {
      const sky = document.querySelector('a-sky');
      if (sky) {
        sky.setAttribute('src', panoramaUrl);
        console.log('Updated sky with new panorama:', panoramaUrl);
      }
    }
    
    // Update the ground element
    if (groundUrl) {
      const ground = document.querySelector('a-plane.ground');
      if (ground) {
        ground.setAttribute('material', 'src', groundUrl);
        console.log('Updated ground with new texture:', groundUrl);
      } else {
        console.log('❌ Ground element not found for update');
      }
    }
  }

  updateAmbientAudioSetting(enabled) {
    if (!this.museumProject?.config) return;

    const config = this.museumProject.config;
    if (!config.soundEffects) config.soundEffects = {};
    
    config.soundEffects.ambientAudioEnabled = enabled;
    
    // Update the global museum config
    museumConfig = config;
    
    console.log('Ambient audio setting updated:', enabled);
    
    // Control actual playback
    const soundEffectsEntity = document.querySelector('[sound-effects]');
    if (soundEffectsEntity && soundEffectsEntity.components['sound-effects']) {
      const soundComponent = soundEffectsEntity.components['sound-effects'];
      
      if (enabled && soundComponent.sounds.ambient) {
        console.log('🔊 Starting ambient audio...');
        soundComponent.sounds.ambient.play();
      } else if (!enabled && soundComponent.sounds.ambient) {
        console.log('🔇 Stopping ambient audio...');
        soundComponent.sounds.ambient.stop();
      }
    }
    
    this.showNotification(`Ambient audio ${enabled ? 'enabled' : 'disabled'}`, 'success');
  }

  resetEnvironment() {
    // Reset to values from config only - no hard-coded defaults
    const config = museumConfig;
    
    if (config?.environment?.sky?.day) {
      document.getElementById('panorama-image-url').value = config.environment.sky.day;
    } else {
      document.getElementById('panorama-image-url').value = '';
    }
    
    if (config?.environment?.ground?.texture) {
      document.getElementById('ground-texture-url').value = config.environment.ground.texture;
    } else {
      document.getElementById('ground-texture-url').value = '';
    }
    
    if (config?.assets?.audio?.ambient) {
      document.getElementById('ambient-audio-url').value = config.assets.audio.ambient;
    } else {
      document.getElementById('ambient-audio-url').value = '';
    }
    
    if (config?.assets?.audio?.click) {
      document.getElementById('click-sound-url').value = config.assets.audio.click;
    } else {
      document.getElementById('click-sound-url').value = '';
    }
    
    // Reset base audio URLs from config only
    if (config?.assets?.audio) {
      // Reset audio1 URL
      document.getElementById('audio1-url').value = config.assets.audio.audio1 || '';
      
      // Reset audiocarrots URL
      document.getElementById('audiocarrots-url').value = config.assets.audio.audiocarrots || '';
      
      // Reset audioonion URL
      document.getElementById('audioonion-url').value = config.assets.audio.audioonion || '';
    } else {
      // Clear all audio URLs if no config
      document.getElementById('audio1-url').value = '';
      document.getElementById('audiocarrots-url').value = '';
      document.getElementById('audioonion-url').value = '';
    }
    
    // Hide preview
    document.getElementById('panorama-preview').style.display = 'none';
    
    this.showNotification('Environment reset to defaults', 'success');
  }

  refreshSoundEffects() {
    console.log('🔄 Refreshing sound effects...');
    // Find the sound-effects component in the scene
    const soundEffectsEntity = document.querySelector('[sound-effects]');
    if (soundEffectsEntity && soundEffectsEntity.components['sound-effects']) {
      const soundComponent = soundEffectsEntity.components['sound-effects'];
      
      // Update the sound URLs if they've changed
      const config = museumConfig;
      console.log('  Config audio assets:', config?.assets?.audio);
      console.log('  Ambient audio enabled:', config?.soundEffects?.ambientAudioEnabled);
      
      if (config.assets?.audio) {
        // Stop any currently playing ambient audio
        if (soundComponent.sounds.ambient) {
          console.log('  Stopping current ambient audio...');
          soundComponent.sounds.ambient.stop();
        }
        
        // Update ambient audio
        if (config.assets.audio.ambient) {
          soundComponent.sounds.ambient = new Howl({
            src: [config.assets.audio.ambient],
            loop: true,
            volume: 0.3,
            autoplay: false
          });
          
          // Play ambient audio if enabled
          if (config?.soundEffects?.ambientAudioEnabled) {
            console.log('🔊 Playing updated ambient audio...');
            soundComponent.sounds.ambient.play();
          }
        }
        
        // Update click sound
        if (config.assets.audio.click) {
          soundComponent.sounds.click = new Howl({
            src: [config.assets.audio.click],
            volume: 0.5
          });
        }
        
        // Update teleport sound
        if (config.assets.audio.teleport) {
          soundComponent.sounds.teleport = new Howl({
            src: [config.assets.audio.teleport],
            volume: 0.7
          });
        }
        
        console.log('Sound effects refreshed with new URLs');
      }
    }
  }

  // Walls and Ceilings Management
  initWallsAndCeilings() {
    this.walls = [];
    this.ceilings = [];
    this.setupWallsAndCeilingsEventListeners();
    this.loadWallsAndCeilingsFromConfig();
  }

  setupWallsAndCeilingsEventListeners() {
    // Add wall button
    document.getElementById('add-wall')?.addEventListener('click', () => {
      this.addWall();
    });

    // Add ceiling button
    document.getElementById('add-ceiling')?.addEventListener('click', () => {
      this.addCeiling();
    });

    // Update walls and ceilings button
    document.getElementById('update-walls-ceilings')?.addEventListener('click', () => {
      this.updateWallsAndCeilings();
    });

    // Reset walls and ceilings button
    document.getElementById('reset-walls-ceilings')?.addEventListener('click', () => {
      this.resetWallsAndCeilings();
    });

    // Toggle gizmos button
    document.getElementById('toggle-gizmos')?.addEventListener('click', () => {
      this.toggleGizmos();
    });
  }

  addWall() {
    const wallId = `wall_${Date.now()}`;
    const wall = {
      id: wallId,
      name: `Wall ${this.walls.length + 1}`,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      width: 10,
      height: 3,
      texture: '',
      tilingX: 1,
      tilingY: 1,
      brightness: 1,
      color: '#cccccc',
      visible: true
    };
    
    this.walls.push(wall);
    this.renderWallsList();
    this.createWallInScene(wall);
  }

  addCeiling() {
    const ceilingId = `ceiling_${Date.now()}`;
    const ceiling = {
      id: ceilingId,
      name: `Ceiling ${this.ceilings.length + 1}`,
      position: { x: 0, y: 3, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      width: 10,
      height: 10,
      texture: '',
      tilingX: 1,
      tilingY: 1,
      brightness: 1,
      color: '#ffffff',
      visible: true
    };
    
    this.ceilings.push(ceiling);
    this.renderCeilingsList();
    this.createCeilingInScene(ceiling);
  }

  renderWallsList() {
    const wallsList = document.getElementById('walls-list');
    const wallCount = document.getElementById('wall-count');
    
    if (!wallsList || !wallCount) return;

    wallCount.textContent = `${this.walls.length} walls`;
    wallsList.innerHTML = '';

    this.walls.forEach((wall, index) => {
      const wallItem = document.createElement('div');
      wallItem.className = 'wall-item';
      wallItem.innerHTML = `
        <div class="wall-item-header">
          <div class="wall-item-title">${wall.name}</div>
          <div class="wall-item-controls">
            <button class="duplicate-btn" data-wall-id="${wall.id}">Duplicate</button>
            <button class="delete-btn" data-wall-id="${wall.id}">Delete</button>
          </div>
        </div>
        <div class="wall-properties">
          <div class="wall-property">
            <label>Name:</label>
            <input type="text" data-wall-id="${wall.id}" data-property="name" value="${wall.name}">
          </div>
          <div class="wall-property">
            <label>Position X:</label>
            <input type="number" data-wall-id="${wall.id}" data-property="position.x" value="${wall.position.x}" step="0.1">
          </div>
          <div class="wall-property">
            <label>Position Y:</label>
            <input type="number" data-wall-id="${wall.id}" data-property="position.y" value="${wall.position.y}" step="0.1">
          </div>
          <div class="wall-property">
            <label>Position Z:</label>
            <input type="number" data-wall-id="${wall.id}" data-property="position.z" value="${wall.position.z}" step="0.1">
          </div>
          <div class="wall-property">
            <label>Render Order:</label>
            <input type="number" data-wall-id="${wall.id}" data-property="renderOrder" value="${wall.renderOrder || 0}" step="1" title="Higher values render in front">
          </div>
          <div class="wall-property">
            <label>Transparent:</label>
            <input type="checkbox" data-wall-id="${wall.id}" data-property="transparent" ${wall.transparent ? 'checked' : ''} title="Make wall semi-transparent to avoid occlusion">
          </div>
          <div class="wall-property">
            <label>Rotation X:</label>
            <input type="number" data-wall-id="${wall.id}" data-property="rotation.x" value="${wall.rotation.x}" step="1">
          </div>
          <div class="wall-property">
            <label>Rotation Y:</label>
            <input type="number" data-wall-id="${wall.id}" data-property="rotation.y" value="${wall.rotation.y}" step="1">
          </div>
          <div class="wall-property">
            <label>Rotation Z:</label>
            <input type="number" data-wall-id="${wall.id}" data-property="rotation.z" value="${wall.rotation.z}" step="1">
          </div>
          <div class="wall-property">
            <label>Width:</label>
            <input type="number" data-wall-id="${wall.id}" data-property="width" value="${wall.width}" step="0.1" min="0.1">
          </div>
          <div class="wall-property">
            <label>Height:</label>
            <input type="number" data-wall-id="${wall.id}" data-property="height" value="${wall.height}" step="0.1" min="0.1">
          </div>
          <div class="wall-property full-width">
            <label>Texture URL:</label>
            <input type="url" data-wall-id="${wall.id}" data-property="texture" value="${wall.texture}" placeholder="https://...">
            <div class="texture-preview" data-wall-id="${wall.id}">
              ${wall.texture ? `<img src="${wall.texture}" alt="Texture preview">` : 'No texture'}
            </div>
          </div>
          <div class="wall-property">
            <label>Texture Tiling X:</label>
            <input type="number" data-wall-id="${wall.id}" data-property="tilingX" value="${wall.tilingX || 1}" step="0.1" min="0.1" max="10">
          </div>
          <div class="wall-property">
            <label>Texture Tiling Y:</label>
            <input type="number" data-wall-id="${wall.id}" data-property="tilingY" value="${wall.tilingY || 1}" step="0.1" min="0.1" max="10">
          </div>
          <div class="wall-property">
            <label>Texture Brightness:</label>
            <input type="range" data-wall-id="${wall.id}" data-property="brightness" value="${wall.brightness || 1}" min="0" max="2" step="0.1">
            <span class="brightness-value">${wall.brightness || 1}</span>
          </div>
          <div class="wall-property">
            <label>Wall Color:</label>
            <input type="color" data-wall-id="${wall.id}" data-property="color" value="${wall.color || '#cccccc'}" style="width: 100%; height: 30px; border: none; border-radius: 4px; cursor: pointer;">
          </div>
          <div class="wall-property">
            <label>
              <input type="checkbox" data-wall-id="${wall.id}" data-property="visible" ${wall.visible ? 'checked' : ''}>
              Visible
            </label>
          </div>
        </div>
      `;
      wallsList.appendChild(wallItem);
    });

    // Add event listeners for wall controls
    wallsList.querySelectorAll('.duplicate-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const wallId = e.target.dataset.wallId;
        this.duplicateWall(wallId);
      });
    });

    wallsList.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const wallId = e.target.dataset.wallId;
        this.deleteWall(wallId);
      });
    });

    wallsList.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', (e) => {
        const wallId = e.target.dataset.wallId;
        const property = e.target.dataset.property;
        this.updateWallProperty(wallId, property, e.target.value);
        
        // Update brightness value display
        if (property === 'brightness') {
          const brightnessValue = wallsList.querySelector(`input[data-wall-id="${wallId}"][data-property="brightness"]`).nextElementSibling;
          if (brightnessValue) {
            brightnessValue.textContent = e.target.value;
          }
        }
      });
    });
  }

  renderCeilingsList() {
    const ceilingsList = document.getElementById('ceilings-list');
    const ceilingCount = document.getElementById('ceiling-count');
    
    if (!ceilingsList || !ceilingCount) return;

    ceilingCount.textContent = `${this.ceilings.length} ceilings`;
    ceilingsList.innerHTML = '';

    this.ceilings.forEach((ceiling, index) => {
      const ceilingItem = document.createElement('div');
      ceilingItem.className = 'ceiling-item';
      ceilingItem.innerHTML = `
        <div class="ceiling-item-header">
          <div class="ceiling-item-title">${ceiling.name}</div>
          <div class="ceiling-item-controls">
            <button class="duplicate-btn" data-ceiling-id="${ceiling.id}">Duplicate</button>
            <button class="delete-btn" data-ceiling-id="${ceiling.id}">Delete</button>
          </div>
        </div>
        <div class="ceiling-properties">
          <div class="ceiling-property">
            <label>Name:</label>
            <input type="text" data-ceiling-id="${ceiling.id}" data-property="name" value="${ceiling.name}">
          </div>
          <div class="ceiling-property">
            <label>Position X:</label>
            <input type="number" data-ceiling-id="${ceiling.id}" data-property="position.x" value="${ceiling.position.x}" step="0.1">
          </div>
          <div class="ceiling-property">
            <label>Position Y:</label>
            <input type="number" data-ceiling-id="${ceiling.id}" data-property="position.y" value="${ceiling.position.y}" step="0.1">
          </div>
          <div class="ceiling-property">
            <label>Position Z:</label>
            <input type="number" data-ceiling-id="${ceiling.id}" data-property="position.z" value="${ceiling.position.z}" step="0.1">
          </div>
          <div class="ceiling-property">
            <label>Render Order:</label>
            <input type="number" data-ceiling-id="${ceiling.id}" data-property="renderOrder" value="${ceiling.renderOrder || 0}" step="1" title="Higher values render in front">
          </div>
          <div class="ceiling-property">
            <label>Transparent:</label>
            <input type="checkbox" data-ceiling-id="${ceiling.id}" data-property="transparent" ${ceiling.transparent ? 'checked' : ''} title="Make ceiling semi-transparent to avoid occlusion">
          </div>
          <div class="ceiling-property">
            <label>Rotation X:</label>
            <input type="number" data-ceiling-id="${ceiling.id}" data-property="rotation.x" value="${ceiling.rotation.x}" step="1">
          </div>
          <div class="ceiling-property">
            <label>Rotation Y:</label>
            <input type="number" data-ceiling-id="${ceiling.id}" data-property="rotation.y" value="${ceiling.rotation.y}" step="1">
          </div>
          <div class="ceiling-property">
            <label>Rotation Z:</label>
            <input type="number" data-ceiling-id="${ceiling.id}" data-property="rotation.z" value="${ceiling.rotation.z}" step="1">
          </div>
          <div class="ceiling-property">
            <label>Width:</label>
            <input type="number" data-ceiling-id="${ceiling.id}" data-property="width" value="${ceiling.width}" step="0.1" min="0.1">
          </div>
          <div class="ceiling-property">
            <label>Height:</label>
            <input type="number" data-ceiling-id="${ceiling.id}" data-property="height" value="${ceiling.height}" step="0.1" min="0.1">
          </div>
          <div class="ceiling-property full-width">
            <label>Texture URL:</label>
            <input type="url" data-ceiling-id="${ceiling.id}" data-property="texture" value="${ceiling.texture}" placeholder="https://...">
            <div class="texture-preview" data-ceiling-id="${ceiling.id}">
              ${ceiling.texture ? `<img src="${ceiling.texture}" alt="Texture preview">` : 'No texture'}
            </div>
          </div>
          <div class="ceiling-property">
            <label>Texture Tiling X:</label>
            <input type="number" data-ceiling-id="${ceiling.id}" data-property="tilingX" value="${ceiling.tilingX || 1}" step="0.1" min="0.1" max="10">
          </div>
          <div class="ceiling-property">
            <label>Texture Tiling Y:</label>
            <input type="number" data-ceiling-id="${ceiling.id}" data-property="tilingY" value="${ceiling.tilingY || 1}" step="0.1" min="0.1" max="10">
          </div>
          <div class="ceiling-property">
            <label>Texture Brightness:</label>
            <input type="range" data-ceiling-id="${ceiling.id}" data-property="brightness" value="${ceiling.brightness || 1}" min="0" max="2" step="0.1">
            <span class="brightness-value">${ceiling.brightness || 1}</span>
          </div>
          <div class="ceiling-property">
            <label>Ceiling Color:</label>
            <input type="color" data-ceiling-id="${ceiling.id}" data-property="color" value="${ceiling.color || '#ffffff'}" style="width: 100%; height: 30px; border: none; border-radius: 4px; cursor: pointer;">
          </div>
          <div class="ceiling-property">
            <label>
              <input type="checkbox" data-ceiling-id="${ceiling.id}" data-property="visible" ${ceiling.visible ? 'checked' : ''}>
              Visible
            </label>
          </div>
        </div>
      `;
      ceilingsList.appendChild(ceilingItem);
    });

    // Add event listeners for ceiling controls
    ceilingsList.querySelectorAll('.duplicate-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const ceilingId = e.target.dataset.ceilingId;
        this.duplicateCeiling(ceilingId);
      });
    });

    ceilingsList.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const ceilingId = e.target.dataset.ceilingId;
        this.deleteCeiling(ceilingId);
      });
    });

    ceilingsList.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', (e) => {
        const ceilingId = e.target.dataset.ceilingId;
        const property = e.target.dataset.property;
        this.updateCeilingProperty(ceilingId, property, e.target.value);
        
        // Update brightness value display
        if (property === 'brightness') {
          const brightnessValue = ceilingsList.querySelector(`input[data-ceiling-id="${ceilingId}"][data-property="brightness"]`).nextElementSibling;
          if (brightnessValue) {
            brightnessValue.textContent = e.target.value;
          }
        }
      });
    });
  }

  updateWallProperty(wallId, property, value) {
    const wall = this.walls.find(w => w.id === wallId);
    if (!wall) return;

    if (property.includes('.')) {
      const [parent, child] = property.split('.');
      wall[parent][child] = property.includes('position') || property.includes('rotation') ? 
        parseFloat(value) || 0 : value;
    } else if (property === 'visible') {
      wall[property] = value === 'on' || value === true;
    } else if (property === 'width' || property === 'height') {
      wall[property] = parseFloat(value) || 0.1;
    } else if (property === 'tilingX' || property === 'tilingY') {
      wall[property] = parseFloat(value) || 1;
    } else if (property === 'brightness') {
      wall[property] = parseFloat(value) || 1;
    } else if (property === 'color') {
      wall[property] = value;
    } else if (property === 'renderOrder') {
      wall[property] = parseInt(value) || 0;
    } else if (property === 'transparent') {
      wall[property] = value === 'on' || value === true;
    } else {
      wall[property] = value;
    }

    this.updateWallInScene(wall);
  }

  updateCeilingProperty(ceilingId, property, value) {
    const ceiling = this.ceilings.find(c => c.id === ceilingId);
    if (!ceiling) return;

    if (property.includes('.')) {
      const [parent, child] = property.split('.');
      ceiling[parent][child] = property.includes('position') || property.includes('rotation') ? 
        parseFloat(value) || 0 : value;
    } else if (property === 'visible') {
      ceiling[property] = value === 'on' || value === true;
    } else if (property === 'width' || property === 'height') {
      ceiling[property] = parseFloat(value) || 0.1;
    } else if (property === 'tilingX' || property === 'tilingY') {
      ceiling[property] = parseFloat(value) || 1;
    } else if (property === 'brightness') {
      ceiling[property] = parseFloat(value) || 1;
    } else if (property === 'color') {
      ceiling[property] = value;
    } else if (property === 'renderOrder') {
      ceiling[property] = parseInt(value) || 0;
    } else if (property === 'transparent') {
      ceiling[property] = value === 'on' || value === true;
    } else {
      ceiling[property] = value;
    }

    this.updateCeilingInScene(ceiling);
  }

  duplicateWall(wallId) {
    const wall = this.walls.find(w => w.id === wallId);
    if (!wall) return;

    const newWall = {
      ...wall,
      id: `wall_${Date.now()}`,
      name: `${wall.name} Copy`,
      position: { ...wall.position, x: wall.position.x + 2 }
    };

    this.walls.push(newWall);
    this.renderWallsList();
    this.createWallInScene(newWall);
  }

  duplicateCeiling(ceilingId) {
    const ceiling = this.ceilings.find(c => c.id === ceilingId);
    if (!ceiling) return;

    const newCeiling = {
      ...ceiling,
      id: `ceiling_${Date.now()}`,
      name: `${ceiling.name} Copy`,
      position: { ...ceiling.position, x: ceiling.position.x + 2 }
    };

    this.ceilings.push(newCeiling);
    this.renderCeilingsList();
    this.createCeilingInScene(newCeiling);
  }

  deleteWall(wallId) {
    this.walls = this.walls.filter(w => w.id !== wallId);
    this.renderWallsList();
    this.removeWallFromScene(wallId);
  }

  deleteCeiling(ceilingId) {
    this.ceilings = this.ceilings.filter(c => c.id !== ceilingId);
    this.renderCeilingsList();
    this.removeCeilingFromScene(ceilingId);
  }

  createWallInScene(wall) {
    const scene = document.querySelector('a-scene');
    if (!scene) return;

    const wallEntity = document.createElement('a-plane');
    wallEntity.setAttribute('id', `wall-${wall.id}`);
    wallEntity.setAttribute('position', `${wall.position.x} ${wall.position.y} ${wall.position.z}`);
    wallEntity.setAttribute('rotation', `${wall.rotation.x} ${wall.rotation.y} ${wall.rotation.z}`);
    wallEntity.setAttribute('width', wall.width);
    wallEntity.setAttribute('height', wall.height);
    wallEntity.setAttribute('geometry', `primitive: plane; width: ${wall.width}; height: ${wall.height}`);
    const tilingX = wall.tilingX || 1;
    const tilingY = wall.tilingY || 1;
    const brightness = wall.brightness || 1;
    const color = wall.color || '#cccccc';
    
    if (wall.texture) {
      const opacity = wall.transparent ? 0.3 : brightness;
      this.setMaterialWhenAssetReady(wallEntity, wall.texture, `side: double; repeat: ${tilingX} ${tilingY}; opacity: ${opacity}; depthTest: true; depthWrite: true; transparent: ${wall.transparent || false}`);
    } else {
      const opacity = wall.transparent ? 0.3 : 1;
      wallEntity.setAttribute('material', `color: ${color}; side: double; depthTest: true; depthWrite: true; transparent: ${wall.transparent || false}; opacity: ${opacity}`);
    }
    wallEntity.setAttribute('visible', wall.visible);
    if (wall.renderOrder !== undefined) {
      wallEntity.setAttribute('render-order', wall.renderOrder);
    } else {
      wallEntity.setAttribute('render-order', -1); // Default to render behind other objects
    }
    wallEntity.classList.add('wall-element');

    // Add manipulation gizmo
    this.createWallGizmo(wall);

    scene.appendChild(wallEntity);
  }

  createCeilingInScene(ceiling) {
    const scene = document.querySelector('a-scene');
    if (!scene) return;

    const ceilingEntity = document.createElement('a-plane');
    ceilingEntity.setAttribute('id', `ceiling-${ceiling.id}`);
    ceilingEntity.setAttribute('position', `${ceiling.position.x} ${ceiling.position.y} ${ceiling.position.z}`);
    ceilingEntity.setAttribute('rotation', `${ceiling.rotation.x} ${ceiling.rotation.y} ${ceiling.rotation.z}`);
    ceilingEntity.setAttribute('width', ceiling.width);
    ceilingEntity.setAttribute('height', ceiling.height);
    ceilingEntity.setAttribute('geometry', `primitive: plane; width: ${ceiling.width}; height: ${ceiling.height}`);
    const tilingX = ceiling.tilingX || 1;
    const tilingY = ceiling.tilingY || 1;
    const brightness = ceiling.brightness || 1;
    const color = ceiling.color || '#ffffff';
    
    if (ceiling.texture) {
      const opacity = ceiling.transparent ? 0.3 : brightness;
      this.setMaterialWhenAssetReady(ceilingEntity, ceiling.texture, `side: double; repeat: ${tilingX} ${tilingY}; opacity: ${opacity}; depthTest: true; depthWrite: true; transparent: ${ceiling.transparent || false}`);
    } else {
      const opacity = ceiling.transparent ? 0.3 : 1;
      ceilingEntity.setAttribute('material', `color: ${color}; side: double; depthTest: true; depthWrite: true; transparent: ${ceiling.transparent || false}; opacity: ${opacity}`);
    }
    ceilingEntity.setAttribute('visible', ceiling.visible);
    if (ceiling.renderOrder !== undefined) {
      ceilingEntity.setAttribute('render-order', ceiling.renderOrder);
    } else {
      ceilingEntity.setAttribute('render-order', -1); // Default to render behind other objects
    }
    ceilingEntity.classList.add('ceiling-element');

    // Add manipulation gizmo
    this.createCeilingGizmo(ceiling);

    scene.appendChild(ceilingEntity);
  }

  updateWallInScene(wall) {
    const wallEntity = document.querySelector(`#wall-${wall.id}`);
    if (!wallEntity) return;

    wallEntity.setAttribute('position', `${wall.position.x} ${wall.position.y} ${wall.position.z}`);
    wallEntity.setAttribute('rotation', `${wall.rotation.x} ${wall.rotation.y} ${wall.rotation.z}`);
    wallEntity.setAttribute('width', wall.width);
    wallEntity.setAttribute('height', wall.height);
    const tilingX = wall.tilingX || 1;
    const tilingY = wall.tilingY || 1;
    const brightness = wall.brightness || 1;
    const color = wall.color || '#cccccc';
    
    if (wall.texture) {
      const opacity = wall.transparent ? 0.3 : brightness;
      this.setMaterialWhenAssetReady(wallEntity, wall.texture, `side: double; repeat: ${tilingX} ${tilingY}; opacity: ${opacity}; depthTest: true; depthWrite: true; transparent: ${wall.transparent || false}`);
    } else {
      const opacity = wall.transparent ? 0.3 : 1;
      wallEntity.setAttribute('material', `color: ${color}; side: double; depthTest: true; depthWrite: true; transparent: ${wall.transparent || false}; opacity: ${opacity}`);
    }
    wallEntity.setAttribute('visible', wall.visible);

    // Update gizmo position
    this.updateWallGizmo(wall);
  }

  updateCeilingInScene(ceiling) {
    const ceilingEntity = document.querySelector(`#ceiling-${ceiling.id}`);
    if (!ceilingEntity) return;

    ceilingEntity.setAttribute('position', `${ceiling.position.x} ${ceiling.position.y} ${ceiling.position.z}`);
    ceilingEntity.setAttribute('rotation', `${ceiling.rotation.x} ${ceiling.rotation.y} ${ceiling.rotation.z}`);
    ceilingEntity.setAttribute('width', ceiling.width);
    ceilingEntity.setAttribute('height', ceiling.height);
    const tilingX = ceiling.tilingX || 1;
    const tilingY = ceiling.tilingY || 1;
    const brightness = ceiling.brightness || 1;
    const color = ceiling.color || '#ffffff';
    
    if (ceiling.texture) {
      const opacity = ceiling.transparent ? 0.3 : brightness;
      this.setMaterialWhenAssetReady(ceilingEntity, ceiling.texture, `side: double; repeat: ${tilingX} ${tilingY}; opacity: ${opacity}; depthTest: true; depthWrite: true; transparent: ${ceiling.transparent || false}`);
    } else {
      const opacity = ceiling.transparent ? 0.3 : 1;
      ceilingEntity.setAttribute('material', `color: ${color}; side: double; depthTest: true; depthWrite: true; transparent: ${ceiling.transparent || false}; opacity: ${opacity}`);
    }
    ceilingEntity.setAttribute('visible', ceiling.visible);

    // Update gizmo position
    this.updateCeilingGizmo(ceiling);
  }

  removeWallFromScene(wallId) {
    const wallEntity = document.querySelector(`#wall-${wallId}`);
    if (wallEntity) {
      wallEntity.remove();
    }
    // Remove gizmo
    const gizmo = document.querySelector(`#gizmo-wall-${wallId}`);
    if (gizmo) {
      gizmo.remove();
    }
  }

  removeCeilingFromScene(ceilingId) {
    const ceilingEntity = document.querySelector(`#ceiling-${ceilingId}`);
    if (ceilingEntity) {
      ceilingEntity.remove();
    }
    // Remove gizmo
    const gizmo = document.querySelector(`#gizmo-ceiling-${ceilingId}`);
    if (gizmo) {
      gizmo.remove();
    }
  }

  // Gizmo creation and manipulation functions
  createWallGizmo(wall) {
    const scene = document.querySelector('a-scene');
    if (!scene) return;

    // Remove existing gizmo if it exists
    const existingGizmo = document.querySelector(`#gizmo-wall-${wall.id}`);
    if (existingGizmo) {
      existingGizmo.remove();
    }

    const gizmo = document.createElement('a-entity');
    gizmo.setAttribute('id', `gizmo-wall-${wall.id}`);
    gizmo.setAttribute('position', `${wall.position.x} ${wall.position.y} ${wall.position.z}`);
    gizmo.classList.add('manipulation-gizmo');

    // X+ axis arrow (red)
    const xArrow = document.createElement('a-cone');
    xArrow.setAttribute('position', '1 0 0');
    xArrow.setAttribute('rotation', '0 0 -90');
    xArrow.setAttribute('radius-bottom', '0.1');
    xArrow.setAttribute('height', '0.5');
    xArrow.setAttribute('material', 'color: #ff0000');
    xArrow.setAttribute('data-axis', 'x+');
    xArrow.setAttribute('data-wall-id', wall.id);
    xArrow.classList.add('gizmo-arrow');
    gizmo.appendChild(xArrow);

    // X- axis arrow (dark red)
    const xArrowNeg = document.createElement('a-cone');
    xArrowNeg.setAttribute('position', '-1 0 0');
    xArrowNeg.setAttribute('rotation', '0 0 90');
    xArrowNeg.setAttribute('radius-bottom', '0.1');
    xArrowNeg.setAttribute('height', '0.5');
    xArrowNeg.setAttribute('material', 'color: #cc0000');
    xArrowNeg.setAttribute('data-axis', 'x-');
    xArrowNeg.setAttribute('data-wall-id', wall.id);
    xArrowNeg.classList.add('gizmo-arrow');
    gizmo.appendChild(xArrowNeg);

    // Y+ axis arrow (green)
    const yArrow = document.createElement('a-cone');
    yArrow.setAttribute('position', '0 1 0');
    yArrow.setAttribute('radius-bottom', '0.1');
    yArrow.setAttribute('height', '0.5');
    yArrow.setAttribute('material', 'color: #00ff00');
    yArrow.setAttribute('data-axis', 'y+');
    yArrow.setAttribute('data-wall-id', wall.id);
    yArrow.classList.add('gizmo-arrow');
    gizmo.appendChild(yArrow);

    // Y- axis arrow (dark green)
    const yArrowNeg = document.createElement('a-cone');
    yArrowNeg.setAttribute('position', '0 -1 0');
    yArrowNeg.setAttribute('rotation', '0 0 180');
    yArrowNeg.setAttribute('radius-bottom', '0.1');
    yArrowNeg.setAttribute('height', '0.5');
    yArrowNeg.setAttribute('material', 'color: #00cc00');
    yArrowNeg.setAttribute('data-axis', 'y-');
    yArrowNeg.setAttribute('data-wall-id', wall.id);
    yArrowNeg.classList.add('gizmo-arrow');
    gizmo.appendChild(yArrowNeg);

    // Z+ axis arrow (blue)
    const zArrow = document.createElement('a-cone');
    zArrow.setAttribute('position', '0 0 1');
    zArrow.setAttribute('rotation', '90 0 0');
    zArrow.setAttribute('radius-bottom', '0.1');
    zArrow.setAttribute('height', '0.5');
    zArrow.setAttribute('material', 'color: #0000ff');
    zArrow.setAttribute('data-axis', 'z+');
    zArrow.setAttribute('data-wall-id', wall.id);
    zArrow.classList.add('gizmo-arrow');
    gizmo.appendChild(zArrow);

    // Z- axis arrow (dark blue)
    const zArrowNeg = document.createElement('a-cone');
    zArrowNeg.setAttribute('position', '0 0 -1');
    zArrowNeg.setAttribute('rotation', '-90 0 0');
    zArrowNeg.setAttribute('radius-bottom', '0.1');
    zArrowNeg.setAttribute('height', '0.5');
    zArrowNeg.setAttribute('material', 'color: #0000cc');
    zArrowNeg.setAttribute('data-axis', 'z-');
    zArrowNeg.setAttribute('data-wall-id', wall.id);
    zArrowNeg.classList.add('gizmo-arrow');
    gizmo.appendChild(zArrowNeg);

    // Add click handlers
    this.addGizmoClickHandlers(gizmo, 'wall', wall.id);

    scene.appendChild(gizmo);
  }

  createCeilingGizmo(ceiling) {
    const scene = document.querySelector('a-scene');
    if (!scene) return;

    // Remove existing gizmo if it exists
    const existingGizmo = document.querySelector(`#gizmo-ceiling-${ceiling.id}`);
    if (existingGizmo) {
      existingGizmo.remove();
    }

    const gizmo = document.createElement('a-entity');
    gizmo.setAttribute('id', `gizmo-ceiling-${ceiling.id}`);
    gizmo.setAttribute('position', `${ceiling.position.x} ${ceiling.position.y} ${ceiling.position.z}`);
    gizmo.classList.add('manipulation-gizmo');

    // X+ axis arrow (red)
    const xArrow = document.createElement('a-cone');
    xArrow.setAttribute('position', '1 0 0');
    xArrow.setAttribute('rotation', '0 0 -90');
    xArrow.setAttribute('radius-bottom', '0.1');
    xArrow.setAttribute('height', '0.5');
    xArrow.setAttribute('material', 'color: #ff0000');
    xArrow.setAttribute('data-axis', 'x+');
    xArrow.setAttribute('data-ceiling-id', ceiling.id);
    xArrow.classList.add('gizmo-arrow');
    gizmo.appendChild(xArrow);

    // X- axis arrow (dark red)
    const xArrowNeg = document.createElement('a-cone');
    xArrowNeg.setAttribute('position', '-1 0 0');
    xArrowNeg.setAttribute('rotation', '0 0 90');
    xArrowNeg.setAttribute('radius-bottom', '0.1');
    xArrowNeg.setAttribute('height', '0.5');
    xArrowNeg.setAttribute('material', 'color: #cc0000');
    xArrowNeg.setAttribute('data-axis', 'x-');
    xArrowNeg.setAttribute('data-ceiling-id', ceiling.id);
    xArrowNeg.classList.add('gizmo-arrow');
    gizmo.appendChild(xArrowNeg);

    // Y+ axis arrow (green)
    const yArrow = document.createElement('a-cone');
    yArrow.setAttribute('position', '0 1 0');
    yArrow.setAttribute('radius-bottom', '0.1');
    yArrow.setAttribute('height', '0.5');
    yArrow.setAttribute('material', 'color: #00ff00');
    yArrow.setAttribute('data-axis', 'y+');
    yArrow.setAttribute('data-ceiling-id', ceiling.id);
    yArrow.classList.add('gizmo-arrow');
    gizmo.appendChild(yArrow);

    // Y- axis arrow (dark green)
    const yArrowNeg = document.createElement('a-cone');
    yArrowNeg.setAttribute('position', '0 -1 0');
    yArrowNeg.setAttribute('rotation', '0 0 180');
    yArrowNeg.setAttribute('radius-bottom', '0.1');
    yArrowNeg.setAttribute('height', '0.5');
    yArrowNeg.setAttribute('material', 'color: #00cc00');
    yArrowNeg.setAttribute('data-axis', 'y-');
    yArrowNeg.setAttribute('data-ceiling-id', ceiling.id);
    yArrowNeg.classList.add('gizmo-arrow');
    gizmo.appendChild(yArrowNeg);

    // Z+ axis arrow (blue)
    const zArrow = document.createElement('a-cone');
    zArrow.setAttribute('position', '0 0 1');
    zArrow.setAttribute('rotation', '90 0 0');
    zArrow.setAttribute('radius-bottom', '0.1');
    zArrow.setAttribute('height', '0.5');
    zArrow.setAttribute('material', 'color: #0000ff');
    zArrow.setAttribute('data-axis', 'z+');
    zArrow.setAttribute('data-ceiling-id', ceiling.id);
    zArrow.classList.add('gizmo-arrow');
    gizmo.appendChild(zArrow);

    // Z- axis arrow (dark blue)
    const zArrowNeg = document.createElement('a-cone');
    zArrowNeg.setAttribute('position', '0 0 -1');
    zArrowNeg.setAttribute('rotation', '-90 0 0');
    zArrowNeg.setAttribute('radius-bottom', '0.1');
    zArrowNeg.setAttribute('height', '0.5');
    zArrowNeg.setAttribute('material', 'color: #0000cc');
    zArrowNeg.setAttribute('data-axis', 'z-');
    zArrowNeg.setAttribute('data-ceiling-id', ceiling.id);
    zArrowNeg.classList.add('gizmo-arrow');
    gizmo.appendChild(zArrowNeg);

    // Add click handlers
    this.addGizmoClickHandlers(gizmo, 'ceiling', ceiling.id);

    scene.appendChild(gizmo);
  }

  addGizmoClickHandlers(gizmo, type, id) {
    const arrows = gizmo.querySelectorAll('.gizmo-arrow');
    arrows.forEach(arrow => {
      // Add raycaster for mouse interaction
      arrow.setAttribute('raycastable', '');
      
      // Use mouse events for desktop interaction
      arrow.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const axis = arrow.getAttribute('data-axis');
        this.handleGizmoClick(type, id, axis);
      });

      // Use click events as backup
      arrow.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const axis = arrow.getAttribute('data-axis');
        this.handleGizmoClick(type, id, axis);
      });

      // Touch events for mobile
      arrow.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const axis = arrow.getAttribute('data-axis');
        this.handleGizmoClick(type, id, axis);
      });

      // Add hover effects
      arrow.addEventListener('mouseenter', () => {
        const originalColor = arrow.getAttribute('material').color;
        arrow.setAttribute('material', `color: ${originalColor}; opacity: 0.8`);
        arrow.setAttribute('scale', '1.2 1.2 1.2');
      });

      arrow.addEventListener('mouseleave', () => {
        const originalColor = arrow.getAttribute('material').color;
        arrow.setAttribute('material', `color: ${originalColor}; opacity: 1`);
        arrow.setAttribute('scale', '1 1 1');
      });
    });
  }

  handleGizmoClick(type, id, axis) {
    console.log('Gizmo clicked!', { type, id, axis }); // Debug log
    const step = 0.5; // Movement step size
    let element;
    
    if (type === 'wall') {
      element = this.walls.find(w => w.id === id);
    } else {
      element = this.ceilings.find(c => c.id === id);
    }

    if (!element) {
      console.log('Element not found!', { type, id });
      return;
    }

    // Update position based on axis
    if (axis === 'x+') {
      element.position.x += step;
    } else if (axis === 'x-') {
      element.position.x -= step;
    } else if (axis === 'y+') {
      element.position.y += step;
    } else if (axis === 'y-') {
      element.position.y -= step;
    } else if (axis === 'z+') {
      element.position.z += step;
    } else if (axis === 'z-') {
      element.position.z -= step;
    }

    console.log('New position:', element.position); // Debug log

    // Update the 3D scene
    if (type === 'wall') {
      this.updateWallInScene(element);
      this.updateWallGizmo(element);
    } else {
      this.updateCeilingInScene(element);
      this.updateCeilingGizmo(element);
    }

    // Update the editor inputs
    this.updateEditorInputs(type, id, element);
  }


  updateWallGizmo(wall) {
    const gizmo = document.querySelector(`#gizmo-wall-${wall.id}`);
    if (gizmo) {
      gizmo.setAttribute('position', `${wall.position.x} ${wall.position.y} ${wall.position.z}`);
    }
  }

  updateCeilingGizmo(ceiling) {
    const gizmo = document.querySelector(`#gizmo-ceiling-${ceiling.id}`);
    if (gizmo) {
      gizmo.setAttribute('position', `${ceiling.position.x} ${ceiling.position.y} ${ceiling.position.z}`);
    }
  }

  updateEditorInputs(type, id, element) {
    if (type === 'wall') {
      // Update wall position inputs
      const xInput = document.querySelector(`input[data-wall-id="${id}"][data-property="position.x"]`);
      const yInput = document.querySelector(`input[data-wall-id="${id}"][data-property="position.y"]`);
      const zInput = document.querySelector(`input[data-wall-id="${id}"][data-property="position.z"]`);
      
      if (xInput) xInput.value = element.position.x;
      if (yInput) yInput.value = element.position.y;
      if (zInput) zInput.value = element.position.z;
    } else {
      // Update ceiling position inputs
      const xInput = document.querySelector(`input[data-ceiling-id="${id}"][data-property="position.x"]`);
      const yInput = document.querySelector(`input[data-ceiling-id="${id}"][data-property="position.y"]`);
      const zInput = document.querySelector(`input[data-ceiling-id="${id}"][data-property="position.z"]`);
      
      if (xInput) xInput.value = element.position.x;
      if (yInput) yInput.value = element.position.y;
      if (zInput) zInput.value = element.position.z;
    }
  }

  toggleGizmos() {
    const gizmos = document.querySelectorAll('.manipulation-gizmo');
    const isVisible = gizmos.length > 0 && gizmos[0].getAttribute('visible') !== 'false';
    
    gizmos.forEach(gizmo => {
      gizmo.setAttribute('visible', !isVisible);
    });

    // Update button text
    const toggleBtn = document.getElementById('toggle-gizmos');
    if (toggleBtn) {
      toggleBtn.textContent = isVisible ? 'Show Manipulation Arrows' : 'Hide Manipulation Arrows';
    }
  }

  disableGazeCursorInEditor() {
    // Disable the gaze cursor in editor mode for better mouse interaction
    const cursor = document.querySelector('a-cursor');
    if (cursor) {
      cursor.setAttribute('visible', false);
      cursor.setAttribute('raycaster', 'objects: .clickable');
    }

    // Also disable look-controls pointer lock to prevent gaze interference
    const camera = document.querySelector('#head');
    if (camera) {
      camera.setAttribute('look-controls', 'pointerLockEnabled: false; reverseMouseDrag: false');
    }

    // Disable VR controllers in editor mode
    const leftController = document.querySelector('#left-controller');
    const rightController = document.querySelector('#right-controller');
    if (leftController) leftController.setAttribute('visible', false);
    if (rightController) rightController.setAttribute('visible', false);

    console.log('Gaze cursor disabled in editor mode for better mouse interaction');
  }

  enableGazeCursorForExport() {
    // Re-enable gaze cursor for exported scenes
    const cursor = document.querySelector('a-cursor');
    if (cursor) {
      cursor.setAttribute('visible', true);
      cursor.setAttribute('raycaster', 'objects: .clickable');
    }

    // Re-enable look-controls for VR
    const camera = document.querySelector('#head');
    if (camera) {
      camera.setAttribute('look-controls', 'pointerLockEnabled: true; reverseMouseDrag: false');
    }

    // Re-enable VR controllers for exported scenes
    const leftController = document.querySelector('#left-controller');
    const rightController = document.querySelector('#right-controller');
    if (leftController) leftController.setAttribute('visible', true);
    if (rightController) rightController.setAttribute('visible', true);

    console.log('Gaze cursor re-enabled for export');
  }

  loadWallsAndCeilingsFromConfig() {
    if (!museumConfig) return;

    this.walls = museumConfig.walls || [];
    this.ceilings = museumConfig.ceilings || [];

    // Clear existing walls and ceilings from scene
    document.querySelectorAll('.wall-element, .ceiling-element').forEach(el => el.remove());

    // Create walls and ceilings in scene
    this.walls.forEach(wall => this.createWallInScene(wall));
    this.ceilings.forEach(ceiling => this.createCeilingInScene(ceiling));

    // Render the UI
    this.renderWallsList();
    this.renderCeilingsList();
  }

  updateWallsAndCeilings() {
    if (!museumConfig) return;

    museumConfig.walls = this.walls;
    museumConfig.ceilings = this.ceilings;

    // Save to config file
    this.saveConfiguration();
    
    console.log('Walls and ceilings updated:', { walls: this.walls, ceilings: this.ceilings });
  }

  resetWallsAndCeilings() {
    if (confirm('Are you sure you want to delete all walls and ceilings?')) {
      this.walls = [];
      this.ceilings = [];
      
      // Clear from scene
      document.querySelectorAll('.wall-element, .ceiling-element').forEach(el => el.remove());
      
      // Update UI
      this.renderWallsList();
      this.renderCeilingsList();
      
      // Update config
      this.updateWallsAndCeilings();
    }
  }
}

// Initialize museum when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Load config from file - no hard-coded defaults
  
  let museumProject;
  let modelEditor;
  
  // Initialize immediately instead of with delays
  console.log('🚀 Initializing museum...');
  museumProject = new MuseumProject();
  
  // Initialize model editor after museum is set up (reduced delay)
  setTimeout(() => {
    console.log('🎨 Initializing model editor...');
    modelEditor = new ModelEditor(museumProject);
    // Expose for other code paths to reference
    window.modelEditor = modelEditor;
    
    // Ensure template UI updates after editor is ready
    if (modelEditor && typeof modelEditor.updateCurrentTemplateDisplay === 'function') {
      modelEditor.updateCurrentTemplateDisplay();
    }
  }, 500); // Reduced from 2000ms to 500ms
});
