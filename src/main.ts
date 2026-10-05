import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router';
// Self-hosted fonts: no request leaves the machine, and it works offline.
import '@fontsource-variable/inter/index.css';
import '@fontsource-variable/jetbrains-mono/index.css';
import './styles.css';

createApp(App).use(router).mount('#app');
