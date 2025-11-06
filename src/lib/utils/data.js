import * as d3 from "d3";
// Helper: Box-Muller transform for standard normal
export function gaussianRandom() {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Generates an ordered dataset of 2D spiral points with Gaussian noise and squashed along the diagonal.
 * @param {number} numPoints - Number of points to generate.
 * @param {number} noiseVariance - Variance of the Gaussian noise.
 * @param {number} [turns=3] - Number of spiral turns.
 * @param {number} [squashFactor=1] - Amount to squash along the diagonal (0 < squashFactor <= 1).
 * @returns {{data: Array<{x:number,y:number}>, t: Array<number>}}
 */
export function generateNoisySpiral(
  numPoints,
  noiseVariance,
  turns = 3,
  squashFactor = 1.8
) {
  const data = [];
  const tArr = [];
  const noiseStd = Math.sqrt(noiseVariance);

  for (let i = 0; i < numPoints; i++) {
    const t = i / (numPoints - 1);
    const theta = t * (Math.PI * 2 * turns);
    const r = theta;
    let x = r * Math.cos(theta);
    let y = r * Math.sin(theta);

    // Add Gaussian noise
    x += noiseStd * gaussianRandom();
    y += noiseStd * gaussianRandom();

    // Squash along diagonal y = x
    // u = (x+y)/2 along diagonal, v = (x-y)/2 orthogonal
    let u = (x + y) / 2;
    let v = (x - y) / 2;

    u *= squashFactor; // squash along diagonal

    // reconstruct
    x = u + v;
    y = u - v;

    data.push({ x, y });
    tArr.push(t);
  }

  return { data, t: tArr };
}

/**
 * Generates a set of uniformly spaced, noise-free spiral points with optional diagonal squash.
 * @param {number} numPoints - Number of points to generate.
 * @param {number} [turns=3] - Number of spiral turns.
 * @param {number} [squashFactor=1] - Amount to squash along the diagonal (0 < squashFactor <= 1).
 * @returns {{data: Array<{x:number,y:number}>, t: Array<number>}}
 */
export function generateNoiseFreeSpiralPoints(
  numPoints,
  turns = 3,
  squashFactor = 1
) {
  const data = [];
  const tArr = [];
  for (let i = 0; i < numPoints; i++) {
    const t = i / (numPoints - 1);
    const theta = t * (Math.PI * 2 * turns);
    const r = theta;
    let x = r * Math.cos(theta);
    let y = r * Math.sin(theta);
    // Squash along diagonal y = x
    let u = (x + y) / 2;
    let v = (x - y) / 2;
    u *= squashFactor;
    x = u + v;
    y = u - v;
    data.push({ x, y });
    tArr.push(t);
  }
  return { data, t: tArr };
}

/**
 * Generates a noisy sine wave dataset with optional rotation
 * @param {number} numPoints - Number of points to generate
 * @param {number} noiseVariance - Variance of Gaussian noise to add
 * @param {number} rotationAngle - Rotation angle in degrees (default: 110)
 * @param {number} squashFactor - Controls the frequency of the sine wave (default: 1)
 * @param {Array<number>} xRange - [min, max] range for x values (default: [0, 10])
 * @param {number} amplitude - Amplitude of the sine wave (default: 1)
 * @returns {{data: Array<{x:number,y:number}>, t: Array<number>}}
 */
export function generateNoisySineWave(
  numPoints,
  noiseVariance,
  rotationAngle = 110,
  squashFactor = 1,
  xRange = [0, 10],
  amplitude = 4
) {
  const data = [];
  const tArr = [];
  const noiseStd = Math.sqrt(noiseVariance);
  const [xMin, xMax] = xRange;
  // Convert degrees to radians
  const rotationAngleRad = (rotationAngle * Math.PI) / 180;
  const cosAngle = Math.cos(rotationAngleRad);
  const sinAngle = Math.sin(rotationAngleRad);

  for (let i = 0; i < numPoints; i++) {
    const t = i / (numPoints - 1);
    // x goes from xMin to xMax, y is sine with frequency controlled by squashFactor
    let x = xMin + t * (xMax - xMin);
    let y = Math.sin(x * squashFactor) * amplitude;
    // Add Gaussian noise
    x += noiseStd * gaussianRandom();
    y += noiseStd * gaussianRandom();

    // Rotate by the specified angle
    const rotatedX = x * cosAngle - y * sinAngle;
    const rotatedY = x * sinAngle + y * cosAngle;
    x = rotatedX;
    y = rotatedY;

    data.push({ x, y });
    tArr.push(t);
  }
  return { data, t: tArr };
}

/**
 * Plots epsilon balls around each point and connects points within epsilon distance.
 * @param {{data: Array<{x: number, y: number}>, t: Array<number>}} dataset
 * @param {number} width - Width of the SVG canvas
 * @param {number} height - Height of the SVG canvas
 * @param {number} margin - Margin around the plot
 * @returns {{xScale: function, yScale: function}}
 */
export function computeDataScales(dataset, width, height, margin) {
  const dataArr = dataset.data;
  const xs = dataArr.map((p) => p.x);
  const ys = dataArr.map((p) => p.y);
  const xExtent = d3.extent(xs);
  const yExtent = d3.extent(ys);
  // Safely handle possible undefineds from d3.extent
  const x0 = xExtent[0] ?? 0;
  const x1 = xExtent[1] ?? 1;
  const y0 = yExtent[0] ?? 0;
  const y1 = yExtent[1] ?? 1;
  const xPad = (x1 - x0) * 0.1;
  const yPad = (y1 - y0) * 0.1;
  const xScale = d3
    .scaleLinear()
    .domain([x0 - xPad, x1 + xPad])
    .range([margin, width - margin]);
  const yScale = d3
    .scaleLinear()
    .domain([y0 - yPad, y1 + yPad])
    .range([height - margin, margin]);
  return { xScale, yScale };
}
