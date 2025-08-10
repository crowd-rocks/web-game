import { 
    Engine, 
    Scene, 
    Vector3, 
    HemisphericLight, 
    UniversalCamera
} from '@babylonjs/core';

export class Game {
    private canvas: HTMLCanvasElement;
    private engine: Engine;
    private scene: Scene;
    private camera!: UniversalCamera;

    private isAscending = false;
    private isDescending = false;
    private keydownHandler?: (e: KeyboardEvent) => void;
    private keyupHandler?: (e: KeyboardEvent) => void;

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

        // Vertical movement (Space to ascend, Shift to descend)
        this.attachInputListeners();
        this.scene.registerBeforeRender(() => {
            const dt = this.engine.getDeltaTime() / 1000; // seconds
            const verticalSpeedUnitsPerSec = 6 * this.camera.speed; // scale relative to camera speed
            if (this.isAscending) {
                this.camera.position.y += verticalSpeedUnitsPerSec * dt;
            }
            if (this.isDescending) {
                this.camera.position.y -= verticalSpeedUnitsPerSec * dt;
            }
        });
    }

    private attachInputListeners(): void {
        this.keydownHandler = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                this.isAscending = true;
                e.preventDefault();
            } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
                this.isDescending = true;
                e.preventDefault();
            }
        };
        this.keyupHandler = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                this.isAscending = false;
                e.preventDefault();
            } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
                this.isDescending = false;
                e.preventDefault();
            }
        };
        window.addEventListener('keydown', this.keydownHandler, { passive: false });
        window.addEventListener('keyup', this.keyupHandler, { passive: false });
    }

    private detachInputListeners(): void {
        if (this.keydownHandler) window.removeEventListener('keydown', this.keydownHandler);
        if (this.keyupHandler) window.removeEventListener('keyup', this.keyupHandler);
        this.keydownHandler = undefined;
        this.keyupHandler = undefined;
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
        this.detachInputListeners();
        this.scene.dispose();
        this.engine.dispose();
    }
} 