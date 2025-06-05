<script>
  import { Ollama } from 'ollama';
  import { tick } from 'svelte';
  let name = $state("ChatBot");
  let system_prompt = $state("You are ChatBot, a helpful AI assistant");  
  let stream_status = $state(true);
  let model = $state("dolphin3:8b");
  let aggressive_retention = $state(false);

  let mapping = [
  {
    id: "*",
    type: "ast"
  },
  {
    id: "\"",
    type: "quote"
  },
  {
    id: "\`",
    type: "code"
  }
];

  const ol = new Ollama({host: "http://localhost:11434"});
  // this is where the system prompt is first injected
  // svelte-ignore state_referenced_locally
  let messages = $state([{ role: "system", content: system_prompt}]);
  let message = $state("");
  let ai_response = $state("Type a message to ask me a question");
  let thinking = $state(false);
  let output_messages = $state([]);
  let settings_status = $state("hidden");
  let output_msg = $state([{type: "normal", content: ""}]);
  let index = $state(0);
  let mode = $state("");
  let edit_index = $state(0);
  let edit_vis = $state(false);

  const scrolldown = async () => {
    await tick();
    window.scrollTo(0, document.body.scrollHeight);

  }


  const is_key = (input, map) => {
    let t_index = 0;
    for(let i of map){
      if(i.id == input){
        return t_index;
      }
      t_index++;
    }
    return -1;
  }

  const parser = async (input) => {
    let sub_index = 0;
    for(let i of input){
      sub_index = is_key(i, mapping);
      if(sub_index != -1){
        if(mode == ""){
          output_msg.push({type: mapping[sub_index].type, content: ""});
          mode = i;
          index++;
        } else if (mode == i){
          console.log("Terminating Character found!");
          output_msg[index].content += mapping[sub_index].id;
          output_msg.push({type: "normal", content: ""});
          index++;
          mode = "";
          continue;
        }
      }
      output_msg[index].content += i;
    }
    /*
    sub_index = 0;
    for(let i of output_msg){
      if(i.content == ""){
        console.log("Removing");
        output_msg.splice(sub_index, 1);
      }
      sub_index++;
    }
    */  
  }

  const parse_whole = (input) => {
    let output_msg = [{type: "normal", content: ""}];
    let mapping = [
      {
        id: "*",
        type: "ast"
      },
      {
        id: "\"",
        type: "quote"
      },
      {
        id: "\`",
        type: "code"
      }
    ];

    let index = 0;
    let sub_index = 0;
    let mode = "";
    output_msg[index].type = "normal";
    for(let i of input){
      sub_index = is_key(i, mapping);
      if(sub_index != -1){
        if(mode == ""){
          output_msg.push({type: mapping[sub_index].type, content: ""});
          mode = i;
          index++;
        } else if (mode == i){
          output_msg[index].content += mapping[sub_index].id;
          output_msg.push({type: "normal", content: ""});
          index++;
          mode = "";
          continue;
        }
      }
      output_msg[index].content += i;
    }
    index = 0;
    for(let i of output_msg){
      if(i.content == ""){
        output_msg.splice(index, 1);
      }
      index++;
    }
    return output_msg;
  }

  async function send (){
    ai_response = "";
    output_msg = [{type: "normal", content: ""}];
    messages.push({ role: 'user', content: message});
    scrolldown();
    output_messages.push({role: "user", content: parse_whole(message)});
    thinking = true;
    const response = await ol.chat({
      model: model,
      messages: messages,
      // I truly dont know why this is erroring, so im just gonna ignore it
      // @ts-ignore
      stream: stream_status,
    });
    message = "";
    index = 0;
    for await (const part of response){
      ai_response += part.message.content;
      for(let i of part.message.content){
        parser(i);
        scrolldown();
      }
    }
    thinking = false;

    messages.push({role: "assistant", content: ai_response});
    output_messages.push({role: "assistant", content: parse_whole(ai_response)});
    // pushes system prompt after every message so that the model maintains it's system
    if(aggressive_retention){
      messages.push({role: "system", content: system_prompt});
    }
  }

  async function regen() {
    ai_response = "";
    output_msg = [{type: "normal", content: ""}];
    thinking = true;
    const response = await ol.chat({
      model: model,
      messages: messages,
      // I truly dont know why this is erroring, so im just gonna ignore it
      // @ts-ignore
      stream: stream_status,
    });
    message = "";
    index = 0;
    for await (const part of response){
      ai_response += part.message.content;
      for(let i of part.message.content){
        parser(i);
        scrolldown();
      }
    }
    thinking = false;

    messages.push({role: "assistant", content: ai_response});
    output_messages.push({role: "assistant", content: parse_whole(ai_response)});
    // pushes system prompt after every message so that the model maintains it's system
    if(aggressive_retention){
      messages.push({role: "system", content: system_prompt});
    }
  }

  const delete_to = (pos) => {
    let target = output_messages[pos];
    output_messages.splice(pos, output_messages.length - pos);
    if(target.role == "assistant"){
      messages.splice(pos + 1, messages.length - pos - 1);
      regen();
    } else {
      message = messages[pos + 1].content;
      messages.splice(pos + 1, messages.length - pos - 1);
    }
  }

  const toggleSettings = () => {
    if(settings_status == "hidden"){
      settings_status = '';
    } else {
      settings_status = "hidden";
      messages = [];
      messages.push({role: "system", content: system_prompt});
      output_messages = [];
    }
    console.log(messages);
  }

  const export_settings = () => {
      const blob = new Blob([JSON.stringify({name: name, system: system_prompt})], { type: 'application/json', });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}.json`;
      a.click();
      URL.revokeObjectURL(url);
  }

  const handleFileChange = (e) => { 
    const reader = new FileReader();
    reader.readAsText(e.target.files[0]);
    reader.onload = (event) => {
      const content = event.target.result;
      try {
        // @ts-ignore
        let json = JSON.parse(content); 
        name = json.name;
        system_prompt = json.system;
      } catch {
        console.log("Error!!!");
      }
    }
  };
</script>

<label for="close" class="blocker {settings_status}"></label>
<div class="settings {settings_status}">

  <input
  
    type="text"
    bind:value={name}
    placeholder="Name"
    style ="
      height: 10%;
    "
  >

  <textarea
    style="height: 80%;"
    bind:value={system_prompt}
    placeholder="System prompt"
  >

  </textarea>
    <span style="height: 10%;">
      <label for="export" class="controlLabel highlight">
        <p1>Export</p1>
      </label>

      <!-- svelte-ignore a11y_consider_explicit_label -->
      <button id="export" onclick={export_settings} class="controlLabel highlight"
        style="visibility: hidden; position: fixed;"
      ></button>

      <label class="controlLabel highlight" for="load">
        <p1>Load</p1>
      </label>
      <input
        id="load"
        type="file"
        placeholder="Load"
        style="position: fixed; visibility: hidden"
        onchange={handleFileChange} 
      >
    </span>
    <label class="controlLabel highlight" for="close">
      <p1>Done</p1>
    </label>
    <button id="close" style="visibility: hidden; position: fixed;" onclick={toggleSettings}>Done</button>
</div>

<div class="chat">

  {#each output_messages as msg, i}
    {#if msg.role != "system"}
      <div class="messageContainer">
        {#if edit_index == i + 1 && edit_vis}
          <textarea
            class="editMsg"
            bind:value={messages[i + 1].content}
          >
          </textarea>
        {:else}
          <div class="message {msg.role}">
            <p1>
              {#each msg.content as chunk}
                <i class="{chunk.type}">{chunk.content}</i>
              {/each}
            </p1>
          </div>
        {/if}

        <span class="controlBar {msg.role}">
          {#if msg.role == "assistant"}
            {#if !edit_vis || edit_index - 1 != i}
            <button onclick={() => {
              if(!edit_vis){
                edit_index = i + 1;
                edit_vis = true;
                console.log(messages);
              }
            }}
            class="icon highlight">E</button>
            {:else}
              <button onclick={() => {
                output_messages[i].content = parse_whole(messages[i + 1].content);
                edit_vis = false;
              }} class="icon highlight">V</button>
            {/if}
            <button onclick={() => delete_to(i)} class="icon highlight">B</button>
          {:else if msg.role == "user"}
            <button onclick={() => delete_to(i)} class="icon highlight">U</button>
          {/if}
        </span>
      </div>
    {/if}
  {/each}

  {#if thinking}
    <div class="messageContainer">
      <div class="message assistant">
        <p1>
          {#each output_msg as chunk}
            <i class="{chunk.type}">{chunk.content}</i>
          {/each}
        </p1>
      </div>
      <span class="controlBar assistant">
        <button class="icon highlight">E</button>
        <button class="icon highlight">B</button>
      </span>
    </div>
  {/if}

  <span style="width: 100vw; height: 20vh">

  </span>
    <span class="msgBar msg{messages.length}">
      <input
        onkeydown={(e) => e.key === "Enter" && send()}
        type="text"
        placeholder="Type a message"
        bind:value={message}
      >
      <span class="controlBar" style="background: none; width: 100%; height: 50px;">
        <p1>{name}</p1>
        {#if !thinking}
          <button onclick={toggleSettings} class="icon highlight">_</button>
        {:else}
          <button onclick={
            () => {
              ol.abort();
              messages.push({role: "assistant", content: ai_response});
              output_messages.push({role: "assistant", content: parse_whole(ai_response)});
              thinking = false;
            }
          } class="icon highlight">!</button>
        {/if}
      </span>
    </span>
</div>

<style>

  .msg1{
    transform: translateY(-37.5vh);
  }

  .controlLabel {
    background-color: #1a1a1a;
    display: flex;
    box-sizing: border-box;
    flex-direction: column;
    padding: 10px;
    border-radius: 10px;
    width: 100%;
    cursor: pointer;
  }

  .true {
    color: rgb(10, 199, 82) !important;
  }

  .editMsg {
    width: 80%;
    background-color: #2f2f2f;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    border: 2px solid var(--main-color);
    outline: none;
    font-size: 20px;
    font-weight: 0;
  }

  .controlBar {
    width: 100%;
    height: 50px;
    align-items: right;
    justify-content: right;
    width: 80%;
    display: flex;
    border-bottom-left-radius: 10px;
    border-bottom-right-radius: 10px;
    flex-direction: row;
    gap: 10px;
    box-sizing: border-box;
    background-color: #242424;
  }

  .ast {
    color: rgb(25, 191, 209);
  }

  .quote {
    color: rgb(232, 127, 29);
  }

  .code {
    background-color: #1a1a1a;
    display: flex;
    box-sizing: border-box;
    padding: 10px;
    border-radius: 10px;
  }

  .header {
    height: 10%;
    width: 100%;
    box-sizing: border-box;
  }

  button {
    border: none;
    white-space: pre-wrap;
  }

  i {
    font-style: normal;
  }

  .message {
    width: 80%;
    padding: 10px;
    display: flex;
    box-sizing: border-box;
    background-color: #2f2f2f;
    border-top-right-radius: 10px;
    border-top-left-radius: 10px;
    flex-direction: column;
    flex-wrap: wrap;
    word-wrap: anywhere;
    text-align: left;
    justify-content: left;
  }

  .messageContainer {
    width: 100%;
    display: flex;
    box-sizing: border-box;
    flex-direction: column;
    text-align: left;
  }

  .user {
    margin-left: 20%;
  }

  .assistant {
    margin-right: 20%;
  }

  .role {
    font-size: 28px;
  }

  .chat {
    width: 100%;
    height: 90%;
    justify-content: center;
    align-items: center;
    display: flex;
    box-sizing: border-box;
    flex: 1;
    padding: 2em;
    flex-direction: column;
    gap: 1em;
  }

  p1 {
    white-space: pre-wrap;
    font-size: 20px;
    text-align: left;
    align-items: left;
  }

  .msgBar {
    position: fixed;
    top: 80vh;
    width: 90vw;
    height: 15vh;
    background-color: #242424;
    display: flex;
    box-sizing: border-box;
    flex-direction: column;
    border-radius: 20px;
    transition:
      transform 750ms ease
    ;
  }

  .msgBar input {
    background: none;
    border: none;

  }

  .response {
    display: flex;
    height: 100%;
    width: 100%;
    flex-direction: column;
    box-sizing: border-box;
  }

  span {
    width: 100%;
    height: 10%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    gap: 10px;
  }

  input{
    width: 100%;
    height: 100%;
    padding: 15px;
    font-size: 24px;
    display: flex;
    box-sizing: border-box;
  }

  textarea, .settings input[type='text'] {
    width: 100%;
    height: 100%;
    padding: 15px;
    font-size: 24px;
    display: flex;
    background-color: #1a1a1a;
    border: none;
    border-radius: 10px;
    resize: none;
    box-sizing: border-box;
  }

  textarea::placeholder, .settings input::placeholder {
    color: #404040;
  }

  button {
    padding: 15px;
    font-size: 20px;
  }

  .hidden {
    transform: translateY(-100vh);
  }

  .blocker {
    width: 100vw;
    height: 100vh;
    position: fixed;
    background: rgba(0, 0, 0, 0.5);
    top: 0;
    left: 0;
    z-index: 50;
    scale: 1;
    transition:
      transform 1000ms ease
    ;
  }

  .settings {
    width: 80vw;
    height: 80vh;
    top: 10vh;
    left: 10vw;
    position: fixed;
    z-index: 75;
    background-color: #2a2a2a;
    display: flex;
    box-sizing: border-box;
    flex-direction: column;
    border-radius: 20px;
    padding: 2em;
    gap: 2px;
    flex-direction: column;
    transition:
      transform 1000ms ease
    ;
  }
</style>
