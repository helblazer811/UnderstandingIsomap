<script>
  import Katex from "$lib/utils/Katex.svelte";
  import "$lib/styles/styles.css";
  import Isomap from "$lib/Isomap.svelte";
  import ActionLink from "$lib/utils/ActionLink.svelte";

  //   Store the state of the UI
  let showPCAVectors = false;
  let showPCAProjection = false;
  let showIntrinsicDimension = false;
</script>

<div id="idyll-mount">
  <div class="idyll-root" data-reactroot="">
    <div class="article-header">
      <h1 class="hed">Dimensionality Reduction with Isomap</h1>
      <h2 class="dek">Nonlinear Dimensionality Reduction</h2>
      <div class="byline">
        By: <a href="https://alechelbling.com">Alec Helbling</a>
      </div>
    </div>
    <Isomap {showPCAVectors} {showPCAProjection} {showIntrinsicDimension} />
    <p class="quote">
      <em>
        "To deal with hyper-planes in a 14-dimensional space, visualize a 3D
        space and say 'fourteen' to yourself very loudly. Everyone does it." -
        Geoffrey Hinton
      </em>
    </p>
    <p>
      <!-- The human brain excels at making sense of a vast amount of sensory information about the physical worldby extracting a small number of relevant features. -->
      In many domains, like computational imaging or genomics, data comes in the
      form of high-dimensional signals that are challenging for humans to directly
      reason about, as our intuition is generally confined to two or three dimensions.
      <!-- Real world data is often noisy and high-dimensional, making it challenging for humans to reason about,  -->
      <!-- as the scope of our intuition is generally confined to two or three dimensions.  -->
      <!-- Unfortunately, raw information like images, robot sensor data, or the human genome all come in the  -->
      <!-- form of high-dimensional signals that are important to understand. -->
      <!-- Real world data is often high-dimensional, making it challenging for humans to visualize and interpret.  -->
      <!-- The human brain excels at making sense of complex sensory signals by extracting a small number of relevant features.  -->
      The field of <a href="">dimensionality reduction</a> aims to compress
      high-dimensional data into lower-dimensional representations that preserve
      their relevant structure while being much easier for people to interpret.
      <!-- The human brain naturally extracts a few salient features from high dimensional perceptual signals.  -->
    </p>
    <p>
      In this article, I'll be exploring <a href="">Isomap</a> a classic
      non-linear dimensionality reduction technique that seeks to embed data
      while preserving its local similarity structure. Isomap builds upon the
      manifold hypothesis, which posits that high-dimensional data often lies on
      a low-dimensional manifold, despite existing in a higher dimensional
      space. Throughout the article there will be various <ActionLink
        action={() => {
          alert("Good job!");
        }}>action links</ActionLink
      > that when clicked will modify the visualization.
    </p>
    <h2>Background: PCA and its Limitations</h2>
    <p>
      A natural starting point for studying dimensionality reduction is
      <a href="">principal components analysis (PCA)</a>, which leverages tools
      from linear algebra to find the axes in data along which the data has
      maximum variation. However, PCA has some key limitations that motivates
      the need for more advanced non-linear dimensionality techniques like
      Isomap, the focus of this blog.
    </p>
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
    </p>
    <p class="inset">
      <em>
        How can we capture the intrinsic structure of our one dimensional data
        embedded in a two dimensional space?
      </em>
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
      PCA fails to capture this structure.
    </p>

    <h1>The Isomap Algorithm</h1>

    <h2>Capturing the Local Structure of Data</h2>
    <p class="quote">
      Problem: How to preserve local structure in high-dimensional data?
    </p>
    <p>
      We are interested in embedding our data in a way that preserves its local
      structure. One way to capture the local structure of data is through a
      nearest neighbor graph. We can define a graph with adjacency matrix <Katex
        math={"A"}
      /> where <Katex math={"A_{ij} = 1"} /> if point <Katex math={"i"} /> is among
      the <Katex math={"k"} /> nearest neighbors of point <Katex math={"j"} /> or
      vice versa, and <Katex math={"A_{ij} = 0"} /> otherwise.
      <br />
      <em> Why can't we just use Euclidean distance?</em>
    </p>

    <h2>Measuring Geodesic Distances</h2>
    <p></p>

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
    </p>

    <h2>Interlude: Principal Components Analysis</h2>
    <p>
      However, a key limitation of PCA is that it assumes the intrinsict
      dimensions, that is to say the semantically meaningful components of a
      piece of data, are linear. However, real world data often has highly
      non-linear structure. This limitation has motivated the entire field of
      nonlinear dimensionality reduction leading to methods like <a href=""
        >Isomap</a
      >, and more recently techniques like <a href="">t-SNE</a> and
      <a href="">UMAP</a>. In this article, we explore the Isomap algorithm,
      which aims to create a low-dimensional representation of data that
      preserves the geodesic distances (more on this later) between points in
      the high-dimensional space.
    </p>
  </div>
</div>
