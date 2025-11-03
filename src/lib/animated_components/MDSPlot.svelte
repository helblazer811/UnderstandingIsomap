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

  import Katex from "$lib/components/Katex.svelte";
  import { onMount } from "svelte";
  import { data } from "$lib/stores/state";

  export let dataset;
  export let width = 500;
  export let height = 500;
  export let radius = 5;
  export let margin = 40;
  export let active = false;
  export let pointOpacity = 0.8;
  export let colorScheme = d3.interpolateViridis;

  let pcaResult = null;
  let pcaProjections = null;
  let showEigenvectors = true;
  let playAnimation = true;
  let animatingProjection = false;

  // Animation timing controls (in ms) as a single object
  export let projectionAnimation = {
    step1: 1000, // Hide PC vector
    step2: 1000, // Draw dotted axis
    step3: 1000, // Draw lines to axis
    step4: 1500, // Animate points to axis
    step5: 1000, // Rotate axis flat
  };

  let svgEl; // reference to the <svg> element

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
    // Remove previous layers
    svg.selectAll(".eigenvector-projection-group").remove();
    svg.selectAll(".pc-arrows").remove();
    // Remove intrinsic dimension axis if any
    svg.selectAll("g.intrinsic-dimension-axis").remove();
    // Revert back to original scatter before animating
    plotScatter(svg, dataset);
    // Compute PCA
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
        console.log("Circle rotation animation completed!");
        // Allow animation again after a delay
        setTimeout(() => {
          animatingProjection = false;
        }, 1500);
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

