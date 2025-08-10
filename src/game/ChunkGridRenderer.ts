import { Scene, MeshBuilder, Color3, Vector3, LinesMesh, StandardMaterial } from '@babylonjs/core';

export type ChunkCoord = { x: string; y: string; z: string } | { x: number; y: number; z: number };

function toInt(n: string | number): number {
  return typeof n === 'string' ? parseInt(n, 10) : n;
}

export class ChunkGridRenderer {
  private scene: Scene;
  private grids = new Map<string, LinesMesh>();
  private material: StandardMaterial;
  private enabled = true;

  constructor(scene: Scene) {
    this.scene = scene;
    this.material = new StandardMaterial('chunk-grid-mat', scene);
    this.material.emissiveColor = new Color3(0.6, 0.6, 0.7);
    this.material.alpha = 0.6;
  }

  dispose(): void {
    this.grids.forEach(g => g.dispose());
    this.grids.clear();
    this.material.dispose();
  }

  setEnabled(flag: boolean): void {
    if (this.enabled === flag) return;
    this.enabled = flag;
    for (const mesh of this.grids.values()) {
      mesh.isVisible = this.enabled;
    }
  }

  isEnabled(): boolean { return this.enabled; }

  renderForChunks(coords: ChunkCoord[]): void {
    this.renderForChunkKeys(coords.map(c => `${toInt(c.x)}:${toInt(c.y)}:${toInt(c.z)}`));
  }

  renderForChunkKeys(keys: string[]): void {
    const desiredKeys = new Set<string>(keys);
    for (const key of desiredKeys) {
      if (!this.grids.has(key)) {
        const [cx, cy, cz] = key.split(':').map(v => parseInt(v, 10));
        const mesh = this.createChunkBox(cx, cy, cz);
        mesh.isVisible = this.enabled;
        this.grids.set(key, mesh);
      }
    }
    for (const [key, mesh] of this.grids) {
      if (!desiredKeys.has(key)) {
        mesh.dispose();
        this.grids.delete(key);
      }
    }
  }

  private createChunkBox(cx: number, cy: number, cz: number): LinesMesh {
    const size = 16;
    // Server coords (x,y,z) with z up -> world (x,z,y)
    const minServer = { x: cx * size, y: cy * size, z: cz * size };
    const maxServer = { x: minServer.x + size, y: minServer.y + size, z: minServer.z + size };

    const toWorld = (sx: number, sy: number, sz: number) => new Vector3(sx, sz, sy);

    const p000 = toWorld(minServer.x, minServer.y, minServer.z);
    const p001 = toWorld(minServer.x, minServer.y, maxServer.z);
    const p010 = toWorld(minServer.x, maxServer.y, minServer.z);
    const p011 = toWorld(minServer.x, maxServer.y, maxServer.z);
    const p100 = toWorld(maxServer.x, minServer.y, minServer.z);
    const p101 = toWorld(maxServer.x, minServer.y, maxServer.z);
    const p110 = toWorld(maxServer.x, maxServer.y, minServer.z);
    const p111 = toWorld(maxServer.x, maxServer.y, maxServer.z);

    const lines = [
      [p000, p001], [p000, p010], [p000, p100],
      [p111, p101], [p111, p110], [p111, p011],
      [p001, p011], [p001, p101],
      [p010, p011], [p010, p110],
      [p100, p101], [p100, p110],
    ];

    const mesh = MeshBuilder.CreateLineSystem(`chunk-grid-${cx}-${cy}-${cz}`,
      { lines, updatable: false }, this.scene);
    mesh.color = new Color3(0.6, 0.6, 0.7);
    mesh.alwaysSelectAsActiveMesh = true;
    mesh.renderingGroupId = 1; // render on top of solids slightly
    mesh.material = this.material;
    return mesh;
  }
} 