<script>
    import { onMount } from "svelte";
    import { settings, ol, parse_model_name } from "../global.svelte";

    import { replace } from "svelte-spa-router";
    let models = $state([]);

    let columns = $state(3);
    let outputModels = $state([[]]);
    const masonryWidth = 275;

    const init = async () => {
        let response = await ol.list();
        for(let i of response.models){
            console.log(i);
            if(models.length == 0){
                models.push(
                    {
                        name: parse_model_name(i.name).model,
                        sizes: 
                        [
                            {
                                id: Math.round(i.size * 0.00000001) / 10,
                                name: i.name
                            }
                        ]
                    }
                
                );
            } else {
                let newModel = true;
                for(let j = 0; j < models.length; j++){
                    // if the model name is already in the list, add it to the sizes list
                    if(models[j].name == parse_model_name(i.name).model){
                        models[j].sizes.push({
                            id: Math.round(i.size * 0.00000001) / 10,
                            name: i.name
                        });
                        newModel = false;
                        break;
                    }
                }
                if(!newModel){
                    continue;
                } else {
                    models.push(
                        {
                            name: parse_model_name(i.name).model,
                            sizes: 
                            [
                                {
                                    id: Math.round(i.size * 0.00000001) / 10,
                                    name: i.name
                                }
                            ]
                        }
                    );
                }
            }
        }

        // SETUP MASONRY

        const width = window.innerWidth;
        let number = Math.floor(width / masonryWidth);
        columns = number;
        outputModels = [];
        for(let i = 0; i < columns; i++){
            outputModels.push([]);
        }
        for(let i = 0; i < models.length; i++){
            outputModels[i % columns].push(models[i]);
        }
        console.log(outputModels);
    }

    init();

    const do_stuff = () => {
        const width = window.innerWidth;
        let number = Math.floor(width / masonryWidth);
        if(columns != number && number != 0){
            columns = number;
            outputModels = [];
            for(let i = 0; i < columns; i++){
                outputModels.push([]);
            }
            for(let i = 0; i < models.length; i++){
                outputModels[i % columns].push(models[i]);
            }
            console.log(outputModels);
        }
    }

    onMount(() => {
        do_stuff()
        window.addEventListener('resize', () => {
            do_stuff();
        })
    });

</script>

<button class="icon highlight" onclick={() => replace("/")}>{"<"}</button>

<div class="charInfo">
    <textarea
        style="width: 10%;"
        bind:value={settings.name}
    >

    </textarea>
    <textarea
        style="width: 90%;"
        bind:value={settings.system}
        
    >
    </textarea>
</div>

<div class="charInfo">
    <button class="h{settings.tools}" onclick={() => settings.tools = !settings.tools}>Use Tools: {settings.tools}</button>
    <button class="h{settings.streaming}" onclick={() => settings.streaming = !settings.streaming}>Streaming: {settings.streaming}</button>
</div>

<div class="container">

{#if models.length != 0}

{#each outputModels as list, i}
    <div class="column">
        {#each list as m}

            <div class="modelCard">

                <p1 class="modelName">{m.name}</p1>

                {#each m.sizes as size}
                    <button
                        class="{settings.model == size.name ? 'selected' : ''}"
                        onclick={() => { settings.model = size.name }}
                    >
                    {size.id} GB
                    </button>
                {/each}

            </div>

        {/each}
    </div>



{/each}

{:else}

    <div class="modelCard">

        <p1 class="modelName">Check out Hugging Face or Ollama and download some models!</p1>

    </div>

{/if}

</div>


<style>


.container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: row;
    box-sizing: border-box;
    padding: 20px;
    gap: 20px;
}

.column {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    gap: 20px;
}

/*
.container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: row;
    flex: 1;
    flex-wrap: wrap;
    padding: 1em;
    box-sizing: border-box;
    gap: 20px;
    align-items: center;
    justify-content: center;
}
*/

.charInfo {
    width: 100%;
    height: 100%;
    padding: 1em;
    box-sizing: border-box;
    display: flex;
    flex-direction: row;
    gap: 20px;

}

textarea {
    resize: none;
    min-height: 100px;
    height: 100%;
    display: flex;
    padding: 10px;
    box-sizing: border-box;
    border: 2px solid transparent;
    border-radius: 15px;
    font-size: 20px;
    font-family: system-ui, Avenir, Helvetica, Arial, sans-serif;
}

.selected, .htrue {
    border: 2px solid var(--main-color) !important;
    color:var(--main-color);
}

.modelCard button, .charInfo button {
    background: none;
    cursor: pointer;
    border: 2px solid white;
    display: flex;
    font-size: 16px;
    padding: 10px;
    border-radius: 20px;
    width: fit-content;
    align-items: center;
    transition:
        border-color 250ms ease,
        color 250ms ease
    ;
}

.modelCard button:hover {
    color: var(--main-color);
}

.icon {
    border: none;
    font-size: 24px;
    display: flex;
    padding: 10px;
    
}

.modelName {
    font-size: 28px;
    text-wrap: balance;
}

.modelCard {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    background-color: var(--body-color);
    padding: 15px;
    border-radius: 15px;
    border: 2px solid transparent;
    gap: 10px;
    width: 100%;
    min-width: 250px;
}

</style>
