# Final Report

最终报告简洁说明：

- 实际使用的 Workspace、Handoff、Bundle、Snapshot 和 revisions；
- Handoff 原始 `mandatoryRiskReport`，不得改写或省略；
- 目标工程预检摘要，以及实际采用的组件、状态、路由和 Token 方案；
- 修改文件和变更范围；
- 目标工程静态检查、测试和视觉验证结果；
- Target validation 结果（如适用）；
- 相对 Screenshot/Fragment 的已知偏差、未实现项和剩余风险。
- 先报告 Review completeness：按 Case 说明是否已处理、Screenshot 是否查看、Scenario 是否重放，以及 obligation observations 是否完整。
- 再按五个维度列出 consumer-supported matched、已知 deviations、unverified 和 not-applicable，不输出自评分数，也不把 Review complete 描述成视觉验收通过。
- 每份不同 Screenshot 内容实际通过 `read_evidence_screenshot` 查看过的代表 blobId，以及它覆盖的 Case；相同 digest 的别名 blobId 不要求重复读取。
- 实际展开的 Screen packet、Case delta 和 detail projection，以及因没有实现问题而有意未读取的维度；不把未读取维度伪装为已验证。
- 末尾必须生成针对本次范围的 Human Verification Checklist，使用实际 Screen、Case 和 Screenshot blob ID 定位；只有 Delivery manifest 已提供路径时才写文件名。未提供 Target 截图不阻止本次实现交付，但相应视觉结论保持 `unverified`。
