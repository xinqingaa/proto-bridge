# 团队快速使用 ProtoBridge

## 目录约定

把原型仓库和 Flutter 仓库放在同一级目录：

```text
work/
├── TradeAppPrd/   # Vue 原型项目
└── youfi/         # Flutter 目标项目
```

日常在 `youfi` 目录执行 ProtoBridge。

## 配置文件

在 `youfi` 根目录创建 `proto-bridge.config.json`：

```json
{
  "source": {
    "adapter": "vue3-prototype",
    "root": "../TradeAppPrd"
  },
  "target": {
    "adapter": "flutter-app",
    "root": "."
  },
  "outputRoot": "./protoBridgeOutput",
  "capture": false
}
```

这份配置使用相对路径，可以提交到 `youfi` 仓库。团队成员只需要保持两个仓库同级即可。

## 生成说明书

在 `youfi` 根目录执行：

```bash
npx @proto-bridge/cli generate
```

也可以直接传原型页面 URL：

```bash
npx @proto-bridge/cli generate --url "http://localhost:5173/#/prototype/etf-detail"
```

输出目录示例：

```text
protoBridgeOutput/etf-detail/
├── migration-context.json
└── migration-spec.md
```

## 常见问题

- 如果提示找不到 `config.source.root`，确认 `TradeAppPrd` 和 `youfi` 是否同级。
- 如果你的本地目录结构不同，可以临时修改 `source.root` 为自己的相对路径。
- ProtoBridge 不负责切换 `TradeAppPrd` 分支；生成前请自己确认原型仓库代码是目标版本。
