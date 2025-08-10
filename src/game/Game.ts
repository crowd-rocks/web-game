import { 
    Engine, 
    Scene, 
    Vector3, 
    HemisphericLight, 
    MeshBuilder,
    FreeCamera,
    StandardMaterial,
    Color3,
    ArcRotateCamera
} from '@babylonjs/core';

export class Game {
    private canvas: HTMLCanvasElement;
    private engine: Engine;
    private scene: Scene;
    private camera!: ArcRotateCamera;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.engine = new Engine(this.canvas, true);
        this.scene = new Scene(this.engine);
        
        this.createScene();
        this.startRenderLoop();
    }

    private createScene(): void {
        // Create an arc rotate camera for better control
        this.camera = new ArcRotateCamera('camera', 0, Math.PI / 3, 10, Vector3.Zero(), this.scene);
        this.camera.attachControl(this.canvas, true);
        this.camera.lowerRadiusLimit = 5;
        this.camera.upperRadiusLimit = 20;

        // Create lighting
        const light = new HemisphericLight('light', new Vector3(0, 1, 0), this.scene);
        light.intensity = 0.7;

        // Create ground
        const ground = MeshBuilder.CreateGround('ground', { width: 20, height: 20 }, this.scene);
        const groundMaterial = new StandardMaterial('groundMaterial', this.scene);
        groundMaterial.diffuseColor = new Color3(0.2, 0.2, 0.2);
        ground.material = groundMaterial;

        // Create main character cube
        const player = MeshBuilder.CreateBox('player', { size: 1 }, this.scene);
        const playerMaterial = new StandardMaterial('playerMaterial', this.scene);
        playerMaterial.diffuseColor = new Color3(0.4, 0.8, 0.4);
        player.material = playerMaterial;
        player.position.y = 0.5;

        // Create NPCs (other cubes)
        this.createNPCs();

        // Add rotation animation to player
        this.scene.registerBeforeRender(() => {
            player.rotate(Vector3.Up(), 0.005);
        });
    }

    private createNPCs(): void {
        const npcCount = 8;
        
        for (let i = 0; i < npcCount; i++) {
            const npc = MeshBuilder.CreateBox(`npc${i}`, { size: 0.8 }, this.scene);
            const npcMaterial = new StandardMaterial(`npcMaterial${i}`, this.scene);
            
            // Random colors for NPCs
            npcMaterial.diffuseColor = new Color3(
                Math.random() * 0.8 + 0.2,
                Math.random() * 0.8 + 0.2,
                Math.random() * 0.8 + 0.2
            );
            
            npc.material = npcMaterial;
            
            // Position NPCs in a circle around the center
            const angle = (i / npcCount) * 2 * Math.PI;
            const radius = 3 + Math.random() * 4;
            npc.position = new Vector3(
                Math.cos(angle) * radius,
                0.4,
                Math.sin(angle) * radius
            );

            // Add individual rotation to each NPC
            const rotationSpeed = (Math.random() - 0.5) * 0.02;
            this.scene.registerBeforeRender(() => {
                npc.rotate(Vector3.Up(), rotationSpeed);
            });
        }
    }

    private startRenderLoop(): void {
        this.engine.runRenderLoop(() => {
            this.scene.render();
        });
    }

    public resize(): void {
        this.engine.resize();
    }

    public dispose(): void {
        this.scene.dispose();
        this.engine.dispose();
    }
} 