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
  } from "$lib/utils/math.js";
  import { onMount } from "svelte";

  export let showPCAProjection = false;
  export let showPCAVectors = false;
  export let showScatter = false;
  export let showGraph = false;
  export let showScatterPlotAnimation = true; // New option to toggle scatter plot animation
  export let k = 5;
  export let width = 700;
  export let height = 700;
  export let radius = 5;
  export let colorScheme = d3.interpolateViridis;

  let data = null;
  let adj = null;
  let svg = null;

  onMount(() => {
    // Create SVG if it doesn't exist
    createSvg(width, height);
    // Select the svg with d3
    svg = d3.select("#svg-container svg");
    // Generate initial data
    data = generateNoisySpiral(300, 0.2, 2.5);
    adj = computeKNearestNeighborGraph(data.data, k);
  });

  $: if (data && showScatter && !showScatterPlotAnimation) {
    plotScatter(data);
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
    const margin = 30;

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

  /**
   * Plots a scatter plot and overlays k-nearest neighbor graph lines using d3.
   * @param {{data: Array<{x: number, y: number}>, t: Array<number>}} dataset - Dataset object.
   * @param {Array<Array<number>>} adj - Adjacency matrix from computeKNearestNeighborGraph.
   */
  function plotKNearestNeighborGraph(dataset, adj) {
    const data = dataset.data;
    const tArr = dataset.t;
    const margin = 30;
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
        .attr("stroke", i === 0 ? "#e53935" : "#1976d2")
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
  const pc1Norm = math.divide(firstPrincipalComponent, math.norm(firstPrincipalComponent));
  const pcaProjections = projectOntoFirstPrincipalComponent(dataset.data);

  // Scales
  const margin = 30;
  const xs = dataset.data.map(p => p.x);
  const ys = dataset.data.map(p => p.y);
  const xExtent = d3.extent(xs);
  const yExtent = d3.extent(ys);
  const xPad = (xExtent[1] - xExtent[0]) * 0.1;
  const yPad = (yExtent[1] - yExtent[0]) * 0.1;
  const xScale = d3.scaleLinear().domain([xExtent[0]-xPad, xExtent[1]+xPad]).range([margin, width-margin]);
  const yScale = d3.scaleLinear().domain([yExtent[0]-yPad, yExtent[1]+yPad]).range([height-margin, margin]);

  // Draw PCA axis (dashed)
  const mean = math.mean(convertObjectDataFormatToArray(dataset.data), 0);
  const axisLen = Math.max(width, height) * 0.8;
  const axisStart = [mean[0] - (pc1Norm[0]*axisLen)/2, mean[1] - (-pc1Norm[1]*axisLen)/2];
  const axisEnd   = [mean[0] + (pc1Norm[0]*axisLen)/2, mean[1] + (-pc1Norm[1]*axisLen)/2];

  const group = svg.append("g").attr("class", "pca-projection-group");
  const axisLine = group.append("line")
    .attr("x1", xScale(axisStart[0])).attr("y1", yScale(axisStart[1]))
    .attr("x2", xScale(axisEnd[0])).attr("y2", yScale(axisEnd[1]))
    .attr("stroke", "#333").attr("stroke-width", 2)
    .attr("stroke-dasharray", "6 6")
    .style("opacity", 0);

  axisLine.transition().duration(pcaAnimation.step2).style("opacity", 1);
  await new Promise(r => setTimeout(r, pcaAnimation.step2));

  // Draw projection lines
  const lines = group.selectAll("line.pca-proj-line")
    .data(dataset.data)
    .enter()
    .append("line")
    .attr("class", "pca-proj-line")
    .attr("x1", d => xScale(d.x))
    .attr("y1", d => yScale(d.y))
    .attr("x2", d => xScale(d.x))
    .attr("y2", d => yScale(d.y))
    .attr("stroke", "#888").attr("stroke-width", 1.5)
    .attr("stroke-dasharray", "2 2")
    .style("opacity", 0);

  lines.transition()
    .duration(pcaAnimation.step3)
    .style("opacity", 1)
    .attr("x2", (d,i) => xScale(pcaProjections[i][0]))
    .attr("y2", (d,i) => yScale(pcaProjections[i][1]));

  await new Promise(r => setTimeout(r, pcaAnimation.step3));

  // Prepare nodes for beeswarm: start at current positions
  const nodes = dataset.data.map((d,i) => ({
    x: xScale(d.x),
    y: yScale(d.y),
    r: 4,
    target: pcaProjections[i]
  }));

  // 1. Run a quick force simulation to compute final non-overlapping positions
  const forceSim = d3.forceSimulation(nodes)
    .force("attractX", d3.forceX(d => xScale(d.target[0])).strength(0.3))
    .force("attractY", d3.forceY(d => yScale(d.target[1])).strength(0.05))
    .force("collide", d3.forceCollide(d => d.r + 1).iterations(2))
    .stop();

  // Tick manually a few times to compute final positions
  const numForceTicks = 50;
  for (let i = 0; i < numForceTicks; i++) forceSim.tick();

  // Clamp to "ground" so points don't go past axis on one side
  const axisY = yScale(mean[1]);
  // 2. Animate points linearly from original positions to final positions
  svg.selectAll("g.scatter-sub-container circle")
    .data(nodes)
    .transition()
    .duration(1500)
    .attr("cx", d => d.x)
    .attr("cy", d => d.y)
    .ease(d3.easeLinear);

  // Remove projection lines after animation
  lines.transition().duration(500).style("opacity", 0).remove();
  await new Promise(r => setTimeout(r, 1500 + 500));

  // 3. Rotate group and points to horizontal
  const axisDx = xScale(axisEnd[0]) - xScale(axisStart[0]);
  const axisDy = yScale(axisEnd[1]) - yScale(axisStart[1]);
  const angle = Math.atan2(axisDy, axisDx);

  group.transition()
    .duration(pcaAnimation.step5)
    .attrTween("transform", function() {
      const cx = xScale(mean[0]);
      const cy = yScale(mean[1]);
      return t => `rotate(${-angle*180/Math.PI*t},${cx},${cy})`;
    });

  svg.selectAll("g.scatter-sub-container circle")
    .transition()
    .duration(pcaAnimation.step5)
    .attrTween("transform", function() {
      const cx = xScale(mean[0]);
      const cy = yScale(mean[1]);
      return t => `rotate(${-angle*180/Math.PI*t},${cx},${cy})`;
    });
}


//   /**
//    * Animates the PCA projection process:
//    * 1. Hides the principal component vector.
//    * 2. Draws a dotted axis for the first PC.
//    * 3. Draws lines from each point to its projection on the axis.
//    * 4. Animates points moving to the axis.
//    * 5. Rotates the axis to be flat (horizontal).
//    * @param {{data: Array<{x: number, y: number}>}} dataset
//    */
//   async function plotPCAProjection(dataset) {
//     // Remove any previous PCA projection layers
//     svg.selectAll(".pca-projection-group").remove();
//     svg.selectAll(".pc-arrows").remove();

//     // Compute PCA
//     const pcaResult = computePCA(dataset.data);
//     // First principal component (as vector)
//     const firstPrincipalComponent = pcaResult.components[0];
//     // Normalize PC1
//     const pc1Norm = math.divide(
//       firstPrincipalComponent,
//       math.norm(firstPrincipalComponent)
//     );

//     // Project data onto first principal component
//     const pcaProjections = projectOntoFirstPrincipalComponent(dataset.data);
//     console.log(pcaProjections);

//     // Scales
//     const margin = 30;
//     const xs = dataset.data.map((p) => p.x);
//     const ys = dataset.data.map((p) => p.y);
//     const xExtent = d3.extent(xs);
//     const yExtent = d3.extent(ys);
//     const xPad = (xExtent[1] - xExtent[0]) * 0.1;
//     const yPad = (yExtent[1] - yExtent[0]) * 0.1;
//     const xScale = d3
//       .scaleLinear()
//       .domain([xExtent[0] - xPad, xExtent[1] + xPad])
//       .range([margin, width - margin]);
//     const yScale = d3
//       .scaleLinear()
//       .domain([yExtent[0] - yPad, yExtent[1] + yPad])
//       .range([height - margin, margin]);

//     // 1. Hide PC vector (if present)
//     svg
//       .selectAll(".pc-arrows")
//       .transition()
//       .duration(pcaAnimation.step1)
//       .style("opacity", 0);
//     await new Promise((r) => setTimeout(r, pcaAnimation.step1));

//     // 2. Draw dotted axis for PC1
//     const group = svg.append("g").attr("class", "pca-projection-group");
//     // Compute mean of data
//     const mean = math.mean(convertObjectDataFormatToArray(dataset.data), 0);
//     // Axis endpoints (long enough to cover plot)
//     const axisLen = Math.max(width, height) * 0.8;
//     const axisStart = [
//       mean[0] - (pc1Norm[0] * axisLen) / 2,
//       mean[1] - (-pc1Norm[1] * axisLen) / 2,
//     ];
//     const axisEnd = [
//       mean[0] + (pc1Norm[0] * axisLen) / 2,
//       mean[1] + (-pc1Norm[1] * axisLen) / 2,
//     ];
//     const axisLine = group
//       .append("line")
//       .attr("class", "pca-dotted-axis")
//       .attr("x1", xScale(axisStart[0]))
//       .attr("y1", yScale(axisStart[1]))
//       .attr("x2", xScale(axisEnd[0]))
//       .attr("y2", yScale(axisEnd[1]))
//       .attr("stroke", "#333")
//       .attr("stroke-width", 2)
//       .attr("stroke-dasharray", "6 6")
//       .style("opacity", 0);

//     axisLine.transition().duration(pcaAnimation.step2).style("opacity", 1);
//     await new Promise((r) => setTimeout(r, pcaAnimation.step2));

//     // 3. Draw lines from each point to its projection
//     const lines = group
//       .selectAll("line.pca-proj-line")
//       .data(dataset.data)
//       .enter()
//       .append("line")
//       .attr("class", "pca-proj-line")
//       .attr("x1", (d) => xScale(d.x))
//       .attr("y1", (d) => yScale(d.y))
//       .attr("x2", (d, i) => xScale(d.x))
//       .attr("y2", (d, i) => yScale(d.y))
//       .attr("stroke", "#888")
//       .attr("stroke-width", 1.5)
//       .attr("stroke-dasharray", "2 2")
//       .style("opacity", 0);

//     lines
//       .transition()
//       .duration(pcaAnimation.step3)
//       .style("opacity", 1)
//       .attr("x2", (d, i) => xScale(pcaProjections[i][0]))
//       .attr("y2", (d, i) => yScale(pcaProjections[i][1]));
//     await new Promise((r) => setTimeout(r, pcaAnimation.step3));

//     // 4. Animate points moving to axis
//     const circles = svg.selectAll("g.scatter-sub-container circle");
//     circles
//       .transition()
//       .duration(pcaAnimation.step4)
//       .attr("cx", (d, i) => xScale(pcaProjections[i][0]))
//       .attr("cy", (d, i) => yScale(pcaProjections[i][1]));
//     await new Promise((r) => setTimeout(r, pcaAnimation.step4));

//     // Remove the projection lines
//     lines.transition().duration(500).style("opacity", 0).remove();
//     await new Promise((r) => setTimeout(r, 500));

//     // 5. Rotate axis flat (horizontal)
//     // Compute rotation angle (from PC1 to horizontal)
//     // const angle = Math.atan2(pc1Norm[1], pc1Norm[0]);
//     const axisDx = xScale(axisEnd[0]) - xScale(axisStart[0]);
//     const axisDy = yScale(axisEnd[1]) - yScale(axisStart[1]);
//     const angle = Math.atan2(axisDy, axisDx);

//     // Animate group rotation
//     group
//       .transition()
//       .duration(pcaAnimation.step5)
//       .attrTween("transform", function () {
//         const cx = xScale(mean[0]);
//         const cy = yScale(mean[1]);
//         return function (t) {
//           const a = -angle * t;
//           return `rotate(${(a * 180) / Math.PI},${cx},${cy})`;
//         };
//       });
//     // Also rotate the points
//     circles
//       .transition()
//       .duration(pcaAnimation.step5)
//       .attrTween("transform", function () {
//         const cx = xScale(mean[0]);
//         const cy = yScale(mean[1]);
//         return function (t) {
//           const a = -angle * t;
//           return `rotate(${(a * 180) / Math.PI},${cx},${cy})`;
//         };
//       });
//     await new Promise((r) => setTimeout(r, pcaAnimation.step5));
//     // After your PCA projection and rotation steps


//     // Create nodes with current positions
// const nodes = dataset.data.map((d, i) => ({
//   x: xScale(d.x),
//   y: yScale(d.y),
//   target: pcaProjections[i], // along axis
//   r: 4, // circle radius
// }));

// // Force simulation
// const simulation = d3.forceSimulation(nodes)
//   .force("attractAxis", d3.forceX(d => xScale(d.target[0]))
//     .strength(0.5))
//   .force("attractAxisY", d3.forceY(d => yScale(d.target[1]))
//     .strength(0.5))
//   .force("collide", d3.forceCollide(d => d.r + 1).iterations(2)) // avoid overlap
//   .stop();

// // Run simulation manually (for smoother animation)
// for (let i = 0; i < 120; i++) simulation.tick();

// // Update circles
// svg.selectAll("g.scatter-sub-container circle")
//   .data(nodes)
//   .transition()
//   .duration(1000)
//   .attr("cx", d => d.x)
//   .attr("cy", d => d.y);

//   }
</script>

<div style="position: fixed" class="fixed" id="svg-container"></div>
