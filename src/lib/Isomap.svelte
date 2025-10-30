<script>
  import * as d3 from "d3";
  import * as math from "mathjs";
  import {
    generateNoisySpiral,
    computeKNearestNeighborGraph,
    dijkstraShortestPath,
    computePCA,
    projectOntoFirstPrincipalComponent,
    convertObjectDataFormatToArray,
    generateNoiseFreeSpiralPoints,
  } from "$lib/utils/math.js";
  import { onMount } from "svelte";

  export let showPCAProjection = false;
  export let showIntrinsicDimension = false;
  export let showPCAVectors = false;
  export let showScatter = false;
  export let showGraph = false;
  export let showScatterPlotAnimation = true; // New option to toggle scatter plot animation
  export let k = 5;
  export let width = 650;
  export let height = 650;
  export let radius = 5;
  export let margin = 30;
  export let colorScheme = d3.interpolateViridis;

  // New exported parameters for spiral generation
  export let numPoints = 300;
  export let noiseAmount = 0.2;
  export let numTurns = 3;

  let data = null;
  let adj = null;
  let svg = null;

  onMount(() => {
    // Create SVG if it doesn't exist
    createSvg(width, height);
    // Select the svg with d3
    svg = d3.select("#svg-container svg");
    // Generate initial data using exported variables
    data = generateNoisySpiral(numPoints, noiseAmount, numTurns);
    adj = computeKNearestNeighborGraph(data.data, k);
  });

  $: if (data && showScatter && !showScatterPlotAnimation) {
    plotScatter(data);
  }

  $: if (data && showIntrinsicDimension) {
    plotIntrinsicDimensionAxis();
  } else if (svg && !showIntrinsicDimension) {
    // Remove intrinsic dimension axis if it exists
    svg.selectAll("g.intrinsic-dimension-axis").remove();
  }

  $: if (data && showScatterPlotAnimation) {
    plotCreateScatterPlotAnimation(data);
  }

  $: if (data && adj && showGraph) {
    plotKNearestNeighborGraph(data, adj);
  }

  $: if (data && showPCAVectors) {
    const pcaResult = computePCA(data.data);
    console.log(pcaResult);
    // Scale the components by the values and scale all down by max value
    const components = pcaResult.components.slice(0, 2);
    const maxVal = Math.max(...pcaResult.values);
    components.forEach((comp) => {
      comp[0] = (comp[0] * pcaResult.values[components.indexOf(comp)]) / maxVal;
      comp[1] = (comp[1] * pcaResult.values[components.indexOf(comp)]) / maxVal;
    });
    // Negate y components for plotting
    components.forEach((comp) => {
      comp[1] = -comp[1];
    });
    // Swap x and y components of each vector for plotting
    // const swappedComponents = components.map((vec) => [vec[1], vec[0]]);
    plotPrincipalComponents(data, components);
  }

  $: if (data && showPCAProjection) {
    plotPCAProjection(data);
  }

  //   // Plot shortest path between random points
  //   $: if (data && adj) {
  //     const start = data.data[0];
  //     const end = data.data[1];
  //     plotShortestPath(data, adj, start, end, {
  //       width: 600,
  //       height: 600,
  //     });
  //   }

  /**
   * Creates an SVG element in #svg-container if it does not exist.
   * @param {number} width - Width of the SVG.
   * @param {number} height - Height of the SVG.
   * @returns {d3.Selection} The d3 selection of the SVG element.
   */
  function createSvg(width = 600, height = 600) {
    let svg = d3.select("#svg-container svg");
    if (svg.empty()) {
      svg = d3
        .select("#svg-container")
        .append("svg")
        .attr("width", width)
        .attr("height", height);
    }
    return svg;
  }
  /**
   * Animates points from random positions to their target spiral positions.
   * @param {{data: Array<{x: number, y: number}>, t: Array<number>}} dataset
   * @param {number} duration - Duration of the animation in milliseconds.
   */
  function plotCreateScatterPlotAnimation(dataset, duration = 2000) {
    const data = dataset.data;
    const tArr = dataset.t;

    // Compute scales
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

    const colorScale = d3.scaleSequential(colorScheme).domain([0, 1]);

    // Remove existing scatter group
    svg.selectAll("g.scatter-sub-container").remove();

    // Initialize nodes at random positions
    const nodes = data.map((d, i) => ({
      cx: Math.random() * (width - 2 * margin) + margin,
      cy: Math.random() * (height - 2 * margin) + margin,
      targetX: xScale(d.x),
      targetY: yScale(d.y),
      t: tArr[i],
      i,
    }));

    // Draw circles
    const scatterGroup = svg.append("g").attr("class", "scatter-sub-container");
    const circles = scatterGroup
      .selectAll("circle")
      .data(nodes, (d) => d.i)
      .enter()
      .append("circle")
      .attr("r", radius)
      .attr("cx", (d) => d.cx)
      .attr("cy", (d) => d.cy)
      .attr("fill", (d) => colorScale(d.t))
      .attr("opacity", 0.8);

    // Animate circles to target positions
    circles
      .transition()
      .duration(duration)
      .ease(d3.easeCubicInOut)
      .attr("cx", (d) => d.targetX)
      .attr("cy", (d) => d.targetY);
  }

  // /**
  //  * Plots the intrinsic dimension axis as a dotted line along the underlying spiral curve, animated over durationMs.
  //  * @param {number} durationMs - Animation duration in milliseconds (default 1200ms)
  //  */
  // function plotIntrinsicDimensionAxis(durationMs = 1200) {
  //   // Always remove previous axis and reanimate
  //   svg.selectAll("g.intrinsic-dimension-axis").remove();
  //   // Use exported numPoints and numTurns
  //   const turns = numTurns;
  //   const squashFactor = 1.8; // Could also be exported if desired
  //   const spiral = generateNoiseFreeSpiralPoints(numPoints, turns, squashFactor);
  //   const spiralData = spiral.data;
  //   // ...existing code for scales and animation...

  //   // Compute scales from current data for consistent overlay
  //   const xs = data.data.map((p) => p.x);
  //   const ys = data.data.map((p) => p.y);
  //   const xExtent = d3.extent(xs);
  //   const yExtent = d3.extent(ys);
  //   const xPad = (xExtent[1] - xExtent[0]) * 0.1;
  //   const yPad = (yExtent[1] - yExtent[0]) * 0.1;
  //   const xScale = d3
  //     .scaleLinear()
  //     .domain([xExtent[0] - xPad, xExtent[1] + xPad])
  //     .range([margin, width - margin]);
  //   const yScale = d3
  //     .scaleLinear()
  //     .domain([yExtent[0] - yPad, yExtent[1] + yPad])
  //     .range([height - margin, margin]);

  //   // Draw the intrinsic dimension axis as a dotted line, animated
  //   const axisGroup = svg.append("g").attr("class", "intrinsic-dimension-axis");
  //   const lineGen = d3
  //     .line()
  //     .x((d) => xScale(d.x))
  //     .y((d) => yScale(d.y));
  //   const path = axisGroup
  //     .append("path")
  //     .datum(spiralData)
  //     .attr("d", lineGen)
  //     .attr("fill", "none")
  //     .attr("stroke", "#1976d2")
  //     .attr("stroke-width", 3)
  //   .attr("stroke-dasharray", "2 6")
  //     .attr("opacity", 0.7);

  //   // Animate the path drawing
  //   const totalLength = path.node().getTotalLength();
  //   path
  //     .attr("stroke-dasharray", totalLength + "," + totalLength)
  //     .attr("stroke-dashoffset", totalLength)
  //     .transition()
  //     .duration(durationMs)
  //     .ease(d3.easeLinear)
  //     .attr("stroke-dashoffset", 0);

  //   // Add label at the lowest y point (bottom of screen) with a margin
  //   // Find the spiral point with the maximum y (since SVG y=0 is top)
  //   let maxY = -Infinity;
  //   let maxIdx = 0;
  //   for (let i = 0; i < spiralData.length; i++) {
  //     if (spiralData[i].y > maxY) {
  //       maxY = spiralData[i].y;
  //       maxIdx = i;
  //     }
  //   }
  //   const labelX = xScale(spiralData[maxIdx].x);
  //   const labelY = yScale(spiralData[maxIdx].y) - 24; // 24px margin above curve
  //   axisGroup
  //     .append("text")
  //     .attr("x", labelX)
  //     .attr("y", labelY)
  //     .attr("text-anchor", "middle")
  //     .attr("fill", "#1976d2")
  //     .attr("font-size", 20)
  //   .attr("font-weight", "normal")
  //     .text("Latent 1D Manifold");
  // }
  /**
   * Plots the intrinsic dimension axis as a dotted line along the underlying spiral curve, animated over durationMs.
   * The label follows the curve near the top-left (theta ~ 3/4 pi), offset slightly, and stays upright.
   * @param {number} durationMs - Animation duration in milliseconds (default 1200ms)
   */
  function plotIntrinsicDimensionAxis(durationMs = 1200) {
    // Remove previous axis
    svg.selectAll("g.intrinsic-dimension-axis").remove();

    // Spiral parameters
    const turns = numTurns;
    const squashFactor = 1.8;
    const spiral = generateNoiseFreeSpiralPoints(
      numPoints,
      turns,
      squashFactor
    );
    const spiralData = spiral.data;

    // Compute scales
    const xs = data.data.map((p) => p.x);
    const ys = data.data.map((p) => p.y);
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

    // Draw the dotted spiral
    const axisGroup = svg.append("g").attr("class", "intrinsic-dimension-axis");

    const lineGen = d3
      .line()
      .x((d) => xScale(d.x))
      .y((d) => yScale(d.y));

    const path = axisGroup
      .append("path")
      .datum(spiralData)
      .attr("d", lineGen)
      .attr("fill", "none")
      .attr("stroke", "#1976d2")
      .attr("stroke-width", 3)
      .attr("stroke-dasharray", "6,4") // fixed dashed line
      .attr("opacity", 0.7);

    // Animate the path drawing
    const totalLength = path.node().getTotalLength();
    path
      .attr("stroke-dasharray", totalLength + "," + totalLength)
      .attr("stroke-dashoffset", totalLength)
      .transition()
      .duration(durationMs)
      .ease(d3.easeLinear)
      .attr("stroke-dashoffset", 0);

    // --- Compute top-left label position using polar coordinates ---
    function cartesianToPolar(p) {
      return {
        r: Math.sqrt(p.x * p.x + p.y * p.y),
        theta: Math.atan2(p.y, p.x),
      };
    }

    const targetTheta = (3 * Math.PI) / 4; // top-left
    let bestIdx = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < spiralData.length; i++) {
      const { r, theta } = cartesianToPolar(spiralData[i]);
      const score = r * Math.cos(theta - targetTheta);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    // Use a small segment for the label, reverse to keep text upright
    const segmentLength = 15;
    const startIdx = Math.max(0, bestIdx - Math.floor(segmentLength / 2));
    const endIdx = Math.min(spiralData.length, startIdx + segmentLength);
    const labelData = spiralData.slice(startIdx, endIdx).reverse();

    // Slight top-left offset
    const offsetX = -15;
    const offsetY = -15;

    // Path for text
    const labelPath = axisGroup
      .append("path")
      .attr("id", "labelPath")
      .attr(
        "d",
        d3
          .line()
          .x((d) => xScale(d.x) + offsetX)
          .y((d) => yScale(d.y) + offsetY)(labelData)
      )
      .attr("fill", "none");

    // Add text along path
    axisGroup
      .append("text")
      .attr("fill", "#1976d2")
      .attr("font-size", 24)
      .attr("font-weight", 280)
      .append("textPath")
      .attr("xlink:href", "#labelPath")
      .attr("startOffset", "0%")
      .text("Latent 1D Manifold");
  }

  /**
   * Plots a scatter plot and overlays k-nearest neighbor graph lines using d3.
   * @param {{data: Array<{x: number, y: number}>, t: Array<number>}} dataset - Dataset object.
   * @param {Array<Array<number>>} adj - Adjacency matrix from computeKNearestNeighborGraph.
   */
  function plotKNearestNeighborGraph(dataset, adj) {
    const data = dataset.data;
    const tArr = dataset.t;
    // Only remove existing kNN lines, not the entire SVG
    if (!svg.empty()) {
      svg.selectAll("line.kNN").remove();
    }
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
    const colorScale = d3.scaleSequential(colorScheme).domain([0, 1]);
    // Prepare kNN lines data for d3 selection
    const lines = [];
    for (let i = 0; i < data.length; i++) {
      for (let j = i + 1; j < data.length; j++) {
        if (adj[i][j] !== Infinity) {
          lines.push({ source: i, target: j });
        }
      }
    }

    // Draw only kNN lines (no scatter points)
    svg
      .selectAll("line.kNN")
      .data(lines)
      .enter()
      .append("line")
      .attr(
        "class",
        (d) => `kNN line-source-${d.source} line-target-${d.target}`
      )
      .attr("x1", (d) => xScale(data[d.source].x))
      .attr("y1", (d) => yScale(data[d.source].y))
      .attr("x2", (d) => xScale(data[d.target].x))
      .attr("y2", (d) => yScale(data[d.target].y))
      .attr("stroke", "#888")
      .attr("stroke-width", 1)
      .attr("opacity", 0.5);

    // Add a transparent overlay for hover detection
    const hoverFactor = 2.5;
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
   * Plots the principal component vectors as arrows over the scatter plot.
   * @param {{data: Array<{x: number, y: number}>}} dataset - Dataset object.
   * @param {Array<Array<number>>} pcs - Principal component vectors (each is [x, y]).
   * @param {Object} [options] - Optional plot settings.
   */
  function plotPrincipalComponents(dataset, pcs) {
    const data = dataset.data;
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

    // Remove previous PC arrows if any
    svg.selectAll("g.pc-arrows").remove();
    const pcGroup = svg.append("g").attr("class", "pc-arrows");

    // Compute mean of data for origin
    const meanX = d3.mean(xs);
    const meanY = d3.mean(ys);
    const origin = [xScale(meanX), yScale(meanY)];

    // Arrow length scaling (adjust as needed)
    const arrowScale = 0.4 * Math.min(width, height);

    pcs.forEach((vec, i) => {
      const [vx, vy] = vec;
      pcGroup
        .append("line")
        .attr("x1", origin[0])
        .attr("y1", origin[1])
        .attr("x2", origin[0] + vx * arrowScale)
        .attr("y2", origin[1] - vy * arrowScale)
        .attr("stroke", "#333")
        .attr("stroke-width", 3)
        .attr("marker-end", "url(#arrowhead)");
    });

    // Add arrowhead marker if not present
    if (svg.select("defs").empty()) {
      const defs = svg.append("defs");
      defs
        .append("marker")
        .attr("id", "arrowhead")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 10)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "#333");
    }
  }

  /**
   * Plots the shortest path between two vertices over the scatter plot using d3.
   * @param {{data: Array<{x: number, y: number}>, t: Array<number>}} dataset - Dataset object.
   * @param {Array<Array<number>>} adj - Adjacency matrix.
   * @param {number} start - Index of the start vertex.
   * @param {number} end - Index of the end vertex.
   */
  function plotShortestPath(dataset, adj, start, end) {
    const data = dataset.data;
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

  // Animation timing controls (in ms) as a single object
  export let pcaAnimation = {
    step1: 1000, // Hide PC vector
    step2: 1000, // Draw dotted axis
    step3: 1000, // Draw lines to axis
    step4: 1500, // Animate points to axis
    step5: 1000, // Rotate axis flat
  };
  async function plotPCAProjection(dataset) {
    // Remove previous layers
    svg.selectAll(".pca-projection-group").remove();
    svg.selectAll(".pc-arrows").remove();

    // Compute PCA
    const pcaResult = computePCA(dataset.data);
    const firstPrincipalComponent = pcaResult.components[0];
    const pc1Norm = math.divide(
      firstPrincipalComponent,
      math.norm(firstPrincipalComponent)
    );
    const pcaProjections = projectOntoFirstPrincipalComponent(dataset.data);

    // Scales
    const xs = dataset.data.map((p) => p.x);
    const ys = dataset.data.map((p) => p.y);
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

    // Draw PCA axis (dashed)
    const mean = math.mean(convertObjectDataFormatToArray(dataset.data), 0);
    const axisLen = Math.max(width, height) * 0.8;
    const axisStart = [
      mean[0] - (pc1Norm[0] * axisLen) / 2,
      mean[1] - (-pc1Norm[1] * axisLen) / 2,
    ];
    const axisEnd = [
      mean[0] + (pc1Norm[0] * axisLen) / 2,
      mean[1] + (-pc1Norm[1] * axisLen) / 2,
    ];

    const group = svg.append("g").attr("class", "pca-projection-group");
    const axisLine = group
      .append("line")
      .attr("x1", xScale(axisStart[0]))
      .attr("y1", yScale(axisStart[1]))
      .attr("x2", xScale(axisEnd[0]))
      .attr("y2", yScale(axisEnd[1]))
      .attr("stroke", "#333")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "6 6")
      .style("opacity", 0);

    axisLine.transition().duration(pcaAnimation.step2).style("opacity", 1);
    await new Promise((r) => setTimeout(r, pcaAnimation.step2));

    // Draw projection lines
    const lines = group
      .selectAll("line.pca-proj-line")
      .data(dataset.data)
      .enter()
      .append("line")
      .attr("class", "pca-proj-line")
      .attr("x1", (d) => xScale(d.x))
      .attr("y1", (d) => yScale(d.y))
      .attr("x2", (d) => xScale(d.x))
      .attr("y2", (d) => yScale(d.y))
      .attr("stroke", "#888")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "2 2")
      .style("opacity", 0);

    lines
      .transition()
      .duration(pcaAnimation.step3)
      .style("opacity", 1)
      .attr("x2", (d, i) => xScale(pcaProjections[i][0]))
      .attr("y2", (d, i) => yScale(pcaProjections[i][1]));

    await new Promise((r) => setTimeout(r, pcaAnimation.step3));

    // Prepare nodes for beeswarm: start at current positions
    const nodes = dataset.data.map((d, i) => ({
      x: xScale(d.x),
      y: yScale(d.y),
      r: 4,
      target: pcaProjections[i],
    }));

    // 1. Run a quick force simulation to compute final non-overlapping positions
    const forceSim = d3
      .forceSimulation(nodes)
      .force("attractX", d3.forceX((d) => xScale(d.target[0])).strength(0.3))
      .force("attractY", d3.forceY((d) => yScale(d.target[1])).strength(0.05))
      .force("collide", d3.forceCollide((d) => d.r + 1).iterations(2))
      .stop();

    // Tick manually a few times to compute final positions
    const numForceTicks = 50;
    for (let i = 0; i < numForceTicks; i++) forceSim.tick();

    // Clamp to "ground" so points don't go past axis on one side
    const axisY = yScale(mean[1]);
    // 2. Animate points linearly from original positions to final positions
    svg
      .selectAll("g.scatter-sub-container circle")
      .data(nodes)
      .transition()
      .duration(1500)
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .ease(d3.easeLinear);

    // Remove projection lines after animation
    lines.transition().duration(500).style("opacity", 0).remove();
    await new Promise((r) => setTimeout(r, 1500 + 500));

    // 3. Rotate group and points to horizontal
    const axisDx = xScale(axisEnd[0]) - xScale(axisStart[0]);
    const axisDy = yScale(axisEnd[1]) - yScale(axisStart[1]);
    const angle = Math.atan2(axisDy, axisDx);

    group
      .transition()
      .duration(pcaAnimation.step5)
      .attrTween("transform", function () {
        const cx = xScale(mean[0]);
        const cy = yScale(mean[1]);
        return (t) => `rotate(${((-angle * 180) / Math.PI) * t},${cx},${cy})`;
      });

    svg
      .selectAll("g.scatter-sub-container circle")
      .transition()
      .duration(pcaAnimation.step5)
      .attrTween("transform", function () {
        const cx = xScale(mean[0]);
        const cy = yScale(mean[1]);
        return (t) => `rotate(${((-angle * 180) / Math.PI) * t},${cx},${cy})`;
      });
  }
</script>

<div style="position: fixed" class="fixed" id="svg-container"></div>
