import { createRouter, createWebHashHistory } from 'vue-router';
import ExampleIndex from '../views/ExampleIndex.vue';
import HoldingList from '../views/prototype/asset/HoldingList.vue';
import PnlAnalysis from '../views/prototype/asset/PnlAnalysis.vue';

const routes = [
  {
    path: '/',
    name: 'example-index',
    component: ExampleIndex,
  },
  {
    path: '/prototype/asset/holding-list',
    name: 'asset-holding-list',
    component: HoldingList,
  },
  {
    path: '/prototype/asset/pnl-analysis',
    name: 'asset-pnl-analysis',
    component: PnlAnalysis,
  },
];

export default createRouter({
  history: createWebHashHistory(),
  routes,
});
