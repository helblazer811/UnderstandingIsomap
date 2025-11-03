<script>
  import * as d3 from "d3";
  import * as settings from "$lib/settings.js";
  import { onMount } from "svelte";
  import { generateNoisySineWave } from "$lib/utils/data.js";
  import { computeEpsilonNeighborhoodGraph } from "$lib/utils/math.js";
  import { computeDataScales } from "$lib/utils/data.js";

  export let epsilon = 1;
  export let width = 500;
  export let height = 600;
  export let margin = 40;
  export let radius = 6;
  export let active = true;
  export let colorScheme = d3.interpolateViridis;

  export let pointOpacity = 0.9;
  export let numPoints = 180;
  export let noiseLevel = 0.1;
  export let svgEl; // reference to the <svg> element

  let showSingleEpsilonBall = true;
  let showAllEpsilonBalls = false;
  let animatingAllBalls = false;
  let showEpsilonBallGraph = false;
  let dataset = null;
  let highlightedIdx = null;
  let tempHighlightedIdx = null;
  let xScale = null;
  let yScale = null;
  let animatedEpsilonRadius = 0;
  let currentOpacity = 1.0;

  // Draw scatter points with t-based Viridis color and click-to-highlight
  function plotScatter(
    svg,
    dataset,
    xScale,
    yScale,
    radius,
    colorScale,
    withinEpsilon
  ) {
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
      .attr("fill", (d, i) => colorScale(dataset.t[i]))
      .attr("opacity", (d, i) => (withinEpsilon[i] ? 0.8 : 0.35))
      .style("cursor", "pointer")
      .on("click", function (event, d) {
        console.log("Point clicked:", d);
        const idx = dataArr.indexOf(d);
        if (idx !== -1) {
          highlightedIdx = idx;
          tempHighlightedIdx = null; // Clear temporary highlight on click
          console.log("Clicked point index:", idx);
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
    const groupClass = opacity > 0.5 ? "temp-epsilon-ball-group" : "epsilon-ball-group";
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

  // Draw lines connecting all pairs of points within epsilon distance
  function plotEpsilonNeighborhoodGraph(svg, dataset, epsilon, xScale, yScale) {
    svg.selectAll("g.neighborhood-graph-group").remove();
    const dataArr = dataset.data;
    const group = svg.append("g").attr("class", "neighborhood-graph-group");

    // Compute the epsilon neighborhood graph using the math.js function
    const adjMatrix = computeEpsilonNeighborhoodGraph(dataArr, epsilon);

    // Draw lines between connected pairs (where adjMatrix[i][j] is not 0)
    for (let i = 0; i < dataArr.length; i++) {
      for (let j = i + 1; j < dataArr.length; j++) {
        if (adjMatrix[i][j] == 1) {
          const p1 = dataArr[i];
          const p2 = dataArr[j];

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

  // Draw epsilon balls around all points with a given radius
  function plotAllEpsilonBalls(
    svg,
    dataset,
    radius,
    xScale,
    yScale,
    opacity = 0.2
  ) {
    svg.selectAll("g.all-epsilon-balls-group").remove();
    const dataArr = dataset.data;
    const group = svg.append("g").attr("class", "all-epsilon-balls-group");

    // Draw epsilon balls around all points
    dataArr.forEach((d, i) => {
      const cx = xScale(d.x);
      const cy = yScale(d.y);
      const r = Math.abs(xScale(d.x + radius) - xScale(d.x));

      group
        .append("circle")
        .attr("class", "all-epsilon-ball")
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

  // Animate epsilon value back and forth for three seconds
  function animateEpsilon(duration = 3000, min = 0, max = 5) {
    const start = performance.now();
    function animate(now) {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      // Use a sine wave to go back and forth
      const phase = Math.sin(t * Math.PI);
      epsilon = min + (max - min) * phase;
      if (elapsed < duration) {
        requestAnimationFrame(animate);
      } else {
        epsilon = 1; // Reset to default after animation
      }
    }
    requestAnimationFrame(animate);
  }

  function animateAllEpsilonBalls(
    growDuration = 3000,
    holdDuration = 1000,
    targetEpsilon = 1.0,
    startEpsilon = 0,
    maxEpsilon = 1.5
  ) {
    return new Promise((resolve) => {
      console.log("Animating all epsilon balls");
      const start = performance.now();
      animatedEpsilonRadius = startEpsilon;
      currentOpacity = 1.0;

      function animate(now) {
        const elapsed = now - start;

        if (elapsed < growDuration) {
          // Growing phase: animate from start to max epsilon
          const t = elapsed / growDuration;
          animatedEpsilonRadius = startEpsilon + (maxEpsilon - startEpsilon) * t;
          currentOpacity = 1.0;
          requestAnimationFrame(animate);
        } else if (elapsed < growDuration + holdDuration) {
          // Holding phase: stay at max epsilon
          animatedEpsilonRadius = maxEpsilon;
          currentOpacity = 1.0;
          requestAnimationFrame(animate);
        } else {
          // Decreasing phase: animate from max back to target epsilon, then fade out
          const decreaseElapsed = elapsed - growDuration - holdDuration;
          const decreaseDuration = 1000; // 1 second to decrease back to target
          const fadeDuration = 500; // 0.5 seconds to fade out

          if (decreaseElapsed < decreaseDuration) {
            // Decrease radius back to target
            const t = decreaseElapsed / decreaseDuration;
            animatedEpsilonRadius = maxEpsilon - (maxEpsilon - targetEpsilon) * t;
            currentOpacity = 1.0;
            requestAnimationFrame(animate);
          } else if (decreaseElapsed < decreaseDuration + fadeDuration) {
            // Fade out opacity
            const fadeElapsed = decreaseElapsed - decreaseDuration;
            const t = fadeElapsed / fadeDuration;
            animatedEpsilonRadius = targetEpsilon;
            currentOpacity = 1.0 - t;
            requestAnimationFrame(animate);
          } else {
            // Animation complete
            animatingAllBalls = false;
            animatedEpsilonRadius = 0;
            currentOpacity = 0;
            resolve(); // Resolve the promise when animation completes
          }
        }
      }

      requestAnimationFrame(animate);
    });
  }

  // Show scatter points and epsilon balls when active
  $: if (active && dataset && svgEl) {
    const svg = d3.select(svgEl);
    // Compute scales and color
    const dataArr = dataset.data;
    const colorScale = d3.scaleSequential(colorScheme).domain([0, 1]);

    // Use highlightWithinEpsilonPoints for dot highlighting
    let withinEpsilon;
    if (showSingleEpsilonBall) {
      withinEpsilon = highlightWithinEpsilonPoints(
        dataset,
        highlightedIdx,
        epsilon,
        xScale,
        yScale
      );
    } else {
      withinEpsilon = new Array(dataArr.length).fill(false);
    }

    plotScatter(
      svg,
      dataset,
      xScale,
      yScale,
      radius,
      colorScale,
      withinEpsilon
    );
  }

  //   Plot all epsilon balls
  $: if (active && svgEl && showAllEpsilonBalls) {
    const svg = d3.select(svgEl);
    plotAllEpsilonBalls(
      svg,
      dataset,
      animatedEpsilonRadius,
      xScale,
      yScale,
      currentOpacity
    );
  }

  $: if (
    (active && svgEl && showSingleEpsilonBall) ||
    (active && svgEl && (highlightedIdx !== null || tempHighlightedIdx !== null) && showAllEpsilonBalls)
    && !showEpsilonBallGraph
  ) {
    const svg = d3.select(svgEl);
    // Always show the permanent highlight if it exists
    if (highlightedIdx !== null) {
      plotEpsilonBall(svg, dataset, epsilon, highlightedIdx, xScale, yScale, 0.4);
    }
    // Show temporary hover highlight with higher opacity
    if (tempHighlightedIdx !== null && tempHighlightedIdx !== highlightedIdx) {
      plotEpsilonBall(svg, dataset, epsilon, tempHighlightedIdx, xScale, yScale, 0.7);
    }
  }

  // Animate all epsilon balls when animatingAllBalls is true
  $: if (animatingAllBalls && active && dataset && svgEl) {
    const svg = d3.select(svgEl);
    svg.selectAll("g.epsilon-ball-group").remove();
    svg.selectAll("g.temp-epsilon-ball-group").remove();
    // Animate all epsilon balls
    animateAllEpsilonBalls(2000, 0).then(() => {
        showEpsilonBallGraph = true;
    });
    // plotAllEpsilonBalls(svg, dataset, animatedEpsilonRadius, xScale, yScale);
  }

  $ : if (active && svgEl && showEpsilonBallGraph) {
    const svg = d3.select(svgEl);
    plotEpsilonNeighborhoodGraph(
      svg,
      dataset,
      epsilon,
      xScale,
      yScale
    );
  }

  onMount(() => {
    // Sample sine wave dataset
    dataset = generateNoisySineWave(numPoints, 0.01, 110, 1.2, [0, 20]);
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
  });
</script>
