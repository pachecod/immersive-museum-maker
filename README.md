<!--
Immersive Museum Maker - A tool that helps people create immersive storytelling worlds using the A-Frame open source library. Output is optimized for mobile phones, desktop (WASD keys) and the Meta Quest headset browser.

Copyright (C) 2025  Dan Pacheco

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License in the LICENSE file of this repository for more details.
-->

# Immersive Museum Maker

The Immersive Museum Maker (IMM)is a web-based tool for creating immersive 3D museum experiences and virtual exhibitions. Build interactive VR/AR-ready environments with drag-and-drop simplicity, complete with 3D models, audio, lighting, and custom walls and ceilings.

The IMM is currently optimized to render projects using the A-Frame open source platform, but there are future plans to also support Babylon.js. The output is optimized to work on mobile browsers, desktop browsers and Meta Quest 3 headset browsers, in that priority order. Navigation on mobile is achieved by moving the phone around to choose direction, holding one thumb down to move forward, and holding two thumbs down to move backward. Navigation on desktop uses WASD and mouse look. Navigation on Quest is similar to mobile, but using handsets for portal-based jumping.

## What It Does

The Immersive Museum Maker transforms the complex process of creating 3D virtual environments into an intuitive, web-based editor. Users can:

- **Create Virtual Museums**: Build complete 3D exhibition spaces with walls, ceilings, and custom environments
- **Add 3D Content**: Import and position 3D models, artifacts, and interactive exhibits
- **Design Environments**: Customize lighting, audio, textures, and atmospheric effects
- **Enable Interactivity**: Add hotspots, information panels, and navigation elements
- **Export & Share**: Generate standalone HTML files that work across all supported devices

## Key Features

### **Scene Building**
- **Walls & Ceilings System**: Add, position, and customize architectural elements
- **3D Gizmos**: Direct manipulation tools for precise object positioning
- **Template Library**: Pre-built environments (classroom, house, outdoor exploration)
- **Real-time Preview**: See changes instantly in the 3D viewer

### **Content Management**
- **3D Model Support**: Import GLB/GLTF models with automatic positioning
- **Texture System**: Apply custom textures with tiling and brightness controls
- **Color Customization**: Full color picker for walls, ceilings, and materials
- **Audio Integration**: Ambient sounds, click effects, and spatial audio

### **Interactivity**
- **Hotspots**: Clickable information points throughout the experience
- **Labels & Text**: Floating labels and information panels
- **Navigation**: Smooth camera controls and teleportation
- **VR Support**: Full compatibility with Meta Quest and other VR headsets

### **Cross-Platform**
- **Mobile Optimized**: Touch controls and responsive design
- **Desktop Ready**: WASD keyboard navigation
- **VR Compatible**: Works with Meta Quest, HTC Vive, and other headsets
- **Web Standards**: Built on A-Frame for maximum compatibility

## Quick Start

### For Users
1. **Choose a Template**: Start with a pre-built environment or create from scratch
2. **Add Content**: Import 3D models, add walls/ceilings, customize textures
3. **Design & Position**: Use gizmos to position objects precisely
4. **Export**: Generate a standalone HTML file for sharing

### For Developers
```bash
# Clone the repository
git clone https://github.com/pachecod/immersive-museum-maker.git

# Install dependencies
npm install

# Start the development server
node server.js

# Open http://localhost:3001 in your browser
```

## Educational Use

Perfect for:
- **Museum Education**: Create virtual field trips and interactive exhibits
- **History Classes**: Build historical environments and timelines
- **Science Education**: Design interactive lab spaces and demonstrations
- **Art Appreciation**: Curate virtual galleries and artist showcases
- **Language Learning**: Create immersive cultural environments

## Professional Applications

- **Museum Curation**: Design virtual exhibitions and online collections
- **Architecture**: Present building designs in immersive 3D
- **Real Estate**: Create virtual property tours
- **Training**: Build interactive learning environments
- **Marketing**: Develop immersive brand experiences

## Technical Stack

- **Frontend**: A-Frame (WebXR), HTML5, CSS3, JavaScript
- **Backend**: Node.js, Express.js
- **3D Graphics**: Three.js (via A-Frame)
- **File Handling**: Multer, Unzipper
- **Deployment**: Render.com ready

## Project Structure

```
immersive-museum-maker/
├── index.html              # Main template selection page
├── editor.html             # Scene editor interface
├── script.js               # Core application logic
├── server.js               # Backend server
├── style.css               # Styling and UI
├── templates/              # Pre-built environment templates
│   ├── classroom.json
│   ├── house-template.json
│   └── outdoor-exploration.json
├── hosted-projects/        # Student submissions
├── student-projects/       # Project archives
└── professor-dashboard.html # Instructor management interface
```

## Templates Included

- **Classroom**: Educational environment with desks and presentation areas
- **House**: Residential setting for home-based exhibits
- **Outdoor Exploration**: Natural environment for outdoor experiences

## Advanced Features

### Professor Dashboard
- **Student Management**: Review and host student projects
- **Export Options**: Download packages or standalone HTML files
- **Hosting System**: Automatic deployment of student work

### Editor Tools
- **Real-time Updates**: Changes appear instantly in 3D preview
- **Undo/Redo**: Full editing history with rollback capability
- **Import/Export**: Save and load project configurations
- **Collaboration**: Multiple users can work on the same project

## Deployment

### Local Development
```bash
node server.js
# Access at http://localhost:3001
```

### Production (Render.com)
1. Connect your GitHub repository
2. Deploy using the included `render.yaml` configuration
3. Set environment variables as needed

## Documentation

- ** Coming soon!

## Contributing

I welcome contributions of all types, including feedback and code suggestions. Please see our contributing guidelines and code of conduct.

## License

This project is licensed under the **GNU General Public License v3 (GPLv3)**.

### What that means:
- ✅ You can use, copy, modify, and distribute this code — even commercially
- ✅ You must preserve the copyright notice: `Copyright (C) 2025 Dan Pacheco`
- ✅ You must keep the GPLv3 license text with any copy you share
- ✅ If you modify the code, you must state your changes clearly and release under GPLv3
- ❌ You cannot remove the author's name or present the work as your own
- ❌ You cannot relicense under more restrictive terms

**In short: you can build on this work, but you must give credit, keep it open, and share alike.**

## Acknowledgments

- **A-Frame Community**: For the amazing WebXR framework
- **Three.js**: For 3D graphics capabilities
- **Open Source Contributors**: Who make projects like this possible

## Support

- **Issues**: Report bugs and request features on GitHub
- **Discussions**: Join community conversations
- **Email**: Contact the maintainer for direct support

---

**Built with ❤️ for educators, creators, and the open web.**

*Transform your ideas into immersive 3D experiences. No coding required.*