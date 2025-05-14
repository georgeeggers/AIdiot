<script>
  import { Ollama } from 'ollama';

  let name = $state("ChatBot");
  let system_prompt = $derived("You are " + name + ", an AI assistant");  
  let stream_status = $state(true);
  let model = $state("dolphin3:8b");
  let aggressive_retention = $state(false);

  const ol = new Ollama({ host: "http://localhost:11434"});
  // this is where the system prompt is first injected
  let messages = $state([{ role: "system", content: system_prompt}]);
  let message = $state("");
  let ai_response = $state("Type a message to ask me a question");
  let thinking = $state(false);
  let output_messages = $derived([...messages].reverse());
  let settings_status = $state("hidden");

  async function send (){
    ai_response = "";
    messages.push({ role: 'user', content: message});
    thinking = true;
    const response = await ol.chat({
      model: model,
      messages: messages,
      // I truly dont know why this is erroring, so im just gonna ignore it
      // @ts-ignore
      stream: stream_status,
    });
    message = "";
    let count = 0;

    if(stream_status){
      for await (const part of response){
        ai_response += part.message.content;
        count++;
        if(count >= 10000){
          break;
        }
      }
    } else {
      ai_response = response.message.content;
    }
    thinking = false;
    messages.push({role: "assistant", content: ai_response});
    // pushes system prompt after every message so that the model maintains it's system
    if(aggressive_retention){
      messages.push({role: "system", content: system_prompt});
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

    <button onclick={toggleSettings}>Done</button>

  </span>

</div>

<span class="header">
  <h1>{name}</h1>
  <button onclick={toggleSettings}>Settings</button>
</span>

<div class="chat">

  <span style="width: 100vw; height: 20vh">

  </span>

  <span class="msgBar">
      <input
        onkeydown={(e) => e.key === "Enter" && send()}
        type="text"
        placeholder="Type a message"
        bind:value={message}
      >
  </span>

  {#if thinking}
    <div class="messageContainer">
      <span class='message'>
        {#if stream_status}
          <p1 class="role">{name}</p1>
          <p1>{ai_response}</p1>
        {:else}
          <p1 class="role">{name}</p1>
          <p1>Thinking...</p1>
        {/if}
      </span>
    </div>
  {/if}

  {#each output_messages as msg}
    {#if msg.role != "system"}
      <div class="messageContainer {msg.role}">
        <span class='message'>
          {#if msg.role == "assistant"}
            <p1 class="role">{name}</p1>
          {:else}
            <p1 class="role">You</p1>
          {/if}
          <p1 style='text-align: left;'>{msg.content}</p1>
        </span>
      </div>
    {/if}
  {/each}
 
</div>

<style>
  .header {
    height: 10%;
  }

  .message {
    width: 100%;
    padding: 10px;
    display: flex;
    box-sizing: border-box;
    background-color: #2f2f2f;
    border-radius: 8px;
    flex-direction: column;
    flex-wrap: wrap;
    word-wrap: anywhere;
  }

  .messageContainer {
    width: 100%;
    display: flex;
    box-sizing: border-box;
  }

  .user {
    align-items: right;
  }

  .assistant {
    align-items: left;
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
    flex-direction: column-reverse;
    gap: 1em;
  }

  p1 {
    white-space: pre-wrap;
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
    font-size: 24px;
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