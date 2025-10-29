<script>
import * as d3 from "d3";
  import { onMount } from "svelte";
// import nj from "numjs";

// /**
//  * Perform PCA on a dataset object {data: [], t: []}
//  * @param {Object} dataset - Object with keys 'data' and 't'
//  * @param {number} nComponents - Number of principal components
//  * @returns {Object} - {transformed, eigenvectors, eigenvalues}
//  */
// function pca(dataset, nComponents = 2) {
//   // Convert dataset.data to NumJs array
//   const data = nj.array(dataset.data);

//   // 1️⃣ Center the data
//   const mean = data.mean(0);
//   const centered = data.subtract(mean);

//   // 2️⃣ Covariance matrix
//   const covMatrix = nj.dot(centered.T, centered).divide(data.shape[0] - 1);

//   // 3️⃣ Eigen decomposition
//   const eig = nj.linalg.eig(covMatrix);
//   const eigenvalues = eig[0];
//   const eigenvectors = eig[1];

//   // 4️⃣ Sort eigenvectors by eigenvalues (descending)
//   const idx = nj.argsort(eigenvalues).tolist().reverse();
//   const sortedEigenvectors = nj.array(idx.map((i) => eigenvectors.T.pick(i))).T;

//   // 5️⃣ Select top nComponents eigenvectors
//   const topEigenvectors = sortedEigenvectors.slice(null, null, 0, nComponents);

//   // 6️⃣ Project data
//   const transformed = nj.dot(centered, topEigenvectors);

//   return {
//     transformed: transformed,
//     eigenvectors: topEigenvectors,
//     eigenvalues: nj.array(idx.map((i) => eigenvalues.get(i))),
//   };
// }

/**
 * Computes the shortest path between two vertices using Dijkstra's algorithm.
 * @param {Array<Array<number>>} adj - Adjacency matrix (n x n), with Infinity for no edge.
 * @param {number} start - Index of the start vertex.
 * @param {number} end - Index of the end vertex.
 * @returns {Array<number>} Array of vertex indices representing the shortest path from start to end (inclusive). Returns [] if no path exists.
 */
