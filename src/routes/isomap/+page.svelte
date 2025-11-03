<script>
  import "$lib/styles/styles.css";
  import { onMount } from "svelte";

  import * as settings from "$lib/settings";
  //   import * as state from "$lib/stores/state.js";

  import ActionLink from "$lib/components/ActionLink.svelte";
  import Quote from "$lib/components/Quote.svelte";
  import Katex from "$lib/components/Katex.svelte";
  import IntroScatter from "$lib/animated_components/IntroScatter.svelte";
  import IntroScatterSlotted from "$lib/animated_components/IntroScatterSlotted.svelte";
  import PCAScatter from "$lib/animated_components/PCAScatter.svelte";
  import EpsilonGraph from "$lib/animated_components/EpsilonGraph.svelte";
  import GraphDistance from "$lib/animated_components/GraphDistance.svelte";
  import KNNGraph from "$lib/animated_components/KNNGraph.svelte";
  import MDSPlot from "$lib/animated_components/MDSPlot.svelte";
  import EuclideanPairwiseDistances from "$lib/animated_components/EuclideanPairwiseDistances.svelte";

  import { generateNoisySpiral } from "$lib/utils/data.js";
  import Section from "$lib/components/Section.svelte";
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
  <Section height={500} width={500}>
    <div slot="text">
      <div class="article-header">
        <h1 class="hed">Dimensionality Reduction with Isomap</h1>
        <!-- <h2 class="dek">Nonlinear Dimensionality Reduction</h2> -->
        <div class="byline">
          By: <a href="https://alechelbling.com">Alec Helbling</a>
        </div>
      </div>
      <Quote>
        "To deal with hyper-planes in a 14-dimensional space, visualize a 3D
        space and say 'fourteen' to yourself very loudly. Everyone does it." -
        Geoffrey Hinton
      </Quote>
      <p>
        In many domains, like computational imaging or genomics, data comes in
        the form of high-dimensional signals that are challenging for humans to
        directly reason about, as our intuition is generally confined to two or
        three dimensions. The field of <a href="">dimensionality reduction</a> aims
        to compress high-dimensional data into lower-dimensional representations
        that preserve their relevant structure while being much easier for people
        to interpret.
      </p>
      <p>
        On the right we have a classic spiral dataset, which is a one
        dimensional <em>manifold</em>
        embedded in a two dimensional space. The
        <span class="viridis-gradient-text">color of each point </span>
        represents its position along this intrinsic dimension.
        <em
          >How can we capture the intrinsic structure of our low dimensional
          data (1D) embedded in a higher dimensional (2D) space?</em
        >
      </p>
      <p>
        In this article, I'll be exploring <a href="">Isomap</a>, a classic
        non-linear dimensionality reduction technique that seeks to create a low
        dimensional embedding of data that preserves its local similarity
        structure. Isomap builds upon the manifold hypothesis, which posits that
        data often lies on a low-dimensional manifold, despite existing in a
        higher dimensional space. This is a classic assumption that is central
        to many modern dimensionality reduction techniques like
        <a href="">t-SNE</a>
        and <a href="">UMAP</a>.
      </p>
    </div>
    <IntroScatterSlotted {dataset} let:svgEl svgEl={svgEl} slot="visualization"/>
  </Section>
  <IntroScatter {dataset} />
  <MDSPlot {dataset} />
  <EuclideanPairwiseDistances />
  <!-- <PCAScatter {dataset} /> -->
  <EpsilonGraph />
  <KNNGraph />
  <GraphDistance />
</div>
