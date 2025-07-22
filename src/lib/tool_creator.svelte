<script>
    import { basicSetup, EditorView } from 'codemirror';
    import { javascript } from "@codemirror/lang-javascript"
    import { json } from "@codemirror/lang-json"
    import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
    import { keymap } from '@codemirror/view';
    import { indentWithTab } from "@codemirror/commands";
    import { oneDarkTheme } from '@codemirror/theme-one-dark';
    import { tags } from '@lezer/highlight';
    import { onMount } from 'svelte';
    import { EditorState } from "@codemirror/state";
    import { settings } from '../global.svelte';

    const ivory = "#abb2bf", stone = "#7d8799", darkBackground = "#21252b", highlightBackground = "#2c313a", background = "#282c34", tooltipBackground = "#353a42", selection = "#3E4451", cursor = "#528bff";

    const myHighlightStyle = HighlightStyle.define([
        {tag: tags.keyword, color: "#e0186f"},
        {tag: tags.comment, color: "#a6aeb1", fontStyle: "italic"},
        {tag: tags.string, color: "#01c9ba"},
        {tag: tags.number, color: "#e0c31b"},
        {tag: tags.arithmeticOperator, color: "#1d9af3"},
        {tag: tags.operator, color: "#1d9af3"},
        {tag: tags.bracket, color: "#f31d8b"},
        {tag: tags.paren, color: "#d41447"},
        {tag: tags.invalid, color: "#ffffff"}
    ])

    const myTheme = EditorView.theme({
        "&": {
            color: ivory,
            backgroundColor: background
        },
        ".cm-content": {
            caretColor: cursor
        },
        ".cm-cursor, .cm-dropCursor": { borderLeftColor: cursor },
        "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": { backgroundColor: selection },
        ".cm-panels": { backgroundColor: darkBackground, color: ivory },
        ".cm-panels.cm-panels-top": { borderBottom: "2px solid black" },
        ".cm-panels.cm-panels-bottom": { borderTop: "2px solid black" },
        ".cm-searchMatch": {
            backgroundColor: "#72a1ff59",
            outline: "1px solid #457dff"
        },
        ".cm-searchMatch.cm-searchMatch-selected": {
            backgroundColor: "#6199ff2f"
        },
        ".cm-activeLine": { backgroundColor: "#6699ff0b" },
        ".cm-selectionMatch": { backgroundColor: "#aafe661a" },
        "&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket": {
            backgroundColor: "#bad0f847"
        },
        ".cm-gutters": {
            backgroundColor: background,
            color: stone,
            border: "none"
        },
        ".cm-activeLineGutter": {
            backgroundColor: highlightBackground
        },
        ".cm-foldPlaceholder": {
            backgroundColor: "transparent",
            border: "none",
            color: "#ddd"
        },
        ".cm-tooltip": {
            border: "none",
            backgroundColor: tooltipBackground
        },
        ".cm-tooltip .cm-tooltip-arrow:before": {
            borderTopColor: "transparent",
            borderBottomColor: "transparent"
        },
        ".cm-tooltip .cm-tooltip-arrow:after": {
            borderTopColor: tooltipBackground,
            borderBottomColor: tooltipBackground
        },
        ".cm-tooltip-autocomplete": {
            "& > ul > li[aria-selected]": {
                backgroundColor: highlightBackground,
                color: ivory
            }
        }
    }, { dark: true });

    let editor;
    let description;
    onMount(() => {
        editor = new EditorView({
            parent: document.getElementById("editor"),
            doc: 
`
/* ----- Your Code Below ----- */





`,
            // extensions: [basicSetup, javascript(), myTheme, syntaxHighlighting(myHighlightStyle)]
            extensions: [basicSetup, javascript(), myTheme, syntaxHighlighting(myHighlightStyle), keymap.of([indentWithTab])]
        });
        description = new EditorView({
            parent: document.getElementById("description"),
            doc: 
`[
  functionName: {
    description: "Function Description",
    function_parameters: [
        
    ]
  } 
]`,
            // extensions: [basicSetup, javascript(), myTheme, syntaxHighlighting(myHighlightStyle)]
            extensions: [basicSetup, json(), myTheme, syntaxHighlighting(myHighlightStyle), keymap.of([indentWithTab])]
        });
    })

    let functionName = $state("testFunc");
    let argName = $state("");
    let argType = $state("");
    let argDescription = $state("")
    let paramCount = $state(0);
    const addParam = () => {
        let parts = editor.state.doc.toString().split('\n');
        parts[paramCount] = "  const " + argName + " = args." + argName + ";\n";
        let total = "";
        for(let i of parts){
            total += i + '\n';
        };
        let endPosition = editor.state.doc.length;
        editor.dispatch({
            changes: { from: 0, to: endPosition, insert: total}
        });

        parts = description.state.doc.toString().split('\n');
        parts[(paramCount * 4) + 4] = "      " + argName + ": {\n        type: \"" + argType + "\",\n        description: \"" + argDescription + "\"\n      },\n";
        total = "";
        for(let i of parts){
            total += i + '\n';
        };
        endPosition = description.state.doc.length;
        description.dispatch({
            changes: { from: 0, to: endPosition, insert: total}
        });
        paramCount++;
    }

    const addTool = () => {
        // the tool should contain code to push it the the list in itself
        let thing = new Function('args', editor.state.doc.toString());
        settings.tool_definitions[functionName] = {
            func: thing,
            description: description.state.doc.toString()
        };
        settings.tool_definitions[functionName].func({location: "Tucson"});
    }
</script>

<div class="controlBar">
    <input
        type="text"
        placeholder="Parameter name"
        bind:value={argName}
    >

    <input
        type="text"
        placeholder="Parameter type"
        bind:value={argType}
    >

    <input
        type="text"
        placeholder="Parameter description"
        bind:value={argDescription}
    >
    <button onclick={addParam}>Add parameter</button>
</div>

<div id="editor" class="editor"></div>

<div id="description" class="description"></div>

<button onclick={addTool}>Add Tool</button>

<style>
    .editor {
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        padding: 20px;
    }

    .controlBar {
        width: 100%;
        display: flex;
        box-sizing: border-box;
        flex-direction: row;
        gap: 20px; 
        padding: 10px;
    }

    .controlBar input[type="text"], .controlBar button {
        width: 100%;
        display: flex;
        box-sizing: border-box;
        padding: 5px;
        min-height: 10px;
        font-size: 16px;
        font-family: 'monospace';
        border: none;
        border-radius: 5px;
        background-color: #282c34;
    }

    .description {
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        padding: 20px;
    }
</style>