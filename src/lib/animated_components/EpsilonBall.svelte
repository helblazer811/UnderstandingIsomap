<script>
  //@ts-nocheck
  import * as d3 from "d3";
  import * as settings from "$lib/settings.js";
  import { onMount } from "svelte";
  import { generateNoisySineWave } from "$lib/utils/data.js";
  import { computeDataScales } from "$lib/utils/data.js";

  export let epsilon = 2;
  export let width = 500;
  export let height = 500;
  export let margin = 40;
  export let radius = 6;
  export let active = true;
  export let colorScheme = d3.interpolateViridis;
  export let numPoints = 90;
  export const noiseLevel = 0.1;
  // Configurable opacities for points inside vs outside the epsilon ball
  export let inEpsilonOpacity = 0.9;
  export let outsideEpsilonOpacity = 0.15;
  let svgEl; // local reference to the <svg> element

  let dataset = null;
  let highlightedIdx = null;
  let tempHighlightedIdx = null;
  let xScale = null;
  let yScale = null;
  let currentOpacity = 1.0;

  // Draw scatter points with t-based Viridis color and click-to-highlight
  function plotScatter(svg, dataset, xScale, yScale, radius, withinEpsilon) {
    svg.selectAll("g.scatter-group").remove();
    const dataArr = dataset.data;
    const scatterGroup = svg.append("g").attr("class", "scatter-group");
    const colorScale = d3.scaleSequential(colorScheme).domain([0, 1]);
    if (!withinEpsilon) {
      withinEpsilon = new Array(dataArr.length).fill(false);
    }
    scatterGroup
      .selectAll("circle.scatter-point")
      .data(dataArr)
      .enter()
      .append("circle")
      .attr("class", "scatter-point")
      .attr("cx", (d) => xScale(d.x))
      .attr("cy", (d) => yScale(d.y))
      .attr("r", radius)
      .attr("fill", (d, i) => colorScale(dataset.t[i]))
  .attr("opacity", (d, i) => (withinEpsilon[i] ? inEpsilonOpacity : outsideEpsilonOpacity))
      .style("cursor", "pointer")
      .on("click", function (event, d) {
        const idx = dataArr.indexOf(d);
        if (idx !== -1) {
          highlightedIdx = idx;
          tempHighlightedIdx = null; // Clear temporary highlight on click
        }
      })
      .on("mouseenter", function (event, d) {
        const idx = dataArr.indexOf(d);
        if (idx !== -1 && idx !== highlightedIdx) {
          tempHighlightedIdx = idx;
        }
      })
      .on("mouseleave", function (event, d) {
        tempHighlightedIdx = null;
        // Clean up the temporary epsilon ball group
        d3.select(svgEl).selectAll("g.temp-epsilon-ball-group").remove();
      });

    return { xScale, yScale };
  }

  // Returns an array of booleans: true if point i is within epsilon of highlightedIdx (in screen space)
  function highlightWithinEpsilonPoints(
    dataset,
    highlightedIdx,
    epsilon,
    xScale,
    yScale
  ) {
    const dataArr = dataset.data;
    let withinEpsilon = new Array(dataArr.length).fill(false);
    if (highlightedIdx !== null) {
      const hx = dataArr[highlightedIdx].x;
      const hy = dataArr[highlightedIdx].y;
      const hxScreen = xScale(hx);
      const hyScreen = yScale(hy);
      const epsilonScreen = Math.abs(xScale(hx + epsilon) - xScale(hx));
      for (let i = 0; i < dataArr.length; i++) {
        const px = dataArr[i].x;
        const py = dataArr[i].y;
        const pxScreen = xScale(px);
        const pyScreen = yScale(py);
        const distScreen = Math.sqrt(
          (pxScreen - hxScreen) ** 2 + (pyScreen - hyScreen) ** 2
        );
        if (distScreen <= epsilonScreen) {
          withinEpsilon[i] = true;
        }
      }
    }
    return withinEpsilon;
  }

  // Draw a single epsilon ball, radius line, and label for the highlighted point
  function plotEpsilonBall(
    svg,
    dataset,
    epsilon,
    highlightedIdx,
    xScale,
    yScale,
    opacity = 0.5
  ) {
    const groupClass =
      opacity > 0.5 ? "temp-epsilon-ball-group" : "epsilon-ball-group";
    svg.selectAll(`g.${groupClass}`).remove();
    if (highlightedIdx === null) return;
    const dataArr = dataset.data;
    const group = svg.append("g").attr("class", groupClass);
    const d = dataArr[highlightedIdx];
    const cx = xScale(d.x);
    const cy = yScale(d.y);
    const r = Math.abs(xScale(d.x + epsilon) - xScale(d.x));
    // Draw the epsilon ball
    group
      .append("circle")
      .attr("class", "epsilon-ball")
      .attr("cx", cx)
      .attr("cy", cy)
      .attr("r", r)
      .attr("stroke", "#1976d2")
      .attr("stroke-width", 3.5)
      .attr("fill", "none")
      .attr("opacity", opacity)
      .style("pointer-events", "none");

    // Draw the radius line (to the right)
    group
      .append("line")
      .attr("x1", cx)
      .attr("y1", cy)
      .attr("x2", cx + r)
      .attr("y2", cy)
      .attr("stroke", "#1976d2")
      .attr("stroke-width", 3.5)
      .attr("opacity", 0.5)
      .attr("stroke-dasharray", "8,4");

    // Draw the epsilon label (SVG text, to be replaced by KaTeX in overlay)
    group
      .append("text")
      .attr("x", cx + r / 2 + 8)
      .attr("y", cy - 8)
      .attr("fill", "#1976d2")
      .attr("font-size", 24)
      .attr("font-family", "sans-serif")
      .text("ε");
  }

  // Show scatter points and epsilon balls when active
  $: if (active && dataset && svgEl) {
    const svg = d3.select(svgEl);
    // Compute scales and color
    const dataArr = dataset.data;
    // Use highlightWithinEpsilonPoints for dot highlighting
    let withinEpsilon;
    withinEpsilon = highlightWithinEpsilonPoints(
      dataset,
      highlightedIdx,
      epsilon,
      xScale,
      yScale
    );

    plotScatter(svg, dataset, xScale, yScale, radius, withinEpsilon);
  }

  $: if (active && dataset && svgEl) {
    const svg = d3.select(svgEl);
    // Always show the permanent highlight if it exists
    if (highlightedIdx !== null) {
      plotEpsilonBall(
        svg,
        dataset,
        epsilon,
        highlightedIdx,
        xScale,
        yScale,
        0.4
      );
    }
    // Show temporary hover highlight with higher opacity
    if (tempHighlightedIdx !== null && tempHighlightedIdx !== highlightedIdx) {
      plotEpsilonBall(
        svg,
        dataset,
        epsilon,
        tempHighlightedIdx,
        xScale,
        yScale,
        0.7
      );
    }
  }

  onMount(() => {
    // Sample sine wave dataset
    dataset = generateNoisySineWave(numPoints, 0.01, 10, 1.5, [0, 15], 4);
    // Compute scales
    if (dataset) {
      const scales = computeDataScales(dataset, width, height, margin);
      xScale = scales.xScale;
      yScale = scales.yScale;
    }
    // Pick the central-most point (closest to mean)
    if (dataset && dataset.data && dataset.data.length > 0) {
      const xs = dataset.data.map((p) => p.x);
      const ys = dataset.data.map((p) => p.y);
      const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
      const meanY = ys.reduce((a, b) => a + b, 0) / ys.length;
      let minDist = Infinity;
      let minIdx = 0;
      for (let i = 0; i < dataset.data.length; i++) {
        const dx = dataset.data[i].x - meanX;
        const dy = dataset.data[i].y - meanY;
        const dist = dx * dx + dy * dy;
        if (dist < minDist) {
          minDist = dist;
          minIdx = i;
        }
      }
      highlightedIdx = minIdx;
    }
    // Also plot scatter at first
    const svg = d3.select(svgEl);
    plotScatter(svg, dataset, xScale, yScale, radius);
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
  <p class="figure-caption">Figure 4: Epsilon neighborhood around a point.</p>
</div>
