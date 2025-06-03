<script>
  import { Ollama } from 'ollama';
  import { tick } from 'svelte';
  let name = $state("ChatBot");
  let system_prompt = $derived("");  
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

  const ol = new Ollama({ host: "http://localhost:11434"});
  // this is where the system prompt is first injected
  let messages = $state([{ role: "system", content: system_prompt}]);
  let message = $state("");
  let ai_response = $state("Type a message to ask me a question");
  let thinking = $state(false);
  let output_messages = $state([]);
  let settings_status = $state("hidden");
  let output_msg = $state([{type: "normal", content: ""}]);
  let index = $state(0);
  let mode = $state("");


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

  const test_parser = (i) => {
    let sub_index = 0;
    sub_index = is_key(i, mapping);
    if(sub_index != -1){
      if(mode == ""){
        console.log({type: mapping[sub_index].type, content: ""})
        output_msg.push({type: mapping[sub_index].type, content: ""});

        mode = i;
        console.log(mode);
        index++;
      } else if (mode == i){
        console.log("Terminating Character found!");
        output_msg[index].content += mapping[sub_index].id;
        output_msg.push({type: "normal", content: ""});
        index++;
        mode = "";
        return;
      }
    }
    output_msg[index].content += i;
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
        test_parser(i);
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
        test_parser(i);
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
    messages.splice(messages.length - pos - 1, messages.length - pos + 1);
    if(target.role == "assistant"){
      regen();
    } else {
      message = target.content;
    }
  }

  const toggleSettings = () => {
    if(settings_status == "hidden"){
      settings_status = '';
    } else {
      settings_status = "hidden";
      messages = [{ role: "system", content: system_prompt}];
    }
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

<div class="blocker {settings_status}"></div>
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

    bind:value={system_prompt}
    placeholder="System prompt"
  >

  </textarea>

    <span>

    <button
    
      onclick={() => { aggressive_retention = !aggressive_retention}}

    >Aggressive Retention: {aggressive_retention}</button>

    <button
    
      onclick={() => { stream_status = !stream_status}}

    >Streaming: {stream_status}</button>

    <button onclick={export_settings}>Export</button>

    <input
      type="file"
      placeholder="Load"
      onchange={handleFileChange} 
    >
    <button onclick={toggleSettings}>Done</button>
  </span>

</div>

<span class="header">
  <h1 style="color: var(--main-color);">{name}</h1>
  <button onclick={toggleSettings}>Settings</button>
</span>

<div class="chat">

  <span class="msgBar">
      <input
        onkeydown={(e) => e.key === "Enter" && send()}
        type="text"
        placeholder="Type a message"
        bind:value={message}
      >
  </span>

  {#each output_messages as msg, i}
    {#if msg.role != "system"}
      <div class="messageContainer">
        <span class="message {msg.role}">
          <span class="controlBar">
            {#if msg.role == "assistant"}
              <h3>{name}</h3>
              <button class="icon highlight">E</button>
              <button onclick={() => delete_to(i)} class="icon highlight">B</button>
            {:else if msg.role == "user"}
              <h3>You</h3>
              <button onclick={() => delete_to(i)} class="icon highlight">U</button>
            {/if}
          </span>
          <p1>
            {#each msg.content as chunk}
              <i class="{chunk.type}">{chunk.content}</i>
            {/each}
          </p1>
        </span>
      </div>
    {/if}
  {/each}

  {#if thinking}
    <div class="messageContainer">
      <div class="message assistant">
        <span class="controlBar">
            <h3>{name}</h3>
            <button class="icon highlight">E</button>
            <button class="icon highlight">B</button>
          </span>
        <p1>
          {#each output_msg as chunk}
            <i class="{chunk.type}">{chunk.content}</i>
          {/each}
        </p1>
      </div>
    </div>
  {/if}

  <span style="width: 100vw; height: 20vh">

  </span>

</div>

<style>

  .controlBar {
    width: 100%;
    height: 40px;
    display: flex;
    flex-direction: row;
    gap: 10px;
    box-sizing: border-box;
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
    border-radius: 8px;
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
    gap: 5px;
    flex-direction: column;
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
    top: 82vh;
    width: 90vw;
    height: 10vh;
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

  textarea {
    width: 100%;
    height: 100%;
    padding: 15px;
    font-size: 24px;
    display: flex;
    box-sizing: border-box;
  }

  button {
    padding: 15px;
    font-size: 20px;
  }

  .hidden {
    visibility: hidden;
  }

  .blocker {
    width: 100vw;
    height: 100vh;
    position: fixed;
    background-color: rgba(0, 0, 0, 0.8);
    top: 0;
    left: 0;
    z-index: 50;
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
    padding: 2em;
    gap: 2px;
    flex-direction: column;
  }
</style>
