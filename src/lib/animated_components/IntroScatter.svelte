<script>
  import * as d3 from "d3";
  import { onMount } from "svelte";
  import * as settings from "$lib/settings.js";

  import Quote from "$lib/components/Quote.svelte";
  import ActionLink from "$lib/components/ActionLink.svelte";

  export let dataset;
  export let width = 500;
  export let height = 500;
  export let margin = 40;
  export let radius = 5;
  export let active = true;
  export let colorScheme = d3.interpolateViridis;

  export let pointOpacity = 0.8;
  let svgEl; // reference to the <svg> element

  /**
   * Animates existing points to their spiral positions.
   * @param pointsSelection - D3 selection of existing circles with bound data
   * @param {{data: Array<{x: number, y: number}>, t: Array<number>}} dataset - original dataset
   * @param {number} duration - Duration in ms
   */
  /**
   * @param {*} pointsSelection
   * @param {*} dataset
   * @param {number} duration
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

  $: if ((active && dataset && svgEl) || (active && svgEl)) {
    const svg = d3.select(svgEl);
    svg.selectAll("circle").remove();
    const points = svg
      .selectAll("circle")
      .data(dataset.data)
      .enter()
      .append("circle")
      .attr("r", radius)
      .attr("opacity", pointOpacity);
    animateScatterToSpiral(points, dataset, 2000);
  }
</script>

<div
  class="text-plot"
  on:mouseenter={() => (active = true)}
  on:mouseleave={() => (active = false)}
  role="region"
  aria-label="Intro visualization section"
>
  <div class="text-container">
    <div class="article-header">
      <h1 class="hed">Dimensionality Reduction with Isomap</h1>
      <h2 class="dek">Nonlinear Dimensionality Reduction</h2>
      <div class="byline">
        By: <a href="https://alechelbling.com">Alec Helbling</a>
      </div>
    </div>
    <Quote>
      "To deal with hyper-planes in a 14-dimensional space, visualize a 3D space
      and say 'fourteen' to yourself very loudly. Everyone does it." - Geoffrey
      Hinton
    </Quote>
    <p>
      In many domains, like computational imaging or genomics, data comes in the
      form of high-dimensional signals that are challenging for humans to
      directly reason about, as our intuition is generally confined to two or
      three dimensions. The field of <a href="">dimensionality reduction</a> aims
      to compress high-dimensional data into lower-dimensional representations that
      preserve their relevant structure while being much easier for people to interpret.
    </p>
    <p>
      In this article, I'll be exploring <a href="">Isomap</a> a classic
      non-linear dimensionality reduction technique that seeks to embed data
      while preserving its local similarity structure. Isomap builds upon the
      manifold hypothesis, which posits that high-dimensional data often lies on
      a low-dimensional manifold, despite existing in a higher dimensional
      space. Throughout the article there will be various <ActionLink
        action={() => {
          alert("Good job!");
        }}>action links</ActionLink
      > that when clicked will modify the visualization.
    </p>
  </div>
  <div class="plot">
    <svg
      bind:this={svgEl}
      {width}
      {height}
      style:opacity={active ? 1 : settings.inactiveOpacity}
    ></svg>
  </div>
</div>
