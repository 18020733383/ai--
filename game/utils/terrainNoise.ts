/**
 * 2D Value Noise（无依赖，确定性）
 * 用于生成地图地形网格：森林/草原/沙漠/丘陵/湿地
 */

const SEED = 42;
const hash = (x: number, y: number) => {
  let n = ((x + SEED) * 374761393 + (y + SEED) * 668265263) | 0;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) & 0x7fffffff) / 0x7fffffff;
};

const lerp = (a: number, b: number, t: number) =>
  a + (b - a) * (t * t * (3 - 2 * t)); // smoothstep

const noise2D = (x: number, y: number) => {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const aa = hash(ix, iy);
  const ab = hash(ix, iy + 1);
  const ba = hash(ix + 1, iy);
  const bb = hash(ix + 1, iy + 1);
  return lerp(lerp(aa, ba, fx), lerp(ab, bb, fx), fy);
};

/** 分形布朗运动，得到更平滑的地形 */
export const fbm = (x: number, y: number, octaves = 3) => {
  let v = 0;
  let a = 0.5;
  let f = 1;
  for (let i = 0; i < octaves; i++) {
    v += a * (noise2D(x * f, y * f) * 0.5 + 0.5);
    a *= 0.5;
    f *= 2;
  }
  return Math.max(0, Math.min(1, v));
};

export type TerrainType = 'forest' | 'grassland' | 'desert' | 'hills' | 'wetland';

/** 根据 0~1 归一化坐标返回地形类型，这样细化网格时不会整张地图洗牌 */
export const getTerrainType = (nx: number, ny: number): TerrainType => {
  const x = Math.max(0, Math.min(1, nx));
  const y = Math.max(0, Math.min(1, ny));
  const n1 = fbm(x * 4.5, y * 4.5);
  const n2 = fbm(x * 10 + 100, y * 10 + 57);
  const combined = n1 * 0.7 + n2 * 0.3;
  if (combined < 0.18) return 'wetland';
  if (combined < 0.42) return 'grassland';
  if (combined < 0.62) return 'forest';
  if (combined < 0.82) return 'hills';
  return 'desert';
};
