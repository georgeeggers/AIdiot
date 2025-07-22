import Chat from "./lib/chat.svelte";
import Settings from './lib/settings.svelte';
import ToolCreator from "./lib/tool_creator.svelte";
export const routes = {
    "/": Chat,
    "/settings": Settings,
    "/creator": ToolCreator
}