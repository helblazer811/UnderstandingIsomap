<script>
  // @ts-nocheck
  import * as d3 from "d3";
  import * as settings from "$lib/settings.js";

  import { generateNoiseFreeSpiralPoints } from "$lib/utils/data.js";
  import { plotScatter } from "$lib/utils/plotting.js";
  import { onMount } from "svelte";

  export let dataset;
  export let active = true;
  export let width = 500;
  export let height = 500;
  export let margin = 40;
  export let radius = 5;
  export let colorScheme = d3.interpolateViridis;
  export let pointOpacity = 0.6;
  // Control the axis draw duration and the pause between repeats
  export let axisDuration = 3000;
  export let repeatDelay = 1200;
  let svgEl; // local reference to the <svg> element
  let isAnimating = false;

  /**
   * Animates existing points to their spiral positions.
   * @param pointsSelection - D3 selection of existing circles with bound data
   * @param {{data: Array<{x: number, y: number}>, t: Array<number>}} dataset - original dataset
   * @param {number} duration - Duration in ms
   */
  function animateScatterToSpiral(pointsSelection, dataset, duration = 2000) {
    const data = dataset.data;
    const tArr = dataset.t;

    // Compute scales
    const xs = data.map((/** @type {{x:number}} */ p) => p.x);
    const ys = data.map((/** @type {{y:number}} */ p) => p.y);
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

    //   Make points visible
    pointsSelection.attr("opacity", pointOpacity);

    // Set initial positions to random Gaussian
    function gaussianRandom() {
      let u = 0,
        v = 0;
      while (u === 0) u = Math.random();
      while (v === 0) v = Math.random();
      return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }
    const xMean = (xExtent[0] + xExtent[1]) / 2;
    const yMean = (yExtent[0] + yExtent[1]) / 2;
    const xStd = (xExtent[1] - xExtent[0]) / 4;
    const yStd = (yExtent[1] - yExtent[0]) / 4;

    pointsSelection
      .attr("cx", () => xScale(xMean + gaussianRandom() * xStd))
      .attr("cy", () => yScale(yMean + gaussianRandom() * yStd))
      .attr("fill", function (_d, i) {
        return colorScale(tArr[i]);
      })
      .transition()
      .duration(duration)
      .ease(d3.easeCubicInOut)
      .attr("cx", function (_d, i) {
        return xScale(data[i].x);
      })
      .attr("cy", function (_d, i) {
        return yScale(data[i].y);
      });
  }

  // Plots the scatter points without animation.
  // @param {object} dataset - { data: [{x, y}], t: [number] }
  function drawScatter(svg, dataset) {
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

    plotScatter(svg, dataset, { xScale, yScale }, {
      radius,
      fillColor: (d, i) => colorScale(dataset.t[i]),
      opacity: dataset.data.map(() => pointOpacity),
      pointClass: "scatter-point",
      groupClass: "scatter-group",
      clearPrevious: true
    });
  }

  /**
   * Plots the intrinsic dimension axis as a dotted line along the underlying spiral curve, animated over durationMs.
   * The label follows the curve near the top-left (theta ~ 3/4 pi), offset slightly, and stays upright.
   * @param {number} durationMs - Animation duration in milliseconds (default 1200ms)
   */
  function animateIntrinsicDimensionAxis(svg, data, durationMs = 1200) {
    // Remove previous axis
    svg.selectAll("g.intrinsic-dimension-axis").remove();

    // Spiral parameters
    const spiral = generateNoiseFreeSpiralPoints(
      settings.numPoints,
      settings.numTurns,
      settings.squashFactor
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
      .attr("stroke", "white")
      .attr("stroke-width", 7)
      .attr("stroke-dasharray", "6,4")
      .attr("opacity", 0.5);

    // Add the main path on top
    const mainPath = axisGroup
      .append("path")
      .datum(spiralData)
      .attr("d", lineGen)
      .attr("fill", "none")
      .attr("stroke", "#1976d2")
      .attr("stroke-width", 3)
      .attr("stroke-dasharray", "6,4")
      .attr("opacity", 0.7);

    // Animate the path drawing
    const totalLength = mainPath.node().getTotalLength();
    path
      .attr("stroke-dasharray", totalLength + "," + totalLength)
      .attr("stroke-dashoffset", totalLength)
      .transition()
      .duration(durationMs)
      .ease(d3.easeLinear)
      .attr("stroke-dashoffset", 0);
    mainPath
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

    const targetTheta = 0.25 * Math.PI; // top-right
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
    const segmentLength = 25;
    const startIdx = Math.max(0, bestIdx - Math.floor(segmentLength / 2));
    const endIdx = Math.min(spiralData.length, startIdx + segmentLength);
    const labelData = spiralData.slice(startIdx, endIdx).reverse();

    // Slight top-left offset
    const offsetX = 10;
    const offsetY = -10;

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

  async function runAxisLoop() {
    if (isAnimating) return; // prevent overlapping loops
    isAnimating = true;
    const svg = d3.select(svgEl);
    while (active) {
      animateIntrinsicDimensionAxis(svg, dataset, axisDuration);
      // wait for animation to finish plus a small pause
      await new Promise((r) => setTimeout(r, axisDuration + repeatDelay));
    }
    isAnimating = false;
  }

  $: if (dataset && svgEl) {
    const svg = d3.select(svgEl);
    drawScatter(svg, dataset);
  }

  // Start or resume the loop when conditions are met
  $: if (active && dataset && svgEl) {
    const svg = d3.select(svgEl);
    runAxisLoop();
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
  <p class="figure-caption">
    Figure 1: A noisy spiral dataset illustrating a 1D manifold embedded in 2D.
    The <span class="viridis-gradient-text">color of each point&nbsp;</span> represents
    its position along this intrinsic dimension.
  </p>
</div>
