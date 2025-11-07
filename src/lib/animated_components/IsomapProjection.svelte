<script>
  //@ts-nocheck
  /* 
        Plot for multi-dimensional scaling (MDS)
        
        Show limitations of conventional MDS with a Euclidean metric. 

        Show projection to single dimension eigenvector of the centered pairwise distance matrix
        and show how this is not a good representation for our data. 
  */
  import * as d3 from "d3";
  import * as settings from "$lib/settings.js";
  import {
    computeIsomap,
    computeKNearestNeighborGraph,
    connectDisconnectedComponents,
  } from "$lib/utils/math.js";

  export let active = false;
  let svgEl; // local reference to the <svg> element
  export let dataset;
  export let width = 500;
  export let height = 500;
  export let radius = 5;
  export let margin = 40;
  export let pointOpacity = 0.8;
  export let colorScheme = d3.interpolateViridis;
  export let repeatDelay = 1500; // ms pause before repeating when active

  export let k = 3;
  let isomapResult = null;
  let isomapCoords = null;
  let animatingProjection = false;
  let remainingCircleRotations = null;
  // Orchestrated cycle: scatter -> pause -> show kNN graph -> project with edges following -> hold -> restart
  export let preGraphDelay = 800; // ms before showing graph
  // reuse repeatDelay (already exported) as post-projection hold
  let cycleRunning = false;
  let restartTimeoutId = null;

  // Animation timing controls (in ms) as a single object
  export const projectionAnimation = {
    step1: 1000, // Hide PC vector
    step2: 1000, // Draw dotted axis
    step3: 1000, // Draw lines to axis
    step4: 1500, // Animate points to axis
    step5: 1000, // Rotate axis flat
  };

  // Plots the scatter points without animation.
  // @param {object} dataset - { data: [{x, y}], t: [number] }
  function plotScatter(svg, dataset) {
    if (!dataset || !dataset.data) return;

    // Compute scales
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

    const colorScale = d3.scaleSequential(colorScheme).domain([0, 1]);

    // Remove previous scatter sub-container if any
    svg.selectAll("g.scatter-sub-container").remove();

    // Create a group for scatter points
    const scatterGroup = svg.append("g").attr("class", "scatter-sub-container");

    scatterGroup
      .selectAll("circle")
      .data(dataset.data)
      .enter()
      .append("circle")
      .attr("cx", (d) => xScale(d.x))
      .attr("cy", (d) => yScale(d.y))
      .attr("r", radius)
      .attr("fill", (d, i) => colorScale(dataset.t[i]))
      .attr("opacity", pointOpacity);
  }

  function getScales(dataset) {
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
    return { xScale, yScale };
  }

  function plotKNNGraphAllAtOnce(svg, dataset, k) {
    svg.selectAll("g.iso-knn-graph").remove();
    const { xScale, yScale } = getScales(dataset);
    const group = svg.append("g").attr("class", "iso-knn-graph");

    // Build KNN graph, then ensure connectivity by bridging components
    const knnAdj = computeKNearestNeighborGraph(dataset.data, k);
    const adj = connectDisconnectedComponents(knnAdj, dataset.data);
    const edges = [];
    for (let i = 0; i < adj.length; i++) {
      for (let j = i + 1; j < adj.length; j++) {
        const w = adj[i][j];
        if (w !== Infinity && w !== 0) {
          edges.push({ i, j });
        }
      }
    }

    group
      .selectAll("line")
      .data(edges)
      .enter()
      .append("line")
      .attr("x1", (d) => xScale(dataset.data[d.i].x))
      .attr("y1", (d) => yScale(dataset.data[d.i].y))
      .attr("x2", (d) => xScale(dataset.data[d.j].x))
      .attr("y2", (d) => yScale(dataset.data[d.j].y))
      .attr("stroke", "#1976d2")
      .attr("stroke-width", 2)
      .attr("opacity", 0.85)
      .style("pointer-events", "none");
  }

  async function runCycle(svg, dataset) {
    if (cycleRunning) return;
    cycleRunning = true;
    // Start from original scatter
    plotScatter(svg, dataset);
    // Wait before revealing graph
    await new Promise((resolve) => setTimeout(resolve, preGraphDelay));
    // Show KNN graph (stays during projection)
    plotKNNGraphAllAtOnce(svg, dataset, k);
    // Let browser paint once
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
    // Kick off projection animation (edges will follow inside)
    animateProjection(svg, dataset);
  }

  async function runKNNPhase(svg, dataset) {
    knnPhaseRunning = true;
    knnPhaseCancelled = false;
    // Clean overlays
    svg.selectAll("g.iso-knn-graph").remove();
    // Draw scatter fresh to ensure clean base
    plotScatter(svg, dataset);
    plotKNNGraphAllAtOnce(svg, dataset, k);
    // Small settle time (0ms) so browser paints, then hold
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
    if (knnPhaseCancelled) {
      svg.selectAll("g.iso-knn-graph").remove();
      knnPhaseRunning = false;
      return;
    }
    // Hold with full graph visible
    await new Promise((resolve) => {
      knnTimeoutId = setTimeout(resolve, knnHoldDuration);
    });
    // Clear before projection
    svg.selectAll("g.iso-knn-graph").remove();
    knnPhaseRunning = false;
  }

  async function animateProjection(svg, dataset) {
    if (!animatingProjection) {
      animatingProjection = true;
    } else {
      return; // Prevent overlapping animations
    }
    // Clean overlays and revert to original scatter before animating
    svg.selectAll(".eigenvector-projection-group").remove();
    svg.selectAll(".pc-arrows").remove();
    svg.selectAll("g.intrinsic-dimension-axis").remove();
    // Keep existing scatter and any KNN graph; do not clear those here
    // Build scales for original and Isomap coordinates
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

    // Scales for Isomap coordinates
    const isoXs = isomapCoords.map((p) => p[0]);
    const isoYs = isomapCoords.map((p) => p[1]);
    const isoXExtent = d3.extent(isoXs);
    const isoYExtent = d3.extent(isoYs);
    const isoXPad = (isoXExtent[1] - isoXExtent[0]) * 0.1;
    const isoYPad = (isoYExtent[1] - isoYExtent[0]) * 0.1;
    const isoXScale = d3
      .scaleLinear()
      .domain([isoXExtent[0] - isoXPad, isoXExtent[1] + isoXPad])
      .range([margin, width - margin]);
    const isoYScale = d3
      .scaleLinear()
      .domain([isoYExtent[0] - isoYPad, isoYExtent[1] + isoYPad])
      .range([height - margin, margin]);

    // Animate points from original to Isomap coordinates
    const sel = svg
      .selectAll("g.scatter-sub-container circle")
      .data(
        dataset.data.map((d, i) => ({
          x: isoXScale(isomapCoords[i][0]),
          y: isoYScale(isomapCoords[i][1]),
        }))
      );

    remainingCircleRotations = sel.size();

    const durationMs = 5000;
    sel
      .transition()
      .duration(durationMs)
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .ease(d3.easeCubicInOut)
      .on("end", () => {
        // Decrement and when all transitions complete, schedule repeat
        if (remainingCircleRotations > 1) {
          remainingCircleRotations -= 1;
        } else {
          remainingCircleRotations = 0;
          animatingProjection = false;
          // Remove KNN graph at end of projection
          svg.selectAll("g.iso-knn-graph").remove();
          // Hold on projected points, then restart full cycle
          if (active) {
            restartTimeoutId = setTimeout(() => {
              if (active && !animatingProjection) {
                cycleRunning = false; // allow next run
                runCycle(svg, dataset);
              }
            }, repeatDelay);
          } else {
            cycleRunning = false;
          }
        }
      });

    // Also animate KNN edges' endpoints to follow the nodes
    svg
      .selectAll("g.iso-knn-graph line")
      .transition()
      .duration(durationMs)
      .ease(d3.easeCubicInOut)
      .attr("x1", (d) => isoXScale(isomapCoords[d.i][0]))
      .attr("y1", (d) => isoYScale(isomapCoords[d.i][1]))
      .attr("x2", (d) => isoXScale(isomapCoords[d.j][0]))
      .attr("y2", (d) => isoYScale(isomapCoords[d.j][1]));
  }

  $: if (dataset) {
    isomapResult = computeIsomap(dataset.data, k);
    isomapCoords = isomapResult.coordinates;
  }

  $: if (dataset && svgEl) {
    const svg = d3.select(svgEl);
    plotScatter(svg, dataset);
  }

  // Optional: start cycle when active
  $: if (dataset && svgEl && active) {
    const svg = d3.select(svgEl);
    if (!cycleRunning && !animatingProjection) {
      runCycle(svg, dataset);
    }
  }

  // Cancel timers if deactivated
  $: if (!active) {
    if (restartTimeoutId) clearTimeout(restartTimeoutId);
    cycleRunning = false;
  }

</script>

<div class="figure-wrapper">
  <svg
    bind:this={svgEl}
    viewBox={`0 0 ${width} ${height}`}
    preserveAspectRatio="xMidYMid meet"
    {width}
    {height}
    style="display:block; width: 100%; max-width: {width}px; height: auto;"
    style:opacity={active ? 1 : settings.inactiveOpacity}
  ></svg>
  <p class="figure-caption">Figure 8: Isomap embedding preserves manifold structure using graph geodesic distances.</p>
</div>