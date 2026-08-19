# ADR 0009：Flutter 官方 MCP 使用操作者 DTD URI 与 Driver Bridge

状态：Superseded by [ADR 0010](./0010-flutter-mcp-remains-experimental.md)

日期：2026-08-18

本 ADR 记录当时实验实现采用的协议边界，不再描述当前默认产品行为。

## 背景

实际 Dart and Flutter MCP server 提供 `connect_dart_tooling_daemon`、
`get_widget_tree`、`flutter_driver` 和 `get_runtime_errors`。它不提供自动枚举任意
DTD 的 attach-only Tool，也不提供通用 `vm_service` Tool。旧实现依赖的
`dtd`、`vm_service`、`widget_inspector` 和 `flutter_driver_command` 因而无法与
官方 server 建立真实 Runtime Review。

## 决策

- DTD URI 由操作者从当前已运行的 debug App/IDE 复制，通过 Local Service 环境输入；
- 原始 DTD URI 只保留在进程内存，不进入 Store、Review receipt 或 MCP projection；
- Local Service 只 allowlist 当前官方四个 Runtime Tool，不调用设备/App 生命周期 Tool；
- App identity、Case prepare 和 typed observation 通过 debug-only Flutter Driver
  Bridge 的稳定 finder 读取；不建立第二条直连 VM Service 的 Runtime provider；
- Core 只持久化 attach、identity、prepare、observe、screenshot、interaction 和
  runtime-errors 等 provider-neutral capability；
- 新 Flutter Review 使用 machine contract v3。v2 只作为历史输入存在，不能创建
  新 Runtime Review；
- 每次 render/scenario 固定 before/after runtime-error receipt，每个 render attempt
  在完成前必须存在 artifact compare。

## 后果

ProtoBridge 保持 attach-only，不需要拥有 Simulator、Emulator 或物理设备生命周期。
操作者必须先启动带 build identity 的 debug App，并提供当前 DTD URI。官方 MCP 或
Driver Bridge 缺失时 Runtime 轨保持未验证，Code/Semantic Review 仍可继续，且没有
launcher、任意图片或自述 JSON fallback。
