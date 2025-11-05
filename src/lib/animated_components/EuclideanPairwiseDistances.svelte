<script>
  import * as d3 from "d3";
  import * as settings from "$lib/settings.js";
  import { onMount } from "svelte";
  import { generateNoisySineWave } from "$lib/utils/data.js";

  let svgEl;
  export let width = 500;
  export let height = 300;
  export let margin = 40;
  export let k = 5;
  export let radius = 8;
  export let active = true;
  export let pointOpacity = 0.3;
  export let numPoints = 30;
  export let noiseLevel = 0.02;
  export let traversalOpacity = 1.0;
  export let graphColor = "#1976d2";
  export let animationSpeed = 50;
  export let pauseBetweenTraversals = 1000;

  let currentAnimationId = 0;
  let animationInProgress = false;
  let dataset = null;
  let highlightedIdx = null;
  let xScale = null;
  let yScale = null;

  // Compute scales for the dataset
  function computeScales(dataset) {
    const dataArr = dataset.data;
    const xs = dataArr.map((p) => p.x);
    const ys = dataArr.map((p) => p.y);
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

  // Draw scatter points with constant blue color and click-to-highlight
  function plotScatter(svg, dataset, xScale, yScale, radius, withinEpsilon) {
    svg.selectAll("g.scatter-group").remove();
    const dataArr = dataset.data;
    const scatterGroup = svg.append("g").attr("class", "scatter-group");
    scatterGroup
      .selectAll("circle.scatter-point")
      .data(dataArr)
      .enter()
      .append("circle")
      .attr("class", "scatter-point")
      .attr("cx", (d) => xScale(d.x))
      .attr("cy", (d) => yScale(d.y))
      .attr("r", radius)
      .attr("fill", graphColor)
      .attr("opacity", (d, i) =>
        withinEpsilon[i] ? pointOpacity * 2 : pointOpacity
      )
      .style("cursor", "pointer")
      .on("mouseenter", function (event, d) {
        const idx = dataArr.indexOf(d);
        if (idx !== -1 && idx !== highlightedIdx) {
          //   tempHighlightedIdx = idx;
          currentAnimationId += 1;
          highlightedIdx = idx; // This will trigger the animation
        }
      });
  }

  // Function to animate drawing lines from a start point to all other points
  async function animatingPairwiseDistances(
    svg,
    dataset,
    xScale,
    yScale,
    startIdx
  ) {
    if (animationInProgress) return;
    if (!active) return;
    const animationId = ++currentAnimationId;
    animationInProgress = true;
    console.log("Starting pairwise distances animation");

    const dataArr = dataset.data;
    const startPoint = dataArr[startIdx];

    svg.selectAll("g.animation-lines-group").remove();
    const animationGroup = svg
      .append("g")
      .attr("class", "animation-lines-group");

    // Highlight the start point
    animationGroup
      .append("circle")
      .attr("cx", xScale(startPoint.x))
      .attr("cy", yScale(startPoint.y))
      .attr("r", radius + 2)
      .attr("fill", "none")
      .attr("stroke", graphColor)
      .attr("stroke-width", 3);

    // Animate drawing lines to each other point sequentially
    for (let i = 0; i < dataArr.length; i++) {
      if (i === startIdx) continue;
      if (animationId !== currentAnimationId) {
        // A new animation has started, abort this one
        return;
      }

      const endPoint = dataArr[i];

      // Create the line
      const line = animationGroup
        .append("line")
        .attr("x1", xScale(startPoint.x))
        .attr("y1", yScale(startPoint.y))
        .attr("x2", xScale(startPoint.x)) // Start from start point
        .attr("y2", yScale(startPoint.y))
        .attr("stroke", graphColor)
        .attr("stroke-width", 2)
        .attr("opacity", traversalOpacity);

      // Animate the line extending to the end point
      await new Promise((resolve) => {
        line
          .transition()
          .duration(animationSpeed)
          .attr("x2", xScale(endPoint.x))
          .attr("y2", yScale(endPoint.y))
          .on("end", resolve);
      });

      // Pause briefly before next line
      await new Promise((resolve) => {
        setTimeout(resolve, pauseBetweenTraversals / 10);
      });
    }

    // Animation complete, wait cooldown then start with new random point
    await new Promise((resolve) => {
      setTimeout(resolve, pauseBetweenTraversals);
    });

    animationInProgress = false;
    svg.selectAll("g.animation-lines-group").remove();
    highlightedIdx = Math.floor(Math.random() * dataset.data.length);
  }

  $: if (highlightedIdx !== null && active) {
    // If active or highlightedIdx changes, start animation
    const svg = d3.select(svgEl);
    animationInProgress = false;
    currentAnimationId += 1;
    animatingPairwiseDistances(svg, dataset, xScale, yScale, highlightedIdx);
  }

  onMount(() => {
    // Generate sine wave dataset
    dataset = generateNoisySineWave(numPoints, noiseLevel, 20, 1, [
      0,
      4 * Math.PI,
    ]);

    // Compute scales
    const scales = computeScales(dataset);
    xScale = scales.xScale;
    yScale = scales.yScale;

    // Select a random node for highlightedIdx
    highlightedIdx = Math.floor(Math.random() * dataset.data.length);

    const svg = d3.select(svgEl);
    plotScatter(svg, dataset, xScale, yScale, radius, []);
  });
  
</script>

<svg
  bind:this={svgEl}
  {width}
  {height}
  style:opacity={active ? 1 : settings.inactiveOpacity}
></svg>
