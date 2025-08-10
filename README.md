# Crowded Kingdoms - Babylon.js Game

A 3D web game built with Babylon.js and Vite, featuring a "crowded" scene with multiple animated characters.

## Features

- **3D Scene**: Full 3D environment with ground, lighting, and camera controls
- **Player Character**: Central green cube representing the player
- **NPCs**: Multiple colored cubes scattered around the scene, each with unique rotation speeds
- **Camera Controls**: Arc rotate camera with zoom limits for better user experience
- **Responsive**: Automatically adjusts to window resizing
- **Modern Build**: Uses Vite for fast development and building

## Getting Started

### Prerequisites

- Node.js (version 20.14.0 or higher recommended)
- npm

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd crowded-kingdoms-web-game
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Controls

- **Mouse/Touch**: Click and drag to rotate the camera around the scene
- **Scroll**: Zoom in and out
- **Window Resize**: The game automatically adjusts to window size changes

## Project Structure

```
src/
├── main.ts              # Main entry point
├── style.css            # Global styles
└── game/
    └── Game.ts          # Main game logic and scene setup
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

## Technologies Used

- **Babylon.js** - 3D graphics engine
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and development server
- **CSS3** - Styling and animations

## Development

The game is built with a modular architecture:

- `Game` class handles the main game logic
- Scene creation and management
- Camera and lighting setup
- NPC generation and animation
- Event handling for resize and cleanup

## Future Enhancements

- Player movement controls
- Collision detection
- Sound effects and music
- More complex 3D models
- Game mechanics and objectives
- Multiplayer support

## License

This project is open source and available under the MIT License. 