// @ts-nocheck
import * as math from "mathjs";

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
 * Computes the shortest path distances from a start vertex to all other vertices using Dijkstra's algorithm.
 * @param {Array<Array<number>>} adj - Adjacency matrix (n x n), with Infinity for no edge.
 * @param {number} start - Index of the start vertex.
 * @returns {Array<number>} Array of distances from start to each vertex. Infinity if unreachable.
 */
export function dijkstraDistances(adj, start) {
  const n = adj.length;
  const dist = Array(n).fill(Infinity);
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
        }
      }
    }
  }
  return dist;
}

/**
 * Computes the shortest path distance between two vertices using Dijkstra's algorithm.
 * @param {Array<Array<number>>} adj - Adjacency matrix (n x n), with Infinity for no edge.
 * @param {number} start - Index of the start vertex.
 * @param {number} end - Index of the end vertex.
 * @returns {number} Distance from start to end. Infinity if no path exists.
 */
export function dijkstraDistance(adj, start, end) {
  const distances = dijkstraDistances(adj, start);
  return distances[end];
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
/**
 * Computes the epsilon neighborhood graph for a set of 2D points.
 * Returns an adjacency matrix (n x n) where entry [i][j] is the Euclidean distance if points i and j are within epsilon distance, otherwise 0.
 * @param {Array<{x: number, y: number}>} data - Array of 2D points.
 * @param {number} epsilon - Maximum distance for neighborhood inclusion.
 * @returns {Array<Array<number>>} Adjacency matrix.
 */
export function computeEpsilonNeighborhoodGraph(data, epsilon) {
  const n = data.length;
  // Initialize adjacency matrix with 0
  const adj = Array.from({ length: n }, () => Array(n).fill(0));

  // Compute all pairwise distances and connect points within epsilon
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      // Only compute upper triangle (symmetric matrix)
      const dx = data[i].x - data[j].x;
      const dy = data[i].y - data[j].y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= epsilon) {
        adj[i][j] = 1;
        adj[j][i] = 1; // Make symmetric (undirected graph)
      }
    }
  }

  return adj;
}
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

/* -------------- Code for doing MDS ------------------ */

export function computeMDS(pairwiseDistances, data, nComponents = 2) {
  /**
   * Computes Multidimensional Scaling (MDS) projection from pairwise distances.
   * @param {Array<Array<number>>} pairwiseDistances - Symmetric matrix of pairwise distances (n x n).
   * @param {number} [nComponents=2] - Number of dimensions to project into.
   * @returns {Object} { coordinates: Array<Array<number>>, eigenvectors: Array<Array<number>> } - Projected coordinates and eigenvectors.
   */
  /* Given pairwise distances compute the MDS projection */
  const n = pairwiseDistances.length;
  const D = math.matrix(pairwiseDistances);
  // Element-wise square: use map to avoid issues with direct square on Matrix
  const D2 = math.map(D, (v) => v * v);

  // Centering matrix
  const I = math.identity(n);
  const ones = math.ones(n, n);
  const J = math.divide(ones, n);
  const C = math.subtract(I, J);

  // Double centering
  const B = math.multiply(-0.5, math.multiply(math.multiply(C, D2), C));

  // Top eigenpair via power iteration (replace eigs)
  const { eigenvalue: topValRaw, eigenvector: topVecRaw } = powerIteration(B);
  const topVal = Math.max(0, topValRaw);
  const topVec = Array.isArray(topVecRaw) ? topVecRaw : topVecRaw.toArray();

  // 1D coordinates from top eigenvector
  const coords1D = Array.from(
    { length: n },
    (_, i) => topVec[i] * Math.sqrt(topVal)
  );

  // Rescale 1D coords to match original data's x-width, place along mean y
  let xMin = Infinity,
    xMax = -Infinity,
    ySum = 0;
  for (let i = 0; i < n; i++) {
    const p = data[i];
    if (p.x < xMin) xMin = p.x;
    if (p.x > xMax) xMax = p.x;
    ySum += p.y;
  }
  const origWidth = xMax - xMin;
  const yConst = ySum / n;

  let projMin = Infinity,
    projMax = -Infinity,
    projSum = 0;
  for (let i = 0; i < n; i++) {
    const v = coords1D[i];
    if (v < projMin) projMin = v;
    if (v > projMax) projMax = v;
    projSum += v;
  }
  const projWidth = projMax - projMin;
  const projMean = projSum / n;
  const scale = projWidth > 0 && origWidth > 0 ? origWidth / projWidth : 1;
  const xCenter = (xMin + xMax) / 2;

  const coords = coords1D.map((v) => [
    (v - projMean) * scale + xCenter,
    yConst,
  ]);

  return {
    coordinates: coords,
    eigenvectors: [topVec],
  };
}

