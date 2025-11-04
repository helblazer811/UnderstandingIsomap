<script>
  /* 
        Plot for multi-dimensional scaling (MDS)
        
        Show limitations of conventional MDS with a Euclidean metric. 

        Show projection to single dimension eigenvector of the centered pairwise distance matrix
        and show how this is not a good representation for our data. 
  */
  import * as d3 from "d3";
  import * as math from "mathjs";
  import * as settings from "$lib/settings.js";
  import {
    computePCA,
    projectOntoFirstPrincipalComponent,
    convertObjectDataFormatToArray,
  } from "$lib/utils/math.js";

  export let active = false;
  export let svgEl; // reference to the <svg> element
  export let dataset;
  export let width = 500;
  export let height = 500;
  export let radius = 5;
  export let margin = 40;
  export let pointOpacity = 0.8;
  export let colorScheme = d3.interpolateViridis;

  let pcaResult = null;
  let pcaProjections = null;
  let showEigenvectors = true;
  let animatingProjection = false;
  let remainingCircleRotations = null;

  // Animation timing controls (in ms) as a single object
  export let projectionAnimation = {
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

  /**
   * Plots the eigenvectors as arrows over the scatter plot.
   * @param {{data: Array<{x: number, y: number}>}} dataset - Dataset object.
   * @param {Array<Array<number>>} pcs - Principal component vectors (each is [x, y]).
   * @param {Object} [options] - Optional plot settings.
   */
  function plotEigenvectors(svg, dataset) {
    // Remove pc arrows if any
    svg.selectAll("g.pc-arrows").remove();

    // Compute the pca components given the dataset
    const pcaResult = computePCA(dataset.data);
    const pcs = pcaResult.components;

    const data = dataset.data;
    const xs = data.map((p) => p.x);
    const ys = data.map((p) => p.y);
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

    // Remove previous PC arrows if any
    svg.selectAll("g.pc-arrows").remove();
    const pcGroup = svg.append("g").attr("class", "pc-arrows");

    // Compute mean of data for origin
    const meanX = d3.mean(xs);
    const meanY = d3.mean(ys);
    const origin = [xScale(meanX), yScale(meanY)];

    // Arrow length scaling (adjust as needed)
    const arrowScale = 0.4 * Math.min(width, height);

    pcs.forEach((vec, i) => {
      const [vx, vy] = vec;
      pcGroup
        .append("line")
        .attr("x1", origin[0])
        .attr("y1", origin[1])
        .attr("x2", origin[0] + vx * arrowScale)
        .attr("y2", origin[1] - vy * arrowScale)
        .attr("stroke", "#333")
        .attr("stroke-width", 3)
        .attr("marker-end", "url(#arrowhead)");
    });

    // Add arrowhead marker if not present
    if (svg.select("defs").empty()) {
      const defs = svg.append("defs");
      defs
        .append("marker")
        .attr("id", "arrowhead")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 10)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "#333");
    }
  }

  async function animateProjection(svg, dataset) {
    if (!animatingProjection) {
      animatingProjection = true;
    } else {
      return; // Prevent overlapping animations
    }
    console.log("Starting projection animation");
    // Remove previous layers
    svg.selectAll(".eigenvector-projection-group").remove();
    svg.selectAll(".pc-arrows").remove();
    // Remove intrinsic dimension axis if any
    svg.selectAll("g.intrinsic-dimension-axis").remove();
    // Revert back to original scatter before animating
    plotScatter(svg, dataset);
    // Find the first principal component
    const firstPrincipalComponent = pcaResult.components[0];
    const pc1Norm = math.divide(
      firstPrincipalComponent,
      math.norm(firstPrincipalComponent)
    );
    // Scales
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

    // Draw PCA axis (dashed)
    const mean = math.mean(convertObjectDataFormatToArray(dataset.data), 0);
    const axisLen = Math.max(width, height) * 0.8;
    const axisStart = [
      mean[0] - (pc1Norm[0] * axisLen) / 2,
      mean[1] - (-pc1Norm[1] * axisLen) / 2,
    ];
    const axisEnd = [
      mean[0] + (pc1Norm[0] * axisLen) / 2,
      mean[1] + (-pc1Norm[1] * axisLen) / 2,
    ];

    const group = svg.append("g").attr("class", "eigenvector-projection-group");
    const axisLine = group
      .append("line")
      .attr("x1", xScale(axisStart[0]))
      .attr("y1", yScale(axisStart[1]))
      .attr("x2", xScale(axisEnd[0]))
      .attr("y2", yScale(axisEnd[1]))
      .attr("stroke", "#333")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "6 6")
      .style("opacity", 0);

    axisLine
      .transition()
      .duration(projectionAnimation.step2)
      .style("opacity", 1);
    await new Promise((r) => setTimeout(r, projectionAnimation.step2));

    // Draw projection lines
    const lines = group
      .selectAll("line.pca-proj-line")
      .data(dataset.data)
      .enter()
      .append("line")
      .attr("class", "pca-proj-line")
      .attr("x1", (d) => xScale(d.x))
      .attr("y1", (d) => yScale(d.y))
      .attr("x2", (d) => xScale(d.x))
      .attr("y2", (d) => yScale(d.y))
      .attr("stroke", "#888")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "2 2")
      .style("opacity", 0);

    lines
      .transition()
      .duration(projectionAnimation.step3)
      .style("opacity", 1)
      .attr("x2", (d, i) => xScale(pcaProjections[i][0]))
      .attr("y2", (d, i) => yScale(pcaProjections[i][1]));

    await new Promise((r) => setTimeout(r, projectionAnimation.step3));

    // Prepare nodes for beeswarm: start at current positions
    const nodes = dataset.data.map((d, i) => ({
      x: xScale(d.x),
      y: yScale(d.y),
      r: 4,
      target: pcaProjections[i],
    }));

    // 1. Run a quick force simulation to compute final non-overlapping positions
    const forceSim = d3
      .forceSimulation(nodes)
      .force("attractX", d3.forceX((d) => xScale(d.target[0])).strength(0.3))
      .force("attractY", d3.forceY((d) => yScale(d.target[1])).strength(0.05))
      .force("collide", d3.forceCollide((d) => d.r + 1).iterations(2))
      .stop();

    // Tick manually a few times to compute final positions
    const numForceTicks = 50;
    for (let i = 0; i < numForceTicks; i++) forceSim.tick();

    // Clamp to "ground" so points don't go past axis on one side
    const axisY = yScale(mean[1]);
    // 2. Animate points linearly from original positions to final positions
    svg
      .selectAll("g.scatter-sub-container circle")
      .data(nodes)
      .transition()
      .duration(1500)
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .ease(d3.easeLinear);

    // Remove projection lines after animation
    lines.transition().duration(500).style("opacity", 0).remove();
    await new Promise((r) => setTimeout(r, 1500 + 500));

    // 3. Rotate group and points to horizontal
    const axisDx = xScale(axisEnd[0]) - xScale(axisStart[0]);
    const axisDy = yScale(axisEnd[1]) - yScale(axisStart[1]);
    const angle = Math.atan2(axisDy, axisDx);

    group
      .transition()
      .duration(projectionAnimation.step5)
      .attrTween("transform", function () {
        const cx = xScale(mean[0]);
        const cy = yScale(mean[1]);
        return (t) => `rotate(${((-angle * 180) / Math.PI) * t},${cx},${cy})`;
      })

    // Set the remaining circle rotations to the number of circles
    remainingCircleRotations = dataset.data.length;

    svg
      .selectAll("g.scatter-sub-container circle")
      .transition()
      .duration(projectionAnimation.step5)
      .attrTween("transform", function () {
        const cx = xScale(mean[0]);
        const cy = yScale(mean[1]);
        return (t) => `rotate(${((-angle * 180) / Math.PI) * t},${cx},${cy})`;
      })
      .on("end", function() {
        // Allow animation again after a delay
        if (remainingCircleRotations == 1) {
            animatingProjection = false;
        } else {
            remainingCircleRotations -= 1;
        }
      });
  }

  //   $: if (active && svgEl && showIntrinsicDimension) {
  //     const svg = d3.select(svgEl);
  //     plotIntrinsicDimensionAxis(svg, dataset, 1200);
  //   }

//   $: if (active && svgEl && showEigenvectors) {
//     const svg = d3.select(svgEl);
//     plotEigenvectors(svg, dataset);
//   }

//   $: if (active && svgEl && playAnimation && !animatingProjection && pcaResult != null && pcaProjections != null) {
//     console.log("Starting projection animation");
//   }

  $: if (dataset) {
    console.log("Dataset changed, computing PCA");
    pcaResult = computePCA(dataset.data);
    pcaProjections = projectOntoFirstPrincipalComponent(dataset.data);
  }

  $: if(active) {
    console.log("Active state changed");
  }

  $: if (svgEl) {
    console.log("SVG element is set");
  }

  // Optional: re-plot if dataset changes
  $: if (dataset && svgEl && active) {
    const svg = d3.select(svgEl);
    plotScatter(svg, dataset);
    animateProjection(svg, dataset);
  }

</script>