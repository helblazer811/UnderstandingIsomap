<script>
  // @ts-nocheck
  import * as d3 from "d3";
  import * as settings from "$lib/settings.js";
  import { onMount } from "svelte";
  import { generateNoisySineWave } from "$lib/utils/data.js";
  import {
    computeKNearestNeighborGraph,
    dijkstraShortestPath,
  } from "$lib/utils/math.js";

  let svgEl; // local reference to the <svg> element
  export let width = 500;
  export let height = 250;
  export let margin = 40;
  export let k = 5;
  export let radius = 5;
  export let active = false;
  export let pointOpacity = 0.2;
  export let numPoints = 100;
  export let noiseLevel = 0.005;
  export let traversalOpacity = 1.0;
  export let graphColor = "#1976d2";
  export let traversalColor = "#ff6b35";
  export let animationSpeed = 50;
  export let pauseBetweenTraversals = 1000;

  let showScatterPlot = true;
  let showKNNGraph = true;
  let animateTraversal = true;
  let dataset = null;
  let KNNAdjacencyMatrix = null;
  let highlightedIdx = null;
  let tempHighlightedIdx = null;
  let xScale = null;
  let yScale = null;
  let animatingTraversal = false;
  let traversalPath = null;

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

  // Helper function to get random start and end indices
  function getRandomIndices(dataLength) {
    const startIdx = Math.floor(Math.random() * dataLength);
    let endIdx = Math.floor(Math.random() * dataLength);
    // Ensure start and end are different
    while (endIdx === startIdx) {
      endIdx = Math.floor(Math.random() * dataLength);
    }
    return { startIdx, endIdx };
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

    return { xScale, yScale };
  }

  // Draw lines connecting k-nearest neighbor pairs
  function plotKNNGraph(svg, dataset, k, xScale, yScale) {
    svg.selectAll("g.knn-graph-group").remove();
    const dataArr = dataset.data;
    const group = svg.append("g").attr("class", "knn-graph-group");

    // Draw lines between connected pairs (where adjMatrix[i][j] is not Infinity)
    for (let i = 0; i < dataArr.length; i++) {
      for (let j = i + 1; j < dataArr.length; j++) {
        if (KNNAdjacencyMatrix[i][j] !== Infinity) {
          const p1 = dataArr[i];
          const p2 = dataArr[j];

          group
            .append("line")
            .attr("x1", xScale(p1.x))
            .attr("y1", yScale(p1.y))
            .attr("x2", xScale(p2.x))
            .attr("y2", yScale(p2.y))
            .attr("stroke", graphColor)
            .attr("stroke-width", 3)
            .attr("opacity", 0.3)
            .style("pointer-events", "none");
        }
      }
    }
  }

  // Animate graph traversal using Dijkstra's algorithm
  async function animateGraphTraversal(startIdx = 0, endIdx = null) {
    if (animatingTraversal) return; // 🚫 prevent overlapping animations
    animatingTraversal = true;
    if (!dataset || !xScale || !yScale) return;

    const targetEndIdx =
      endIdx !== null ? endIdx : Math.floor(dataset.data.length / 2);
    const dataArr = dataset.data;

    // Find shortest path using Dijkstra
    const path = dijkstraShortestPath(KNNAdjacencyMatrix, startIdx, targetEndIdx);

    if (path.length === 0) {
      console.log("No path found between", startIdx, "and", targetEndIdx);
      return;
    }

    function animatePath() {
      return new Promise((resolve) => {
        const svg = d3.select(svgEl);
        svg.selectAll("g.traversal-path-group").remove();
        const pathGroup = svg.append("g").attr("class", "traversal-path-group");

        // Add blur filter for label backgrounds
        const defs = svg.select("defs");
        if (defs.empty()) {
          svg
            .append("defs")
            .append("filter")
            .attr("id", "blur")
            .append("feGaussianBlur")
            .attr("stdDeviation", 1);
        }

        // Add labels for start and end points
        const startPoint = dataArr[startIdx];
        const endPoint = dataArr[targetEndIdx];

        // Determine label positions based on x-coordinates
        const isStartLeft = xScale(startPoint.x) < xScale(endPoint.x);
        const startLabelX = isStartLeft
          ? xScale(startPoint.x) - 15
          : xScale(startPoint.x) + 15;
        const endLabelX = isStartLeft
          ? xScale(endPoint.x) + 15
          : xScale(endPoint.x) - 15;

        // Start label background
        pathGroup
          .append("rect")
          .attr("x", startLabelX - 15)
          .attr("y", yScale(startPoint.y) - 9)
          .attr("width", 30)
          .attr("height", 18)
          .attr("fill", "white")
          .attr("opacity", 0.7)
          .attr("rx", 3)
          .attr("filter", "url(#blur)");

        // Start label
        pathGroup
          .append("text")
          .attr("x", startLabelX)
          .attr("y", yScale(startPoint.y))
          .attr("text-anchor", "middle")
          .attr("font-size", "22px")
          .attr("fill", traversalColor)
          .text("x")
          .append("tspan")
          .attr("dy", "0.3em")
          .attr("font-size", "12px")
          .text("i");

        // End label background
        pathGroup
          .append("rect")
          .attr("x", endLabelX - 15)
          .attr("y", yScale(endPoint.y) - 9)
          .attr("width", 30)
          .attr("height", 18)
          .attr("fill", "white")
          .attr("opacity", 0.7)
          .attr("rx", 3)
          .attr("filter", "url(#blur)");

        // End label
        pathGroup
          .append("text")
          .attr("x", endLabelX)
          .attr("y", yScale(endPoint.y))
          .attr("text-anchor", "middle")
          .attr("font-size", "18px")
          .attr("fill", traversalColor)
          .text("x")
          .append("tspan")
          .attr("dy", "0.3em")
          .attr("font-size", "12px")
          .text("j");

        // Now animate the traversal, drawing nodes as we go
        let currentIndex = 0;

        function animateStep() {
          if (currentIndex >= path.length) {
            // Animation complete
            setTimeout(() => {
              setTimeout(() => {
                // Clear the path and restart with new random points
                animatingTraversal = false;
                if (!animatingTraversal && active) {
                  svg.selectAll("g.traversal-path-group").remove();
                  const { startIdx, endIdx } = getRandomIndices(dataArr.length);
                  animateGraphTraversal(startIdx, endIdx);
                }
              }, 500); // Short pause after clearing
            }, pauseBetweenTraversals); // Configurable pause before clearing
            resolve();
            return;
          }

          // Draw the current node
          const vertex = path[currentIndex];
          pathGroup
            .append("circle")
            .attr("cx", xScale(dataArr[vertex].x))
            .attr("cy", yScale(dataArr[vertex].y))
            .attr("r", radius)
            .attr("fill", traversalColor)
            .attr("stroke", traversalColor)
            .attr("stroke-width", 2)
            .attr("opacity", traversalOpacity);

          // Draw the edge to the next node if not the last node
          if (currentIndex < path.length - 1) {
            const nextVertex = path[currentIndex + 1];
            const p1 = dataArr[vertex];
            const p2 = dataArr[nextVertex];

            pathGroup
              .append("line")
              .attr("x1", xScale(p1.x))
              .attr("y1", yScale(p1.y))
              .attr("x2", xScale(p2.x))
              .attr("y2", yScale(p2.y))
              .attr("stroke", traversalColor)
              .attr("stroke-width", 3)
              .attr("opacity", traversalOpacity)
              .style("pointer-events", "none");
          }

          currentIndex++;
          setTimeout(animateStep, animationSpeed);
        }

        animateStep();
      });
    }

    await animatePath();
  }

  $: if (dataset && svgEl && showScatterPlot) {
    const svg = d3.select(svgEl);
    plotScatter(svg, dataset, xScale, yScale, radius, []);
  }

  $: if (
    dataset &&
    svgEl &&
    animateTraversal &&
    active &&
    !animatingTraversal
  ) {
    // const svg = d3.select(svgEl);
    // plotKNNGraph(svg, dataset, k, xScale, yScale);
    // Start graph traversal animation after a delay
    if (!animatingTraversal && active) {
      const { startIdx, endIdx } = getRandomIndices(dataset.data.length);
      animateGraphTraversal(startIdx, endIdx);
    }
  }

  $: if (dataset && svgEl && showKNNGraph) {
    // Compute KNN graph and graph paths
    KNNAdjacencyMatrix = computeKNearestNeighborGraph(dataset.data, k);
    // Plot KNN graph
    const svg = d3.select(svgEl);
    plotKNNGraph(svg, dataset, k, xScale, yScale);
  }

  onMount(() => {
    // Generate sine wave dataset
    dataset = generateNoisySineWave(numPoints, noiseLevel, 0, 1, [0, 25], 0.5);

    // Compute scales
    const scales = computeScales(dataset);
    xScale = scales.xScale;
    yScale = scales.yScale;

    // Show scatter plot by default
    showScatterPlot = true;
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
  <p class="figure-caption">Figure 7: Shortest-path traversal on the KNN graph illustrates geodesic distance.</p>
</div>
