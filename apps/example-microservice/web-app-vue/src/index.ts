import { createApp } from 'vue';
import App from './App.vue';
import { TsRestPlugin } from './api/client';

createApp(App).use(TsRestPlugin).mount('#app');
