import { Scene, MeshBuilder, StandardMaterial, DynamicTexture, Color3, Vector3, Mesh, AbstractMesh } from '@babylonjs/core';

export type ChunkCoord = { x: string; y: string; z: string } | { x: number; y: number; z: number };

function toInt(n: string | number): number {
  return typeof n === 'string' ? parseInt(n, 10) : n;
}

export class ChunkLabelRenderer {
  private scene: Scene;
  private labels = new Map<string, Mesh>();
  private beforeRenderObserver?: () => void;

  constructor(scene: Scene) {
    this.scene = scene;
    // Update label scale every frame to keep readable size
    this.beforeRenderObserver = () => {
      const camera = this.scene.activeCamera;
      if (!camera) return;
      for (const [, plane] of this.labels) {
        const distance = Vector3.Distance(camera.position, plane.position);
        // Scale proportional to distance so on-screen size remains similar
        const scale = Math.min(8, Math.max(0.35, distance / 40));
        plane.scaling.setAll(scale);
      }
    };
    this.scene.registerBeforeRender(this.beforeRenderObserver);
  }

  dispose(): void {
    if (this.beforeRenderObserver) {
      this.scene.unregisterBeforeRender(this.beforeRenderObserver);
      this.beforeRenderObserver = undefined;
    }
    for (const [, mesh] of this.labels) {
      mesh.dispose(false, true);
    }
    this.labels.clear();
  }

  renderForChunks(coords: ChunkCoord[]): void {
    const desiredKeys = new Set<string>();
    for (const c of coords) {
      const cx = toInt(c.x);
      const cy = toInt(c.y);
      const cz = toInt(c.z);
      const key = `${cx}:${cy}:${cz}`;
      desiredKeys.add(key);
      if (!this.labels.has(key)) {
        const mesh = this.createLabelMesh(cx, cy, cz);
        this.labels.set(key, mesh);
      }
    }
    // Remove labels no longer needed
    for (const [key, mesh] of this.labels) {
      if (!desiredKeys.has(key)) {
        mesh.dispose(false, true);
        this.labels.delete(key);
      }
    }
  }

  private createLabelMesh(cx: number, cy: number, cz: number): Mesh {
    const text = `${cx},${cy},${cz}`;
    const baseWidth = 6;
    const baseHeight = 1.5;

    const plane = MeshBuilder.CreatePlane(`chunk-label-${text}`,
      { width: baseWidth, height: baseHeight }, this.scene);

    // Position at chunk center
    const s = 16;
    plane.position = new Vector3(cx * s + s / 2, cy * s + s / 2, cz * s + s / 2);

    // Billboard to face camera
    plane.billboardMode = AbstractMesh.BILLBOARDMODE_ALL;
    plane.isPickable = false;
    plane.renderingGroupId = 2;

    // Create dynamic texture with text
    const dynTex = new DynamicTexture(`dt-${text}`, { width: 512, height: 128 }, this.scene, true);
    dynTex.hasAlpha = true;
    const ctx = dynTex.getContext();
    ctx.clearRect(0, 0, 512, 128);

    const fontSize = 56;
    dynTex.drawText(text, null, null, `${fontSize}px Arial`, 'white', 'transparent', true, true);

    const mat = new StandardMaterial(`mat-${text}`, this.scene);
    mat.diffuseTexture = dynTex;
    mat.emissiveColor = new Color3(1, 1, 1);
    mat.backFaceCulling = false;
    mat.opacityTexture = dynTex;

    plane.material = mat;

    return plane;
  }
} 