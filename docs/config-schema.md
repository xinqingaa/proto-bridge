# ProtoBridge 配置 Schema 规划

本文档描述下一阶段配置方向。目前还没有完整实现。

## 1. 目标

配置需要支持：

- source project A 和 target project B
- 本地路径和远程 GitLab 仓库
- branch 或 tag 选择
- 未来 source/target 的多技术栈组合
- 当前 `vue3-prototype -> flutter-app` 工作流
- 确定性的输出目录
- 在迁移期间兼容现有 `prototypeRoot` 和 `flutterRoot` 配置

## 2. 规划配置形态

```json
{
  "source": {
    "kind": "vue3-prototype",
    "location": {
      "type": "remote",
      "repo": "git@gitlab.company.com:group/prototype.git",
      "ref": "main"
    }
  },
  "target": {
    "kind": "flutter-app",
    "location": {
      "type": "remote",
      "repo": "git@gitlab.company.com:group/mobile-app.git",
      "ref": "develop"
    }
  },
  "input": {
    "route": "/prototype/trade"
  },
  "outputDir": "./output/stock-trade",
  "capture": {
    "enabled": false,
    "url": "http://localhost:5173/#/prototype/trade"
  }
}
```

## 3. Source 和 Target

`source` 描述项目 A。

`target` 描述项目 B。

二者使用相同结构：

```ts
type ProjectDescriptor = {
  kind: string
  location: ProjectLocation
}
```

第一阶段支持的值是：

```text
source.kind = vue3-prototype
target.kind = flutter-app
```

未来可能支持：

```text
react-prototype
flutter-app
vue-app
react-app
figma-design
```

## 4. Location

### Local

```json
{
  "type": "local",
  "path": "/Users/name/work/project"
}
```

适合使用 local mode 的情况：

- 用户已经有本地 checkout
- remote Git 认证不可用
- 用户需要测试本地未提交改动
- clone 大仓库成本太高

### Remote

```json
{
  "type": "remote",
  "repo": "git@gitlab.company.com:group/project.git",
  "ref": "develop"
}
```

适合使用 remote mode 的情况：

- 团队成员希望共享同一份配置
- 不同用户的本地路径不一致
- 期望使用 branch 或 tag 指定源码状态
- 可复现性比本地便利性更重要

规划第一版中，`ref` 支持 branch 或 tag。

commit pinning 可以后续再加。

## 5. Cache Directory

远程仓库应该 clone 到：

```text
.proto-bridge/cache/repos
```

该路径应该被 Git 忽略。

缓存目录属于 ProtoBridge 项目 C，但里面保存的是生成的本地 checkout，不能提交到仓库。

## 6. Input

对于 `vue3-prototype`，第一阶段输入方式包括：

```json
{
  "input": {
    "route": "/prototype/trade"
  }
}
```

```json
{
  "input": {
    "url": "http://localhost:5173/#/prototype/trade"
  }
}
```

```json
{
  "input": {
    "file": "prototype/src/views/prototype/stock/StockTradePage.vue"
  }
}
```

后续 input 形态可以变成 adapter-specific：

```json
{
  "input": {
    "type": "route",
    "value": "/prototype/trade"
  }
}
```

## 7. Output

`outputDir` 控制生成文件写入位置：

```json
{
  "outputDir": "./output/stock-trade"
}
```

预期文件：

```text
migration-context.json
llm-prompt.md
migration-spec.md
```

如果开启 Playwright capture，可能额外生成：

```text
screenshot.png
dom-snapshot.json
```

## 8. Capture

旧配置使用：

```json
{
  "noCapture": true,
  "prototypeUrl": "http://localhost:5173/#/prototype/trade"
}
```

规划配置使用：

```json
{
  "capture": {
    "enabled": false,
    "url": "http://localhost:5173/#/prototype/trade"
  }
}
```

CLI 可以继续支持 `--capture` 和 `--no-capture` 作为覆盖参数。

## 9. 与当前配置兼容

当前配置在迁移期间应继续有效：

```json
{
  "prototypeRoot": "/path/to/TradeAppPrd",
  "flutterRoot": "/path/to/youfi",
  "route": "/prototype/trade",
  "target": "flutter",
  "outDir": "./output/stock-trade",
  "noCapture": true
}
```

内部可以 normalize 为：

```json
{
  "source": {
    "kind": "vue3-prototype",
    "location": {
      "type": "local",
      "path": "/path/to/TradeAppPrd"
    }
  },
  "target": {
    "kind": "flutter-app",
    "location": {
      "type": "local",
      "path": "/path/to/youfi"
    }
  },
  "input": {
    "route": "/prototype/trade"
  },
  "outputDir": "./output/stock-trade",
  "capture": {
    "enabled": false
  }
}
```

## 10. 示例：团队共享 Remote 配置

```json
{
  "source": {
    "kind": "vue3-prototype",
    "location": {
      "type": "remote",
      "repo": "git@gitlab.company.com:product/prototype-platform.git",
      "ref": "main"
    }
  },
  "target": {
    "kind": "flutter-app",
    "location": {
      "type": "remote",
      "repo": "git@gitlab.company.com:mobile/youfi-app.git",
      "ref": "develop"
    }
  },
  "input": {
    "route": "/prototype/trade"
  },
  "outputDir": "./output/stock-trade",
  "capture": {
    "enabled": false
  }
}
```

## 11. 示例：本地覆盖配置

```json
{
  "source": {
    "kind": "vue3-prototype",
    "location": {
      "type": "local",
      "path": "/Users/name/work/TradeAppPrd"
    }
  },
  "target": {
    "kind": "flutter-app",
    "location": {
      "type": "local",
      "path": "/Users/name/work/youfi"
    }
  },
  "input": {
    "route": "/prototype/trade"
  },
  "outputDir": "./output/stock-trade",
  "capture": {
    "enabled": false
  }
}
```

