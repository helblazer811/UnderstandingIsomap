<script>
    import Katex from '$lib/utils/Katex.svelte';
    import '$lib/styles/styles.css';
    import Isomap from '$lib/Isomap.svelte';
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
        <Isomap />
        <p>
            Data often lays in high-dimensional spaces, making it challenging to visualize and interpret. 
            Humans struggle to comprehend more than three dimensions of data. 
        </p>

    <h2>Capturing the Local Structure of Data</h2>
    <p class="quote"> Problem: How to preserve local structure in high-dimensional data?</p>
    <p>
        We are interested in embedding our data in a way that preserves its local structure. 
        One way to capture the local structure of data is through a nearest neighbor graph. 
        We can define a graph with adjacency matrix <Katex math={'A'} /> where <Katex math={'A_{ij} = 1'} /> if point <Katex math={'i'} /> is among the <Katex math={'k'} /> nearest neighbors of point <Katex math={'j'} /> or vice versa, and <Katex math={'A_{ij} = 0'} /> otherwise.
        <br />
        <em> Why can't we just use Euclidean distance?</em>
    </p>

    <h2>Measuring Geodesic Distances</h2>
    <p>

    </p>

    <h2>Multidimensional Scaling</h2>
    <p> 
        Given our geodisic distance matrix <Katex math={'D'} />, we can use <a> multi-dimensional scaling </a> to
        infer low rank embeddings that preserve the similarity of our original points. 
        That is we want to find coordinates <Katex math={'y_1, \\dots, y_n \\in \\mathbb{R}^p'} /> such that 
        <Katex math={'||y_i - y_j||^2 \\approx d_{ij}^2'} />

        Let <Katex math={'D'} /> be such that <Katex math={'D_{ij}'} /> is the geodesic distance beween data points 
        <Katex math={'x_i'} /> and <Katex math={'x_j'} />. 

        We want to compute a gram matrix (a matrix of inner products between our points). 

        Normally if we wanted to use the Euclidean metric we could compute the Gram matrix as <Katex math={'XX^T'} />.

        However, we only have access to distances between points.

        However, we can recover the Gram matrix from our squared distance matrix <Katex math={'D^2'} />.

        The inner product between points <Katex math={'y_i'} /> and <Katex math={'y_j'} /> can be expressed in terms of distances as
        <a href="">Dimensionality reduction</a> aims to express high-dimensional information in a low dimensional form in a way that preserves the essence of the data. 
        Perhaps the simplest approach to dimensionality reduction is <a href="">principal components analysis (PCA)</a>, which leverages tools from linear algebra to find the axes in data along which the data has maximum variation. 

        If we center data by subtracting the mean <Katex math={'\\bar{y} = \\frac{1}{n} \\sum_{i=1}^n y_i'} />, we have that

        However, we can use the identity that the Gram matrix <Katex math={'B'} /> can be computed 
        by double centering the squared distance matrix.

        <Katex math={'\\[B = -\\frac{1}{2} H D^2 H\\]'}/>
    </p>

    <h2>Interlude: Principal Components Analysis</h2>
        <p>
            However, a key limitation of PCA is that it assumes the intrinsict dimensions, that is to say the semantically meaningful components of a piece of data, are linear. 
            However, real world data often has highly non-linear structure. 
            This limitation has motivated the entire field of nonlinear dimensionality reduction leading to methods like <a href="">Isomap</a>, and more recently techniques like <a href="">t-SNE</a> and <a href="">UMAP</a>.
            In this article, we explore the Isomap algorithm, which aims to create a low-dimensional representation of data that preserves the geodesic distances (more on this later) between points in the high-dimensional space.
        </p>
    </div>
</div>
