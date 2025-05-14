<script>
  import { Ollama } from 'ollama';

  let system_prompt = "You are a helpful AI assistant";
  let stream_status = $state(true);
  let model = $state("smollm:135m");

  const ol = new Ollama({ host: "http://localhost:11434"});
  // this is the system prompt
  let messages = $state([{ role: "system", content: system_prompt}]);
  let message = $state("");
  let ai_response = $state("Type a message to ask me a question");
 
  let thinking = $state(false);

  // impleemnt sending logic
  async function send (){
    ai_response = "";
    messages.push({ role: 'user', content: message});
    thinking = true;
    const response = await ol.chat({
      model: model,
      messages: messages,
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
      console.log(response);
    }
    thinking = false;
    
    messages.push({role: "assistant", content: ai_response});
  }
</script>
<span class="header">
  <h1>AIdiot</h1>
</span>

<div class="chat">


    {#each messages as msg}
      {#if msg.role != "system"}
        <div class="messageContainer {msg.role}">
          <span class='message'>
            <p1 class="role">{msg.role}</p1>
            <p1>{msg.content}</p1>
          </span>
        </div>
      {/if}
    {/each}

    {#if thinking}
      <div class="messageContainer">
        <span class='message'>
          {#if stream_status}
            <p1 class="role">assistant</p1>
            <p1>{ai_response}</p1>
          {:else}
            <p1 class="role">assistant</p1>
            <p1>Thinking...</p1>
          {/if}
        </span>
      </div>
    {/if}

  <span>
      <input
        onkeydown={(e) => e.key === "Enter" && send()}
        type="text"
        placeholder="Type a message"
        bind:value={message}
      >

      <button onclick={send}>Send</button>
  </span>
 
</div>

<style>
  .header {
    height: 10%;
  }

  .message {
    width: 80%;
    padding: 10px;
    display: flex;
    box-sizing: border-box;
    background-color: #2f2f2f;
    border-radius: 8px;
    flex-direction: column;
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
    padding: 2em;
    flex-direction: column;
    gap: 1em;
  }

  p1 {
    white-space: pre-wrap;
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
    width: 90%;
    height: 100%;
    padding: 15px;
    font-size: 24px;
  }

  button {
    width: 10%;
    padding: 15px;
    font-size: 150%;
    height: 100%;
    cursor: pointer;
    box-sizing: border-box;
    display: flex;
  }

  button:hover {
    border: 2px solid white;
  }
</style>