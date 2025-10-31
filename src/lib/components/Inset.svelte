

<style>
  .inset {
    width: 500px;
    display: block;
    font-style: italic;
    left: 0;
    padding-left: 20px;
  }

  .inset p {
    width: 100%;
    margin: 1.5em auto;
    border-bottom: 1px solid #aaa;
  }
</style>

<div class="inset">
  <p><em><slot /></em></p>
</div>
