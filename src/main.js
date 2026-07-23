import { createApp } from "vue";
import { createRouter, createWebHashHistory } from "vue-router";
import App from "./App.vue";
import DashboardView from "./views/DashboardView.vue";
import CalendarView from "./views/CalendarView.vue";
import ClubView from "./views/ClubView.vue";
import "./styles.css";

const router = createRouter({
  history: createWebHashHistory(),
  scrollBehavior(to, from, savedPosition) {
    return savedPosition || { top: 0 };
  },
  routes: [
    { path: "/", component: DashboardView },
    { path: "/calendar", component: CalendarView },
    { path: "/club/:id", component: ClubView, props: true },
  ],
});

createApp(App).use(router).mount("#app");
