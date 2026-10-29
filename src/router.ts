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
    {
      path: '/help',
      component: HelpView,
      children: [
        { path: '', component: () => import('./views/help/HelpOverview.vue') },
        { path: 'learn', component: () => import('./views/help/HelpLearn.vue') },
        { path: 'setup', component: () => import('./views/help/HelpSetup.vue') },
        { path: 'upgrade', component: () => import('./views/help/HelpUpgrade.vue') },
        { path: 'reference', component: () => import('./views/help/HelpReference.vue') },
      ],
    },
    { path: '/needs-you', component: NeedsYouView },
    { path: '/w/:ws', component: WorkspaceView, props: { view: 'feed' } },
    { path: '/w/:ws/home', component: WorkspaceView, props: { view: 'home' } },
    { path: '/w/:ws/specs', component: WorkspaceView, props: { view: 'specs' } },
    { path: '/w/:ws/issues', component: WorkspaceView, props: { view: 'issues' } },
    { path: '/w/:ws/issues/:id(\\d{4})', component: WorkspaceView, props: { view: 'issue' } },
    { path: '/w/:ws/projects', component: WorkspaceView, props: { view: 'projects' } },
    { path: '/w/:ws/routines', component: WorkspaceView, props: { view: 'routines' } },
    { path: '/w/:ws/routines/:slug', component: WorkspaceView, props: { view: 'routine' } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
});
