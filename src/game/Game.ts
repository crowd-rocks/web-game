import { 
    Engine, 
    Scene, 
    Vector3, 
    HemisphericLight, 
    MeshBuilder,
    UniversalCamera,
    StandardMaterial,
    Color3
} from '@babylonjs/core';

export class Game {
    private canvas: HTMLCanvasElement;
    private engine: Engine;
    private scene: Scene;
    private camera!: UniversalCamera;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.engine = new Engine(this.canvas, true);
        this.scene = new Scene(this.engine);
        
        this.createScene();
        this.startRenderLoop();
    }

    private createScene(): void {
        // First-person camera
        this.camera = new UniversalCamera('fp-camera', new Vector3(0, 2, -5), this.scene);
        this.camera.setTarget(Vector3.Zero());
        this.camera.attachControl(this.canvas, true);
        this.camera.speed = 0.5;
        this.camera.angularSensibility = 4000;
        this.camera.keysUp.push(87);    // W
        this.camera.keysDown.push(83);  // S
        this.camera.keysLeft.push(65);  // A
        this.camera.keysRight.push(68); // D

        // Pointer lock for mouse look
        this.canvas.addEventListener('click', () => {
            if (document.pointerLockElement !== this.canvas) {
                this.canvas.requestPointerLock();
            }
        });

        // Lighting
        const light = new HemisphericLight('light', new Vector3(0, 1, 0), this.scene);
        light.intensity = 0.8;

        // Simple ground
        const ground = MeshBuilder.CreateGround('ground', { width: 200, height: 200 }, this.scene);
        const groundMaterial = new StandardMaterial('groundMaterial', this.scene);
        groundMaterial.diffuseColor = new Color3(0.25, 0.3, 0.25);
        ground.material = groundMaterial;
    }

    public getScene(): Scene {
        return this.scene;
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