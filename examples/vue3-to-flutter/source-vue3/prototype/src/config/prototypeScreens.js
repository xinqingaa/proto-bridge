export const prototypeModules = [
  {
    module: 'asset',
    items: [
      {
        screenId: 'asset.holding-list',
        path: '/prototype/asset/holding-list',
        view: 'asset/HoldingList.vue',
        label: '持仓列表',
        title: '持仓列表',
        key: 'asset_holding_list',
        name: 'AssetHoldingList',
        status: 'ready',
        completed: true,
        owner: 'ProtoBridge Example',
        changelog: [
          {
            date: '2026-05-17',
            text: 'Add a compact list page for low-complexity reconstruction evidence.',
          },
        ],
      },
      {
        screenId: 'asset.pnl-analysis',
        path: '/prototype/asset/pnl-analysis',
        view: 'asset/PnlAnalysis.vue',
        label: '盈亏分析',
        title: '盈亏分析',
        key: 'asset_pnl_analysis',
        name: 'AssetPnlAnalysis',
        status: 'ready',
        completed: true,
        owner: 'ProtoBridge Example',
        changelog: [
          {
            date: '2026-05-17',
            text: 'Add tabs, filters, metric cards, trend chart, and trade detail sheet.',
          },
        ],
      },
    ],
  },
];
