import Phaser from 'phaser';

export default class MainScene extends Phaser.Scene {
	constructor() {
		super('MainScene');

		this.road = null;
		this.vehicle = null;
		this.cursors = null;
		this.keys = null;
		this.acceleration = 320;
		this.maxSpeed = 100;
		this.normalDrag = 180;
		this.brakeDrag = 700;
		this.roadBounds = null;
	}

	preload() {}

	create() {
		const worldWidth = 800;
		const worldHeight = 600;

		this.cameras.main.setBackgroundColor('#24354e');

		this.add.rectangle(worldWidth / 2, worldHeight / 2, worldWidth, worldHeight, 0x1b4332);

		this.road = this.add.rectangle(worldWidth / 2, worldHeight / 2, 520, 360, 0x4b5563);
		this.add.rectangle(worldWidth / 2, worldHeight / 2, 500, 340, 0x6b7280, 0.18);

		this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

		this.vehicle = this.add.rectangle(worldWidth / 2, worldHeight / 2 + 110, 28, 44, 0xef4444);
		this.physics.add.existing(this.vehicle);

		this.vehicle.body.setAllowGravity(false);
		this.vehicle.body.setDrag(this.normalDrag, this.normalDrag);
		this.vehicle.body.setMaxVelocity(this.maxSpeed, this.maxSpeed);

		this.cursors = this.input.keyboard.createCursorKeys();
		this.keys = this.input.keyboard.addKeys('W,A,S,D');
		this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

		const roadWidth = 520;
		const roadHeight = 360;

		this.roadBounds = {
			left: worldWidth / 2 - roadWidth / 2,
			right: worldWidth / 2 + roadWidth / 2,
			top: worldHeight / 2 - roadHeight / 2,
			bottom: worldHeight / 2 + roadHeight / 2,
		};
	}

	update() {
		const body = this.vehicle.body;
		const braking = this.spaceKey.isDown;

		if (braking) {
			body.setAcceleration(0, 0);
			body.setDrag(this.brakeDrag, this.brakeDrag);
		} else {
			body.setDrag(this.normalDrag, this.normalDrag);
			body.setAccelerationX(0);
			body.setAccelerationY(0);

			if (this.cursors.left.isDown || this.keys.A.isDown) {
				body.setVelocityX(-this.maxSpeed);
			} else if (this.cursors.right.isDown || this.keys.D.isDown) {
				body.setVelocityX(this.maxSpeed);
			} else {
				body.setVelocityX(0);
			}

			if (this.cursors.up.isDown || this.keys.W.isDown) {
				body.setAccelerationY(-this.acceleration);
			} else if (this.cursors.down.isDown || this.keys.S.isDown) {
				body.setAccelerationY(this.acceleration);
			}
		}


		const halfWidth = this.vehicle.displayWidth / 2;
		const halfHeight = this.vehicle.displayHeight / 2;

		this.vehicle.x = Phaser.Math.Clamp(this.vehicle.x, this.roadBounds.left + halfWidth, this.roadBounds.right - halfWidth);
		this.vehicle.y = Phaser.Math.Clamp(this.vehicle.y, this.roadBounds.top + halfHeight, this.roadBounds.bottom - halfHeight);
	}
}
