<script>
    import { io } from "socket.io-client";

    import { onMount } from "svelte";
    import { writable } from "svelte/store";

    let connected = false;
    let url;

    let gpi = [];
    let gpo = [];
    let settings = {};
    let settingsHidden = true;
    let consoleLog = writable([
        { time: new Date(), line: "Recived Tally: 1 ON" },
    ]);

    onMount(() => {
        url = window.location.href;
        console.log(url);

        const socket = io(url);

        console.log(socket);

        socket.on("connect", () => {
            connected = true;
            console.log("connected");
        });
        socket.on("state", (data) => {
            gpi = data.gpi;
            gpo = data.gpo;
            settings = data.settings;
        });
        socket.on("consolelog", (line) => {
            let oldArr = $consoleLog;
            if (oldArr.length < 10) {
            } else {
                oldArr.shift();
            }
            oldArr.push({ time: new Date(), line: line });

            console.log(oldArr);
            consoleLog.set(oldArr);
        });
    });
</script>

<main class="container">
    <h1>GPI TO COMPANION</h1>
    {#if !settingsHidden}
        <div on:click={() => (settingsHidden = true)}>
            {#each Object.keys(settings) as setting}
                <div>
                    {setting}: {settings[setting]}
                </div>
            {/each}
        </div>
        connected: {connected}
    {:else}
        <button on:click={() => (settingsHidden = false)}>Show settings</button>
    {/if}
    <h2>Inputs</h2>
    <div class="grid">
        {#each gpi as i}
            {#if i}
                <div class={`cell ${i.status ? "red" : ""}`}>
                    {i.tallyNumber}
                </div>
            {/if}
        {/each}
    </div>
    <h2>Outputs</h2>

    <div class="grid">
        {#each gpo as o}
            {#if o}
                <div class={`cell ${o.status ? "red" : ""}`}>
                    {o.tallyNumber}
                </div>
            {/if}
        {/each}
    </div>
    <div>
        <h1>Console</h1>
        {#each $consoleLog as { time, line }}
            <p class="console">
                {time.getFullYear() +
                    "-" +
                    (time.getMonth() + 1) +
                    "-" +
                    time.getDate()}
                {("0" + time.getHours()).slice(-2) +
                    ":" +
                    ("0" + time.getMinutes()).slice(-2) +
                    ":" +
                    ("0" + time.getSeconds()).slice(-2)}: {line}
            </p>
        {/each}
    </div>
</main>

<style>
    .container {
        padding-left: 1em;
        padding-right: 1em;
    }
    .settings {
    }
    .console {
        font-size: medium;
        margin: 0;
    }
    .grid {
        padding: 10px;
        display: grid;
        grid-template-columns: repeat(8, 1fr);
        gap: 1em;
    }
    .cell {
        display: flex;
        justify-content: center;
        align-content: center;
        flex-direction: column;
        border: 1px solid white;
        width: 100%;
        height: 100%;
        aspect-ratio: 1/1;
        text-align: center;
    }
    .red {
        background-color: red;
    }
</style>
