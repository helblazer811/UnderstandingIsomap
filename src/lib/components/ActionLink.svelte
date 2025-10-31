<script>
    export let action = () => {};

    function handleClick(event) {
        event.preventDefault();
        action();
    }
</script>

<style>
    a {
        color: #000;
        border-bottom: 1px dashed #000;
        font-weight:  650;
        cursor: pointer;
    }
    a:hover {
        color: rgb(221, 66, 66);
        text-decoration: none;
        border-bottom: 1px dashed rgb(221, 66, 66);
    }
</style>

<a href="#" on:click={handleClick}>
    <slot></slot>
</a>