function dijkstraShortestPath(adj, start, end) {
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
function computeKNearestNeighborGraph(data, k) {
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
 * Generates an ordered dataset of 2D spiral points with added Gaussian noise.
 * Each point has x, y, and t (from 0 to 1).
 * @param {number} numPoints - Number of points to generate.
 * @param {number} noiseVariance - Variance of the Gaussian noise to add.
 * @param {number} [turns=2] - Number of spiral turns.
 * @returns {Array<{x: number, y: number, t: number}>} Array of dataset objects.
 */
function generateNoisySpiral(numPoints, noiseVariance, turns = 3) {
  const data = [];
  const tArr = [];
  const noiseStd = Math.sqrt(noiseVariance);
  for (let i = 0; i < numPoints; i++) {
    const t = i / (numPoints - 1);
    const theta = t * (Math.PI * 2 * turns);
    const r = theta;
    let x = r * Math.cos(theta);
    let y = r * Math.sin(theta);
    x += noiseStd * gaussianRandom();
    y += noiseStd * gaussianRandom();
    data.push({ x, y });
    tArr.push(t);
  }
  return { data, t: tArr };
}

// Helper: Box-Muller transform for standard normal
function gaussianRandom() {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Plots a scatter plot of 2D points in the #scatter-plot-container div using d3.
 * @param {{data: Array<{x: number, y: number}>, t: Array<number>}} dataset - Dataset object to plot.
 * @param {Object} [options] - Optional plot settings.
 * @param {number} [options.width=400] - Width of the plot.
 * @param {number} [options.height=400] - Height of the plot.
 * @param {number} [options.radius=5] - Radius of each point in the scatter plot.
 * @param {function} [options.colorScheme=d3.interpolateViridis] - D3 color interpolator function for coloring points by t.
 */
function plotScatter(dataset, options = {}) {
  const data = dataset.data;
  const tArr = dataset.t;
  const width = options.width || 400;
  const height = options.height || 400;
  const radius = options.radius || 5;
  const colorScheme = options.colorScheme || d3.interpolateViridis;
  const margin = 30;
  d3.select("#scatter-plot-container").selectAll("svg").remove();
  const xs = data.map((p) => p.x);
  const ys = data.map((p) => p.y);
  const xExtent = d3.extent(xs);
  const yExtent = d3.extent(ys);
  const xPad = (xExtent[1] - xExtent[0]) * 0.1;
  const yPad = (yExtent[1] - yExtent[0]) * 0.1;
  const xScale = d3
    .scaleLinear()
    .domain([xExtent[0] - xPad, xExtent[1] + xPad])
    .range([margin, width - margin]);
  const yScale = d3
    .scaleLinear()
    .domain([yExtent[0] - yPad, yExtent[1] + yPad])
    .range([height - margin, margin]);
  // Color scale: use d3.interpolateViridis by default, or user-supplied option
  const colorScale = d3.scaleSequential(colorScheme).domain([0, 1]);
  const svg = d3
    .select("#scatter-plot-container")
    .append("svg")
    .attr("width", width)
    .attr("height", height);
  svg
    .selectAll("circle")
    .data(data.map((d, i) => ({ ...d, t: tArr[i] })))
    .enter()
    .append("circle")
    .attr("cx", (d) => xScale(d.x))
    .attr("cy", (d) => yScale(d.y))
    .attr("r", radius)
    .attr("fill", (d) => colorScale(d.t))
    .attr("opacity", 0.8);
}

/**
 * Plots a scatter plot and overlays k-nearest neighbor graph lines using d3.
 * @param {{data: Array<{x: number, y: number}>, t: Array<number>}} dataset - Dataset object.
 * @param {Array<Array<number>>} adj - Adjacency matrix from computeKNearestNeighborGraph.
 * @param {Object} [options] - Optional plot settings (width, height, radius, colorScheme).
 */
function plotScatterAndKNearestNeighborGraph(dataset, adj, options = {}) {
  const data = dataset.data;
  const tArr = dataset.t;
  const width = options.width || 400;
  const height = options.height || 400;
  const radius = options.radius || 5;
  const margin = 30;
  d3.select("#scatter-plot-container").selectAll("svg").remove();
  const xs = data.map((p) => p.x);
  const ys = data.map((p) => p.y);
  const xExtent = d3.extent(xs);
  const yExtent = d3.extent(ys);
  const xPad = (xExtent[1] - xExtent[0]) * 0.1;
  const yPad = (yExtent[1] - yExtent[0]) * 0.1;
  const xScale = d3
    .scaleLinear()
    .domain([xExtent[0] - xPad, xExtent[1] + xPad])
    .range([margin, width - margin]);
  const yScale = d3
    .scaleLinear()
    .domain([yExtent[0] - yPad, yExtent[1] + yPad])
    .range([height - margin, margin]);
  const colorScheme = options.colorScheme || d3.interpolateViridis;
  const colorScale = d3.scaleSequential(colorScheme).domain([0, 1]);
  const svg = d3
    .select("#scatter-plot-container")
    .append("svg")
    .attr("width", width)
    .attr("height", height);
  // Prepare kNN lines data for d3 selection
  const lines = [];
  for (let i = 0; i < data.length; i++) {
    for (let j = i + 1; j < data.length; j++) {
      if (adj[i][j] !== Infinity) {
        lines.push({ source: i, target: j });
      }
    }
  }

  // Draw kNN lines
  svg
    .selectAll("line.kNN")
    .data(lines)
    .enter()
    .append("line")
    .attr("class", (d) => `kNN line-source-${d.source} line-target-${d.target}`)
    .attr("x1", (d) => xScale(data[d.source].x))
    .attr("y1", (d) => yScale(data[d.source].y))
    .attr("x2", (d) => xScale(data[d.target].x))
    .attr("y2", (d) => yScale(data[d.target].y))
    .attr("stroke", "#888")
    .attr("stroke-width", 1)
    .attr("opacity", 0.5);

  // Draw points
  svg
    .selectAll("circle.point")
    .data(data.map((d, i) => ({ ...d, t: tArr[i], idx: i })))
    .enter()
    .append("circle")
    .attr("class", (d) => `point point-${d.idx}`)
    .attr("cx", (d) => xScale(d.x))
    .attr("cy", (d) => yScale(d.y))
    .attr("r", radius)
    .attr("fill", (d) => colorScale(d.t))
    .attr("opacity", 0.8);

  // Add a transparent overlay for hover detection
  const hoverFactor = options.hoverFactor || 2.5;
  svg
    .append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "transparent")
    .on("mousemove", function (event) {
      const [mx, my] = d3.pointer(event);
      // Find the closest point within hoverFactor * radius
      let minDist = Infinity;
      let minIdx = -1;
      data.forEach((d, i) => {
        const px = xScale(d.x);
        const py = yScale(d.y);
        const dist = Math.sqrt((mx - px) ** 2 + (my - py) ** 2);
        if (dist < minDist) {
          minDist = dist;
          minIdx = i;
        }
      });
      if (minDist <= hoverFactor * radius) {
        // Simulate hover on that point
        const d = { ...data[minIdx], t: tArr[minIdx], idx: minIdx };
        // Fade all points
        svg.selectAll("circle.point").attr("opacity", 0.1);
        // Highlight hovered point
        svg
          .select(`.point-${minIdx}`)
          .attr("opacity", 1)
          .attr("stroke", "#000")
          .attr("stroke-width", 2);
        // Find neighbors
        const neighbors = [];
        for (let j = 0; j < data.length; j++) {
          if (adj[minIdx][j] !== Infinity) neighbors.push(j);
        }
        // Highlight neighbor points
        neighbors.forEach((j) => {
          svg
            .select(`.point-${j}`)
            .attr("opacity", 1)
            .attr("stroke", "#000")
            .attr("stroke-width", 1.5);
          // Thicken lines between minIdx and neighbor
          svg
            .selectAll(
              `.line-source-${Math.min(minIdx, j)}.line-target-${Math.max(
                minIdx,
                j
              )}`
            )
            .attr("stroke-width", 3)
            .attr("opacity", 1)
            .attr("stroke", "#1976d2");
        });
      } else {
        // Reset all points
        svg
          .selectAll("circle.point")
          .attr("opacity", 0.8)
          .attr("stroke", null)
          .attr("stroke-width", null);
        // Reset all lines
        svg
          .selectAll("line.kNN")
          .attr("stroke-width", 1)
          .attr("opacity", 0.5)
          .attr("stroke", "#888");
      }
    })
    .on("mouseleave", function () {
      // Reset all points
      svg
        .selectAll("circle.point")
        .attr("opacity", 0.8)
        .attr("stroke", null)
        .attr("stroke-width", null);
      // Reset all lines
      svg
        .selectAll("line.kNN")
        .attr("stroke-width", 1)
        .attr("opacity", 0.5)
        .attr("stroke", "#888");
    })
    .on("mouseover", function (event, d) {
      // Fade all points
      svg.selectAll("circle.point").attr("opacity", 0.1);
      // Highlight hovered point
      d3.select(this)
        .attr("opacity", 1)
        .attr("stroke", "#000")
        .attr("stroke-width", 2);
      // Find neighbors
      const neighbors = [];
      for (let j = 0; j < data.length; j++) {
        if (adj[d.idx][j] !== Infinity) neighbors.push(j);
      }
      // Highlight neighbor points
      neighbors.forEach((j) => {
        svg
          .select(`.point-${j}`)
          .attr("opacity", 1)
          .attr("stroke", "#000")
          .attr("stroke-width", 1.5);
        // Thicken lines between d.idx and neighbor
        svg
          .selectAll(
            `.line-source-${Math.min(d.idx, j)}.line-target-${Math.max(
              d.idx,
              j
            )}`
          )
          .attr("stroke-width", 3)
          .attr("opacity", 1)
          .attr("stroke", "#6a7e92ff");
      });
    })
    .on("mouseout", function (event, d) {
      // Reset all points
      svg
        .selectAll("circle.point")
        .attr("opacity", 0.8)
        .attr("stroke", null)
        .attr("stroke-width", null);
      // Reset all lines
      svg
        .selectAll("line.kNN")
        .attr("stroke-width", 1)
        .attr("opacity", 0.5)
        .attr("stroke", "#888");
    });
}

/**
 * Plots the shortest path between two vertices over the scatter plot using d3.
 * @param {{data: Array<{x: number, y: number}>, t: Array<number>}} dataset - Dataset object.
 * @param {Array<Array<number>>} adj - Adjacency matrix.
 * @param {number} start - Index of the start vertex.
 * @param {number} end - Index of the end vertex.
 * @param {Object} [options] - Optional plot settings (width, height, radius, colorScheme).
 */
function plotShortestPath(dataset, adj, start, end, options = {}) {
  // First, plot the scatter plot and kNN graph
  plotScatterAndKNearestNeighborGraph(dataset, adj, options);
  const data = dataset.data;
  const width = options.width || 400;
  const height = options.height || 400;
  const margin = 30;
  const xs = data.map((p) => p.x);
  const ys = data.map((p) => p.y);
  const xExtent = d3.extent(xs);
  const yExtent = d3.extent(ys);
  const xPad = (xExtent[1] - xExtent[0]) * 0.1;
  const yPad = (yExtent[1] - yExtent[0]) * 0.1;
  const xScale = d3
    .scaleLinear()
    .domain([xExtent[0] - xPad, xExtent[1] + xPad])
    .range([margin, width - margin]);
  const yScale = d3
    .scaleLinear()
    .domain([yExtent[0] - yPad, yExtent[1] + yPad])
    .range([height - margin, margin]);
  // Compute shortest path
  const path = dijkstraShortestPath(adj, start, end);
  if (path.length < 2) return; // No path
  // Overlay the path as a thick colored line
  const svg = d3.select("#scatter-plot-container svg");
  const pathCoords = path.map((i) => [xScale(data[i].x), yScale(data[i].y)]);
  const lineGen = d3.line();
  svg
    .append("path")
    .attr("d", lineGen(pathCoords))
    .attr("fill", "none")
    .attr("stroke", "#e53935")
    .attr("stroke-width", 4)
    .attr("stroke-linecap", "round")
    .attr("stroke-linejoin", "round")
    .attr("opacity", 0.95);
}

onMount(() => {
  // Initial plot
  const data = generateNoisySpiral(300, 0.5, 2.5);
  const k = 5;
  const adj = computeKNearestNeighborGraph(data.data, k);

  plotScatterAndKNearestNeighborGraph(data, adj, {
    width: 600,
    height: 600,
    radius: 5,
  });
});
</script>

<div style="position: fixed" class="fixed">
    <div style="width: 100%">
        <!-- Put the changing interactive elements here. -->
        <div id="scatter-plot-container" style="width:400px; height:400px;"></div>
    </div>
</div>