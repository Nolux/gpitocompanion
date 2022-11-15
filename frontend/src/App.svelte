<script>
    import { io } from "socket.io-client";

    let connected = false;
    let gpi = [{ tallyNumber: 1, status: false }];
    let gpo = [];
    let settings = {};

    const socket = io("http://10.0.10.233:8888");

    console.log(socket);

    socket.on("connect", () => {
        connected = true;
        console.log("connected");
    });
    socket.on("state", (data) => {
        console.log(data);
        gpi = data.gpi;
        gpo = data.gpo;
        settings = data.settings;
        console.log(gpi, gpo, settings);
    });
</script>

<main>
    <div>
        {#each Object.keys(settings) as setting}
            <div>
                {setting}: {settings[setting]}
            </div>
        {/each}
    </div>
    connected: {connected}
    <h1>Inputs</h1>
    <div class="grid">
        {#each gpi as i}
            <div class="cell">
                {#if i}
                    <div class={i.status ? "red" : ""}>
                        {i.tallyNumber}
                    </div>
                {/if}
            </div>
        {/each}
    </div>
    <h1>Outputs</h1>

    <div class="grid">
        {#each gpo as o}
            <div class="cell">
                {#if o}
                    <div class={o.status ? "red" : ""}>
                        {o.tallyNumber}
                    </div>
                {/if}
            </div>
        {/each}
    </div>
</main>

<style>
    .grid {
        display: grid;
        grid-template-columns: repeat(10, 40px);
    }
    .cell {
        width: 30px;
        height: 30px;
        text-align: center;
    }
    .red {
        background-color: red;
    }
</style>
