import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import SettingsView from '../views/SettingsView.vue'
import TagsView from '../views/TagsView.vue'
import CalendarView from '../views/CalendarView.vue'
import StatsView from '../views/StatsView.vue'
import PomodoroView from '../views/PomodoroView.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomeView,
    meta: { title: '提醒', icon: '🔔' }
  },
  {
    path: '/calendar',
    name: 'Calendar',
    component: CalendarView,
    meta: { title: '日历', icon: '📅' }
  },
  {
    path: '/tags',
    name: 'Tags',
    component: TagsView,
    meta: { title: '标签管理', icon: '🏷️' }
  },
  {
    path: '/stats',
    name: 'Stats',
    component: StatsView,
    meta: { title: '统计', icon: '📊' }
  },
  {
    path: '/pomodoro',
    name: 'Pomodoro',
    component: PomodoroView,
    meta: { title: '番茄专注', icon: '🍅' }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: SettingsView,
    meta: { title: '设置', icon: '⚙️' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router