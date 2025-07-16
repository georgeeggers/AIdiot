import Chat from "./lib/chat.svelte";
import Settings from './lib/settings.svelte';
import Test from './lib/test.svelte';
export const routes = {
    "/": Chat,
    "/settings": Settings,
    "/test": Test
}