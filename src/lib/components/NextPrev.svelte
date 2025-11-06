<script>
  export let onClickPrevious = () => {};
  export let onClickNext = () => {};
</script>

<div class="next-prev-container">
  <button class="nav-button prev-button" on:click={onClickPrevious} aria-label="Previous">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </button>

  <button class="nav-button next-button" on:click={onClickNext} aria-label="Next">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </button>
</div>

<style>
  .next-prev-container {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .nav-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 0.25rem;
    color: #666;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .nav-button:hover {
    background-color: #f0f0f0;
    color: #333;
  }

  .nav-button:active {
    transform: scale(0.95);
  }

  .nav-button:focus {
    outline: 2px solid #007acc;
    outline-offset: 2px;
  }

  .prev-button svg {
    transform: rotate(0deg);
  }

  .next-button svg {
    transform: rotate(0deg);
  }
</style>