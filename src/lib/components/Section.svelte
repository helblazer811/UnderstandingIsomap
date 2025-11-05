<script>
  let active = false;
  // Section now only manages the hover-active state and layout; width/height are owned by child visualizations.
</script>

<div
  class="text-plot-section"
  on:mouseenter={() => (active = true)}
  on:mouseleave={() => (active = false)}
  role="region"
  aria-label="Section with text and plot"
>
  <div class="text-container">
    <slot name="text"></slot>
  </div>
  <div class="plot">
    <slot name="visualization" {active}></slot>
  </div>
</div>

<style>
  .text-plot-section {
    display: flex; /* side-by-side layout */
    flex-direction: row;
    width: 100%;
    /* position: relative; */
    gap: 20px; /* optional spacing between text and plot */
    align-items: center;
  }

  .text-container {
    flex: 1; /* each takes equal horizontal space */
    width: 100%;
    max-width: 550px;
    margin-left: 80px;
  }

  .text-plot-section .plot {
    flex: 1; /* each takes equal horizontal space */
    height: 100%;
    display: flex;
    justify-content: center; /* horizontal center */
    align-items: center; /* vertical center */
  }
</style>