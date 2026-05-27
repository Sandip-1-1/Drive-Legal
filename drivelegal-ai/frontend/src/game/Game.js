// Game.js
// ─────────────────────────────────────────────
// This file creates and configures the Phaser game.
// It imports the scene and tells Phaser how to run it.
//
// Think of this as the "settings file" for the game engine.
// You rarely need to edit this — most work happens in scenes.
// ─────────────────────────────────────────────

import Phaser from 'phaser'
import MainScene from './MainScene.js'

const config = {
  // Phaser.AUTO means: use WebGL if available, Canvas if not
  // WebGL is faster (uses GPU), Canvas is the fallback
  type: Phaser.AUTO,

  width: 800,
  height: 450,

  // inject the canvas into this HTML element
  // must match the id in App.jsx
  parent: 'game-container',

  backgroundColor: '#1a1a2e',

  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },   // top-down game — no gravity
      debug: false          // set true to see hitboxes
    }
  },

  scene: MainScene   // which scene to load first
}

// Create and export the game instance
// App.jsx imports Game.js which runs this line
// That's what starts Phaser
export default new Phaser.Game(config)