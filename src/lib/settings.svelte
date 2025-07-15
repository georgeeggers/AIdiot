<script>
    import { settings, ol, parse_model_name } from "../global.svelte";

    import { replace } from "svelte-spa-router";
    let models = $state([]);
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
    }

    init();



</script>

<button class="icon highlight" onclick={() => replace("/")}>{"<"}</button>

<div class="container">

{#each models as m, index}


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


<style>

.container {
    width: 100%;
    height: 100%;
    display: grid;
    padding: 1em;
    box-sizing: border-box;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    grid-template-rows: masonry;
    gap: 20px;
}

.selected {
    border: 2px solid var(--main-color) !important;
    color:var(--main-color);
}

.modelCard button {
    background: none;
    cursor: pointer;
    border: 2px solid white;
    display: flex;
    text-align: left;
    font-size: 16px;
    padding: 10px;
    border-radius: 20px;
    width: fit-content;
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
