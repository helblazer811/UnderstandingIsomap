<script>
  // @ts-nocheck
  import * as d3 from "d3";
  import * as settings from "$lib/settings.js";
  import { computeKNearestNeighborGraph } from "$lib/utils/math.js";
  import { generateNoisySineWave } from "$lib/utils/data.js";
  import { computeDataScales } from "$lib/utils/data.js";
  import { onMount } from "svelte";

  let svgEl; // local reference to the <svg> element
  export let k;
  export let width = 500;
  export let height = 300;
  export let margin = 40;
  export let radius = 6;
  export let active = true;
  export let colorScheme = d3.interpolateViridis;
  export let numPoints = 90;
  export const noiseLevel = 0.1;
  export let pointOpacity = 0.6;
  export let edgeOpacity = 0.3;
  export let edgeWidth = 1.5;
  // export let pointColor = "#1976d2";
  export let graphColor = "#1976d2";
  let dataset = null;
  // let highlightedIdx = null;
  // let tempHighlightedIdx = null;
  let xScale = null;
  let yScale = null;

  // Draw lines connecting k-nearest neighbor pairs
  function plotKNNGraph(svg, dataset, k, xScale, yScale) {
    svg.selectAll("g.knn-graph-group").remove();
    const dataArr = dataset.data;
    const group = svg.append("g").attr("class", "knn-graph-group");

    // Compute the k-nearest neighbor graph using the math.js function
    const adjMatrix = computeKNearestNeighborGraph(dataArr, k);

    // Draw lines between connected pairs (where adjMatrix[i][j] is not Infinity)
    for (let i = 0; i < dataArr.length; i++) {
      for (let j = i + 1; j < dataArr.length; j++) {
        if (adjMatrix[i][j] !== Infinity) {
          const p1 = dataArr[i];
          const p2 = dataArr[j];

          group
            .append("line")
            .attr("x1", xScale(p1.x))
            .attr("y1", yScale(p1.y))
            .attr("x2", xScale(p2.x))
            .attr("y2", yScale(p2.y))
            .attr("stroke", graphColor)
            .attr("stroke-width", edgeWidth)
            .attr("opacity", edgeOpacity)
            .style("pointer-events", "none");
        }
      }
    }
  }
  // Draw scatter points with t-based Viridis color and click-to-highlight
  function plotScatter(svg, dataset, radius) {
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
      .attr("opacity", pointOpacity)
      .attr("fill", (d, i) => colorScheme(dataset.t[i]));
      // .attr("fill", pointColor);
    // .attr("opacity", (d, i) => (withinEpsilon[i] ? 0.8 : 0.35))
    // .style("cursor", "pointer")
    // .on("click", function (event, d) {
    //   console.log("Point clicked:", d);
    //   const idx = dataArr.indexOf(d);
    //   if (idx !== -1) {
    //     highlightedIdx = idx;
    //     tempHighlightedIdx = null; // Clear temporary highlight on click
    //     console.log("Clicked point index:", idx);
    //   }
    // })
    // .on("mouseenter", function (event, d) {
    //   const idx = dataArr.indexOf(d);
    //   if (idx !== -1 && idx !== highlightedIdx) {
    //     tempHighlightedIdx = idx;
    //   }
    // })
    // .on("mouseleave", function (event, d) {
    //   tempHighlightedIdx = null;
    //   // Clean up the temporary epsilon ball group
    //   d3.select(svgEl).selectAll("g.temp-epsilon-ball-group").remove();
    // });
  }

  // Show scatter points and epsilon balls when active
  $: if (active && dataset && svgEl) {
    const svg = d3.select(svgEl);
    // Compute scales and color
    // const dataArr = dataset.data;
    // const colorScale = d3.scaleSequential(colorScheme).domain([0, 1]);

    plotScatter(svg, dataset, radius);
    plotKNNGraph(svg, dataset, k, xScale, yScale);
  }

  onMount(() => {
    // Generate sine wave dataset
    dataset = generateNoisySineWave(numPoints, 0.01, 10, 1.5, [0, 15], 4);

    // Compute scales for the dataset
    const scales = computeDataScales(dataset, width, height, margin);
    xScale = scales.xScale;
    yScale = scales.yScale;

    // Plot scatter at first 
    const svg = d3.select(svgEl);
    plotScatter(svg, dataset, radius);
  });
  
</script>

<svg
  bind:this={svgEl}
  viewBox={`0 0 ${width} ${height}`}
  preserveAspectRatio="xMidYMid meet"
  {width}
  {height}
  style="display:block; width: 100%; max-width: {width}px; height: auto;"
  style:opacity={active ? 1 : settings.inactiveOpacity}
></svg>
