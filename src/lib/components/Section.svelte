<script>
  import { onMount } from "svelte";
  let active = false;
  let sectionEl;
  let hovering = false;
  let visible = false;

  // Active whenever hovered OR any part of the section is visible in the viewport
  $: active = hovering || visible;

  function handleMouseEnter() {
    hovering = true;
  }
  function handleMouseLeave() {
    hovering = false;
  }

  onMount(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          // Any intersection activates visibility
          visible = entry.isIntersecting && entry.intersectionRatio > 0;
        }
      },
      { root: null, threshold: [0] }
    );
    if (sectionEl) observer.observe(sectionEl);
    return () => observer.disconnect();
  });
  // Section manages active state and layout; width/height are owned by child visualizations.
</script>

<div
  class="text-plot-section"
  bind:this={sectionEl}
  on:mouseenter={handleMouseEnter}
  on:mouseleave={handleMouseLeave}
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
    max-width: 650px;
    margin-left: 80px;
  }

  .text-plot-section .plot {
    flex: 1; /* each takes equal horizontal space */
    height: 100%;
    display: flex;
    justify-content: center; /* horizontal center */
    align-items: center; /* vertical center */
  }

  /* Responsive: stack visualization below text on narrow screens */
  @media (max-width: 1000px) {
    .text-plot-section {
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
      /* padding: 0 20px;  */
      display: flex;
      align-items: center;
    }
    .text-plot-section .text-container {
      width: 92%;
      margin-left: 0px;
    }
    .text-plot-section .plot {
      width: 100%;
      justify-content: center;
      align-items: center;
    }
  }
</style>
