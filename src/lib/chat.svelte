<script>
  import { tick } from "svelte";
  import {
    settings,
    export_settings,
    ol,
    parse_model_name,
  } from "../global.svelte";
  import { replace } from "svelte-spa-router";
  let name = $state("ChatBot");
  let system_prompt = $state("You are ChatBot, a helpful AI assistant");
  let stream_status = $state(true);
  let aggressive_retention = $state(false);

  let mapping = [
    {
      id: "*",
      type: "ast",
    },
    {
      id: '"',
      type: "quote",
    },
    {
      id: "`",
      type: "code",
    },
  ];

  // this is where the system prompt is first injected
  // svelte-ignore state_referenced_locally
  let messages = $state([{ role: "system", content: settings.system }]);
  let message = $state("");
  let ai_response = $state("Type a message to ask me a question");
  let thinking = $state(false);
  let output_messages = $state([]);
  let settings_status = $state("hidden");
  let output_msg = $state([{ type: "normal", content: "" }]);
  let index = $state(0);
  let mode = $state("");
  let edit_index = $state(0);
  let edit_vis = $state(false);
  let models = $state([]);
  let n_head = $state("");
  let n_status = $state("hidden");
  let n_body = $state("");

  const getWeather = (args) => {
    const location = args.location;
    return `The weather in ${location} is 71 degrees and raining`;
  }

  const sqrt = (args) => {
    const number = parseFloat(args.number);
    return `The square root of ${number} is ${Math.sqrt(number)}`;
  }

  const sendText = (args) => {
    const recipient = args.recipient;
    const message = args.message;
    if(Math.random() % 10 == 1){
        return `The text message to ${recipient} failed to send.`;
    }
    return `You succesfully sent the message \"${message}\" to \"${recipient}\"`
  }

  const tools = {
    "getWeather": getWeather,
    "sqrt": sqrt,
    "sendText": sendText
  }

  const notify = (head, body, time) => {
    n_head = head;
    n_body = body;
    n_status = "";
    setTimeout(() => {
      n_status = "hidden";
    }, time);
  };

  const scrolldown = async () => {
    await tick();
    window.scrollTo(0, document.body.scrollHeight);
  };

  // test the tool functionality in ollama

  const is_key = (input, map) => {
    let t_index = 0;
    for (let i of map) {
      if (i.id == input) {
        return t_index;
      }
      t_index++;
    }
    return -1;
  };

  const parser = async (input) => {
    let sub_index = 0;
    for (let i of input) {
      sub_index = is_key(i, mapping);
      if (sub_index != -1) {
        if (mode == "") {
          output_msg.push({ type: mapping[sub_index].type, content: "" });
          mode = i;
          index++;
        } else if (mode == i) {
          console.log("Terminating Character found!");
          output_msg[index].content += mapping[sub_index].id;
          output_msg.push({ type: "normal", content: "" });
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
  };

  const parse_whole = (input) => {
    let output_msg = [{ type: "normal", content: "" }];
    let mapping = [
      {
        id: "*",
        type: "ast",
      },
      {
        id: '"',
        type: "quote",
      },
      {
        id: "`",
        type: "code",
      },
    ];

    let index = 0;
    let sub_index = 0;
    let mode = "";
    output_msg[index].type = "normal";
    for (let i of input) {
      sub_index = is_key(i, mapping);
      if (sub_index != -1) {
        if (mode == "") {
          output_msg.push({ type: mapping[sub_index].type, content: "" });
          mode = i;
          index++;
        } else if (mode == i) {
          output_msg[index].content += mapping[sub_index].id;
          output_msg.push({ type: "normal", content: "" });
          index++;
          mode = "";
          continue;
        }
      }
      output_msg[index].content += i;
    }
    index = 0;
    for (let i of output_msg) {
      if (i.content == "") {
        output_msg.splice(index, 1);
      }
      index++;
    }
    return output_msg;
  };

  async function send() {
    if (settings.model == "Load a model...") {
      notify(
        "Error: No model loaded",
        "Please select a model from the settings menu",
        5000,
      );
      return;
    }
    if(!settings.streaming){
      output_msg = [{ type: "ast", content: "Thinking..." }];
    } else {
      output_msg = [{ type: "normal", content: "" }];
    }
    messages.push({ role: "user", content: message });
    scrolldown();
    output_messages.push({ role: "user", content: parse_whole(message) });
    message = "";
    thinking = true;
    const response = await ol.chat({
      model: settings.model,
      messages: messages,
      // I truly dont know why this is erroring, so im just gonna ignore it
      // @ts-ignore
      stream: settings.streaming,
    });
    ai_response = "";
    index = 0;
    if(settings.streaming){
      for await (const part of response) {
        ai_response += part.message.content;
        for (let i of part.message.content) {
          parser(i);
          scrolldown();
        }
      }
    } else {
      ai_response = response.message.content;
    }
    thinking = false;

    messages.push({ role: "assistant", content: ai_response });
    output_messages.push({
      role: "assistant",
      content: parse_whole(ai_response),
    });
    // pushes system prompt after every message so that the model maintains it's system
    if (aggressive_retention) {
      messages.push({ role: "system", content: system_prompt });
    }
  }

  async function regen() {
    if (settings.model == "") {
      notify(
        "Error: No model loaded",
        "Please select a model from the settings menu",
        5000,
      );
      return;
    }

    if(!settings.streaming){
      output_msg = [{ type: "ast", content: "Thinking..." }];
    } else {
      output_msg = [{ type: "normal", content: "" }];
    }
    scrolldown();
    thinking = true;
    const response = await ol.chat({
      model: settings.model,
      messages: messages,
      // I truly dont know why this is erroring, so im just gonna ignore it
      // @ts-ignore
      stream: settings.streaming,
    });
    ai_response = "";
    index = 0;
    if(settings.streaming){
      for await (const part of response) {
        ai_response += part.message.content;
        for (let i of part.message.content) {
          parser(i);
          scrolldown();
        }
      }
    } else {
      ai_response = response.message.content;
    }
    thinking = false;


    messages.push({ role: "assistant", content: ai_response });
    output_messages.push({
      role: "assistant",
      content: parse_whole(ai_response),
    });
    // pushes system prompt after every message so that the model maintains it's system
    if (aggressive_retention) {
      messages.push({ role: "system", content: system_prompt });
    }
  }

  const delete_to = (pos) => {
    let target = output_messages[pos];
    output_messages.splice(pos, output_messages.length - pos);
    if (target.role == "assistant") {
      messages.splice(pos + 1, messages.length - pos - 1);
      regen();
    } else {
      message = messages[pos + 1].content;
      messages.splice(pos + 1, messages.length - pos - 1);
    }
  };

  const init = async () => {
    console.log(settings.model);
    if (settings.model == "Load a model...") {
      let response = await ol.list();
      models = response.models;
      settings.model = models[0].name;
    }
  };

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
    };
  };

  const use_tools = async (question) => {
    // this first message will simply determine if the user requested something that would warrant tools or not
    if (settings.model == "Load a model...") {
      notify(
        "Error: No model loaded",
        "Please select a model from the settings menu",
        5000,
      );
      return;
    }
    ai_response = "";

    messages.push({ role: "user", content: message });
    scrolldown();
    output_messages.push({ role: "user", content: parse_whole(message) });
    thinking = true;
    message = "";
    output_msg = [{ type: "normal", content: "Identifying tools..." }];
    let temp_messages = [
      {
        role: "system",
        content: `If the user asks anything that could activate a tool, begin your response with the flag \"[TOOL_CALL]\", followed by valid JSON array in this format: {\"tools\": [{\"tool_name\": \"tool_1\", \"parameters\"": {\"param1\": \"arg1\"}"}, {\"tool_name\": \"tool_2\", \"parameters\": {\"param1\": \"arg1\"}"}]}. Expand the JSON to account for more tools and more arguments as needed. If the user does not say anything that would garner a tool call, output the flag \"[NO_TOOL]\", and nothing else. Never respond with anything other than the [TOOL_CALL] flags, or valid JSON.
        
        \nThe tools available to you are as follows:\n
        {
            function_name: getWeather, 
            description: \"Returns the temperature and weather conditions at a given location\"
            function_parameters: [
            location: {
                type: \"string\",
                description: \"The target location\"
            }
            ]
        },
        {
            function_name: sqrt, 
            description: \"Return the square root of a number\"
            function_parameters: [
            number: {
                type: \"number\",
                description: \"The number to take the root of\"
            }
            ]
        },
        {
            function_name: sendText, 
            description: \"Sends a text message to someone\"
            function_parameters: [
            recipient: {
                type: \"string\",
                description: \"The recipient of the message\"
            },
            message: {
                type: \"string\",
                description: \"The message to send\"
            }
            ]
        }

        Never respond with a call to a tool you do not have access to in any scenario. You only have access to the getWeather, sqrt, and sendText functions

        `,
      },
      {
        role: "user",
        content: question,
      },
    ];

    while (true) {
      let response = await ol.chat({
        model: settings.model,
        messages: temp_messages,
      });

      if (
        response.message.content.substring(0, 11) == "[TOOL_CALL]" ||
        response.message.content.substring(0, 13) == '"[TOOL_CALL]"'
      ) {
        console.log("Tool called!");
        let sys_context =
          "Here are the responses from your tools calls. This should provide information to aid your response. Do not mention you got aid from tool calls, with the exception of if the tool returned an error\n";
        let stuff = response.message.content.split("[TOOL_CALL]")[1];
        console.log(stuff);
        try {
          stuff = JSON.parse(stuff);
        } catch (Err) {
          console.log("error :(", Err);
          continue;
        }

        // @ts-ignore
        for (let i of stuff.tools) {
          try {
            let result = tools[i.tool_name](i.parameters) + "\n";
            sys_context += result;
            output_messages.push({ role: "tool", content: parse_whole("Tool \"" + i.tool_name + '\" called\n' + result) })
          } catch (Err) {
            sys_context +=
              "The call to " +
              i.tool_name +
              " failed, and returned the error " +
              Err;
            output_messages.push({ role: "tool", content: parse_whole("Attempt to call \"" + i.tool_name + '\" errored\n' + Err) })
            
          }
        }
        console.log(sys_context);
        messages.push({ role: "tool", content: sys_context });
        break;
      } else if (
        response.message.content.substring(0, 9) == "[NO_TOOL]" ||
        response.message.content.substring(0, 11) == '"[NO_TOOL]"'
      ) {
        console.log("Response does not contain tools!");
        break;
      } else {
        console.log("Format error");
        console.log(response.message.content);
      }
    }

    // actually run the question
    if(!settings.streaming){
      output_msg = [{ type: "ast", content: "Thinking..." }];
    } else {
      output_msg = [{ type: "normal", content: "" }];
    }
    scrolldown();
    const finalResponse = await ol.chat({
      model: settings.model,
      messages: messages,
      // @ts-ignore
      stream: settings.streaming
    });

    thinking = true;
    ai_response = "";
    index = 0;
    if(settings.streaming){
      for await (const part of finalResponse) {
        ai_response += part.message.content;
        for (let i of part.message.content) {
          parser(i);
          scrolldown();
        }
      }
    } else {
      ai_response = finalResponse.message.content;
    }
    thinking = false;

    messages.push({ role: "assistant", content: ai_response });
    output_messages.push({
      role: "assistant",
      content: parse_whole(ai_response),
    });
  };

  const process_message = () => {
    if(settings.tools){
      use_tools(message);
    } else {
      send();
    }
  }

  init();
</script>

<label for="closeNotif" class="notification {n_status}">
  <h2>{n_head}</h2>
  <p1>{n_body}</p1>
</label>

<button
  style="position: fixed; visibility: hidden;"
  id="closeNotif"
  onclick={() => {
    n_status = "hidden";
  }}>Close</button
>

<div class="chat">
  {#each output_messages as msg, i}
    {#if msg.role != "system"}
      <div class="messageContainer">
        {#if edit_index == i + 1 && edit_vis}
          <textarea class="editMsg" bind:value={messages[i + 1].content}>
          </textarea>
        {:else}
          <div class="message {msg.role}">
            <p1>
              {#each msg.content as chunk}
                <i class={chunk.type}>{chunk.content}</i>
              {/each}
            </p1>
          </div>
        {/if}

        {#if msg.role == "assistant" || msg.role == "user"}
          <span class="controlBar {msg.role}">
            {#if msg.role == "assistant"}
              {#if !edit_vis || edit_index - 1 != i}
                <button
                  onclick={() => {
                    if (!edit_vis) {
                      edit_index = i + 1;
                      edit_vis = true;
                      console.log(messages);
                    }
                  }}
                  class="icon highlight">E</button
                >
              {:else}
                <button
                  onclick={() => {
                    output_messages[i].content = parse_whole(
                      messages[i + 1].content,
                    );
                    edit_vis = false;
                  }}
                  class="icon highlight">V</button
                >
              {/if}
              <button onclick={() => delete_to(i)} class="icon highlight"
                >B</button
              >
              {:else if msg.role == "user"}
                <button onclick={() => delete_to(i)} class="icon highlight"
                  >U</button
                >
              {/if}
          </span>
        {/if}
      </div>
    {/if}
  {/each}

  {#if thinking}
    <div class="messageContainer">
      <div class="message assistant">
        <p1>
          {#each output_msg as chunk}
            <i class={chunk.type}>{chunk.content}</i>
          {/each}
        </p1>
      </div>
      <span class="controlBar assistant">
        <button class="icon highlight">E</button>
        <button class="icon highlight">B</button>
      </span>
    </div>
  {/if}

  <span style="width: 100vw; height: 20vh"> </span>
  <span class="msgBar msg{messages.length}">
    <input
      onkeydown={(e) => e.key === "Enter" && process_message()}
      type="text"
      placeholder="Type a message"
      bind:value={message}
    />
    <span
      class="controlBar"
      style="background: none; width: 100%; height: 50px;"
    >
      {#if parse_model_name(settings.model).model.length >= 17}
        <p1>{parse_model_name(settings.model).model.substring(0, 17)}...</p1>
      {:else}
        <p1>{parse_model_name(settings.model).model}</p1>
      {/if}
      <p1>{"  -  "}</p1>
      <p1>{settings.name}</p1>
      {#if !thinking}
        <button onclick={() => replace("/settings")} class="icon highlight"
          >_</button
        >
      {:else}
        <button
          onclick={async () => {
            await ol.abort();
            messages.push({ role: "assistant", content: ai_response });
            output_messages.push({
              role: "assistant",
              content: parse_whole(ai_response),
            });
            thinking = false;
          }}
          class="icon highlight">!</button
        >
      {/if}
    </span>
  </span>
</div>

<style>
  .notification {
    z-index: 100;
    position: fixed;
    width: 40vw;
    left: 5vw;
    top: 5vh;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    padding: 20px;
    border: 2px solid var(--main-color);
    background-color: var(--bg-color);
    border-radius: 20px;
    opacity: 1;
    transition:
      transform 1000ms ease,
      opacity 1000ms ease;
  }

  .notification.hidden {
    transform: translateX(-35vw);
    opacity: 0;
  }

  .msg1 {
    top: calc(50vh - (max(125px, 15vh) / 2)) !important;
  }

  .controlLabel {
    background-color: var(--bg-color);
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
    width: 60%;
    background-color: var(--control-color);
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    border: 2px solid var(--main-color);
    outline: none;
    font-size: 20px;
    font-weight: 0;
  }

  .controlBar {
    width: 60%;
    height: 50px;
    align-items: right;
    justify-content: right;
    display: flex;
    border-bottom-left-radius: 10px;
    border-bottom-right-radius: 10px;
    flex-direction: row;
    gap: 10px;
    box-sizing: border-box;
    background-color: var(--body-color);
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
    width: 60%;
    padding: 10px;
    display: flex;
    box-sizing: border-box;
    background-color: var(--control-color);
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
    margin-left: 40%;
  }

  .assistant {
    margin-right: 40%;
  }

  .tool {
    width: 40%;
    margin-right: 60%;
    border-radius: 15px;
    background-color: var(--body-color);
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
    top: calc(100vh - max(125px, 15vh) - 50px);
    width: 90vw;
    height: 15vh;
    background-color: var(--body-color);
    display: flex;
    box-sizing: border-box;
    flex-direction: column;
    min-height: 125px;
    border-radius: 20px;
    transition: top 250ms ease;
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

  input {
    width: 100%;
    height: 100%;
    padding: 15px;
    font-size: 24px;
    display: flex;
    box-sizing: border-box;
  }

  textarea,
  .settings input[type="text"] {
    width: 100%;
    height: 100%;
    padding: 15px;
    font-size: 24px;
    display: flex;
    background-color: var(--bg-color);
    border: none;
    border-radius: 10px;
    resize: none;
    box-sizing: border-box;
  }

  textarea::placeholder,
  .settings input::placeholder {
    color: #404040;
  }

  button {
    padding: 15px;
    font-size: 20px;
  }

  .hidden {
    transform: translateY(-100vh);
    /* I truly don't know why this wont work without the !important directive, but it doesn't, so there ya go*/
    opacity: 0 !important;
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
    opacity: 1;
    transition:
      transform 1000ms ease,
      opacity 1000ms ease;
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
    opacity: 1;
    transition:
      transform 1000ms ease,
      opacity 1000ms ease;
  }
</style>
