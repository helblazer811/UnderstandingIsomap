<script>
  //@ts-nocheck
  import * as d3 from "d3";
  import { onMount } from "svelte";
  import * as settings from "$lib/settings.js";
  import { generateNoisySineWave, computeDataScales } from "$lib/utils/data.js";
  import { plotScatter as plotScatterUtility } from "$lib/utils/plotting.js";

  export let width = 500;
  export let height = 300;
  export let margin = 40;
  export let radius = 6;
  export let active = true;
  export let colorScheme = d3.interpolateViridis;
  export let epsilon = 1;
  export let numPoints = 50;
  export let graphShowDuration = 4000;
  export let pointOpacity = 0.15;
  export let growDuration = 2000; // ms to grow epsilon from 0 to maxEpsilon
  // export let maxEpsilon = 1.1; // target epsilon radius at peak (data units)
  export let waitDuration = 1000; // ms to wait at max epsilon before plotting the graph
  // New configurable styles for neighborhood graph edges
  export let graphEdgeStrokeWidth = 3;
  export let graphEdgeOpacity = 0.8;
  // Configurable styles for epsilon balls
  export let epsilonBallStrokeWidth = 2;
  export let epsilonBallOpacity = 0.6;

  let svgEl;
  let dataset;
  let xScale, yScale;
  let animatedEpsilonRadius = 0;
  let currentOpacity = 1.0;

  // -------------------------------
  // Drawing functions
  // -------------------------------
  function drawScatter(svg, dataset, xScale, yScale) {
    const colorScale = d3.scaleSequential(colorScheme).domain([0, 1]);
    plotScatterUtility(svg, dataset, { xScale, yScale }, {
      radius,
      fillColor: (d, i) => colorScale(dataset.t[i]),
      opacity: dataset.data.map(() => pointOpacity),
      pointClass: "scatter-point",
      groupClass: "scatter-group",
      clearPrevious: true
    });
  }

  function plotAllEpsilonBalls(svg, dataset, radius, opacity = epsilonBallOpacity) {
    svg.selectAll("g.all-epsilon-balls-group").remove();
    const group = svg.append("g").attr("class", "all-epsilon-balls-group");

    dataset.data.forEach((d) => {
      const cx = xScale(d.x);
      const cy = yScale(d.y);
      const r = Math.abs(xScale(d.x + radius) - xScale(d.x));
      group
        .append("circle")
        .attr("cx", cx)
        .attr("cy", cy)
        .attr("r", r)
        .attr("stroke", "#1976d2")
        .attr("stroke-width", epsilonBallStrokeWidth)
        .attr("fill", "none")
        .attr("opacity", opacity)
        .style("pointer-events", "none");
    });
  }

  /**
   * Compute epsilon neighborhood graph using screen-space distances (consistent with EpsilonBall)
   * Returns an adjacency matrix where adjMatrix[i][j] === 1 if points i and j are within epsilon distance
   */
  function computeEpsilonNeighborhoodGraphScreenSpace(dataset, epsilon) {
    const dataArr = dataset.data;
    const n = dataArr.length;
    const adjMatrix = Array(n).fill(null).map(() => Array(n).fill(0));

    // Convert epsilon from data space to screen space
    const epsilonScreen = Math.abs(xScale(epsilon) - xScale(0));

    for (let i = 0; i < n; i++) {
      const p1 = dataArr[i];
      const p1xScreen = xScale(p1.x);
      const p1yScreen = yScale(p1.y);

      for (let j = i + 1; j < n; j++) {
        const p2 = dataArr[j];
        const p2xScreen = xScale(p2.x);
        const p2yScreen = yScale(p2.y);

        // Compute Euclidean distance in screen space
        const distScreen = Math.sqrt(
          (p2xScreen - p1xScreen) ** 2 + (p2yScreen - p1yScreen) ** 2
        );

        // Mark as connected if within epsilon distance
        if (distScreen <= epsilonScreen) {
          adjMatrix[i][j] = 1;
          adjMatrix[j][i] = 1;
        }
      }
    }
    return adjMatrix;
  }

  function plotEpsilonNeighborhoodGraph(svg, dataset, epsilon) {
    svg.selectAll("g.neighborhood-graph-group").remove();
    const group = svg.append("g").attr("class", "neighborhood-graph-group");

    const adjMatrix = computeEpsilonNeighborhoodGraphScreenSpace(dataset, epsilon);
    for (let i = 0; i < dataset.data.length; i++) {
      for (let j = i + 1; j < dataset.data.length; j++) {
        if (adjMatrix[i][j] === 1) {
          const p1 = dataset.data[i];
          const p2 = dataset.data[j];
          group
            .append("line")
            .attr("x1", xScale(p1.x))
            .attr("y1", yScale(p1.y))
            .attr("x2", xScale(p2.x))
            .attr("y2", yScale(p2.y))
            .attr("stroke", "#1976d2")
            .attr("stroke-width", graphEdgeStrokeWidth)
            .attr("opacity", graphEdgeOpacity)
            .style("pointer-events", "none");
        }
      }
    }
  }

  // -------------------------------
  // Animation
  // -------------------------------
  async function animateCycle() {
    // Compute radius
    while (active) {
      // Grow and fade epsilon balls
      await new Promise((resolve) => {
        const start = performance.now();
        const svg = d3.select(svgEl);

        function animate(now) {
          const elapsed = now - start;
          if (elapsed < growDuration) {
            const t = elapsed / growDuration;
            animatedEpsilonRadius = t * epsilon;

            // Plot directly here instead of reactive block
            plotAllEpsilonBalls(svg, dataset, animatedEpsilonRadius);

            requestAnimationFrame(animate);
          } else {
            animatedEpsilonRadius = epsilon;

            // Final frame
            const svg = d3.select(svgEl);
            plotAllEpsilonBalls(svg, dataset, animatedEpsilonRadius);

            resolve();
          }
        }

        requestAnimationFrame(animate);
      });

      // Hold at max epsilon before plotting the graph
      await new Promise((r) => setTimeout(r, waitDuration));

      // Show the graph: first remove any epsilon balls, then draw the graph
      const svg = d3.select(svgEl);
      svg.selectAll("g.all-epsilon-balls-group").remove();
      plotEpsilonNeighborhoodGraph(svg, dataset, epsilon);

      // Hold the graph briefly
      await new Promise((r) => setTimeout(r, graphShowDuration));

      // Clear graph
      svg.selectAll("g.neighborhood-graph-group").remove();

      // Reset for next cycle
      animatedEpsilonRadius = 0;
      currentOpacity = 1.0;
    }
  }

  // -------------------------------
  // Reactive rendering
  // -------------------------------

  // Plot scatter initially
  $: if (dataset && active) {
    const svg = d3.select(svgEl);
    drawScatter(svg, dataset, xScale, yScale);
    // Trigger animation
    animateCycle();
  }

  onMount(() => {
    dataset = generateNoisySineWave(numPoints, 0.01, 10, 1.5, [0, 10], 4);
    const scales = computeDataScales(dataset, width, height, margin);
    xScale = scales.xScale;
    yScale = scales.yScale;
    // Also plot scatter on mount
    const svg = d3.select(svgEl);
    drawScatter(svg, dataset, xScale, yScale);
  });
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
  <p class="figure-caption">
    Figure 5: Graph formed by connecting the points in each epsilon
    neighborhood.
  </p>
</div>