export function computeEuclideanPairwiseDistances(data) {
  /**
   * Computes the pairwise Euclidean distances between all data points.
   * @param {Array<Array<number>>} data - 2D array of data points (n_samples x n_features).
   * @returns {Array<Array<number>>} Symmetric matrix of pairwise Euclidean distances (n x n).
   */
  // Return a matrix of pairwise distances between the data points
  const n = data.length;
  const distanceMatrix = Array(n)
    .fill()
    .map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const distance = math.distance(data[i], data[j]);
      distanceMatrix[i][j] = distance;
      distanceMatrix[j][i] = distance; // Symmetric matrix
    }
  }

  return distanceMatrix;
}

export function computeEuclideanMDS(data) {
  /**
   * Computes Euclidean MDS by first calculating pairwise Euclidean distances, then applying MDS.
   * @param {Array<Array<number>>} data - 2D array of data points (n_samples x n_features).
   * @returns {Object} { coordinates: Array<Array<number>>, eigenvectors: Array<Array<number>> } - MDS projection and eigenvectors.
   */
  // Compute the pairwise distances then do MDS on them
  const euclideanPairwiseDistances = computeEuclideanPairwiseDistances(data);
  return computeMDS(euclideanPairwiseDistances, data);
}

export function computeGeodesicPairwiseDistances(adjacencyMatrix) {
  /**
   * Computes geodesic pairwise distances using Dijkstra's algorithm for all pairs.
   * @param {Array<Array<number>>} adjacencyMatrix - Adjacency matrix (n x n), with edge weights or Infinity for no edge.
   * @returns {Array<Array<number>>} Symmetric matrix of geodesic distances (n x n), with Infinity for unreachable pairs.
   */
  /* 
    Compute the geodesic distances using Dijkstra's algorithm 
    between each element in the given adjacency matrix 
  */
  const n = adjacencyMatrix.length;
  const distanceMatrix = Array.from({ length: n }, () =>
    Array(n).fill(Infinity)
  );

  for (let i = 0; i < n; i++) {
    const distances = dijkstraDistances(adjacencyMatrix, i);
    for (let j = 0; j < n; j++) {
      distanceMatrix[i][j] = distances[j];
    }
  }

  return distanceMatrix;
}

/**
 * Find connected components in an undirected weighted graph represented by an adjacency matrix.
 * Uses DFS over edges where weight is finite and non-zero.
 * @param {Array<Array<number>>} adjacencyMatrix
 * @returns {Array<Array<number>>} Array of components, each a list of vertex indices.
 */
export function findConnectedComponents(adjacencyMatrix) {
  const n = adjacencyMatrix.length;
  const visited = Array(n).fill(false);
  const components = [];

  const hasEdge = (w) => w !== Infinity && w !== 0;

  function dfs(u, comp) {
    visited[u] = true;
    comp.push(u);
    for (let v = 0; v < n; v++) {
      if (!visited[v] && hasEdge(adjacencyMatrix[u][v])) {
        dfs(v, comp);
      }
    }
  }

  for (let i = 0; i < n; i++) {
    if (!visited[i]) {
      const comp = [];
      dfs(i, comp);
      components.push(comp);
    }
  }

  return components;
}

/**
 * Ensure a graph is connected by iteratively connecting the closest pair of vertices
 * belonging to different connected components, using Euclidean distance between their
 * original coordinates (provided in `data`). Returns a NEW adjacency matrix.
 * @param {Array<Array<number>>} adjacencyMatrix - Weighted adjacency matrix (Infinity or 0 = no edge)
 * @param {Array<{x:number, y:number}>} data - Original 2D coordinates for distance evaluation
 * @returns {Array<Array<number>>} A connected adjacency matrix
 */
