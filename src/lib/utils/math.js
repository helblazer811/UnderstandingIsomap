import * as math from "mathjs";
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
 * Computes the shortest path between two vertices using Dijkstra's algorithm.
 * @param {Array<Array<number>>} adj - Adjacency matrix (n x n), with Infinity for no edge.
 * @param {number} start - Index of the start vertex.
 * @param {number} end - Index of the end vertex.
 * @returns {Array<number>} Array of vertex indices representing the shortest path from start to end (inclusive). Returns [] if no path exists.
 */
export function dijkstraShortestPath(adj, start, end) {
  const n = adj.length;
  const dist = Array(n).fill(Infinity);
  const prev = Array(n).fill(null);
  const visited = Array(n).fill(false);
  dist[start] = 0;
  for (let count = 0; count < n; count++) {
    // Find unvisited node with smallest distance
    let u = -1;
    let minDist = Infinity;
    for (let i = 0; i < n; i++) {
      if (!visited[i] && dist[i] < minDist) {
        minDist = dist[i];
        u = i;
      }
    }
    if (u === -1 || minDist === Infinity) break; // No more reachable nodes
    visited[u] = true;
    for (let v = 0; v < n; v++) {
      if (!visited[v] && adj[u][v] !== Infinity) {
        const alt = dist[u] + adj[u][v];
        if (alt < dist[v]) {
          dist[v] = alt;
          prev[v] = u;
        }
      }
    }
  }
  // Reconstruct path
  const path = [];
  let curr = end;
  while (curr !== null) {
    path.push(curr);
    curr = prev[curr];
  }
  path.reverse();
  if (path[0] !== start) return [];
  return path;
}

/**
 * Computes the k-nearest neighbor graph for a set of 2D points.
 * Returns an adjacency matrix (n x n) where entry [i][j] is the Euclidean distance if j is among i's k nearest neighbors, otherwise Infinity.
 * @param {Array<{x: number, y: number}>} data - Array of 2D points.
 * @param {number} k - Number of nearest neighbors.
 * @returns {Array<Array<number>>} Adjacency matrix.
 */
export function computeKNearestNeighborGraph(data, k) {
  const n = data.length;
  // Initialize adjacency matrix with Infinity
  const adj = Array.from({ length: n }, () => Array(n).fill(Infinity));
  // Compute all pairwise distances
  const dists = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const dx = data[i].x - data[j].x;
      const dy = data[i].y - data[j].y;
      dists[i][j] = Math.sqrt(dx * dx + dy * dy);
    }
  }
  // For each point, find k nearest neighbors
  for (let i = 0; i < n; i++) {
    // Get sorted indices of neighbors by distance
    const neighbors = Array.from({ length: n }, (_, j) => j)
      .filter((j) => j !== i)
      .sort((a, b) => dists[i][a] - dists[i][b])
      .slice(0, k);
    for (const j of neighbors) {
      adj[i][j] = dists[i][j];
      adj[j][i] = dists[i][j]; // Make symmetric (undirected)
    }
  }
  return adj;
}

// Helper: Box-Muller transform for standard normal
export function gaussianRandom() {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function convertObjectDataFormatToArray(dataObj) {
  return dataObj.map((point) => [point.x, point.y]);
}

/**
 * Perform PCA on a dataset using math.js
 * @param {Array<Array<number>>} data - 2D array of shape (n_samples, n_features)
 * @param {number} [nComponents] - Number of components to keep (optional)
 * @returns {Object} { projected, components, explainedVariance, mean }
 */
export function computePCA(data, nComponents = null) {
  // Make sure we have a plain array
  const dataArray = convertObjectDataFormatToArray(data);
  // Center data
  const mean = math.mean(dataArray, 0);
  const centered = dataArray.map((row) => math.subtract(row, mean));

  const X_centered = math.matrix(centered);
  const nSamples = X_centered.size()[0];
  const nFeatures = X_centered.size()[1];

  // 2. Covariance matrix
  const cov = math.multiply(math.transpose(X_centered), X_centered);
  const covMatrix = math.divide(cov, nSamples - 1);

  // 3. Eigen decomposition
  const eig = math.eigs(covMatrix);
  const eigenVectors = eig.eigenvectors;

  // 4. Sort eigenvalues/vectors by descending eigenvalue
  const sorted = eigenVectors.sort((a, b) => b.value - a.value);

  console.log(sorted);

  const sortedValues = sorted.map((e) => e.value);
  const sortedVectors = sorted.map((e) => e.vector);

  // 5. Choose number of components
  const k = nComponents || nFeatures;
  const components = math.transpose(math.matrix(sortedVectors.slice(0, k)));

  // 6. Project data
  const projected = math.multiply(X_centered, components);

  // 7. Explained variance ratio
  const totalVar = math.sum(sortedValues);
  const explainedVariance = sortedValues.slice(0, k).map((v) => v / totalVar);

  return {
    projected: projected.toArray(),
    components: components.toArray(),
    values: sortedValues,
    explainedVariance,
    mean: mean,
  };
}

/**
 * Projects 2D data onto the first principal component using mathjs.
 * @param {Array<{x:number, y:number}>} data - Array of 2D points.
 * @returns {Array<number>} Array of scores (projections onto first PC).
 */
export function projectOntoFirstPrincipalComponent(data) {
  // Convert to array and center
  const arr = data.map((pt) => [pt.x, pt.y]);
  const mean = math.mean(arr, 0);
  const centered = arr.map((row) => math.subtract(row, mean));
  // Compute covariance and eigendecomposition
  const X = math.matrix(centered);
  const cov = math.multiply(math.transpose(X), X);
  const covMatrix = math.divide(cov, arr.length - 1);
  const eig = math.eigs(covMatrix);
  // Sort eigenvectors by value descending and take the first
  const sorted = eig.eigenvectors.sort((a, b) => b.value - a.value);
  let pc1 = sorted[0].vector;
  // Normalize pc1
  pc1 = math.divide(pc1, math.norm(pc1));
  // Compute projection scores (n_samples x 1)
  console.log(X);
  console.log(pc1);
  const scores = math.multiply(X, pc1); // shape: [n, 1]
  // Reconstruct projected vectors (n x 2)
  const projected = math.multiply(
    math.reshape(scores, [scores.size()[0], 1]),
    math.reshape(pc1, [1, pc1.size()[0]])
  );
  // math.js interprets this as n x 1 * 1 x 2 = n x 2
  // Add back the mean
  const reconstructed = math.add(projected, mean);

  return reconstructed.toArray();
}
