<script>
  //@ts-nocheck
  import * as d3 from "d3";
  import { onMount } from "svelte";
  import * as settings from "$lib/settings.js";
  import { generateNoisySineWave, computeDataScales } from "$lib/utils/data.js";
  import { computeEpsilonNeighborhoodGraph } from "$lib/utils/math.js";

  export let width = 500;
  export let height = 300;
  export let margin = 40;
  export let radius = 6;
  export let active = true;
  export let colorScheme = d3.interpolateViridis;
  export let epsilon = 1;
  export let numPoints = 180;
  export let graphShowDuration = 2000;
  export let pointOpacity = 0.6;
  export let growDuration = 2000; // ms to grow epsilon from 0 to maxEpsilon
  export let maxEpsilon = 1.5; // target epsilon radius at peak (data units)
  export let waitDuration = 1000; // ms to wait at max epsilon before plotting the graph

  let svgEl;
  let dataset;
  let xScale, yScale;
  let animatedEpsilonRadius = 0;
  let currentOpacity = 1.0;

  // -------------------------------
  // Drawing functions
  // -------------------------------
  function plotScatter(svg, dataset, xScale, yScale) {
    svg.selectAll("g.scatter-group").remove();
    const group = svg.append("g").attr("class", "scatter-group");

    const colorScale = d3.scaleSequential(colorScheme).domain([0, 1]);

    group
      .selectAll("circle")
      .data(dataset.data)
      .join("circle")
      .attr("cx", (d) => xScale(d.x))
      .attr("cy", (d) => yScale(d.y))
      .attr("r", radius)
      .attr("fill", (d, i) => colorScale(dataset.t[i]))
      .attr("opacity", pointOpacity);
  }

  function plotAllEpsilonBalls(svg, dataset, radius, opacity = 0.2) {
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
        .attr("stroke-width", 2)
        .attr("fill", "none")
        .attr("opacity", opacity)
        .style("pointer-events", "none");
    });
  }

  function plotEpsilonNeighborhoodGraph(svg, dataset, epsilon) {
    svg.selectAll("g.neighborhood-graph-group").remove();
    const group = svg.append("g").attr("class", "neighborhood-graph-group");

    const adjMatrix = computeEpsilonNeighborhoodGraph(dataset.data, epsilon);
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
            .attr("stroke-width", 2)
            .attr("opacity", 0.3)
            .style("pointer-events", "none");
        }
      }
    }
  }

  // -------------------------------
  // Animation
  // -------------------------------
  async function animateCycle() {
    while (active) {
      // Grow and fade epsilon balls
      await new Promise((resolve) => {
        const start = performance.now();

        function animate(now) {
          const elapsed = now - start;
          if (elapsed < growDuration) {
            const t = elapsed / growDuration;
            animatedEpsilonRadius = t * maxEpsilon;

            // Plot directly here instead of reactive block
            const svg = d3.select(svgEl);
            plotAllEpsilonBalls(
              svg,
              dataset,
              animatedEpsilonRadius
            );

            requestAnimationFrame(animate);
          } else {
            animatedEpsilonRadius = maxEpsilon;

            // Final frame
            const svg = d3.select(svgEl);
            plotAllEpsilonBalls(
              svg,
              dataset,
              animatedEpsilonRadius
            );

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

  // // -------------------------------
  // // Reactive rendering
  // // -------------------------------
  // $: if (dataset && animatedEpsilonRadius) {
  //   const svg = d3.select(svgEl);
  //   console.log("Reactive plotAllEpsilonBalls triggered");
  //   plotAllEpsilonBalls(svg, dataset, animatedEpsilonRadius, currentOpacity);
  // }

  // Plot scatter initially
  $: if (dataset && active) {
    const svg = d3.select(svgEl);
    plotScatter(svg, dataset, xScale, yScale);
    // Trigger animation
    animateCycle();
  }

  onMount(() => {
    dataset = generateNoisySineWave(numPoints, 0.01, 10, 1.5, [0, 15], 4);
    const scales = computeDataScales(dataset, width, height, margin);
    xScale = scales.xScale;
    yScale = scales.yScale;
  });
</script>

<svg
  bind:this={svgEl}
  {width}
  {height}
  style:opacity={active ? 1 : settings.inactiveOpacity}
></svg>
