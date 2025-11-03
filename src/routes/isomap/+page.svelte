<script>
  import "$lib/styles/styles.css";
  import { onMount } from "svelte";

  import * as settings from "$lib/settings";
  //   import * as state from "$lib/stores/state.js";

  import ActionLink from "$lib/components/ActionLink.svelte";
  import Quote from "$lib/components/Quote.svelte";
  import Katex from "$lib/components/Katex.svelte";
  import IntroScatter from "$lib/animated_components/IntroScatter.svelte";
  import IntroScatterSlotted from "$lib/animated_components/IntroScatter.svelte";
  import PCAScatter from "$lib/animated_components/PCAScatter.svelte";
  import EpsilonGraph from "$lib/animated_components/EpsilonGraph.svelte";
  import GraphDistance from "$lib/animated_components/GraphDistance.svelte";
  import KNNGraph from "$lib/animated_components/KNNGraph.svelte";
  import MDSPlot from "$lib/animated_components/MDSPlot.svelte";
  import EuclideanPairwiseDistances from "$lib/animated_components/EuclideanPairwiseDistances.svelte";

  import { generateNoisySpiral } from "$lib/utils/data.js";
  import Section from "$lib/components/Section.svelte";
  import Minimizable from "$lib/components/Minimizable.svelte";
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
        <a href="">t-SNE</a> and <a href="">UMAP</a>.
      </p>
    </div>
    <IntroScatter {dataset} let:svgEl {svgEl} slot="visualization" />
  </Section>
  <Section height={500} width={500}>
    <div slot="text">
      <h2>Multidimensional Scaling</h2>
      <p>
        <a href="">Multidimensional Scaling (MDS)</a> is a classical
        dimensionality reduction technique that aims to take some
        high-dimensional data <Katex
          math={"x_1, \\dots, x_n \\in \\mathbb{R}^{d}"}
        /> and produce a lower-dimensional representation <Katex
          math={"y_1, \\dots, y_n \\in \\mathbb{R}^{p}"}
        /> where the pairwise distances between points are preserved as well as possible.
      </p>
      <p>
        Multi-dimensional scaling assumes that we only have access to pairwise
        distances between points
        <Katex math={"d_{ij}"} /> rather than the original coordinates of the points
        themselves. In it's simplest form, called classical MDS, we use the Euclidean
        distance metric <Katex math={"d_{ij} = ||x_i - x_j||_2"} />. MDS then
        seeks to find points <Katex
          math={"y_1, \\dots, y_n \\in \\mathbb{R}^{p}"}
        /> such that the distances between these new points approximate the original
        distances
        <Katex math={"||y_i - y_j||_2 \\approx d_{ij}"} />. In particular, MDS
        tries to minimize the stress function
        <Katex
          math={"\n  \\text{Stress} = \\sum_{i<j} (||y_i - y_j||_2 - d_{ij})^2. "}
          displayMode={true}
        />
      </p>
      <p>
        Instead of directly operating on our pairwise distances, represented by
        the distance matrix <Katex math={"D \\in \\mathbb{R}^{n \\times n}"} />,
        classical MDS converts these distances into a set of similarity scores
        between points. This is done by double centering the squared distance
        matrix to produce a Gram matrix <Katex
          math={"B = -\\frac{1}{2} H D^2 H,"}
          displayMode={true}
        /> where <Katex math={"H = I - \\frac{1}{n} 11^T"} /> is the centering matrix.
        The centering matrix <Katex math={"H"} /> centers the data by subtracting
        the mean from each point.
      </p>
      <p>
        Given this Gram matrix we can then perform an eigen decomposition
        <Katex math={"B = V \\Lambda V^T"} displayMode={true} />
        to find the top <Katex math={"p"} /> eigenvectors corresponding to the largest
        eigenvalues. The low-dimensional coordinates <Katex
          math={"Y \\in \\mathbb{R}^{n \\times p}"}
        /> of our points are exactly given by these eigenvectors scaled by the square
        root of their corresponding eigenvalues:
        <Katex math={"\n  Y = V_p \\Lambda_p^{1/2} "} displayMode={true} /> where
        <Katex math={"V_p"} /> contains the top <Katex math={"p"} /> eigenvectors
        and <Katex math={"\\Lambda_p"} /> contains the top <Katex math={"p"} /> eigenvalues.
      </p>
      <Minimizable
        title="Explanation of Equivalence between Classical MDS and PCA"
      >
        <div>
          <h2>Equivalence between Classical MDS and PCA</h2>
          <p>
            Interestingly, classical MDS with the Euclidean distance metric is
            equivalent to
            <a href="">Principal Components Analysis (PCA)</a>. PCA seeks to
            find a low-dimensional representation of data that maximizes the
            variance along each dimension. This is done by computing the
            covariance matrix
            <Katex math={"C = \\frac{1}{n} X^T X"} />
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
          <p>
            The equivalence between these two formulations can be seen using the
            SVD of <Katex math={"X"} />
            <Katex math={"X = U \\Sigma V^T."} displayMode={true} />
            The covariance matrix <Katex math={"X^T X"} /> of centered data <Katex
              math={"X"}
            /> can be written as
            <Katex
              math={"X^T X = (U \\Sigma V^T)^T(U \\Sigma V^T) = (V \\Sigma U^T) (U \\Sigma V^T) = V \\Sigma^2 V^T."}
              displayMode={true}
            />
            The data can be projected onto the principal components leading to <Katex
              math={"Y = X V_p = U \\Sigma V^T V_p = U_p \\Sigma_p"}
              displayMode={true}
            /> where <Katex math={"\\Sigma_p"} /> contains the top <Katex
              math={"p"}
            /> singular values.
          </p>
          <p>
            On the other hand, the double centered Gram matrix used in MDS can
            be written as
            <Katex
              math={"B = -\\frac{1}{2} H D^2 H = -\\frac{1}{2} H (X X^T) H."}
              displayMode={true}
            />
            If we assume that our data is already centered (i.e. <Katex
              math={"HX = X"}
            />), then we have that <Katex
              math={"B = -\\frac{1}{2} H D^2 H = -\\frac{1}{2} H (X X^T) H \\propto X X^T."}
              displayMode={true}
            />
            Using the SVD of <Katex math={"X"} />, we can write the Gram matrix
            as
            <Katex
              math={"X X^T = (U \\Sigma V^T)(U \\Sigma V^T)^T = U \\Sigma^2 U^T."}
              displayMode={true}
            />
            The low-dimensional coordinates obtained from MDS are given by <Katex
              math={"Y = U_p \\Lambda_p^{1/2} = U_p \\Sigma_p"}
              displayMode={true}
            /> where <Katex math={"\\Sigma_p"} /> contains the top <Katex
              math={"p"}
            /> singular values, using the fact that the singular values are the square
            roots of the eigenvalues.
          </p>
          <p>
            Thus we see that both PCA coordinates and MDS coordinates are
            identical when using the Euclidean distance metric (up to scaling
            and rotation).
            <!-- It is in fact the case that the projections obtained from PCA are the same (up to scaling and rotation) as those obtained from classical MDS with the Euclidean distance metric. -->
          </p>
        </div>
      </Minimizable>
    </div>
    <MDSPlot {dataset} let:svgEl {svgEl} slot="visualization" />
  </Section>
  <!-- <MDSPlot {dataset} /> -->
  <Section width={500} height={300}>
    <div slot="text">
      <h2>Limitations of MDS with Euclidean Distance</h2>
      <p>
        We can project the data onto the first principal component to get a
        one-dimensional representation of our data. But we can see that, despite
        the fact that our spiral dataset has a single intrinsic dimension, PCA
        fails to capture this structure. This is because Euclidean distance is a
        poor (global) measure of similarity between the points in our dataset.
      </p>
    </div>
    <EuclideanPairwiseDistances let:svgEl {svgEl} slot="visualization" />
  </Section>
  <!-- <PCAScatter {dataset} /> -->
  <Section height={600} width={500}>
    <div slot="text">
      <h2>Capturing the Local Structure of Data</h2>
      <p>
        We've established that a linear method like PCA is a poor choice for
        uncovering the true structure of our spiral dataset. An interesting
        observation about this dataset is that, while Euclidean distance may not
        be a good measure of similarity between points that are far apart, it
        works reasonably well for points that are close together! One way to see
        this is to draw a circle around a point (called an epsilon
        neighborhood). That is the region about a point <Katex math={"x_i"} /> defined
        as
        <Katex
          math={"N_\\epsilon(x_i) = \\{ x_j : ||x_i - x_j||_2 < \\epsilon \\}"}
          displayMode={true}
        />
        for some small value of <Katex math={"\\epsilon"} />. Look and notice
        that the points that fall within this circle when <Katex
          math={"\\epsilon"}
        /> is small are also close to the point along the spiral's intrinsic dimension.
      </p>
      <div class="slider-container">
        <label class="slider-main-label">
          <Katex math={"\\epsilon"} />
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

      <p>
        A powerful perspective in many dimensionality reduction techniques is to
        represent data as a graph, where the connections between points in our
        dataset capture their local similarity structure. This is central to
        many more powerful dimensionality reduction techniques like <a href=""
          >t-SNE</a
        >
        and
        <a href="">UMAP</a>.
      </p>
      <p>
        One interesting choice for constructing a graph that captures local
        similarity is to use these <Katex math={"\\epsilon"} /> neighborhoods. If
        two points lie within each other's <Katex math={"\\epsilon"} /> neighborhoods,
        <ActionLink
          action={() => {
            showSingleEpsilonBall = false;
            showAllEpsilonBalls = true;
            showEpsilonBallGraph = false;
            animatingAllBalls = true;
          }}>we can connect them with an edge in the graph.</ActionLink
        >
        We can represent this graph with an adjacency matrix <Katex
          math={"A"}
        /> where
        <Katex math={"A_{ij} = 1"} /> if points <Katex math={"i"} /> and <Katex
          math={"j"}
        /> are connected and <Katex math={"A_{ij} = 0"} /> otherwise. Another simple
        choice is to connect each point to its k-nearest neighbors.
      </p>
    </div>
    <EpsilonGraph let:svgEl {svgEl} {epsilon} slot="visualization" />
  </Section>
  <Section height={500} width={500}>
    <div slot="text">
      <!-- K slider -->
      <!-- <input type="range" min="1" max="10" step="1" value="5" /> -->
      <div class="slider-container">
        <label class="slider-main-label">
          <Katex math={"k"} />
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
    <KNNGraph let:svgEl {svgEl} {k} slot="visualization" />
  </Section>
  <Section height={500} width={500}>
    <div slot="text">
      <h2>Measuring Distance in a Graph</h2>
      <p>
        Now that we have a graph that captures the local similarity structure of
        our data Many dimensionality reduction techniques capture this local
        similarity structure in the form of a graph. We can take this <Katex
          math={"\\epsilon"}
        /> An interesting way to see this is to draw a circle around a point and
        note that the closest points We are interested in embedding our data in a
        way that preserves its local structure. One way to capture the local structure
        of data is through a nearest neighbor graph. We can define a graph with adjacency
        matrix
        <Katex math={"A"} /> where
        <Katex math={"A_{ij} = 1"} /> if point <Katex math={"i"} /> is among the
        <Katex math={"k"} /> nearest neighbors of point <Katex math={"j"} /> or vice
        versa, and <Katex math={"A_{ij} = 0"} /> otherwise.
        <br />
        <em> Why can't we just use Euclidean distance?</em>
      </p>

      <h2>Measuring Geodesic Distances</h2>
    </div>
    <GraphDistance let:svgEl {svgEl} slot="visualization"/>
  </Section>
</div>
