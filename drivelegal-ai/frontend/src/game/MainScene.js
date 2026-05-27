// MainScene.js — Phase 5: Connected to Flask Backend
// ─────────────────────────────────────────────
// WHAT CHANGED FROM PHASE 3:
//
// 1. Rules loaded from server on startup
// 2. Violations sent to server via API call
// 3. Game uses server response for fine/message
// 4. Graceful fallback if server is offline
// 5. Server status shown in HUD
//
// The game is now a "thin client" —
// it handles visuals and input only.
// All rule logic lives on the server.
// ─────────────────────────────────────────────

import Phaser from 'phaser'
import { fetchRules, reportViolation, checkHealth } from '../api.js'

// ── CONSTANTS ─────────────────────────────────
const GAME_W = 800
const GAME_H = 450
const ROAD_X = 80
const ROAD_Y = 100
const ROAD_W = 640
const ROAD_H = 250
const CAR_W  = 36
const CAR_H  = 22

const CAR_ACCELERATION = 600
const CAR_MAX_SPEED    = 300
const CAR_DRAG         = 400

const INTER_X        = 480
const INTER_W        = 90
const LIGHT_DURATION = 4000
const SPEED_LIMIT    = 180
const BOOST_SPEED    = 500

// ← NEW: Fallback rules used when server is offline
// Game still works — just uses these local values
// instead of server values
const FALLBACK_RULES = {
  red_light: {
    fine: 1000, severity: 'high',
    message: 'Red Light Violation',
    detail: 'Crossed intersection on red signal.',
    color: 0xff4444
  },
  speeding: {
    fine: 500, severity: 'medium',
    message: 'Speeding Violation',
    detail: 'Exceeded the speed limit.',
    color: 0xff9900
  },
  red_light_speeding: {
    fine: 2000, severity: 'critical',
    message: 'Red Light + Speeding',
    detail: 'Multiple violations at once.',
    color: 0xff0000
  }
}

// ← CHANGED: handleViolation is now async
// because it makes an API call to Flask
// and has to wait for the response
async function handleViolation(scene, type) {

  // Prevent duplicate calls while one is processing
  if (scene.isProcessing) return
  scene.isProcessing = true

  // Show immediate feedback so game feels responsive
  // Player sees this while we wait for server response
  scene.showPopup('Checking...', 'Contacting server...', 0x888888)

  // ── THE API CALL ──────────────────────────────
  // This is the core of Phase 5.
  // Send violation to Flask, wait for response.
  // reportViolation() is from api.js
  const result = await reportViolation(type, 'player_1')

  if (result && result.success) {

    // ── SERVER RESPONDED SUCCESSFULLY ────────────
    // Use server's fine and message
    // NOT hardcoded values
    scene.totalFine      += result.fine
    scene.violationCount += 1

    // Map severity to color for popup
    const colorMap = {
      critical: 0xff0000,
      high:     0xff4444,
      medium:   0xff9900,
      low:      0xffcc00
    }
    const color = colorMap[result.severity] || 0xff4444

    // Show popup with server's message
    scene.showPopup(
      result.message,
      `${result.detail}  |  Fine: ₹${result.fine}`,
      color
    )

    // Update HUD
    scene.fineText.setText(`fine: ₹${scene.totalFine}`)
    scene.violationText.setText(`violations: ${scene.violationCount}`)

    // Add to violation log
    const time = new Date().toLocaleTimeString()
    scene.violationLog.unshift(
      `${time}  ${result.message}  —  ₹${result.fine}`
    )
    if (scene.violationLog.length > 4) scene.violationLog.pop()
    scene.logText.setText(scene.violationLog.join('\n'))

    console.log('[Game] Server processed violation:', result)

  } else {

    // ── SERVER OFFLINE OR ERROR ───────────────────
    // Graceful degradation — game still responds
    // Uses local fallback rules instead
    console.warn('[Game] Server unavailable — using fallback rules')

    const fallback = FALLBACK_RULES[type]
    if (fallback) {
      scene.totalFine      += fallback.fine
      scene.violationCount += 1

      scene.showPopup(
        fallback.message,
        `${fallback.detail}  |  Fine: ₹${fallback.fine} (offline)`,
        fallback.color
      )

      scene.fineText.setText(`fine: ₹${scene.totalFine}`)
      scene.violationText.setText(`violations: ${scene.violationCount}`)

      // Update offline indicator in HUD
      if (scene.serverStatusText) {
        scene.serverStatusText
          .setText('● offline mode')
          .setStyle({ fill: '#ff8800' })
      }
    }

  }

  // Hide popup after 2.5 seconds
  // then re-enable violation processing
  scene.time.delayedCall(2500, () => {
    scene.hidePopup()
    scene.isProcessing = false
  })

}


