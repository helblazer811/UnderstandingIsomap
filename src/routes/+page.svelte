<script>
  //@ts-nocheck
  import "$lib/styles/styles.css";
  import { onMount } from "svelte";

  import * as settings from "$lib/settings";
  //   import * as state from "$lib/stores/state.js";
  import { generateNoisySpiral } from "$lib/utils/data.js";

  import ActionLink from "$lib/components/ActionLink.svelte";
  import Quote from "$lib/components/Quote.svelte";
  import Katex from "$lib/components/Katex.svelte";
  import IntroScatter from "$lib/animated_components/IntroScatter.svelte";
  import PCAScatter from "$lib/animated_components/PCAScatter.svelte";
  import EpsilonGraph from "$lib/animated_components/EpsilonGraph.svelte";
  import GraphDistance from "$lib/animated_components/GraphDistance.svelte";
  import KNNGraph from "$lib/animated_components/KNNGraph.svelte";
  import MDSPlot from "$lib/animated_components/MDSEuclideanProjection.svelte";
  import EuclideanPairwiseDistances from "$lib/animated_components/EuclideanPairwiseDistances.svelte";
  import Section from "$lib/components/Section.svelte";
  import Minimizable from "$lib/components/Minimizable.svelte";
  import EpsilonBall from "$lib/animated_components/EpsilonBall.svelte";
  import IsomapProjection from "$lib/animated_components/IsomapProjection.svelte";
  //   import { ScatterPlot } from "$lib/components/ScatterPlot.js";
  //   import { animateScatterToSpiral } from "$lib/animated_components/createScatter.jscatter.js";
  //   import { plotIntrinsicDimensionAxis } from "$lib/animated_components/intrinsicDimensionAxis.jsonAxis.js";

  //   let svg;
  //   let pointSelection;

  let dataset = null;

  // EpsilonGraph variables
  let k = 5;
  let epsilon = 1;
  let showSingleEpsilonBall = true;
  let showAllEpsilonBalls = false;
  let showEpsilonBallGraph = false;
  let animatingAllBalls = false;

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

