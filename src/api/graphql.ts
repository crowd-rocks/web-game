export type AuthTokens = {
  token: string;
  gameTokenId: string;
};

const PROD_GRAPHQL = 'https://webapi.crowdedkingdoms.com:6443/graphql';
const GRAPHQL_ENDPOINT = import.meta.env.DEV ? '/graphql' : PROD_GRAPHQL;

export type GraphQLResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

async function graphqlRequest<T>(query: string, variables?: Record<string, unknown>, token?: string): Promise<T> {
  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GraphQL HTTP ${res.status}: ${text}`);
  }

  const json = (await res.json()) as GraphQLResponse<T>;
  if (json.errors && json.errors.length) {
    throw new Error(json.errors.map(e => e.message).join('; '));
  }
  if (!json.data) {
    throw new Error('No data in GraphQL response');
  }
  return json.data;
}

// Auth
export async function login(email: string, password: string): Promise<AuthTokens> {
  const query = `
    mutation Login($input: LoginUserInput!) {
      login(loginUserInput: $input) {
        token
        gameTokenId
      }
    }
  `;
  const data = await graphqlRequest<{ login: AuthTokens }>(query, { input: { email, password } });
  return data.login;
}

export async function register(email: string, username: string, password: string): Promise<AuthTokens> {
  const query = `
    mutation Register($input: RegisterUserInput!) {
      register(registerUserInput: $input) {
        token
        gameTokenId
      }
    }
  `;
  // Schema uses optional gamertag; map provided username to gamertag
  const data = await graphqlRequest<{ register: AuthTokens }>(query, { input: { email, password, gamertag: username } });
  return data.register;
}

// Map state
export type UserMapState = {
  mapId: string; // BigInt serialized as string
};

export async function getUserMapStates(token: string): Promise<UserMapState[]> {
  const query = `
    query UserMapStates {
      userMapStates { mapId }
    }
  `;
  const data = await graphqlRequest<{ userMapStates: UserMapState[] }>(query, undefined, token);
  return data.userMapStates;
}

// Chunks
export type ChunkCoordinates = { x: string; y: string; z: string };

export type ChunkSummary = {
  chunkId: string;
  mapId: string;
  coordinates: ChunkCoordinates;
  voxels?: string | null; // base64 16x16x16 voxel types
};

export async function getChunksByDistance(params: {
  mapId: string; // BigInt as string
  centerCoordinate: { x: string | number; y: string | number; z: string | number };
  maxDistance: number;
  limit?: number;
  skip?: number;
}, token: string): Promise<ChunkSummary[]> {
  const query = `
    query GetChunksByDistance($input: GetChunksByDistanceInput!) {
      getChunksByDistance(input: $input) {
        chunks {
          chunkId
          mapId
          coordinates { x y z }
          voxels
        }
        limit
        skip
      }
    }
  `;

  const input = {
    mapId: params.mapId,
    centerCoordinate: {
      x: String(params.centerCoordinate.x),
      y: String(params.centerCoordinate.y),
      z: String(params.centerCoordinate.z),
    },
    maxDistance: params.maxDistance,
    ...(typeof params.limit === 'number' ? { limit: params.limit } : {}),
    ...(typeof params.skip === 'number' ? { skip: params.skip } : {}),
  };

  const data = await graphqlRequest<{ getChunksByDistance: { chunks: ChunkSummary[] } }>(query, { input }, token);
  return data.getChunksByDistance.chunks;
}

// Voxel updates by distance
export type VoxelUpdate = {
  location: { x: number; y: number; z: number };
  voxelType: number;
};

export type ChunkVoxelUpdates = {
  coordinates: ChunkCoordinates;
  voxels: VoxelUpdate[];
};

export async function listVoxelUpdatesByDistance(params: {
  mapId: string; // BigInt as string
  centerCoordinate: { x: string | number; y: string | number; z: string | number };
  maxDistance: number;
  limit?: number;
  skip?: number;
  since?: string; // ISO DateTime
}, token: string): Promise<ChunkVoxelUpdates[]> {
  const query = `
    query ListVoxelUpdatesByDistance($input: ListVoxelUpdatesByDistanceInput!) {
      listVoxelUpdatesByDistance(input: $input) {
        chunks {
          coordinates { x y z }
          voxels { location { x y z } voxelType }
        }
        limit
        skip
      }
    }
  `;

  const input = {
    mapId: params.mapId,
    centerCoordinate: {
      x: String(params.centerCoordinate.x),
      y: String(params.centerCoordinate.y),
      z: String(params.centerCoordinate.z),
    },
    maxDistance: params.maxDistance,
    ...(typeof params.limit === 'number' ? { limit: params.limit } : {}),
    ...(typeof params.skip === 'number' ? { skip: params.skip } : {}),
    ...(params.since ? { since: params.since } : {}),
  };

  const data = await graphqlRequest<{ listVoxelUpdatesByDistance: { chunks: ChunkVoxelUpdates[] } }>(query, { input }, token);
  return data.listVoxelUpdatesByDistance.chunks;
}

// Helpers for voxel data
export function decodeChunkVoxelsBase64(data: string): Uint8Array {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes; // expected length 4096 (16*16*16)
}

// Apply updates using chunk-local voxel coordinates (0..15) with a fixed orientation
// regardless of world octant. Indexing order is x + y*16 + z*256.
export function applyVoxelUpdatesToChunkBytes(bytes: Uint8Array, updates: VoxelUpdate[]): void {
  for (const u of updates) {
    const lx = u.location.x;
    const ly = u.location.y;
    const lz = u.location.z;
    if (lx < 0 || lx >= 16 || ly < 0 || ly >= 16 || lz < 0 || lz >= 16) continue;
    const idx = lx + ly * 16 + lz * 256;
    bytes[idx] = u.voxelType & 0xff;
  }
} 