export function connectDisconnectedComponents(adjacencyMatrix, data) {
  const n = adjacencyMatrix.length;
  if (n === 0) return adjacencyMatrix;

  // Deep copy adjacency to avoid mutating the caller's matrix
  const adj = adjacencyMatrix.map((row) => row.slice());

  const euclid = (i, j) => {
    const dx = data[i].x - data[j].x;
    const dy = data[i].y - data[j].y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Repeatedly connect components until only one remains
  let components = findConnectedComponents(adj);
  while (components.length > 1) {
    let bestI = -1;
    let bestJ = -1;
    let bestDist = Infinity;

    // Find closest cross-component pair
    for (let a = 0; a < components.length; a++) {
      for (let b = a + 1; b < components.length; b++) {
        const compA = components[a];
        const compB = components[b];
        for (const i of compA) {
          for (const j of compB) {
            const d = euclid(i, j);
            if (d < bestDist) {
              bestDist = d;
              bestI = i;
              bestJ = j;
            }
          }
        }
      }
    }

    if (bestI === -1 || bestJ === -1 || bestDist === Infinity) {
      // Fallback: cannot find a finite connection; break to avoid infinite loop
      break;
    }

    // Connect the best pair symmetrically with Euclidean distance as weight
    adj[bestI][bestJ] = bestDist;
    adj[bestJ][bestI] = bestDist;

    // Recompute components after adding the bridge
    components = findConnectedComponents(adj);
  }

  return adj;
}

/**
 * Power iteration to approximate the dominant eigenvalue/vector of a matrix.
 * @param {import('mathjs').MathType} matrix - Square matrix (mathjs Matrix or array of arrays)
 * @param {number} numIters
 * @param {number} tol
 * @returns {{ eigenvalue: number, eigenvector: Array<number> | any }}
 */
export function powerIteration(matrix, numIters = 1000, tol = 1e-10) {
  const size = math.size(matrix).toArray
    ? math.size(matrix).toArray()
    : math.size(matrix);
  const n = Array.isArray(size) ? size[0] : size.get([0]);
  // Initialize random vector b in [-1,1]
  let b = Array.from({ length: n }, () => Math.random() * 2 - 1);
  let bNorm = math.norm(b);
  if (bNorm === 0) bNorm = 1;
  b = math.divide(b, bNorm);

  let lambda = 0;
  for (let i = 0; i < numIters; i++) {
    const bNew = math.multiply(matrix, b);
    const bNewNorm = math.norm(bNew);
    if (bNewNorm === 0) break;
    b = math.divide(bNew, bNewNorm);
    const lambdaNew = math.dot(b, math.multiply(matrix, b));
    if (Math.abs(lambdaNew - lambda) < tol) {
      lambda = lambdaNew;
      break;
    }
    lambda = lambdaNew;
  }
  return { eigenvalue: lambda, eigenvector: b };
}

export function computeIsomap(data, k) {
  /**
   * Performs Isomap dimensionality reduction.
   * @param {Array<{x: number, y: number}>} data - Array of 2D data points.
   * @param {number} k - Number of nearest neighbors for graph construction.
   * @returns {Object} { coordinates: Array<Array<number>>, eigenvectors: Array<Array<number>> } - MDS projection and eigenvectors.
   */
  // This is basically MDS on the geodesic pairwise distance matrix
  // NOTE: Assuming going from 2 to 1 dimension here.
  // 1. Construct KNN graph
  const knnAdjacencyMatrix = computeKNearestNeighborGraph(data, k);
  // 1.5. Ensure the graph is connected by bridging components via nearest cross-component pair
  const connectedAdjacencyMatrix = connectDisconnectedComponents(
    knnAdjacencyMatrix,
    data
  );
  // 2. Compute the geodesic distances in this (now connected) graph.
  // Get start time
  const startTime = performance.now();
  const geodesicDistances = computeGeodesicPairwiseDistances(
    connectedAdjacencyMatrix
  );
  // Assert no Infinity values remain
  for (let i = 0; i < geodesicDistances.length; i++) {
    for (let j = 0; j < geodesicDistances.length; j++) {
      if (geodesicDistances[i][j] === Infinity) {
        console.warn(
          `Warning: Found Infinity in geodesic distances between ${i} and ${j}`
        );
      }
    }
  }
  // Get end time
  const endTime = performance.now();
  // 3. Compute MDS on these geodesic pairwise distances
  const mds = computeMDS(geodesicDistances, data);
  return mds;
}
