// the main settings

import { Ollama } from "ollama";

export let settings = $state({
    name: "ChatBot", 
    system: "You are ChatBot, a helpful AI assistant", 
    streaming: true, model: "Load a model...", 
    tools: false, 
    debugMode: false,
    tool_definitions: {}
})

export const export_settings = () => {
    const blob = new Blob([JSON.stringify({ name: settings.name, system: settings.system })], { type: 'application/json', });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

export const parse_model_name = (input) => {
    let output = {
        from: "?",
        creator: "?",
        model: "?",
        quant: "?"
    }

    let temp = input.split("/");
    if (temp.length == 1) {
        output.from = "Ollama";
        temp = temp[0].split(":");
        output.model = temp[0];
        output.quant = temp[1];
    } else {
        if (temp[0] == "hf.co") {
            output.from = "HuggingFace";
            output.creator = temp[1];
            temp = temp[2].split(":")
            output.model = temp[0];
            output.quant = temp[1];

        } else {
            output.from = "Ollama";
            output.creator = temp[0];
            temp = temp[1].split(":")
            output.model = temp[0];
            output.quant = temp[1];
        }

    }

    return output;
}

const handleFileChange = (e) => {
    const reader = new FileReader();
    reader.readAsText(e.target.files[0]);
    reader.onload = (event) => {
        const content = event.target.result;
        try {
            // @ts-ignore
            let json = JSON.parse(content);

        } catch {
            console.log("Error!!!");
        }
    };
};



export const ol = new Ollama({ host: "http://localhost:11434" });