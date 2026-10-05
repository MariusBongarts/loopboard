import { createRouter, createWebHistory } from 'vue-router';
import HelpView from './views/HelpView.vue';
import HomeView from './views/HomeView.vue';
import NeedsYouView from './views/NeedsYouView.vue';
import WorkspaceView from './views/WorkspaceView.vue';

export const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: (to) => (to.hash ? { el: to.hash } : { top: 0 }),
  routes: [
    { path: '/', component: HomeView },
    { path: '/help', component: HelpView },
    { path: '/needs-you', component: NeedsYouView },
    { path: '/w/:ws', component: WorkspaceView, props: { view: 'feed' } },
    { path: '/w/:ws/specs', component: WorkspaceView, props: { view: 'specs' } },
    { path: '/w/:ws/issues', component: WorkspaceView, props: { view: 'issues' } },
    { path: '/w/:ws/projects', component: WorkspaceView, props: { view: 'projects' } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
});
