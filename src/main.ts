import './style.css';
import { Game } from './game/Game';

// Initialize the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
    if (!canvas) {
        throw new Error('Canvas element not found');
    }

    const game = new Game(canvas);

    // Handle window resize
    window.addEventListener('resize', () => {
        game.resize();
    });

    // Handle page unload
    window.addEventListener('beforeunload', () => {
        game.dispose();
    });
});
