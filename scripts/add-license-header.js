#!/usr/bin/env node
/*
 Adds a standard license header comment to source files.
 - Supports: js, jsx, ts, tsx, css, scss, html, md, sh, py, yml, yaml
 - Skips: json, lockfiles, binaries, node_modules, build artifacts, zips
 - Respects shebangs (#!) and <!DOCTYPE> in HTML
*/

const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();

const headerText = `Immersive Museum Maker - A tool that helps people create immersive storytelling worlds using the A-Frame open source library. Output is optimized for mobile phones, desktop (WASD keys) and the Meta Quest headset browser.

Copyright (C) 2025  Dan Pacheco

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License in the LICENSE file of this repository for more details.`;

// Map file extensions to comment wrappers
function wrapHeader(ext, text) {
  switch (ext) {
    case '.js':
    case '.jsx':
    case '.ts':
    case '.tsx':
    case '.css':
    case '.scss':
      return `/*\n${text}\n*/\n`;
    case '.html':
    case '.htm':
    case '.md':
      return `<!--\n${text}\n-->\n`;
    case '.yml':
    case '.yaml':
    case '.sh':
    case '.py':
      return `# ${text.replace(/\n/g, '\n# ')}\n`;
    default:
      return null;
  }
}

const allowedExts = new Set(['.js','.jsx','.ts','.tsx','.css','.scss','.html','.htm','.md','.yml','.yaml','.sh','.py']);
const skipNames = new Set(['node_modules','.git','.next','dist','build','out','.cache']);
const skipExts = new Set(['.json','.zip','.gz','.bz2','.png','.jpg','.jpeg','.gif','.webp','.ico','.svg','.glb','.gltf','.mp3','.wav','.mp4','.mov','.pdf','.lock']);

function shouldSkipFile(fp) {
  const rel = path.relative(repoRoot, fp);
  if (rel.split(path.sep).some(seg => skipNames.has(seg))) return true;
  const ext = path.extname(fp).toLowerCase();
  if (skipExts.has(ext)) return true;
  if (!allowedExts.has(ext)) return true;
  return false;
}

function hasHeader(content) {
  return content.includes('Immersive Museum Maker - A tool');
}

function applyHeaderToContent(fp, content, headerWrapped) {
  const ext = path.extname(fp).toLowerCase();

  // Respect shebang
  if ((ext === '.sh' || ext === '.py' || ext === '.js') && content.startsWith('#!')) {
    const idx = content.indexOf('\n');
    if (idx !== -1) {
      const shebang = content.slice(0, idx + 1);
      const rest = content.slice(idx + 1);
      return shebang + headerWrapped + rest;
    }
  }

  // Respect <!DOCTYPE> in HTML
  if ((ext === '.html' || ext === '.htm') && /^<!DOCTYPE/i.test(content)) {
    const idx = content.indexOf('\n');
    if (idx !== -1) {
      const first = content.slice(0, idx + 1);
      const rest = content.slice(idx + 1);
      return first + headerWrapped + rest;
    }
  }

  return headerWrapped + content;
}

function processFile(fp) {
  if (shouldSkipFile(fp)) return false;
  let content;
  try { content = fs.readFileSync(fp, 'utf8'); } catch { return false; }
  if (hasHeader(content)) return false;
  const ext = path.extname(fp).toLowerCase();
  const wrapped = wrapHeader(ext, headerText);
  if (!wrapped) return false;
  const updated = applyHeaderToContent(fp, content, wrapped);
  fs.writeFileSync(fp, updated, 'utf8');
  return true;
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    if (skipNames.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walk(full);
    } else if (ent.isFile()) {
      processFile(full);
    }
  }
}

walk(repoRoot);
console.log('License header applied where applicable.');