<div class="container">
  <!-- All your headings, paragraphs, ActionLinks, etc. go here -->
  <Section>
    <div slot="text">
      <div class="article-header">
        <h1 class="hed">
          A Visual Introduction to Dimensionality Reduction with Isomap
        </h1>
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
        In many domains, ranging from computational imaging to finance, data
        comes in the form of high-dimensional signals that are challenging for
        humans to directly reason about, as our intuition is generally confined
        to two or three dimensions. Thankfully, while data may often lay in very
        high-dimensional spaces, it is often the case that the intrinsic
        dimensionality of the data is much lower. This is a concept known as the
        manifold hypothesis, and is a core assumption for many machine learning
        techniques. The goal of dimensionality reduction is to compress
        high-dimensional data into lower-dimensional forms that preserve their
        relevant structure while being much easier for people to interpret.
      </p>
      <p>
        A simple dataset to start our investigation of dimensionality reduction
        is a one dimensional spiral embedded in a two dimensional space (see
        Figure 1).
        <em
          >How can we capture the intrinsic structure of our low dimensional
          data (1D) embedded in a higher dimensional (2D) space?</em
        > While simple, by studying this setting, we can gain an intuition for how
        dimensionality reduction works in much higher dimensional settings.
      </p>
    </div>
    <IntroScatter
      {dataset}
      let:active
      {active}
      width={500}
      height={500}
      slot="visualization"
    />
  </Section>
  <Section>
    <div slot="text">
      <p>
        In this article, I'll be exploring
        <!-- svelte-ignore a11y-invalid-attribute -->
        <a href="https://en.wikipedia.org/wiki/Isomap">Isomap</a>, a classic
        non-linear dimensionality reduction technique that seeks to create a low
        dimensional embedding of data that preserves its local similarity
        structure. Isomap builds upon the manifold hypothesis, forming a graph
        that captures the local structure of data,and projecting points in a way
        that preserves this structure. This is a pattern that is central to many
        modern dimensionality reduction techniques like
        <!-- svelte-ignore a11y-invalid-attribute -->
        <a
          href="https://en.wikipedia.org/wiki/T-distributed_stochastic_neighbor_embedding"
          >t-SNE</a
        >
        and <!-- svelte-ignore a11y-invalid-attribute -->
        <a href="https://pair-code.github.io/understanding-umap/">UMAP</a>.
      </p>
    </div>
  </Section>
  <Section>
    <div slot="text">
      <h2>Multidimensional Scaling</h2>
      <p>
        One of the steps in Isomap is to perform <a
          href="https://en.wikipedia.org/wiki/Multidimensional_scaling"
          >Multidimensional Scaling (MDS)</a
        >
        on a matrix of pairwise graph distances between points. MDS is a classical
        dimensionality reduction technique that aims to take some high-dimensional
        data <Katex math={"x_1, \\dots, x_n \\in \\mathbb{R}^{d}"} /> and produce
        a lower-dimensional representation <Katex
          math={"y_1, \\dots, y_n \\in \\mathbb{R}^{p}"}
        /> where the pairwise distances between points are preserved as well as possible.
      </p>
      <p>
        MDS assumes that we only have access to pairwise distances between
        points
        <Katex math={"d_{ij}"} /> rather than the original coordinates of the points
        themselves. In it's simplest form, called classical MDS, we use the Euclidean
        distance metric <Katex math={"d_{ij} = ||x_i - x_j||_2"} />. MDS then
        seeks to find points <Katex
          math={"y_1, \\dots, y_n \\in \\mathbb{R}^{p}"}
        /> such that the distances between these new points approximate the original
        distances
        <Katex math={"||y_i - y_j||_2 \\approx d_{ij}"} />.
      </p>
      <p>
        Instead of directly operating on our pairwise distances, represented by
        the distance matrix <Katex math={"D \\in \\mathbb{R}^{n \\times n}"} />,
        classical MDS converts these distances into a set of similarity scores
        between points. This is done by double centering the squared distance
        matrix to produce a Gram matrix <Katex
          math={"B = -\\frac{1}{2} H D^2 H,"}
          displayMode={true}
        /> where <Katex
          math={"H = I - \\frac{1}{n} \\mathbf{1}\\mathbf{1}^T"}
        /> is the centering matrix. Here <Katex math={"\\mathbf{1}"} /> is a vector
        of all ones of length <Katex math={"n"} />. The centering matrix <Katex
          math={"H"}
        /> centers the data by subtracting the mean from each point.
      </p>
      <p>
        Given this Gram matrix we can then perform an eigen decomposition
        <Katex math={"B = V \\Lambda V^T"} displayMode={true} />
        to find the top <Katex math={"p"} /> eigenvectors corresponding to the largest
        eigenvalues. Here <Katex math="V" /> is the matrix of all eigenvectors and
        <Katex math={"\\Lambda"} /> is the diagonal matrix of all eigenvalues. The
        low-dimensional coordinates <Katex
          math={"Y \\in \\mathbb{R}^{n \\times p}"}
        /> of our points are exactly given by these eigenvectors scaled by the square
        root of their corresponding eigenvalues:
        <Katex math={"\n  Y = V_p \\Lambda_p^{1/2} "} displayMode={true} /> where
        <Katex math={"V_p"} /> contains the top <Katex math={"p"} /> eigenvectors
        and <Katex math={"\\Lambda_p"} /> contains the top <Katex math={"p"} /> eigenvalues.
        These coordinates are shown in Figure 2.
      </p>
      <p>
        An interesting fact about classical MDS is that when using the Euclidean
        distance metric, the resulting low-dimensional coordinates are
        equivalent to those obtained from
        <!-- svelte-ignore a11y-invalid-attribute -->
        <a href="https://en.wikipedia.org/wiki/Principal_component_analysis"
          >Principal Component Analysis (PCA)</a
        >.
      </p>
    </div>
    <MDSPlot
      {dataset}
      let:active
      {active}
      width={500}
      height={500}
      slot="visualization"
    />
  </Section>
  <Section>
    <div slot="text">
      <Minimizable
        title="Explanation of Equivalence between Classical MDS and PCA"
      >
        <div>
          <h2>Equivalence Between Classical MDS and PCA</h2>
          <p>
            Interestingly, classical MDS with the Euclidean distance metric is
            equivalent to
            <!-- svelte-ignore a11y-invalid-attribute -->
            <a href="https://en.wikipedia.org/wiki/Principal_component_analysis"
              >Principal Components Analysis (PCA)</a
            >.
          </p>
          <h3>Definition of PCA</h3>
          <p>
            PCA seeks to find a low-dimensional representation of data that
            maximizes the variance along each dimension. This is done by
            computing the covariance matrix
            <Katex math={"C = \\frac{1}{n} X^T X"} displayMode={true} />
            of the centered data <Katex
              math={"X \\in \\mathbb{R}^{n \\times d}"}
            />
            and performing an eigen decomposition
            <Katex math="C = V \Lambda V^T" />. The top <Katex math={"p"} /> eigenvectors
            corresponding to the largest eigenvalues form the principal components
            of the data. The low-dimensional coordinates <Katex
              math={"Y \\in \\mathbb{R}^{n \\times p}"}
            /> are given by projecting the data onto these principal components:
            <Katex math={"\n  Y = X V_p "} displayMode={true} /> where <Katex
              math={"V_p"}
            /> contains the top <Katex math={"p"} /> eigenvectors.
          </p>
          <h3>Equivalence Explanation</h3>
          <p>
            The equivalence between these two formulations can be seen using the
            SVD of <Katex math={"X"} />
            <Katex math={"X = U \\Sigma V^T."} displayMode={true} />
            For PCA, we established that the projections onto the principal components
            are given by
            <Katex math={"Y = X V_p"} />
            If we expand this using the SVD of <Katex math={"X"} />, we have
            <Katex
              math={"Y = (U \\Sigma V^T) V_p = U_p \\Sigma_p."}
              displayMode={true}
            />
          </p>
          <p>
            For MDS, we perform an eigen decomposition to our double centered
            Gram matrix
            <Katex math={"B = -\\frac{1}{2} H D^2 H."} displayMode={true} />
            For the special case when <Katex math={"D"} /> is the Euclidean distance
            matrix, and we assume that our data is already centered (i.e. <Katex
              math={"HX = X"}
            />), we have that <Katex
              math={"B \\propto X X^T."}
              displayMode={true}
            />
            If we take the SVD of <Katex math={"B = X X^T"} />, we have
            <Katex
              math={"X X^T = (U \\Sigma V^T)(U \\Sigma V^T)^T = U \\Sigma^2 U^T."}
              displayMode={true}
            />
            Because <Katex math={"X X^T"} /> is symmetric and positive semi-definite,
            its eigen decomposition is unique up to the signs and rotation, thus
            we have that the eigenvectors are given by <Katex math={"U"} /> and the
            eigenvalues are given by <Katex math={"\\Lambda = \\Sigma^2"} />.
            For MDS we compute the low-dimensional coordinates using the
            eigenvectors of <Katex math={"B"} /> giving us
            <Katex
              math={"Y = U_p \\Lambda_p^{1/2} = U_p \\Sigma_p"}
              displayMode={true}
            />
          </p>
        </div>
      </Minimizable>
    </div></Section
  >
  <!-- <MDSPlot {dataset} /> -->
  <!-- <PCAScatter {dataset} /> -->
  <Section>
    <div slot="text">
      <h2>Limitations of MDS with Euclidean Distance</h2>
      <p>
        We can see in Figure 2 that when using Euclidean distance as our metric
        for
        <Katex math={"d_{ij}"} />, MDS amounts to projecting data onto the first
        <Katex math={"k"} /> principal components. While this is a powerful technique
        for many types of data, for our spiral dataset it fails to capture the intrinsic
        structure of the data because it is restricted to linear axes in the original
        space.
      </p>
      <p>
        A central assumption that Isomap and many other non-linear
        dimensionality reduction techniques takes advantage of is that <b>
          while Euclidean distance may not be a good global measure of
          similarity for data with manifold structure, it works fairly well
          locally.
        </b>
        That is, while Euclidean distance may not be a good measure of similarity
        between points that are far apart, it works reasonably well for points that
        are close together (Figure 3)! The closest points to a given point in Euclidean
        distance are indeed nearby along the spiral, however points that are a medium
        Euclidean distance away may be very far apart along the spiral.
      </p>
    </div>
    <EuclideanPairwiseDistances
      let:active
      {active}
      width={500}
      height={200}
      slot="visualization"
    />
  </Section>
  <Section>
    <div slot="text">
      <h2>Epsilon Neighborhoods</h2>
      <p>
        One way to formalize the idea of locality is through neighborhoods. You
        can draw a circle (hypersphere) around a point (called an epsilon
        neighborhood). That is the region about a point <Katex math={"x_i"} /> defined
        as
        <Katex
          math={"N_\\epsilon(x_i) = \\{ x_j : ||x_i - x_j||_2 < \\epsilon \\}"}
          displayMode={true}
        />
        for some small value of <Katex math={"\\epsilon"} />. See a depiction of
        this in Figure 4. Look and notice that the points that fall within this
        circle when <Katex math={"\\epsilon"} /> is small are also close to the point
        along the spiral's intrinsic dimension. However, if we increase <Katex
          math={"\\epsilon"}
        />, we start to include points that are nearby in Euclidean distance but
        far apart along the spiral.
      </p>
      <div class="slider-container">
        <label class="slider-main-label">
          <Katex math={`\\epsilon = ${epsilon.toFixed(2)}`} />
        </label>
        <div class="slider-row">
          <span class="slider-value-label">0</span>
          <input
            type="range"
            min="0"
            max="5"
            step="0.01"
            bind:value={epsilon}
            class="slider"
          />
          <span class="slider-value-label">5</span>
        </div>
      </div>
    </div>
    <EpsilonBall
      let:active
      {active}
      {epsilon}
      width={500}
      height={200}
      slot="visualization"
    />
  </Section>
  <Section>
    <div slot="text">
      <h2>Building a Graph from Local Neighborhoods</h2>
      <Quote>
        How can we embed data that is locally Euclidean but globally
        non-Euclidean?
      </Quote>
      <p>
        Now that we have established that our data has local Euclidean
        structure, how can we take advantage of this to build a better
        dimensionality reduction technique? A powerful perspective in many
        dimensionality reduction techniques is to represent data as a graph,
        where the connections between points in our dataset capture their local
        similarity structure. This is central to many more powerful
        dimensionality reduction techniques like
        <!-- svelte-ignore a11y-invalid-attribute -->
        <a
          href="https://en.wikipedia.org/wiki/T-distributed_stochastic_neighbor_embedding"
          >t-SNE</a
        >
        and <!-- svelte-ignore a11y-invalid-attribute -->
        <a href="https://pair-code.github.io/understanding-umap/">UMAP</a>.
      </p>
      <p>
        One interesting choice for constructing a graph that captures local
        similarity is to use these <Katex math={"\\epsilon"} /> neighborhoods. If
        two points lie within each other's <Katex math={"\\epsilon"} /> neighborhoods,
        we can connect them with an edge in the graph (Figure 5). We can represent
        this graph with an adjacency matrix <Katex math={"A"} /> where
        <Katex math={"A_{ij} = 1"} /> if points <Katex math={"i"} /> and <Katex
          math={"j"}
        /> are connected and <Katex math={"A_{ij} = 0"} /> otherwise. This way of
        constructing a graph relates to a deep concept in topology called
        <a href="https://en.wikipedia.org/wiki/Persistent_homology"
          >persistent homology</a
        >, which studies how the connectivity structure of data changes as we
        vary
        <Katex math={"\\epsilon"} />. However, this is out of the scope of this
        article.
      </p>
    </div>
    <EpsilonGraph
      let:active
      {active}
      {epsilon}
      width={500}
      height={200}
      slot="visualization"
    />
  </Section>
  <Section>
    <div slot="text">
      <p>
        Another simple choice is to connect each point to its k-nearest
        neighbors (Figure 6).
      </p>
      <!-- K slider -->
      <!-- <input type="range" min="1" max="10" step="1" value="5" /> -->
      <div class="slider-container">
        <label class="slider-main-label">
          <Katex math={`k = ${k}`} />
        </label>
        <div class="slider-row">
          <span class="slider-value-label">1</span>
          <input
            type="range"
            min="1"
            max="20"
            step="1"
            bind:value={k}
            class="slider"
          />
          <span class="slider-value-label">20</span>
        </div>
        <p>
          This is the construction that Isomap uses to build its graph, and what
          we'll be using in this article.
        </p>
      </div>
    </div>
    <KNNGraph
      let:active
      {active}
      {k}
      width={500}
      height={200}
      slot="visualization"
    />
  </Section>
  <Section>
    <div slot="text">
      <h2>Measuring Distance in a Graph</h2>
      <p>
        Now that we have a graph that captures the local similarity structure of
        our data, how can we quantify a notion of distance between points? In
        the case of Isomap, the answer is exceptionally simple, we can just
        conventional algorithms like Dijkstra's to compute the shortest path
        between points in the graph as our distance measure (Figure 7). We can
        use our k-nearest neighbor graph constructed earlier, with edges
        weighted by Euclidean distance between connected points.
      </p>
    </div>
    <GraphDistance
      let:active
      {active}
      width={500}
      height={200}
      slot="visualization"
    />
  </Section>
  <Section>
    <div slot="text">
      <h2>The Final Isomap Algorithm!</h2>
      <p>
        Equipped with a principled method for computing the distances between
        points that respects the manifold structure of our data, we can now plug
        these distances into classical MDS to obtain our low-dimensional
        embedding! The full Isomap algorithm can be summarized in the following
        steps:
      </p>
      <ol>
        <li>
          Construct a k-nearest neighbor graph from the data, with edges
          weighted by Euclidean distance.
        </li>
        <li>
          Compute the shortest path distances between all pairs of points in the
          graph using Dijkstra's algorithm. This gives us a new distance matrix <Katex
            math={"D_{graph}"}
          />.
        </li>
        <li>
          Apply classical MDS to the graph distance matrix <Katex
            math={"D_{graph}"}
          /> to obtain low-dimensional coordinates that preserve these distances.
        </li>
      </ol>
    </div>
    <IsomapProjection
      {dataset}
      let:active
      {active}
      width={500}
      height={500}
      slot="visualization"
    />
  </Section>
  <Section>
    <div slot="text">
      <h2>Ackwnowledgements</h2>
      <p>
        I would like to thank <a href="https://bhoov.com">Benjamin Hoover</a>
        and <a href="https://hamza-elhamdadi.github.io/">Hamza Elhamdadi</a> for
        their feedback on this article.
      </p>
    </div>
  </Section>
</div>
