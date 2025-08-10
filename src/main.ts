import './style.css';
import { Game } from './game/Game';
import { login as apiLogin, register as apiRegister, getChunksByDistance, listVoxelUpdatesByDistance, decodeChunkVoxelsBase64, applyVoxelUpdatesToChunkBytes, type AuthTokens, type ChunkSummary } from './api/graphql';
import { VoxelRenderer } from './game/VoxelRenderer';
import { ChunkGridRenderer } from './game/ChunkGridRenderer';
import { ChunkLabelRenderer } from './game/ChunkLabelRenderer';

let gameInstance: Game | null = null;
let voxelRenderer: VoxelRenderer | null = null;
let gridRenderer: ChunkGridRenderer | null = null;
let labelRenderer: ChunkLabelRenderer | null = null;

// Initialize the game after authentication
function bootGame(): Game {
  const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
  if (!canvas) {
    throw new Error('Canvas element not found');
  }
  const game = new Game(canvas);
  return game;
}

function setupAuthUI(): void {
  const overlay = document.getElementById('auth-overlay') as HTMLDivElement;
  const tabLogin = document.getElementById('tab-login') as HTMLButtonElement;
  const tabRegister = document.getElementById('tab-register') as HTMLButtonElement;
  const loginForm = document.getElementById('login-form') as HTMLFormElement;
  const registerForm = document.getElementById('register-form') as HTMLFormElement;
  const loginError = document.getElementById('login-error') as HTMLDivElement;
  const registerError = document.getElementById('register-error') as HTMLDivElement;

  function showLogin() {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    loginForm.classList.add('visible');
    registerForm.classList.remove('visible');
  }

  function showRegister() {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    registerForm.classList.add('visible');
    loginForm.classList.remove('visible');
  }

  tabLogin.addEventListener('click', showLogin);
  tabRegister.addEventListener('click', showRegister);

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';
    const email = (document.getElementById('login-email') as HTMLInputElement).value.trim();
    const password = (document.getElementById('login-password') as HTMLInputElement).value;
    (loginForm.querySelector('button[type="submit"]') as HTMLButtonElement).disabled = true;
    try {
      const tokens = await apiLogin(email, password);
      await onAuthSuccess(tokens, overlay);
    } catch (err) {
      loginError.textContent = (err as Error).message || 'Login failed';
    } finally {
      (loginForm.querySelector('button[type="submit"]') as HTMLButtonElement).disabled = false;
    }
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    registerError.textContent = '';
    const email = (document.getElementById('register-email') as HTMLInputElement).value.trim();
    const username = (document.getElementById('register-username') as HTMLInputElement).value.trim();
    const password = (document.getElementById('register-password') as HTMLInputElement).value;
    (registerForm.querySelector('button[type="submit"]') as HTMLButtonElement).disabled = true;
    try {
      const tokens = await apiRegister(email, username, password);
      await onAuthSuccess(tokens, overlay);
    } catch (err) {
      registerError.textContent = (err as Error).message || 'Registration failed';
    } finally {
      (registerForm.querySelector('button[type="submit"]') as HTMLButtonElement).disabled = false;
    }
  });

  // default view
  showLogin();
}

function pickMapId(): string {
  // Use fixed mapId 1
  return '1';
}

function computeChunkKeysWithinDistance(center: { x: number; y: number; z: number }, distance: number): string[] {
  const keys: string[] = [];
  for (let x = center.x - distance; x <= center.x + distance; x++) {
    for (let y = center.y - distance; y <= center.y + distance; y++) {
      for (let z = center.z - distance; z <= center.z + distance; z++) {
        const manhattan = Math.abs(x - center.x) + Math.abs(y - center.y) + Math.abs(z - center.z);
        if (manhattan <= distance) {
          keys.push(`${x}:${y}:${z}`);
        }
      }
    }
  }
  return keys;
}

