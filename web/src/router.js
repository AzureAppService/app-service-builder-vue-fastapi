import { createRouter, createWebHistory } from 'vue-router'
import Home from './views/Home.vue'
import NotFound from './views/NotFound.vue'
import Product from './views/Product.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/products/widget-1', component: Product },
    { path: '/:pathMatch(.*)*', component: NotFound },
  ],
})
