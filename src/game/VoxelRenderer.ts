import { Scene, MeshBuilder, StandardMaterial, Color3, InstancedMesh, Mesh, Vector3 } from '@babylonjs/core';

export type SimpleVoxel = { x: number; y: number; z: number; type: number };

export class VoxelRenderer {
  private scene: Scene;
  private baseCube: Mesh;
  private materialCache: Map<number, StandardMaterial> = new Map();
  private instances: InstancedMesh[] = [];

  constructor(scene: Scene) {
    this.scene = scene;
    this.baseCube = MeshBuilder.CreateBox('voxel-base', { size: 1 }, scene);
    this.baseCube.isVisible = false;
  }

  dispose(): void {
    this.instances.forEach(i => i.dispose());
    this.instances = [];
    this.baseCube.dispose();
    this.materialCache.forEach(mat => mat.dispose());
    this.materialCache.clear();
  }

  private materialForType(voxelType: number): StandardMaterial {
    let mat = this.materialCache.get(voxelType);
    if (mat) return mat;

    mat = new StandardMaterial(`voxel-mat-${voxelType}`, this.scene);
    // Simple color mapping by type
    const hue = ((voxelType * 37) % 360) / 360;
    const color = Color3.FromHSV(hue, 0.6, 0.9);
    mat.diffuseColor = color;
    mat.specularColor = new Color3(0, 0, 0);
    this.materialCache.set(voxelType, mat);
    return mat;
  }

  renderVoxels(voxels: SimpleVoxel[]): void {
    // Clear previous
    this.instances.forEach(i => i.dispose());
    this.instances = [];

    for (const v of voxels) {
      const inst = this.baseCube.createInstance(`vx-${v.x}-${v.y}-${v.z}`);
      inst.position = new Vector3(v.x + 0.5, v.y + 0.5, v.z + 0.5);
      inst.material = this.materialForType(v.type);
      this.instances.push(inst);
    }
  }

  renderChunkBytes(chunkBytes: Uint8Array, chunkOrigin: { x: number; y: number; z: number }): void {
    // Clear previous
    this.instances.forEach(i => i.dispose());
    this.instances = [];

    const size = 16;
    for (let z = 0; z < size; z++) {
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const idx = x + y * size + z * size * size;
          const type = chunkBytes[idx];
          if (type === 0) continue;
          const wx = chunkOrigin.x * size + x;
          const wy = chunkOrigin.y * size + y;
          const wz = chunkOrigin.z * size + z;
          const inst = this.baseCube.createInstance(`vx-${wx}-${wy}-${wz}`);
          inst.position = new Vector3(wx + 0.5, wy + 0.5, wz + 0.5);
          inst.material = this.materialForType(type);
          this.instances.push(inst);
        }
      }
    }
  }
} 