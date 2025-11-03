<script>
  import * as settings from "$lib/settings.js";

  export let width = 500;
  export let height = 300;

  let svgEl; // reference to the <svg> element
  let active = false;
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
    <svg
      bind:this={svgEl}
      {width}
      {height}
      style:opacity={active ? 1 : settings.inactiveOpacity}
    ></svg>
    <slot name="visualization" svgEl={svgEl} width={width} height={height}></slot>
  </div>
</div>

<style>
  .text-plot-section {
    display: flex; /* side-by-side layout */
    flex-direction: row;
    width: 100%;
    /* position: relative; */
    gap: 20px; /* optional spacing between text and plot */
    align-items: flex-start;
  }

  .text-container {
    flex: 1; /* each takes equal horizontal space */
    width: 100%;
    max-width: 550px;
    margin-left: 80px;
  }

  .text-plot-container .plot {
    flex: 1; /* each takes equal horizontal space */
    height: 100%;
    display: flex;
    justify-content: center; /* horizontal center */
    align-items: center; /* vertical center */
  }

  .text-plot-container .plot svg {
    /* width: 100%; */
    /* height: auto; */
  }
</style>
