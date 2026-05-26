import Phaser from 'phaser';
import MainScene from './MainScene';

export default function createGame(parent) {
	return new Phaser.Game({
		type: Phaser.AUTO,
		parent,
		width: 800,
		height: 600,
		backgroundColor: '#1f2937',
		physics: {
			default: 'arcade',
			arcade: {
				debug: false,
			},
		},
		scene: [MainScene],
	});
}