//   $: if (active && svgEl && showEigenvectors) {
//     const svg = d3.select(svgEl);
//     plotEigenvectors(svg, dataset);
//   }

  $: if (active && svgEl && playAnimation && !animatingProjection && pcaResult != null && pcaProjections != null) {
    animatingProjection = true;
    const svg = d3.select(svgEl);
    animateProjection(svg, dataset);
  }

  $: if (dataset) {
    // Compute PCA and projection up front once dataset is available
    pcaResult = computePCA(dataset.data);
    pcaProjections = projectOntoFirstPrincipalComponent(dataset.data);
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
    <h2>Multidimensional Scaling</h2>
    <p>
        <a href="">Multidimensional Scaling (MDS)</a> is a classical dimensionality reduction technique that aims to 
        take some high-dimensional data  <Katex math={"x_1, \\dots, x_n \\in \\mathbb{R}^{d}"}/> and 
        produce a lower-dimensional representation <Katex math={"y_1, \\dots, y_n \\in \\mathbb{R}^{p}"}/> where the pairwise distances between points are preserved as well as possible.
    </p>
    <p>
        Multi-dimensional scaling assumes that we only have access to pairwise distances between points 
        <Katex math={"d_{ij}"} /> rather than the original coordinates of the points themselves. 
        In it's simplest form, called classical MDS, we use the Euclidean distance metric <Katex math={"d_{ij} = ||x_i - x_j||_2"}/>. 
        MDS then seeks to find points <Katex math={"y_1, \\dots, y_n \\in \\mathbb{R}^{p}"} /> such that the
        distances between these new points approximate the original distances
        <Katex math={"||y_i - y_j||_2 \\approx d_{ij}"} />. In particular, MDS tries to minimize the stress function
        <Katex math={"\n  \\text{Stress} = \\sum_{i<j} (||y_i - y_j||_2 - d_{ij})^2. "} displayMode={true}/>
    </p>
    <p>
        Instead of directly operating on our pairwise distances, represented by the distance matrix <Katex math={"D \\in \\mathbb{R}^{n \\times n}"} />,
        classical MDS converts these distances into a set of similarity scores between points. 
        This is done by double centering the squared distance matrix to produce a Gram matrix <Katex math={"B = -\\frac{1}{2} H D^2 H,"} displayMode={true}/> where <Katex math={"H = I - \\frac{1}{n} 11^T"} /> is the centering matrix.
        The centering matrix <Katex math={"H"} /> centers the data by subtracting the mean from each point. 

    </p>
    <p>
        Given this Gram matrix we can then perform an eigen decomposition 
        <Katex math={"B = V \\Lambda V^T"} displayMode={true} />
        to find the top <Katex math={"p"} /> eigenvectors corresponding to the largest eigenvalues. 
        The low-dimensional coordinates <Katex math={"Y \\in \\mathbb{R}^{n \\times p}"} /> of our points are exactly given by these 
        eigenvectors scaled by the square root of their corresponding eigenvalues:
        <Katex math={"\n  Y = V_p \\Lambda_p^{1/2} "} displayMode={true}/> where <Katex math={"V_p"} /> contains the top <Katex math={"p"} /> eigenvectors and <Katex math={"\\Lambda_p"} /> contains the top <Katex math={"p"} /> eigenvalues.
    </p>
    <h2> Connection to PCA</h2>
    <p>
        Interestingly, classical MDS with the Euclidean distance metric is equivalent to
        <a href="">Principal Components Analysis (PCA)</a>. 
        PCA seeks to find a low-dimensional representation of data that maximizes the variance along each dimension.
        This is done by computing the covariance matrix 
        <Katex math={"C = \\frac{1}{n} X^T X"}/> 
        of the centered data <Katex math={"X \\in \\mathbb{R}^{n \\times d}"} />
        and performing an eigen decomposition 
        <Katex math="C = V \Lambda V^T"/>. The top <Katex math={"p"} /> eigenvectors corresponding to the largest eigenvalues
        form the principal components of the data. The low-dimensional coordinates <Katex math={"Y \\in \\mathbb{R}^{n \\times p}"} /> are given by projecting the data onto these principal components:
        <Katex math={"\n  Y = X V_p "} displayMode={true}/> where <Katex math={"V_p"} /> contains the top <Katex math={"p"} /> eigenvectors.
    </p>
    <p>
        The equivalence between these two formulations can be seen using the SVD of <Katex math={"X"} /> 
        <Katex math={"X = U \\Sigma V^T."} displayMode={true}/> 
        The covariance matrix <Katex math={"X^T X"} /> of centered data <Katex math={"X"} /> can be written as
        <Katex math={"X^T X = (U \\Sigma V^T)^T(U \\Sigma V^T) = (V \\Sigma U^T) (U \\Sigma V^T) = V \\Sigma^2 V^T."} displayMode={true}/>
        The data can be projected onto the principal components leading to <Katex math={"Y = X V_p = U \\Sigma V^T V_p = U_p \\Sigma_p"} displayMode={true}/> where <Katex math={"\\Sigma_p"} /> contains the top <Katex math={"p"} /> singular values.
    </p>
    <p>
        On the other hand, the double centered Gram matrix used in MDS can be written as
        <Katex math={"B = -\\frac{1}{2} H D^2 H = -\\frac{1}{2} H (X X^T) H."} displayMode={true}/> 
        If we assume that our data is already centered (i.e. <Katex math={"HX = X"} />),
        then we have that <Katex math={"B = -\\frac{1}{2} H D^2 H = -\\frac{1}{2} H (X X^T) H \\propto X X^T."} displayMode={true}/>
        Using the SVD of <Katex math={"X"} />, we can write the Gram matrix as
        <Katex math={"X X^T = (U \\Sigma V^T)(U \\Sigma V^T)^T = U \\Sigma^2 U^T."} displayMode={true}/> 
        The low-dimensional coordinates obtained from MDS are given by <Katex math={"Y = U_p \\Lambda_p^{1/2} = U_p \\Sigma_p"} displayMode={true}/> where <Katex math={"\\Sigma_p"} /> contains the top <Katex math={"p"} /> singular values, using the fact that the singular values are the square roots of the eigenvalues.
    </p>
    <p>
        Thus we see that both PCA coordinates and MDS coordinates are identical when using the Euclidean distance metric (up to scaling and rotation). 
        <!-- It is in fact the case that the projections obtained from PCA are the same (up to scaling and rotation) as those obtained from classical MDS with the Euclidean distance metric. -->
    </p>
    <h2>Limitations of MDS with Euclidean Distance</h2>
    <p>
      We can project the data onto the first principal component to get a one-dimensional representation of our data. But we can
      see that, despite the fact that our spiral dataset has a single intrinsic dimension,
      PCA fails to capture this structure. This is because Euclidean distance is
      a poor (global) measure of similarity between the points in our dataset.
    </p>
    <!-- <p>
        We can see this equivalence by noting that for centered data <Katex math={"X"} />,
        the squared pairwise distances 
        <Katex math={"D_{ij}^2 = ||x_i - x_j||_2^2 = x_i^T x_i - 2 x_i^T x_j + x_j^T x_j."} />
        Recall that the double centered Gram matrix <Katex math={"B"} /> is 
        <Katex math={"B = -\\frac{1}{2} H D^2 H."} displayMode={true}/>. If our data is already centered (i.e. <Katex math={"HX = X"} />),
        then we have that <Katex math={"B = -\\frac{1}{2} H D^2 H = H (X^T X) H."} displayMode={true}/>.
    </p> -->

    <!-- <p>
        

        This is done 


        Classical MDS does not directly operate on these pairwise distances, but rather converts them 
        
        converts our pairwise distance matrix <Katex math={"D \\in \\mathbb{R}^{n \\times n}"} />
        into a 
        In the simplest form of MDS, called classical MDS, we use the standard Euclidean distance
         to represent the distances between points, forming a distance matrix <Katex math={"D \\in \\mathbb{R}^{n \\times n}"} />. 
        
        
        MDS converts these distances <Katex math={"d_{ij}"} />, which are a measure of dissimilarity,
        into a set of similarity scores between points. This comes in the form of a double centered Gram matrix
        <Katex math={"B = -\\frac{1}{2} H D^2 H,"} displayMode={true}/> where <Katex math={"H = I - \\frac{1}{n} 11^T"} /> is the centering matrix. 
        This matrix <Katex math={"H"} /> centers the data by subtracting the mean from each point. The gram matrix <Katex math={"B \\in \\mathbb{R}^{n \\times n}"} /> 
        contains the pairwise inner products between these centered points.
        <Katex math={"B \\in \\mathbb{R}^{n \\times n}"} />,
        where <Katex math={"B_{ij}"} /> represents the inner product between points <Katex math={"y_i"} /> and <Katex math={"y_j"} /> in the lower-dimensional space.



        In particular, suppose we have a set of high-dimensional data points 
        which we can represent as a matrix
        <Katex math={"X \\in \\mathbb{R}^{n \\times d}"}/>. We want to find
        some lower-dimensional representation <Katex math={"y_1, \\dots, y_n \\in \\mathbb{R}^{p}"} /> 
        where <Katex math={"p << d"}/> that preserves the pairwise distances between points.
    </p>
    <p>
        The simplest approach is to use the Euclidean distance between points
        <Katex math={"d_{ij} = ||x_i - x_j||_2"} />. Given these pairwise distances
        we can construct a distance matrix <Katex math={"D \\in \\mathbb{R}^{n \\times n}"} />
        where <Katex math={"D_{ij} = d_{ij}"} />. MDS then seeks to find points
        <Katex math={"y_1, \\dots, y_n \\in \\mathbb{R}^{p}"} /> such that the
        distances between these new points approximate the original distances:
        <Katex math={"||y_i - y_j||_2 \\approx d_{ij}"} />.
    </p>
    <p>
      Given our geodisic distance matrix <Katex math={"D"} />, we can use
      <a> multi-dimensional scaling (MDS)</a>
      to infer low rank embeddings that preserve the similarity of our original points.
      That is we want to find coordinates
      <Katex math={"y_1, \\dots, y_n \\in \\mathbb{R}^p"} /> such that
      <Katex math={"||y_i - y_j||^2 \\approx d_{ij}^2"} />

      Let <Katex math={"D"} /> be such that <Katex math={"D_{ij}"} /> is the geodesic
      distance beween data points
      <Katex math={"x_i"} /> and <Katex math={"x_j"} />. We want to compute a
      gram matrix (a matrix of inner products between our points). Normally if
      we wanted to use the Euclidean metric we could compute the Gram matrix as <Katex
        math={"XX^T"}
      />. However, we only have access to distances between points. However, we
      can recover the Gram matrix from our squared distance matrix <Katex
        math={"D^2"}
      />. The inner product between points <Katex math={"y_i"} /> and <Katex
        math={"y_j"}
      /> can be expressed in terms of distances as
      <a href="">Dimensionality reduction</a> aims to express high-dimensional
      information in a low dimensional form in a way that preserves the essence
      of the data. Perhaps the simplest approach to dimensionality reduction is
      <a href="">principal components analysis (PCA)</a>, which leverages tools
      from linear algebra to find the axes in data along which the data has
      maximum variation. If we center data by subtracting the mean <Katex
        math={"\\bar{y} = \\frac{1}{n} \\sum_{i=1}^n y_i"}
      />, we have that However, we can use the identity that the Gram matrix <Katex
        math={"B"}
      /> can be computed by double centering the squared distance matrix.

      <Katex math={"B = -\\frac{1}{2} H D^2 H"} />
    </p> -->
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
