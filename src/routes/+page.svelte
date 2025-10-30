<script>
  import Katex from "$lib/utils/Katex.svelte";
  import "$lib/styles/styles.css";
  import Isomap from "$lib/Isomap.svelte";
  import ActionLink from "$lib/utils/ActionLink.svelte";

//   Store the state of the UI
  let showPCAVectors = false;
  let showPCAProjection = false;

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
    <Isomap showPCAVectors={showPCAVectors} showPCAProjection={showPCAProjection} />
    <p>
      Data often lays in high-dimensional spaces, making it challenging to
      visualize and interpret. The human brain naturally extracts a few salient
      features from high dimensional perceptual signals. The field of <a href="">dimensionality reduction</a> 
      aims to address this challenge computationally
      by transforming high-dimensional data into a lower-dimensional space while
      preserving its essence. 
    </p>
    <p>
        Throughout the article there will be various <ActionLink action={() => {alert("Good job!")}}>action links</ActionLink> that when 
        clicked will modify the visualization. 
    </p>
    <h2> Background: PCA and its Limitations</h2>
    <p>
        A natural starting point for studying dimensionality reduction is 
        <a href="">principal components analysis (PCA)</a>, which leverages tools
        from linear algebra to find the axes in data along which the data has
        maximum variation. However, PCA has some key limitations that motivates the need for 
        more advanced non-linear dimensionality techniques like Isomap, the focus of this blog.
    </p>
    <p>
        Given some data points <Katex math={"x_1, \\dots, x_n \\in \\mathbb{R}^d"} /> we can represent it as matrix
        <Katex math={"\\[X = \\begin{bmatrix} x_1^T \\\\ \\vdots \\\\ x_n^T \\end{bmatrix}\\]"} />
        where each row is a data point.
        PCA works by performing the eigendecomposition of the covariance matrix of data. 
        To compute the covariance matrix, we can first center the data by subtracting the mean
        <Katex math={"\\bar{x} = \\frac{1}{n} \\sum_{i=1}^n x_i"} /> to get <Katex math={"\\tilde{x}_i = x_i - \\bar{x}"} />.
        In matrix form we can express this as
        <Katex math={"\\[\\tilde{X} = X - 1_n \\bar{x}^T\\]"} /> where <Katex math={"1_n"} /> is a column vector of ones of length <Katex math={"n"} />.
        We can then compute the covariance matrix of our centered data (at least something proportional to it) as
        <Katex math={"\\[\\Sigma = \\tilde{X}^T\\tilde{X}.\\]"} />
        We can then peform the eigendecomposition of the covariance matrix
        <Katex math={"\\[\\Sigma = Q \\Lambda Q^T.\\]"} />
        The vectors in <Katex math={"Q"} /> corresponding to the top <Katex math={"k"} /> eigenvalues in <Katex math={"\\Lambda"} />
        give us the directions of maximum variance in the data. We can see the principal component vectors <ActionLink action={() => {showPCAVectors = !showPCAVectors;}}> overlayed on the data </ActionLink>. 
        The longer vector represents the first principal component, indicating the direction of greatest variance, while the shorter vector represents the second principal component, orthogonal to the first.
    </p>
    <p>
        We can <ActionLink action={() => {showPCAProjection = true;}}> project the data onto the first principal component </ActionLink> to get a one-dimensional representation of our data. 
    </p>

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
      to infer low rank embeddings that preserve the similarity of our original
      points. That is we want to find coordinates <Katex
        math={"y_1, \\dots, y_n \\in \\mathbb{R}^p"}
      /> such that
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

      <Katex math={"\\[B = -\\frac{1}{2} H D^2 H\\]"} />
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
