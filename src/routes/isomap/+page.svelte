<script>
  import "$lib/styles/styles.css";
  import { onMount } from "svelte";

  import * as settings from "$lib/settings";
  //   import * as state from "$lib/stores/state.js";

  import ActionLink from "$lib/components/ActionLink.svelte";
  import Katex from "$lib/components/Katex.svelte";
  import IntroScatter from "$lib/animated_components/IntroScatter.svelte";
  import PCAScatter from "$lib/animated_components/PCAScatter.svelte";
  import EpsilonGraph from "$lib/animated_components/EpsilonGraph.svelte";
  import EpsilonBall from "$lib/animated_components/EpsilonGraph.svelte";

  import { generateNoisySpiral } from "$lib/utils/data.js";
  import GraphDistance from "$lib/animated_components/GraphDistance.svelte";
  //   import { ScatterPlot } from "$lib/components/ScatterPlot.js";
  //   import { animateScatterToSpiral } from "$lib/animated_components/createScatter.jscatter.js";
  //   import { plotIntrinsicDimensionAxis } from "$lib/animated_components/intrinsicDimensionAxis.jsonAxis.js";

  //   let svg;
  //   let pointSelection;

  let dataset = null;

  onMount(() => {
    // Generate spiral dataset
    dataset = generateNoisySpiral(
      settings.numPoints,
      settings.noiseStd,
      settings.numTurns,
      settings.squashFactor
    );
  });
</script>

<!-- Left column: text -->
<div class="text-column">
  <!-- All your headings, paragraphs, ActionLinks, etc. go here -->
   <IntroScatter {dataset}/>
   <PCAScatter {dataset} />
   <EpsilonGraph />
   <GraphDistance />


  <h2>Multidimensional Scaling</h2>
  <p>
    Given our geodisic distance matrix <Katex math={"D"} />, we can use
    <a> multi-dimensional scaling </a>
    to infer low rank embeddings that preserve the similarity of our original points.
    That is we want to find coordinates
    <Katex math={"y_1, \\dots, y_n \\in \\mathbb{R}^p"} /> such that
    <Katex math={"||y_i - y_j||^2 \\approx d_{ij}^2"} />

    Let <Katex math={"D"} /> be such that <Katex math={"D_{ij}"} /> is the geodesic
    distance beween data points
    <Katex math={"x_i"} /> and <Katex math={"x_j"} />. We want to compute a gram
    matrix (a matrix of inner products between our points). Normally if we
    wanted to use the Euclidean metric we could compute the Gram matrix as <Katex
      math={"XX^T"}
    />. However, we only have access to distances between points. However, we
    can recover the Gram matrix from our squared distance matrix <Katex
      math={"D^2"}
    />. The inner product between points <Katex math={"y_i"} /> and <Katex
      math={"y_j"}
    /> can be expressed in terms of distances as
    <a href="">Dimensionality reduction</a> aims to express high-dimensional
    information in a low dimensional form in a way that preserves the essence of
    the data. Perhaps the simplest approach to dimensionality reduction is
    <a href="">principal components analysis (PCA)</a>, which leverages tools
    from linear algebra to find the axes in data along which the data has
    maximum variation. If we center data by subtracting the mean <Katex
      math={"\\bar{y} = \\frac{1}{n} \\sum_{i=1}^n y_i"}
    />, we have that However, we can use the identity that the Gram matrix <Katex
      math={"B"}
    /> can be computed by double centering the squared distance matrix.

    <Katex math={"B = -\\frac{1}{2} H D^2 H"} />
  </p>
</div>
