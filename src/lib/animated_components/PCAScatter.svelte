<script>
  import * as d3 from "d3";
  import * as math from "mathjs";
  import * as settings from "$lib/settings.js";
  import { generateNoiseFreeSpiralPoints } from "$lib/utils/data";
  import {
    computePCA,
    projectOntoFirstPrincipalComponent,
    convertObjectDataFormatToArray,
  } from "$lib/utils/math.js";

  import ActionLink from "$lib/components/ActionLink.svelte";
  import Katex from "$lib/components/Katex.svelte";

  export let dataset;
  export let width = 500;
  export let height = 500;
  export let radius = 5;
  export let margin = 40;
  export let active = false;
  export let pointOpacity = 0.8;
  export let colorScheme = d3.interpolateViridis;

//   export let showIntrinsicDimension = false;
  export let showPCAVectors = true;
  export let showPCAProjection = false;

  // Animation timing controls (in ms) as a single object
  export let pcaAnimation = {
    step1: 1000, // Hide PC vector
    step2: 1000, // Draw dotted axis
    step3: 1000, // Draw lines to axis
    step4: 1500, // Animate points to axis
    step5: 1000, // Rotate axis flat
  };

  let svgEl; // reference to the <svg> element

  // Plots the PCA scatter points without animation.
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
   * Plots the principal component vectors as arrows over the scatter plot.
   * @param {{data: Array<{x: number, y: number}>}} dataset - Dataset object.
   * @param {Array<Array<number>>} pcs - Principal component vectors (each is [x, y]).
   * @param {Object} [options] - Optional plot settings.
   */
  function plotPrincipalComponents(svg, dataset) {
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

  async function plotPCAProjection(svg, dataset) {
    // Remove previous layers
    svg.selectAll(".pca-projection-group").remove();
    svg.selectAll(".pc-arrows").remove();
    // Remove intrinsic dimension axis if any
    svg.selectAll("g.intrinsic-dimension-axis").remove();
    // Revert back to original scatter before animating
    plotScatter(svg, dataset);

    // Compute PCA
    const pcaResult = computePCA(dataset.data);
    const firstPrincipalComponent = pcaResult.components[0];
    const pc1Norm = math.divide(
      firstPrincipalComponent,
      math.norm(firstPrincipalComponent)
    );
    const pcaProjections = projectOntoFirstPrincipalComponent(dataset.data);

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

    const group = svg.append("g").attr("class", "pca-projection-group");
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

    axisLine.transition().duration(pcaAnimation.step2).style("opacity", 1);
    await new Promise((r) => setTimeout(r, pcaAnimation.step2));

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
      .duration(pcaAnimation.step3)
      .style("opacity", 1)
      .attr("x2", (d, i) => xScale(pcaProjections[i][0]))
      .attr("y2", (d, i) => yScale(pcaProjections[i][1]));

    await new Promise((r) => setTimeout(r, pcaAnimation.step3));

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
      .duration(pcaAnimation.step5)
      .attrTween("transform", function () {
        const cx = xScale(mean[0]);
        const cy = yScale(mean[1]);
        return (t) => `rotate(${((-angle * 180) / Math.PI) * t},${cx},${cy})`;
      });

    svg
      .selectAll("g.scatter-sub-container circle")
      .transition()
      .duration(pcaAnimation.step5)
      .attrTween("transform", function () {
        const cx = xScale(mean[0]);
        const cy = yScale(mean[1]);
        return (t) => `rotate(${((-angle * 180) / Math.PI) * t},${cx},${cy})`;
      });
  }

  // Optional: re-plot if dataset changes
  $: if (dataset && svgEl) {
    const svg = d3.select(svgEl);
    plotScatter(svg, dataset);
  }

//   $: if (active && svgEl && showIntrinsicDimension) {
//     const svg = d3.select(svgEl);
//     plotIntrinsicDimensionAxis(svg, dataset, 1200);
//   }

  $: if (active && svgEl && showPCAVectors) {
    const svg = d3.select(svgEl);
    plotPrincipalComponents(svg, dataset);
  }

  $: if (active && svgEl && showPCAProjection) {
    const svg = d3.select(svgEl);
    plotPCAProjection(svg, dataset);
  }
</script>

<div
  class="text-plot"
  on:mouseenter={() => (active = true)}
  on:mouseleave={() => (active = false)}
  role="region"
  aria-label="PCA visualization section"
>
  <div class="text-container">
    <h2>Background: PCA and its Limitations</h2>
    <p>
      On the right we have a classic spiral dataset, which is a one dimensional <em
        >manifold</em
      >
      embedded in a two dimensional space. The
      <span class="viridis-gradient-text">color of each point </span>
      represents its position along this
      <ActionLink
        action={() => {
          showIntrinsicDimension = !showIntrinsicDimension;
        }}>intrinsic dimension</ActionLink
      >.
      <em
        >How can we capture the intrinsic structure of our low dimensional data
        (1D) embedded in a higher dimensional (2D) space?</em
      >
    </p>

    <p>
      A natural starting point for studying dimensionality reduction is
      <a href="">principal components analysis (PCA)</a>, which leverages tools
      from linear algebra to find the axes in data along which the data has
      maximum variation. However, PCA has some key limitations that motivates
      the need for more advanced non-linear dimensionality techniques like
      Isomap, the focus of this blog.
    </p>

    <p>
      Given some data points <Katex
        math={"x_1, \\dots, x_n \\in \\mathbb{R}^d"}
      /> we can represent it as matrix
      <Katex
        math={"X = \\begin{bmatrix} x_1^T \\\\ \\vdots \\\\ x_n^T \\end{bmatrix}"}
        displayMode={true}
      />
      where each row is a data point. PCA works by performing the eigendecomposition
      of the covariance matrix of data. To compute the covariance matrix, we can
      first center the data by subtracting the mean
      <Katex math={"\\bar{x} = \\frac{1}{n} \\sum_{i=1}^n x_i"} /> to get <Katex
        math={"\\tilde{x}_i = x_i - \\bar{x}"}
      />. In matrix form we can express this as
      <Katex math={"\\tilde{X} = X - 1_n \\bar{x}^T"} displayMode={true} /> where
      <Katex math={"1_n"} /> is a column vector of ones of length <Katex
        math={"n"}
      />. We can then compute the covariance matrix of our centered data (at
      least something proportional to it) as
      <Katex math={"\\Sigma = \\tilde{X}^T\\tilde{X}."} displayMode={true} />
      We can then peform the eigendecomposition of the covariance matrix
      <Katex math={"\\Sigma = Q \\Lambda Q^T."} displayMode={true} />
      The vectors in <Katex math={"Q"} /> corresponding to the top <Katex
        math={"k"}
      /> eigenvalues in <Katex math={"\\Lambda"} />
      give us the directions of maximum variance in the data. We can see the principal
      component vectors <ActionLink
        action={() => {
          showPCAVectors = !showPCAVectors;
          showIntrinsicDimension = false;
        }}
      >
        overlayed on the data
      </ActionLink>. The longer vector represents the first principal component,
      indicating the direction of greatest variance, while the shorter vector
      represents the second principal component, orthogonal to the first.
    </p>
    <p>
      We can <ActionLink
        action={() => {
          showPCAProjection = true;
        }}
      >
        project the data onto the first principal component
      </ActionLink> to get a one-dimensional representation of our data. But we can
      see that, despite the fact that our spiral dataset has a single intrinsic dimension,
      PCA fails to capture this structure. This is because Euclidean distance is
      a poor (global) measure of similarity between the points in our dataset.
    </p>
  </div>
  <div class="plot">
    <svg
      bind:this={svgEl}
      {width}
      {height}
      style="opacity: {active ? 1 : settings.inactiveOpacity}"
    ></svg>
  </div>
</div>