export default class MainScene extends Phaser.Scene {

  constructor() {
    super({ key: 'MainScene' })
  }

  preload() {}


  // ← CHANGED: create() is now async
  // because it calls await loadRulesFromServer()
  // before building the scene
  async create() {

    // ── GAME STATE ────────────────────────────────
    this.totalFine      = 0
    this.violationCount = 0
    this.lightState     = 'red'
    this.violationLog   = []
    this.isProcessing   = false   // ← NEW: prevents duplicate API calls
    this.serverOnline   = false   // ← NEW: tracks connection status
    this.serverRules    = null    // ← NEW: rules fetched from server

    this.cooldowns = {
      red_light:          false,
      speeding:           false,
      red_light_speeding: false
    }

    // ← NEW: Load rules from server BEFORE building scene
    // This way HUD can show correct server fine amounts
    await this.loadRulesFromServer()

    // Build scene after rules are loaded
    this.buildBackground()
    this.buildTrafficLight()
    this.buildCar()
    this.buildIntersectionZone()
    this.buildPopup()
    this.buildHUD()
    this.buildViolationLog()

    // ── INPUT ─────────────────────────────────────
    this.cursors  = this.input.keyboard.createCursorKeys()
    this.shiftKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SHIFT
    )

    // ── LIGHT TIMER ───────────────────────────────
    this.lightTimer = this.time.addEvent({
      delay:         LIGHT_DURATION,
      callback:      this.switchLight,
      callbackScope: this,
      loop:          true
    })

  }


  // ── LOAD RULES FROM SERVER ────────────────────
  // ← NEW METHOD
  // Fetches /rules on startup.
  // Sets this.serverOnline based on result.
  // Falls back to local rules if server offline.
  async loadRulesFromServer() {
    console.log('[Game] Fetching rules from server...')

    const data = await fetchRules()

    if (data && data.rules) {
      this.serverRules  = data.rules
      this.serverOnline = true
      console.log('[Game] Rules loaded from server:', this.serverRules)
    } else {
      this.serverRules  = FALLBACK_RULES
      this.serverOnline = false
      console.warn('[Game] Server offline — using fallback rules')
    }
  }


  // ── BUILD BACKGROUND ─────────────────────────
  buildBackground() {
    // Grass
    this.add.rectangle(
      GAME_W/2, GAME_H/2, GAME_W, GAME_H, 0x2d5a1b
    )

    // Road
    this.add.rectangle(
      ROAD_X + ROAD_W/2, ROAD_Y + ROAD_H/2,
      ROAD_W, ROAD_H, 0x555555
    )

    // Road border
    this.add.rectangle(
      ROAD_X + ROAD_W/2, ROAD_Y + ROAD_H/2,
      ROAD_W, ROAD_H, 0x000000, 0
    ).setStrokeStyle(2, 0xffffff, 0.15)

    // Dashes before intersection
    for (let x = ROAD_X + 50; x < INTER_X - 20; x += 70) {
      this.add.rectangle(
        x, ROAD_Y + ROAD_H/2, 36, 5, 0xffffff, 0.2
      )
    }

    // Dashes after intersection
    for (let x = INTER_X + INTER_W + 30; x < ROAD_X + ROAD_W - 40; x += 70) {
      this.add.rectangle(
        x, ROAD_Y + ROAD_H/2, 36, 5, 0xffffff, 0.2
      )
    }

    // Intersection box
    this.add.rectangle(
      INTER_X + INTER_W/2, ROAD_Y + ROAD_H/2,
      INTER_W, ROAD_H, 0x777777
    )
    this.add.rectangle(
      INTER_X + INTER_W/2, ROAD_Y + ROAD_H/2,
      INTER_W, ROAD_H, 0x000000, 0
    ).setStrokeStyle(2, 0xffff00, 0.5)

    // Speed limit sign
    this.add.rectangle(ROAD_X + 34, ROAD_Y - 20, 56, 22, 0xffffff)
      .setStrokeStyle(2, 0xff0000)
    this.add.text(ROAD_X + 34, ROAD_Y - 20, `MAX ${SPEED_LIMIT}`, {
      fontSize: '11px', fill: '#000000', fontStyle: 'bold'
    }).setOrigin(0.5)

    // Instructions
    this.add.text(ROAD_X + 8, ROAD_Y + 8,
      'Arrow keys · SHIFT = boost · Stop at red', {
      fontSize: '11px', fill: '#ffffff', alpha: 0.5
    })
  }


  // ── BUILD TRAFFIC LIGHT ───────────────────────
  buildTrafficLight() {
    const lightX = INTER_X + INTER_W + 16

    this.add.rectangle(
      lightX, ROAD_Y + ROAD_H/2, 4, ROAD_H, 0x444444
    )
    this.add.rectangle(
      lightX + 14, ROAD_Y + 24, 26, 58, 0x111111
    ).setStrokeStyle(1, 0x555555)

    this.redCircle = this.add.circle(
      lightX + 14, ROAD_Y + 11, 9, 0xff0000
    )
    this.greenCircle = this.add.circle(
      lightX + 14, ROAD_Y + 37, 9, 0x0a2a0a
    )

    this.lightLabel = this.add.text(
      INTER_X + INTER_W/2, ROAD_Y - 22,
      'RED — STOP',
      { fontSize: '13px', fill: '#ff4444', fontStyle: 'bold' }
    ).setOrigin(0.5)
  }


  // ── BUILD CAR ─────────────────────────────────
  buildCar() {
    this.physics.world.setBounds(
      ROAD_X + CAR_W/2, ROAD_Y + CAR_H/2,
      ROAD_W - CAR_W,   ROAD_H - CAR_H
    )

    const g = this.make.graphics({ add: false })
    g.fillStyle(0xe74c3c);  g.fillRect(0, 0, CAR_W, CAR_H)
    g.fillStyle(0xc0392b);  g.fillRect(4, 3, CAR_W-8, CAR_H-6)
    g.fillStyle(0x85c1e9, 0.9)
    g.fillRect(6, 4, 10, CAR_H-8)
    g.fillRect(CAR_W-16, 4, 10, CAR_H-8)
    g.fillStyle(0x111111)
    g.fillCircle(5, 2, 3);       g.fillCircle(CAR_W-5, 2, 3)
    g.fillCircle(5, CAR_H-2, 3); g.fillCircle(CAR_W-5, CAR_H-2, 3)
    g.generateTexture('car', CAR_W, CAR_H)
    g.destroy()

    this.car = this.physics.add.image(
      ROAD_X + 100, ROAD_Y + ROAD_H/2, 'car'
    )
    this.car.setCollideWorldBounds(true)
    this.car.setMaxVelocity(BOOST_SPEED, BOOST_SPEED)
    this.car.setDrag(CAR_DRAG, CAR_DRAG)
  }


  // ── BUILD INTERSECTION ZONE ───────────────────
  buildIntersectionZone() {
    this.intersectionZone = this.physics.add.staticImage(
      INTER_X + INTER_W/2, ROAD_Y + ROAD_H/2, '__DEFAULT'
    )
    this.intersectionZone.setDisplaySize(INTER_W, ROAD_H)
    this.intersectionZone.setAlpha(0)

    this.physics.add.overlap(
      this.car,
      this.intersectionZone,
      this.onIntersectionEnter,
      null,
      this
    )
  }


  // ── BUILD POPUP ───────────────────────────────
  buildPopup() {
    this.popupBg = this.add.rectangle(
      GAME_W/2, GAME_H/2, 440, 100, 0x000000, 0.92
    )
    this.popupBar = this.add.rectangle(
      GAME_W/2, GAME_H/2 - 34, 440, 4, 0xff4444
    )
    this.popupTitle = this.add.text(
      GAME_W/2, GAME_H/2 - 14, '',
      { fontSize: '18px', fill: '#ff4444', fontStyle: 'bold' }
    ).setOrigin(0.5)
    this.popupSub = this.add.text(
      GAME_W/2, GAME_H/2 + 16, '',
      { fontSize: '12px', fill: '#cccccc' }
    ).setOrigin(0.5)
    this.hidePopup()
  }


  // ── BUILD HUD ─────────────────────────────────
  buildHUD() {
    // Speed bar
    this.add.rectangle(GAME_W/2, GAME_H - 18, 200, 10, 0x333333)
    this.speedBar = this.add.rectangle(
      GAME_W/2 - 100, GAME_H - 18, 0, 10, 0x00ff88
    ).setOrigin(0, 0.5)

    this.speedText = this.add.text(
      GAME_W - 10, GAME_H - 28, 'speed: 0',
      { fontSize: '13px', fill: '#ffffff' }
    ).setOrigin(1, 0)

    this.fineText = this.add.text(
      10, GAME_H - 28, 'fine: ₹0',
      { fontSize: '13px', fill: '#ffcc00' }
    )

    this.violationText = this.add.text(
      10, GAME_H - 46, 'violations: 0',
      { fontSize: '12px', fill: '#ffffff', alpha: 0.7 }
    )

    this.timerText = this.add.text(
      GAME_W/2, 16, '',
      { fontSize: '12px', fill: '#aaaaaa' }
    ).setOrigin(0.5)

    // ← NEW: Server status indicator
    // Shows whether game is connected to Flask
    const statusColor = this.serverOnline ? '#00ff88' : '#ff8800'
    const statusLabel = this.serverOnline ? '● server online' : '○ offline mode'

    this.serverStatusText = this.add.text(
      GAME_W - 10, 10, statusLabel,
      { fontSize: '11px', fill: statusColor }
    ).setOrigin(1, 0)
  }


  // ── BUILD VIOLATION LOG ───────────────────────
  buildViolationLog() {
    this.add.rectangle(
      GAME_W/2, ROAD_Y - 38,
      GAME_W - 20, 46,
      0x000000, 0.4
    )
    this.add.text(12, ROAD_Y - 58, 'VIOLATION LOG', {
      fontSize: '10px', fill: '#ff4444', alpha: 0.8
    })
    this.logText = this.add.text(12, ROAD_Y - 52, '', {
      fontSize: '10px', fill: '#ffaaaa', lineSpacing: 4
    })
  }


  // ── SWITCH LIGHT ──────────────────────────────
  switchLight() {
    if (this.lightState === 'red') {
      this.lightState = 'green'
      this.redCircle.setFillStyle(0x2a0a0a)
      this.greenCircle.setFillStyle(0x00ff44)
      this.lightLabel.setText('GREEN — GO')
        .setStyle({ fill: '#00ff88' })
    } else {
      this.lightState = 'red'
      this.redCircle.setFillStyle(0xff0000)
      this.greenCircle.setFillStyle(0x0a2a0a)
      this.lightLabel.setText('RED — STOP')
        .setStyle({ fill: '#ff4444' })
    }

    this.cooldowns.red_light          = false
    this.cooldowns.red_light_speeding = false
  }


  // ── ON INTERSECTION ENTER ─────────────────────
  onIntersectionEnter() {
    const vx  = this.car.body.velocity.x
    const vy  = this.car.body.velocity.y
    const spd = Math.sqrt(vx * vx + vy * vy)

    const isRed      = this.lightState === 'red'
    const isSpeeding = spd > SPEED_LIMIT

    if (isRed && isSpeeding && !this.cooldowns.red_light_speeding) {
      handleViolation(this, 'red_light_speeding')
      this.cooldowns.red_light_speeding = true
      this.cooldowns.red_light          = true

    } else if (isRed && !this.cooldowns.red_light) {
      handleViolation(this, 'red_light')
      this.cooldowns.red_light = true
    }
  }


  // ── SHOW / HIDE POPUP ─────────────────────────
  showPopup(title, sub, color) {
    const hex = '#' + (color || 0xff4444)
      .toString(16).padStart(6, '0')
    this.popupBg.setVisible(true)
    this.popupBar.setFillStyle(color || 0xff4444).setVisible(true)
    this.popupTitle.setText(title).setStyle({ fill: hex }).setVisible(true)
    this.popupSub.setText(sub).setVisible(true)
  }

  hidePopup() {
    this.popupBg.setVisible(false)
    this.popupBar.setVisible(false)
    this.popupTitle.setVisible(false)
    this.popupSub.setVisible(false)
  }


  // ── UPDATE ────────────────────────────────────
  update() {

    if (!this.cursors || !this.shiftKey) return
    const boosting = this.shiftKey.isDown
    const accel    = boosting
      ? CAR_ACCELERATION * 1.8
      : CAR_ACCELERATION

    this.car.setAcceleration(0, 0)

    if (this.cursors.left.isDown) {
      this.car.setAccelerationX(-accel)
    } else if (this.cursors.right.isDown) {
      this.car.setAccelerationX(accel)
    }
    if (this.cursors.up.isDown) {
      this.car.setAccelerationY(-accel)
    } else if (this.cursors.down.isDown) {
      this.car.setAccelerationY(accel)
    }

    // ── SPEED HUD ─────────────────────────────────
    const vx  = this.car.body.velocity.x
    const vy  = this.car.body.velocity.y
    const spd = Math.round(Math.sqrt(vx * vx + vy * vy))

    const barWidth = (spd / BOOST_SPEED) * 200
    this.speedBar.width = Math.min(barWidth, 200)

    if (spd > SPEED_LIMIT) {
      this.speedBar.setFillStyle(0xff4444)
    } else if (spd > SPEED_LIMIT * 0.7) {
      this.speedBar.setFillStyle(0xffcc00)
    } else {
      this.speedBar.setFillStyle(0x00ff88)
    }

    const overLimit = spd > SPEED_LIMIT
    this.speedText
      .setText(`speed: ${spd}${overLimit ? ' ⚠' : ''}`)
      .setStyle({ fill: overLimit ? '#ff4444' : '#ffffff' })

    // Light timer countdown
    const remaining = Math.ceil(this.lightTimer.getRemainingSeconds())
    const nextLight = this.lightState === 'red' ? 'green' : 'red'
    this.timerText.setText(`light → ${nextLight} in ${remaining}s`)

    // ── SPEEDING CHECK — whole road ────────────────
    if (spd > SPEED_LIMIT && !this.cooldowns.speeding) {
      handleViolation(this, 'speeding')
      this.cooldowns.speeding = true
    }
    if (spd <= SPEED_LIMIT && this.cooldowns.speeding) {
      this.cooldowns.speeding = false
    }
  }

}