async function loadInitialChunksAndVoxels(token: string): Promise<void> {
  const mapId = pickMapId();
  const centerCoordinate = { x: 0, y: 0, z: 0 };
  const distance = 8;

  const requestedKeys = computeChunkKeysWithinDistance(centerCoordinate, distance);

  const chunks = await getChunksByDistance({
    mapId,
    centerCoordinate,
    maxDistance: distance,
  }, token);

  // Draw grid for all requested chunk coordinates, even if not returned
  if (gameInstance) {
    if (!gridRenderer) {
      gridRenderer = new ChunkGridRenderer(gameInstance.getScene());
    }
    gridRenderer.renderForChunkKeys(requestedKeys);
    gridRenderer.setEnabled(false); // toggle off grid lines by default

    if (!labelRenderer) {
      labelRenderer = new ChunkLabelRenderer(gameInstance.getScene());
    }
    // Labels only for chunks we actually got back
    labelRenderer.renderForChunks(chunks.map(c => c.coordinates));
  }

  const updates = await listVoxelUpdatesByDistance({
    mapId,
    centerCoordinate,
    maxDistance: distance,
  }, token);

  // Build a lookup of updates by chunk coordinate
  const updatesByChunkKey = new Map<string, typeof updates[number]>();
  for (const ch of updates) {
    const key = `${ch.coordinates.x}:${ch.coordinates.y}:${ch.coordinates.z}`;
    updatesByChunkKey.set(key, ch);
  }

  // Render voxels for all returned chunks
  const totalVoxels = await renderAllChunks(chunks, updatesByChunkKey);

  // eslint-disable-next-line no-console
  console.log(`[World Load] requestedChunks=${requestedKeys.length} returnedChunks=${chunks.length} visibleVoxels=${totalVoxels}`);
}

async function renderAllChunks(chunks: ChunkSummary[], updatesByChunkKey: Map<string, any>): Promise<number> {
  if (!gameInstance) return 0;
  if (!voxelRenderer) voxelRenderer = new VoxelRenderer(gameInstance.getScene());

  let total = 0;
  // Simple approach: render one chunk at a time replacing previous; for a real game we’d keep per-chunk meshes
  for (const ch of chunks) {
    if (!ch.voxels) continue;
    const cx = parseInt(ch.coordinates.x, 10);
    const cy = parseInt(ch.coordinates.y, 10);
    const cz = parseInt(ch.coordinates.z, 10);
    const bytes = decodeChunkVoxelsBase64(ch.voxels);
    const upd = updatesByChunkKey.get(`${ch.coordinates.x}:${ch.coordinates.y}:${ch.coordinates.z}`);
    if (upd) {
      applyVoxelUpdatesToChunkBytes(bytes, upd.voxels);
    }
    total += voxelRenderer.renderChunkBytes(bytes, { x: cx, y: cy, z: cz });
  }
  return total;
}

async function onAuthSuccess(tokens: AuthTokens, overlay: HTMLDivElement): Promise<void> {
  // Persist token for session
  sessionStorage.setItem('ck_access_token', tokens.token);
  sessionStorage.setItem('ck_game_token_id', tokens.gameTokenId);
  overlay.style.display = 'none';

  // Start game
  gameInstance = bootGame();

  // Fetch chunks and voxels around origin within distance 8
  try {
    await loadInitialChunksAndVoxels(tokens.token);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to load chunks/voxels:', err);
  }
}

// Initialize when page loads
window.addEventListener('DOMContentLoaded', () => {
  // If token exists, skip auth overlay
  const existingToken = sessionStorage.getItem('ck_access_token');
  const overlay = document.getElementById('auth-overlay') as HTMLDivElement;
  if (existingToken) {
    overlay.style.display = 'none';
    gameInstance = bootGame();
    loadInitialChunksAndVoxels(existingToken).catch(err => console.error(err));
  } else {
    setupAuthUI();
  }

  // Handle window resize
  window.addEventListener('resize', () => {
    if (gameInstance) {
      gameInstance.resize();
    }
  });

  // Handle page unload
  window.addEventListener('beforeunload', () => {
    if (gameInstance) {
      gameInstance.dispose();
      gameInstance = null;
    }
    if (voxelRenderer) {
      voxelRenderer.dispose();
      voxelRenderer = null;
    }
    if (gridRenderer) {
      gridRenderer.dispose();
      gridRenderer = null;
    }
    if (labelRenderer) {
      labelRenderer.dispose();
      labelRenderer = null;
    }
  });
});
