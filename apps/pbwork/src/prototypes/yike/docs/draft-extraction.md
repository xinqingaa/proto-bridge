# 草稿资源原始提取（生成）

> 由 `node apps/pbwork/src/prototypes/yike/scripts/extract-draft-resources.mjs` 生成；加 `--check` 校验新鲜度。不要手工编辑。

本文件保留草稿事实，不是正式 Token 表、完成记录或 Evidence。映射与组件归属见 [resources.md](./resources.md)，当前验收见 [implementation.md](./implementation.md)。

范围：批准的 `drafts/yike/styles/`。包含浅深主题变量、CSS 中含数字的声明（含设备壳与工具样式，必须甄别）、模板动态样式/SVG 位置与展示状态。JS 几何、SVG 路径和最终浏览器合成效果仍需人工审阅；不会自动认定为可提升 Token。

## 来源指纹

| 文件 | SHA-256 |
| --- | --- |
| [CheckInScreen.vue](../../../drafts/yike/styles/CheckInScreen.vue) | `f47fce2716b13c3fc9953d0fae593d32bf0befc7976cbaf61ede789e394668d4` |
| [Dial.vue](../../../drafts/yike/styles/Dial.vue) | `1f9acae73fee5c0d03610a49011e9713436894d930bbe81ea85e24e40389b685` |
| [FocusScreen.vue](../../../drafts/yike/styles/FocusScreen.vue) | `26f29b7152bc2d042e78bc6d9cde334b3fda81fb169933fe57635ebca144229a` |
| [HabitDetailScreen.vue](../../../drafts/yike/styles/HabitDetailScreen.vue) | `4cb0738a20fa8b0c8db3b935af7144443539cca54cedf99c6aa2c4cba501715a` |
| [HabitEditorScreen.vue](../../../drafts/yike/styles/HabitEditorScreen.vue) | `c01be715028c2e42ea4a97393c885e881579cfb078b1382a7b45eaa2ff9ce96b` |
| [LaunchScreen.vue](../../../drafts/yike/styles/LaunchScreen.vue) | `3e31049aeece4e199fa772496d7ac187aa58f0375048393d91bb3ade80388b6f` |
| [PunchButton.vue](../../../drafts/yike/styles/PunchButton.vue) | `6f551f7d49a735f2c57c0899aca790c4d530aadd060a341fcd7acc4dcc2bfbe2` |
| [ReviewScreen.vue](../../../drafts/yike/styles/ReviewScreen.vue) | `85293fc3ff0cb580cef89132bb91ad829ea043b40c815637914739b17db2d094` |
| [SettingsScreen.vue](../../../drafts/yike/styles/SettingsScreen.vue) | `42a828c24cbf054c897092d6c11a934b5aeb9cbb33c78e078757c235b1741464` |
| [Sheet.vue](../../../drafts/yike/styles/Sheet.vue) | `9fb4af3234fb41c2febb8c5c2e8515fb3839a50d89b311cefa2969c6683079e5` |
| [StylePhone.vue](../../../drafts/yike/styles/StylePhone.vue) | `d825a3ec479746f7fe2a62cdf722237b6b03e9f16fce93f262bcb44bad55c9e0` |
| [TabBar.vue](../../../drafts/yike/styles/TabBar.vue) | `70ccafd49b2e6cbe29bee0eebd74ae420a8f05b5358efd06bfc6f911603c3b96` |
| [YikeScreen.vue](../../../drafts/yike/styles/YikeScreen.vue) | `fb8abc1dfcbe2e37387ac33b315d4e3c3553fb3435627df687cd39f364f4d82d` |
| [directions.ts](../../../drafts/yike/styles/directions.ts) | `1f608d97cb0c71e86bf75782a8d123f32bbfdd1fa428c8fabb1f040f02eaa97b` |
| [gallery.ts](../../../drafts/yike/styles/gallery.ts) | `291f60d9fcad6f91ae03f535dc2528c38b0a741702fae860b3d8082896221e94` |
| [sample.ts](../../../drafts/yike/styles/sample.ts) | `f19e6678f027e0658e16f25d7d3ed98531e5783573e0f7e9716d5821171a1d9f` |
| [styles.css](../../../drafts/yike/styles/styles.css) | `8eb286c169761a6aea881453435823ba01b26e0be5f8e5e5d8f616a3f8c6a226` |

## 主题变量

深色未重新声明的变量继承该主题浅色块。下表只展开这一显式覆盖关系，不模拟浏览器级联；字体公共声明另列。

### mechanical

| 变量 | 浅色原值 | 深色原值 | CSS 行（浅 / 深） |
| --- | --- | --- | --- |
| `--ys-bg` | `#e8eae8` | `#141715` | 163 / 185 |
| `--ys-surface` | `#f5f6f4` | `#1e221f` | 164 / 186 |
| `--ys-sunken` | `#dcdfdc` | `#191c1a` | 165 / 187 |
| `--ys-ink` | `#1d2220` | `#eceeeb` | 166 / 188 |
| `--ys-muted` | `#6a716d` | `#8e9590` | 167 / 189 |
| `--ys-line` | `rgba(29, 34, 32, 0.12)` | `rgba(236, 238, 235, 0.12)` | 168 / 190 |
| `--ys-line-strong` | `rgba(29, 34, 32, 0.28)` | `rgba(236, 238, 235, 0.3)` | 169 / 191 |
| `--ys-accent` | `#c65a3a` | `#da6a47` | 170 / 192 |
| `--ys-on-accent` | `#fff7f2` | `#1b0f0a` | 171 / 193 |
| `--ys-accent-soft` | `rgba(198, 90, 58, 0.13)` | `rgba(218, 106, 71, 0.18)` | 172 / 194 |
| `--ys-danger` | `#b4442a` | `#e07656` | 173 / 195 |
| `--ys-lift` | `rgba(29, 34, 32, 0.1)` | `rgba(0, 0, 0, 0.4)` | 174 / 196 |
| `--ys-scrim` | `rgba(20, 24, 22, 0.34)` | `rgba(0, 0, 0, 0.55)` | 175 / 197 |
| `--ys-title-weight` | `700` | `700` | 176 / 继承浅色 |
| `--ys-title-spacing` | `-0.01em` | `-0.01em` | 177 / 继承浅色 |
| `--ys-heading-weight` | `700` | `700` | 178 / 继承浅色 |
| `--ys-radius` | `18px` | `18px` | 179 / 继承浅色 |
| `--ys-radius-sm` | `12px` | `12px` | 180 / 继承浅色 |
| `--ym-rim` | `#d9dcd9` | `#2a2f2b` | 181 / 198 |

### water

| 变量 | 浅色原值 | 深色原值 | CSS 行（浅 / 深） |
| --- | --- | --- | --- |
| `--ys-bg` | `#e3e6e0` | `#101412` | 202 / 227 |
| `--ys-surface` | `#f1f2ee` | `#191e1b` | 203 / 228 |
| `--ys-sunken` | `#d8dcd5` | `#141815` | 204 / 229 |
| `--ys-ink` | `#1e2925` | `#e6ece6` | 205 / 230 |
| `--ys-muted` | `#69736e` | `#8b968e` | 206 / 231 |
| `--ys-line` | `rgba(30, 41, 37, 0.12)` | `rgba(230, 236, 230, 0.1)` | 207 / 232 |
| `--ys-line-strong` | `rgba(30, 41, 37, 0.3)` | `rgba(230, 236, 230, 0.28)` | 208 / 233 |
| `--ys-accent` | `#5c7a5d` | `#86a685` | 209 / 234 |
| `--ys-on-accent` | `#f4f6f2` | `#0f1711` | 210 / 235 |
| `--ys-accent-soft` | `rgba(92, 122, 93, 0.15)` | `rgba(134, 166, 133, 0.18)` | 211 / 236 |
| `--ys-danger` | `#a4553f` | `#d27c62` | 212 / 237 |
| `--ys-lift` | `rgba(30, 41, 37, 0.08)` | `rgba(0, 0, 0, 0.35)` | 213 / 238 |
| `--ys-scrim` | `rgba(18, 26, 22, 0.32)` | `rgba(0, 0, 0, 0.55)` | 214 / 239 |
| `--ys-title-weight` | `300` | `300` | 215 / 继承浅色 |
| `--ys-title-spacing` | `0` | `0` | 216 / 继承浅色 |
| `--ys-heading-weight` | `400` | `400` | 217 / 继承浅色 |
| `--ys-radius` | `22px` | `22px` | 218 / 继承浅色 |
| `--ys-radius-sm` | `14px` | `14px` | 219 / 继承浅色 |
| `--yw-water` | `#7e977d` | `#2e4632` | 220 / 240 |
| `--yw-water-break` | `#a9bba7` | `#253229` | 221 / 241 |
| `--yw-wave` | `rgba(255, 255, 255, 0.2)` | `rgba(255, 255, 255, 0.06)` | 222 / 242 |
| `--yw-submerged` | `#f4f6f2` | `#cfe2cd` | 223 / 243 |

### sundial

| 变量 | 浅色原值 | 深色原值 | CSS 行（浅 / 深） |
| --- | --- | --- | --- |
| `--ys-bg` | `#e2e0db` | `#161619` | 247 / 270 |
| `--ys-surface` | `#eceae5` | `#212126` | 248 / 271 |
| `--ys-sunken` | `#d7d5cf` | `#1b1b1f` | 249 / 272 |
| `--ys-ink` | `#1c1b19` | `#e8e6e1` | 250 / 273 |
| `--ys-muted` | `#6e6a63` | `#8f8c86` | 251 / 274 |
| `--ys-line` | `rgba(28, 27, 25, 0.12)` | `rgba(232, 230, 225, 0.1)` | 252 / 275 |
| `--ys-line-strong` | `rgba(28, 27, 25, 0.26)` | `rgba(232, 230, 225, 0.26)` | 253 / 276 |
| `--ys-accent` | `#2f4a80` | `#93a9db` | 254 / 277 |
| `--ys-on-accent` | `#f2f0eb` | `#12141b` | 255 / 278 |
| `--ys-accent-soft` | `rgba(47, 74, 128, 0.11)` | `rgba(147, 169, 219, 0.16)` | 256 / 279 |
| `--ys-danger` | `#a63a2b` | `#e0806f` | 257 / 280 |
| `--ys-lift` | `rgba(28, 27, 25, 0.1)` | `rgba(0, 0, 0, 0.4)` | 258 / 281 |
| `--ys-scrim` | `rgba(20, 19, 17, 0.32)` | `rgba(0, 0, 0, 0.55)` | 259 / 282 |
| `--ys-title-weight` | `400` | `400` | 260 / 继承浅色 |
| `--ys-title-spacing` | `0.12em` | `0.12em` | 261 / 继承浅色 |
| `--ys-heading-weight` | `400` | `400` | 262 / 继承浅色 |
| `--ys-radius` | `6px` | `6px` | 263 / 继承浅色 |
| `--ys-radius-sm` | `4px` | `4px` | 264 / 继承浅色 |
| `--yd-shadow` | `rgba(28, 27, 25, 0.2)` | `rgba(147, 169, 219, 0.16)` | 265 / 283 |
| `--yd-shadow-strong` | `rgba(28, 27, 25, 0.3)` | `rgba(147, 169, 219, 0.32)` | 266 / 284 |

## 公共变量

| 选择器 | 变量 | 原值 | CSS 行 |
| --- | --- | --- | --- |
| `.ys-phone` | `--ys-font` | `system-ui, -apple-system, "PingFang SC", sans-serif` | 98 |
| `.ys-phone` | `--ys-text` | `var(--ys-font)` | 99 |
| `.ys-phone` | `--ys-num` | `var(--ys-font)` | 100 |
| `.ys-phone` | `--ys-display` | `var(--ys-font)` | 101 |
| `.ys-phone` | `--ym-mono` | `var(--ys-font)` | 102 |
| `.ys-phone` | `--yd-kai` | `var(--ys-font)` | 103 |

## CSS 数值声明清单

保留选择器与源行，包含字号、间距、圆角、描边、阴影、比例、动效和绘制值；相同属性和值合并列出位置。此清单也包含布局语法数字，不能全量抄入主题包。

| 属性 | 原值 | 选择器与 CSS 行 |
| --- | --- | --- |
| `width` | `100%` | `.yk-suite:10`；`.ys-phone .y-button.is-block:535`；`.ys-phone .y-sheet-actions .y-button:673`；`.ym-dial svg:964`；`.yw-surface:1102`；`.y-heat-week i:1627`；`.ys-phone .y-list button, .y-list-row:1675`；`.y-bar:1937`；`.y-bar i:1946` |
| `max-width` | `1060px` | `.yk-suite:11` |
| `gap` | `44px` | `.yk-suite:14` |
| `min-height` | `0` | `.yk-suite .yk-lab-column-head:19`；`.ys-phone-body:133` |
| `margin` | `0` | `.yk-suite-section > h2:29`；`.ys-phone-figure:88`；`:where(.ys-phone) :where(ul, ol):147`；`:where(.ys-phone) :where(h2, h3, p, dl, dd):153` |
| `gap` | `28px 26px` | `.yk-suite-row:42` |
| `zoom` | `0.6` | `.yk-suite .ys-phone:46` |
| `margin` | `var(--pb-spacing-xs) 0 0` | `.yk-compare-palette:57` |
| `padding` | `0` | `.yk-compare-palette:58`；`.ys-phone button:138`；`:where(.ys-phone) :where(ul, ol):148` |
| `width` | `14px` | `.yk-compare-palette i:71`；`.y-holes > i::before, .y-empty-card i, .y-goal i:1327` |
| `height` | `14px` | `.yk-compare-palette i:72`；`.y-holes > i::before, .y-empty-card i, .y-goal i:1328` |
| `border-radius` | `50%` | `.yk-compare-palette i:73`；`.ys-phone .y-icon-button:385`；`.y-switch::after:604`；`.y-modes .is-active::after:734`；`.yd-shadow:1141`；`.y-holes > i::before, .y-empty-card i, .y-goal i:1329`；`.ys-phone .y-punch:1380`；`.y-heat-week i:1629`；`.ys-phone .y-stepper button:1851`；`.y-cal-day i:2150` |
| `box-shadow` | `inset 0 0 0 1px rgba(0, 0, 0, 0.12)` | `.yk-compare-palette i:74` |
| `gap` | `10px` | `.ys-phone-figure:87`；`.y-sheet:633`；`.y-sheet-actions:669`；`.y-habit-name:1273`；`.y-empty-card:1458`；`.y-goal:1585`；`.y-field:1766`；`.y-icon-choices:1810`；`.y-faces:2208` |
| `zoom` | `0.74` | `.ys-phone:105` |
| `width` | `390px` | `.ys-phone:107` |
| `height` | `844px` | `.ys-phone:108` |
| `border-radius` | `46px` | `.ys-phone:111` |
| `box-shadow` | `0 0 0 10px #101114,     0 0 0 11px #2a2c31,     0 30px 60px rgba(0, 0, 0, 0.16)` | `.ys-phone:115` |
| `height` | `50px` | `.ys-phone-status:124`；`.ys-sundial .y-button:545` |
| `flex` | `0 0 auto` | `.ys-phone-status:125`；`.ys-phone svg:157`；`.ys-phone .y-icon-button:382`；`.y-tabbar:462`；`.y-list.is-values button > span:1704`；`.y-kinds b:2058` |
| `padding` | `0 34px 6px` | `.ys-phone-status:127` |
| `font` | `600 15px/1 var(--ys-font)` | `.ys-phone-status:128` |
| `flex` | `1` | `.ys-phone-body:134`；`.y-screen:293`；`.y-overlay-host:318`；`.ys-phone .y-segmented button:569`；`.y-laps b:869`；`.y-card-head span:1241`；`.y-habit-name > div:1277`；`.y-holes > i:1320`；`.y-stats > div:1513`；`.y-heat-week:1621`；`.y-list em:1696`；`.y-chart-day:1921`；`.y-kind-bar:2039`；`.y-day-card li span:nth-child(2):2109`；`.y-calendar-row > span:2129`；`.ys-phone .y-face:2213` |
| `border` | `0` | `.ys-phone button:139` |
| `min-width` | `0` | `.y-screen:292`；`.ys-phone .y-button.is-quiet:527` |
| `padding` | `8px 24px 0` | `.y-screen:295` |
| `flex-shrink` | `0` | `.y-screen > *:299` |
| `padding-bottom` | `28px` | `.y-screen.is-pushed:303` |
| `margin-top` | `18px` | `.y-screen.is-settings .y-section:307`；`.y-head:416`；`.y-banner:1217`；`.y-day-card:2066` |
| `min-height` | `46px` | `.ys-phone .y-screen.is-settings .y-list button, .y-screen.is-settings .y-list-row:312` |
| `gap` | `4px` | `.y-top-text:330`；`.ym-readout:1018`；`.y-period-nav:1904` |
| `font` | `500 13px/1.2 var(--ys-text)` | `.y-date:335` |
| `letter-spacing` | `0.02em` | `.ys-mechanical .y-date:340` |
| `font` | `400 15px/1.2 var(--ys-display)` | `.ys-sundial .y-date:345` |
| `letter-spacing` | `0.14em` | `.ys-sundial .y-date:346` |
| `font` | `400 15px/1.3 var(--ys-text)` | `.y-total:351` |
| `font` | `600 17px/1 var(--ys-num)` | `.y-total b:356` |
| `font-weight` | `400` | `.ys-water .y-total b, .ys-sundial .y-total b:361`；`.ys-water .y-tabbar:482`；`.ys-water .y-modes:740`；`.ys-water .y-round:776`；`.ys-sundial .y-laps b:879`；`.ys-sundial .y-stats b:1544`；`.ys-water .y-stats.is-compact b:1557`；`.y-field.is-row > span:first-child small:1885`；`.ys-sundial .y-day-card header strong:2084` |
| `font-size` | `17px` | `.y-top .y-total:366` |
| `font-weight` | `300` | `.ys-water .y-top .y-total:370`；`.ys-water .y-laps b:875`；`.ys-water .y-stats b:1540` |
| `font-size` | `14px` | `.ys-sundial .y-top .y-total:375`；`.ys-phone .y-button.is-quiet:530`；`.ys-sundial .y-button.is-quiet:551` |
| `width` | `40px` | `.ys-phone .y-icon-button:380`；`.ys-phone .y-punch:1374`；`.y-editor-spacer:1760` |
| `height` | `40px` | `.ys-phone .y-icon-button:381`；`.ys-phone .y-presets button:901`；`.ys-phone .y-punch:1375` |
| `box-shadow` | `inset 0 0 0 1px var(--ys-line-strong)` | `.ys-phone .y-icon-button.is-outlined:390`；`.ys-phone .y-presets button:905`；`.ys-phone .y-stepper button:1853`；`.ys-mechanical .y-cal-day.is-zero i, .ys-mechanical .y-cal-day.is-future i:2182`；`.ys-water .y-cal-day i:2187` |
| `width` | `32px` | `.ys-phone .y-icon-button.is-small:394` |
| `height` | `32px` | `.ys-phone .y-icon-button.is-small:395` |
| `opacity` | `0.3` | `.ys-phone .y-icon-button[disabled]:399` |
| `width` | `20px` | `.y-icon-button svg:403`；`.y-habit-name > svg:1281` |
| `height` | `20px` | `.y-icon-button svg:404`；`.y-habit-name > svg:1282` |
| `width` | `18px` | `.y-icon-button.is-small svg:408`；`.y-pips i:791`；`.y-punch svg:1386`；`.y-list svg:1690` |
| `height` | `18px` | `.y-icon-button.is-small svg:409`；`.y-punch svg:1387`；`.y-list svg:1691` |
| `margin-top` | `4px` | `.y-head.is-tight:420`；`.y-stepper:1840` |
| `font` | `var(--ys-title-weight) 32px/1.1 var(--ys-display)` | `.y-head h2:424` |
| `margin-top` | `6px` | `.y-head .y-total:430` |
| `height` | `44px` | `.y-nav:435`；`.y-cal-day:2141` |
| `margin` | `0 -8px` | `.y-nav:438`；`.y-editor-head:1744` |
| `gap` | `2px` | `.ys-phone .y-nav-back:444` |
| `font` | `500 16px/1 var(--ys-text)` | `.ys-phone .y-nav-back:446`；`.ys-phone .y-nav-action:457`；`.y-field.is-row > span:first-child:1879` |
| `width` | `22px` | `.y-nav-back svg:450`；`.y-goal i:1591`；`.y-icon-choices svg:1826` |
| `height` | `22px` | `.y-nav-back svg:451`；`.y-goal i:1592`；`.y-caret:1794`；`.y-icon-choices svg:1827` |
| `padding` | `0 8px` | `.ys-phone .y-nav-action:455` |
| `margin` | `auto -24px 0` | `.y-tabbar:464` |
| `padding` | `14px 24px 30px` | `.y-tabbar:465` |
| `border-top` | `1px solid var(--ys-line)` | `.y-tabbar:466`；`.y-stats:1507`；`.y-list li + li:1669`；`.y-day-card li:2098` |
| `font` | `600 12px/1 var(--ys-text)` | `.y-tabbar:468` |
| `margin-top` | `0` | `.y-actions + .y-tabbar, .y-empty ~ .y-tabbar:477`；`.y-dial.is-mini:950`；`.y-section .y-list:1665` |
| `font-weight` | `500` | `.ys-water .y-tabbar .is-active:486`；`.ys-phone .y-button.is-quiet:531`；`.ys-water .y-button:540`；`.ys-water .y-modes .is-active:744`；`.ys-water .y-habit-name strong:1298`；`.y-day-card li b:2113` |
| `font` | `400 13px/1 var(--ys-display)` | `.ys-sundial .y-tabbar:490`；`.yd-readout span:1193`；`.ys-sundial .y-section h3:1578` |
| `letter-spacing` | `0.2em` | `.ys-sundial .y-tabbar:491`；`.yw-readout span:1070`；`.yd-readout span:1194`；`.ys-sundial .y-section h3:1579`；`.y-tagline:2275` |
| `height` | `54px` | `.ys-phone .y-button:498` |
| `min-width` | `200px` | `.ys-phone .y-button:499` |
| `padding` | `0 28px` | `.ys-phone .y-button:502` |
| `border-radius` | `27px` | `.ys-phone .y-button:503` |
| `font` | `600 17px/1 var(--ys-text)` | `.ys-phone .y-button:504` |
| `box-shadow` | `inset 0 1px 0 rgba(255, 255, 255, 0.2),     0 8px 18px var(--ys-lift)` | `.ys-phone .y-button.is-primary:510` |
| `box-shadow` | `inset 0 0 0 1.5px var(--ys-line-strong)` | `.ys-phone .y-button.is-secondary:517`；`.y-holes > i::before, .y-empty-card i, .y-goal i:1330`；`.ys-phone .y-punch:1382` |
| `box-shadow` | `inset 0 0 0 1.5px var(--ys-danger)` | `.ys-phone .y-button.is-danger:522`；`.y-field.is-invalid .y-input:1800` |
| `padding` | `6px 10px` | `.ys-phone .y-button.is-quiet:528` |
| `height` | `52px` | `.ys-water .y-button:539`；`.y-input:1777` |
| `letter-spacing` | `0.08em` | `.ys-water .y-button:541`；`.ys-sundial .y-button.is-quiet:552`；`.ys-sundial .y-empty strong:1444` |
| `font` | `400 17px/1 var(--ys-display)` | `.ys-sundial .y-button:546` |
| `letter-spacing` | `0.24em` | `.ys-sundial .y-button:547`；`.ym-readout span:1029`；`.y-wordmark:2269` |
| `font` | `400 13px/1 var(--ys-text)` | `.y-hint:557`；`.y-stats dd:1530`；`.y-goal:1587` |
| `padding` | `3px` | `.y-segmented:562` |
| `height` | `38px` | `.ys-phone .y-segmented button:568`；`.y-cal-day i:2149` |
| `border-radius` | `calc(var(--ys-radius-sm) - 3px)` | `.ys-phone .y-segmented button:570` |
| `font` | `500 14px/1 var(--ys-text)` | `.ys-phone .y-segmented button:572`；`.y-period-nav:1905` |
| `box-shadow` | `0 1px 3px var(--ys-lift)` | `.ys-phone .y-segmented button.is-active:578` |
| `width` | `104px` | `.y-segmented.is-small:582` |
| `height` | `30px` | `.ys-phone .y-segmented.is-small button:586`；`.y-switch:592` |
| `width` | `50px` | `.y-switch:591` |
| `flex` | `0 0 50px` | `.y-switch:593` |
| `border-radius` | `15px` | `.y-switch:594`；`.ys-water .y-bar:1997` |
| `top` | `3px` | `.y-switch::after:600` |
| `left` | `3px` | `.y-switch::after:601` |
| `width` | `24px` | `.y-switch::after:602`；`.y-glyph-badge svg:1494` |
| `height` | `24px` | `.y-switch::after:603`；`.y-glyph-badge svg:1495` |
| `box-shadow` | `0 1px 3px rgba(0, 0, 0, 0.2)` | `.y-switch::after:606` |
| `left` | `23px` | `.y-switch.is-on::after:615` |
| `z-index` | `2` | `.y-scrim:622` |
| `inset` | `0` | `.y-scrim:623`；`.ym-readout:1013` |
| `padding` | `10px 24px 34px` | `.y-sheet:634` |
| `border-radius` | `28px 28px 0 0` | `.y-sheet:635`；`.y-editor:1732` |
| `border-radius` | `10px 10px 0 0` | `.ys-sundial .y-sheet:640`；`.ys-sundial .y-editor:1737` |
| `width` | `36px` | `.y-sheet-grip:644`；`.ys-phone .y-stepper button:1847` |
| `height` | `5px` | `.y-sheet-grip:645`；`.y-modes .is-active::after:732` |
| `margin-bottom` | `8px` | `.y-sheet-grip:647`；`.y-empty-card:1459` |
| `border-radius` | `3px` | `.y-sheet-grip:648`；`.y-pips i:793`；`.ys-sundial .y-cal-day i:2191` |
| `font` | `var(--ys-heading-weight) 21px/1.3 var(--ys-display)` | `.y-sheet h3:653` |
| `letter-spacing` | `0.06em` | `.ys-sundial .y-sheet h3:657`；`.y-section h3:1574`；`.ys-sundial .y-period-nav:1910`；`.ys-sundial .y-day-card header strong:2085` |
| `margin-bottom` | `12px` | `.y-sheet p:661` |
| `font` | `400 15px/1.6 var(--ys-text)` | `.y-sheet p:663` |
| `height` | `46px` | `.ys-phone .y-sheet-actions .y-button.is-quiet:677`；`.ys-phone .y-icon-choices button:1816` |
| `right` | `16px` | `.y-toast:682` |
| `bottom` | `96px` | `.y-toast:683` |
| `left` | `16px` | `.y-toast:684` |
| `padding` | `14px 18px` | `.y-toast:688` |
| `border-radius` | `16px` | `.y-toast:689` |
| `font` | `500 14px/1.2 var(--ys-text)` | `.y-toast:692` |
| `box-shadow` | `0 12px 24px var(--ys-lift)` | `.y-toast:693` |
| `border-radius` | `4px` | `.ys-sundial .y-toast:697`；`.ys-sundial .y-presets button:909`；`.y-kind-bar:2041`；`.y-kind-bar i:2048` |
| `font-weight` | `700` | `.ys-phone .y-toast button:702`；`.y-card-head .is-today:1247`；`.y-chart-day.is-today .y-chart-label:1960`；`.y-chart-day.is-selected em, .y-chart-day.is-selected .y-chart-label:1970` |
| `text-underline-offset` | `3px` | `.ys-phone .y-toast button:704` |
| `gap` | `28px` | `.y-modes:712` |
| `margin-top` | `24px` | `.y-modes:713`；`.y-round:770` |
| `font` | `600 16px/1 var(--ys-text)` | `.y-modes:715` |
| `padding-bottom` | `12px` | `.y-modes span:720` |
| `bottom` | `0` | `.y-modes .is-active::after:729`；`.yw-water:1082` |
| `left` | `50%` | `.y-modes .is-active::after:730` |
| `width` | `5px` | `.y-modes .is-active::after:731` |
| `margin-left` | `-2.5px` | `.y-modes .is-active::after:733` |
| `width` | `6px` | `.ys-water .y-modes .is-active::after:748` |
| `height` | `6px` | `.ys-water .y-modes .is-active::after:749`；`.y-pips i:792` |
| `margin-left` | `-3px` | `.ys-water .y-modes .is-active::after:750` |
| `border-radius` | `50% 50% 50% 0` | `.ys-water .y-modes .is-active::after:751`；`.ys-water .y-pips i:813`；`.ys-water .y-holes > i.is-on::before:1348`；`.y-punch i:1399`；`.ys-water .y-goal i:1601` |
| `transform` | `rotate(-45deg)` | `.ys-water .y-modes .is-active::after:752`；`.ys-water .y-pips i:816`；`.ys-water .y-holes > i.is-on::before:1351`；`.y-punch i:1401`；`.ys-water .y-goal i:1602` |
| `font` | `400 15px/1 var(--ys-display)` | `.ys-sundial .y-modes:756` |
| `letter-spacing` | `0.12em` | `.ys-sundial .y-modes:757`；`.ys-sundial .y-editor-head h3:1756` |
| `border-radius` | `1px` | `.ys-sundial .y-modes .is-active::after:761`；`.ys-sundial .y-heat-week i:1646`；`.ys-sundial .y-kind-bar, .ys-sundial .y-kind-bar i:2054` |
| `transform` | `rotate(-8deg)` | `.ys-sundial .y-modes .is-active::after:762`；`.ys-phone.ys-sundial .y-punch.is-done:1421` |
| `gap` | `12px` | `.y-round:769`；`.y-laps li:857`；`.y-habits:1257`；`.y-empty:1433`；`.y-section:1567`；`.ys-phone .y-list button, .y-list-row:1678`；`.y-kinds li:2028`；`.y-day-card li:2096` |
| `font` | `500 15px/1 var(--ys-text)` | `.y-round:771`；`.ys-phone .y-presets button:904` |
| `font` | `400 14px/1 var(--ys-display)` | `.ys-sundial .y-round:781` |
| `letter-spacing` | `0.1em` | `.ys-sundial .y-round:782`；`.y-launch-foot:2282` |
| `gap` | `6px` | `.y-pips:787`；`.y-stats > div:1515`；`.y-field.is-row > span:first-child:1877`；`.y-calendar:2119`；`.y-calendar-row:2125` |
| `box-shadow` | `inset 0 0 0 1.5px var(--ys-accent)` | `.y-pips i.is-current:803`；`.y-holes > i.is-today::before:1335`；`.y-punch i:1400`；`.ys-water .y-punch.is-done:1409`；`.ys-sundial .y-goal i.is-on:1607`；`.y-cal-day.is-today i:2169`；`.ys-sundial .y-cal-day.is-today i:2201` |
| `gap` | `9px` | `.ys-water .y-pips:807` |
| `width` | `8px` | `.ys-water .y-pips i:811` |
| `height` | `8px` | `.ys-water .y-pips i:812`；`.y-kind-bar:2038` |
| `box-shadow` | `inset 0 0 0 1.2px var(--ys-accent)` | `.ys-water .y-pips i:815`；`.ys-sundial .y-pips i:836` |
| `background` | `linear-gradient(45deg, var(--ys-accent) 50%, transparent 50%)` | `.ys-water .y-pips i.is-current:824` |
| `gap` | `8px` | `.ys-sundial .y-pips:828`；`.y-presets:896`；`.yd-readout:1182`；`.y-detail-hero:1476`；`.y-chart:1915`；`.y-chart-day:1924`；`.y-day-card:2065`；`.ys-phone .y-face:2216` |
| `width` | `10px` | `.ys-sundial .y-pips i:832` |
| `height` | `10px` | `.ys-sundial .y-pips i:833`；`.yw-surface:1103` |
| `border-radius` | `2px` | `.ys-sundial .y-pips i:834`；`.ys-sundial .y-holes > i::before, .ys-sundial .y-empty-card i, .ys-sundial .y-goal i:1357` |
| `transform` | `rotate(-6deg)` | `.ys-sundial .y-pips i:837` |
| `margin-top` | `14px` | `.y-laps:851`；`.y-footnote:2247` |
| `padding` | `12px 4px` | `.y-laps li:858` |
| `border-bottom` | `1px solid var(--ys-line)` | `.y-laps li:859`；`.y-stats:1508` |
| `font` | `400 15px/1 var(--ys-text)` | `.y-laps li:860`；`.y-stepper:1842` |
| `flex` | `0 0 64px` | `.y-laps span:864` |
| `font` | `500 21px/1 var(--ys-num)` | `.y-laps b:870` |
| `font-size` | `13px` | `.y-laps em:884` |
| `margin-top` | `22px` | `.y-presets:897`；`.y-stats:1505`；`.y-section:1568`；`.y-list:1658`；`.y-chart:1916` |
| `padding` | `0 16px` | `.ys-phone .y-presets button:902`；`.ys-phone .y-list button, .y-list-row:1679`；`.y-input:1779` |
| `border-radius` | `20px` | `.ys-phone .y-presets button:903` |
| `gap` | `14px` | `.y-actions:922`；`.yw-readout:1064`；`.y-habit:1263`；`.y-stepper:1839`；`.y-kinds:2022` |
| `padding` | `20px 0 22px` | `.y-actions:924` |
| `min-width` | `148px` | `.ys-phone .y-actions.is-pair .y-button:933` |
| `margin-top` | `26px` | `.y-dial:942`；`.y-card-head:1226` |
| `zoom` | `0.72` | `.y-dial.is-compact > *:946` |
| `zoom` | `0.26` | `.y-dial.is-mini > *:954` |
| `width` | `312px` | `.ym-dial:959` |
| `height` | `312px` | `.ym-dial:960` |
| `height` | `100%` | `.ym-dial svg:965`；`.y-kind-bar i:2047` |
| `filter` | `drop-shadow(0 18px 24px rgba(0, 0, 0, 0.1))` | `.ym-dial svg:966` |
| `stroke-width` | `1` | `.ym-tick:983`；`.ym-knob:1008`；`.yd-hour:1156` |
| `opacity` | `0.4` | `.ym-tick:984`；`.y-holes > i.is-future::before:1339`；`.y-punch span:1415`；`.y-chart-day.is-future .y-bar:1964`；`.y-chart:has(.is-selected) .y-chart-day:not(.is-selected) .y-bar i:1974` |
| `stroke-width` | `2.2` | `.ym-tick.is-major:988` |
| `opacity` | `0.85` | `.ym-tick.is-major:989` |
| `font` | `500 9px var(--ym-mono)` | `.ym-numeral:994` |
| `stroke-width` | `3` | `.ym-grip:1002` |
| `font` | `700 54px/1 var(--ys-num)` | `.ym-readout strong:1022` |
| `font` | `500 11px/1 var(--ym-mono)` | `.ym-readout span:1028` |
| `opacity` | `0.45` | `.y-dial.is-paused .ym-wedge:1033`；`.y-cal-day.is-future:2165` |
| `width` | `236px` | `.yw-vessel:1046` |
| `height` | `368px` | `.yw-vessel:1047` |
| `border-radius` | `34px 34px 112px 112px / 34px 34px 128px 128px` | `.yw-vessel:1049` |
| `box-shadow` | `inset 0 0 0 1.5px var(--ys-line),     0 24px 40px var(--ys-lift)` | `.yw-vessel:1051` |
| `top` | `104px` | `.yw-readout:1058` |
| `right` | `0` | `.yw-readout:1059`；`.yw-water:1081`；`.yd-readout:1176`；`.ys-mechanical .y-bar::before:1987` |
| `left` | `0` | `.yw-readout:1060`；`.yw-water:1083`；`.yw-surface:1101`；`.yd-paper svg:1130`；`.yd-readout:1178`；`.ys-mechanical .y-bar::before:1989` |
| `font` | `400 14px/1 var(--ys-text)` | `.yw-readout span:1069`；`.y-kinds li:2029`；`.y-day-card li:2099`；`.y-tagline:2274` |
| `font` | `200 76px/1 var(--ys-num)` | `.yw-readout strong:1074` |
| `letter-spacing` | `-0.02em` | `.yw-readout strong:1076` |
| `top` | `calc(104px - 368px + 100%)` | `.yw-water .yw-readout:1090` |
| `top` | `0` | `.yw-surface:1100`；`.yd-paper svg:1129` |
| `width` | `316px` | `.yd-paper:1117`；`.yd-paper svg:1131` |
| `height` | `404px` | `.yd-paper:1118` |
| `border-radius` | `6px` | `.yd-paper:1120` |
| `box-shadow` | `inset 0 1px 0 rgba(255, 255, 255, 0.4),     0 20px 36px var(--ys-lift)` | `.yd-paper:1122` |
| `height` | `316px` | `.yd-paper svg:1132` |
| `top` | `10px` | `.yd-shadow:1137` |
| `left` | `10px` | `.yd-shadow:1138` |
| `width` | `296px` | `.yd-shadow:1139` |
| `height` | `296px` | `.yd-shadow:1140` |
| `background` | `conic-gradient(     from 0deg,     var(--yd-shadow) 0deg,     var(--yd-shadow) calc(var(--yd-angle) - 16deg),     transparent var(--yd-angle),     transparent 360deg   )` | `.yd-shadow:1142` |
| `filter` | `blur(3px)` | `.yd-shadow:1149` |
| `-webkit-mask` | `radial-gradient(circle, transparent 0 5%, #000 24%, #000 60%, transparent 74%)` | `.yd-shadow:1150` |
| `mask` | `radial-gradient(circle, transparent 0 5%, #000 24%, #000 60%, transparent 74%)` | `.yd-shadow:1151` |
| `opacity` | `0.16` | `.yd-hour:1157` |
| `opacity` | `0.34` | `.yd-hour.is-major:1161` |
| `stroke-width` | `2` | `.yd-gnomon:1167` |
| `bottom` | `20px` | `.yd-readout:1177` |
| `font` | `400 58px/1 var(--ys-num)` | `.yd-readout strong:1186` |
| `letter-spacing` | `0.04em` | `.yd-readout strong:1188`；`.ys-sundial .y-habit-name strong:1303`；`.y-field > span:first-child:1772` |
| `opacity` | `0.5` | `.y-dial.is-paused .yd-shadow, .y-dial.is-break .yd-shadow:1199` |
| `padding` | `12px 16px` | `.y-banner:1218` |
| `font` | `500 14px/1.4 var(--ys-text)` | `.y-banner:1221` |
| `padding` | `0 16px 8px` | `.y-card-head:1227` |
| `font` | `500 11px/1 var(--ys-text)` | `.y-card-head:1229` |
| `flex` | `0 0 52px` | `.y-card-head .y-card-action:1251`；`.y-kinds li > span:first-child:2033` |
| `padding` | `16px 16px 14px` | `.y-habit:1264` |
| `box-shadow` | `0 1px 0 var(--ys-line)` | `.y-habit:1267`；`.y-empty-card:1463`；`.y-list:1661`；`.y-day-card:2070` |
| `width` | `16px` | `.y-habit-name > .y-habit-more:1287`；`.y-punch i:1397`；`.y-list.is-values svg:1713`；`.y-stepper svg:1857` |
| `height` | `16px` | `.y-habit-name > .y-habit-more:1288`；`.y-punch i:1398`；`.y-list.is-values svg:1714`；`.y-stepper svg:1858` |
| `opacity` | `0.6` | `.y-habit-name > .y-habit-more:1289` |
| `font` | `600 16px/1.2 var(--ys-text)` | `.y-habit-name strong:1294`；`.y-stats.is-compact b:1553` |
| `font` | `400 17px/1.2 var(--ys-display)` | `.ys-sundial .y-habit-name strong:1302` |
| `margin-top` | `3px` | `.y-habit-name span:1308` |
| `font` | `400 12px/1.2 var(--ys-text)` | `.y-habit-name span:1310` |
| `box-shadow` | `inset 0 2px 3px rgba(0, 0, 0, 0.45)` | `.ys-mechanical .y-holes > i.is-on::before:1344` |
| `background` | `radial-gradient(circle, var(--ys-accent) 0 3.5px, transparent 4px)` | `.ys-sundial .y-holes > i.is-on::before:1361`；`.ys-sundial .y-holes > i.is-today.is-on::before:1369` |
| `flex` | `0 0 40px` | `.ys-phone .y-punch:1376` |
| `margin-left` | `12px` | `.ys-phone .y-punch:1379` |
| `font` | `400 18px/1 var(--yd-kai)` | `.y-punch span:1414` |
| `background` | `radial-gradient(circle at 32% 30%, var(--ys-accent-soft), transparent 70%)` | `.ys-phone.ys-sundial .y-punch.is-done:1419` |
| `box-shadow` | `inset 0 0 0 2px var(--ys-accent)` | `.ys-phone.ys-sundial .y-punch.is-done:1420`；`.ys-phone .y-icon-choices button.is-active:1833`；`.ys-phone .y-face.is-active:2227` |
| `opacity` | `0.92` | `.y-punch.is-done span:1426` |
| `margin` | `auto 0` | `.y-empty:1434` |
| `padding` | `0 12px` | `.y-empty:1435` |
| `font` | `var(--ys-heading-weight) 19px/1.3 var(--ys-display)` | `.y-empty strong:1440` |
| `font` | `400 14px/1.6 var(--ys-text)` | `.y-empty p:1449` |
| `margin-top` | `8px` | `.ys-phone .y-empty .y-button:1453`；`.y-detail-hero:1477` |
| `padding` | `18px 20px` | `.y-empty-card:1460` |
| `margin-top` | `40px` | `.y-empty.is-review:1467` |
| `width` | `48px` | `.y-glyph-badge:1482` |
| `height` | `48px` | `.y-glyph-badge:1483` |
| `margin-bottom` | `4px` | `.y-glyph-badge:1486` |
| `box-shadow` | `inset 0 0 0 1px var(--ys-line)` | `.y-glyph-badge:1490`；`.y-input:1782`；`.ys-phone .y-icon-choices button:1822`；`.ys-sundial .y-cal-day i:2197`；`.ys-phone .y-face:2222` |
| `font` | `var(--ys-title-weight) 28px/1.2 var(--ys-display)` | `.y-detail-hero h2:1499` |
| `padding` | `16px 0` | `.y-stats:1506` |
| `padding-left` | `16px` | `.y-stats > div + div:1519` |
| `border-left` | `1px solid var(--ys-line)` | `.y-stats > div + div:1520` |
| `font` | `400 12px/1 var(--ys-text)` | `.y-stats dt:1525`；`.y-chart-label:1951`；`.y-launch-foot:2281` |
| `margin-right` | `2px` | `.y-stats b:1534` |
| `font` | `600 24px/1 var(--ys-num)` | `.y-stats b:1536` |
| `margin-top` | `16px` | `.y-stats.is-compact:1548`；`.y-period:1898` |
| `padding` | `14px 0` | `.y-stats.is-compact:1549` |
| `font` | `400 16px/1.2 var(--ys-display)` | `.ys-sundial .y-stats.is-compact b:1561` |
| `font` | `600 13px/1 var(--ys-text)` | `.y-section h3:1573` |
| `background` | `radial-gradient(circle, var(--ys-accent) 0 5px, transparent 5.5px)` | `.ys-sundial .y-goal i.is-on:1606` |
| `margin-left` | `6px` | `.y-goal span:1611` |
| `gap` | `1.5px` | `.y-heatmap:1616`；`.y-heat-week:1623` |
| `aspect-ratio` | `1` | `.y-heat-week i:1628` |
| `font` | `400 11px/1 var(--ys-text)` | `.y-heat-axis:1653`；`.y-calendar-row.is-head span:2134` |
| `min-height` | `50px` | `.ys-phone .y-list button, .y-list-row:1676` |
| `font` | `500 15px/1.2 var(--ys-text)` | `.ys-phone .y-list button, .y-list-row:1681` |
| `font` | `400 13px/1.2 var(--ys-text)` | `.y-list em:1698` |
| `font-size` | `15px` | `.y-list.is-values em:1709` |
| `height` | `calc(100% - 36px)` | `.y-editor:1728` |
| `gap` | `22px` | `.y-editor:1730` |
| `padding` | `12px 22px 34px` | `.y-editor:1731` |
| `font` | `var(--ys-heading-weight) 17px/1 var(--ys-display)` | `.y-editor-head h3:1748` |
| `font-weight` | `600` | `.ys-mechanical .y-editor-head h3:1752` |
| `font` | `500 13px/1 var(--ys-text)` | `.y-field > span:first-child:1771`；`.y-field small:1805`；`.y-kinds b:2059`；`.ys-phone .y-face:2221` |
| `font` | `400 17px/1 var(--ys-text)` | `.y-input:1783` |
| `opacity` | `0.7` | `.y-input em:1789` |
| `width` | `2px` | `.y-caret:1793` |
| `margin-left` | `2px` | `.y-caret:1795` |
| `width` | `46px` | `.ys-phone .y-icon-choices button:1815` |
| `height` | `36px` | `.ys-phone .y-stepper button:1848` |
| `min-width` | `20px` | `.y-stepper b:1862` |
| `font` | `600 22px/1 var(--ys-num)` | `.y-stepper b:1864` |
| `letter-spacing` | `0` | `.y-field.is-row > span:first-child:1880` |
| `height` | `12px` | `.y-chart-day em:1928` |
| `font` | `500 11px/1 var(--ys-num)` | `.y-chart-day em:1930` |
| `max-width` | `30px` | `.y-bar:1938` |
| `background` | `repeating-linear-gradient(     to top,     var(--ys-accent) 0 calc(var(--y-block) - 3px),     transparent calc(var(--y-block) - 3px) var(--y-block)   )` | `.ys-mechanical .y-bar i:1978` |
| `bottom` | `-1px` | `.ys-mechanical .y-bar::before:1988` |
| `height` | `1px` | `.ys-mechanical .y-bar::before:1990` |
| `box-shadow` | `inset 0 0 0 1.5px var(--ys-line)` | `.ys-water .y-bar:1999` |
| `max-width` | `14px` | `.ys-sundial .y-bar:2007` |
| `border-top` | `2px solid var(--ys-ink)` | `.ys-sundial .y-bar i:2011` |
| `padding` | `14px 16px` | `.y-day-card:2067` |
| `font` | `600 15px/1.2 var(--ys-display)` | `.y-day-card header strong:2080` |
| `font` | `400 13px/1.3 var(--ys-text)` | `.y-day-card header span, .y-day-card p:2091` |
| `padding` | `8px 0` | `.y-day-card li:2097` |
| `flex` | `0 0 48px` | `.y-day-card li span:first-child:2103` |
| `margin-top` | `20px` | `.y-calendar:2120` |
| `width` | `38px` | `.y-cal-day i:2148` |
| `font` | `500 12px/1 var(--ys-num)` | `.y-cal-day b:2156` |
| `font-weight` | `800` | `.y-cal-day.is-today b:2173` |
| `background` | `radial-gradient(     circle,     color-mix(in srgb, var(--ys-accent) var(--y-pct), transparent) 0 12px,     transparent 12.5px   )` | `.ys-sundial .y-cal-day i:2192` |
| `padding` | `10px 0 12px` | `.ys-phone .y-face:2217` |
| `width` | `88px` | `.y-face-preview:2232` |
| `height` | `92px` | `.y-face-preview:2233` |
| `border-radius` | `10px` | `.y-face-preview:2236` |
| `font` | `400 12px/1.5 var(--ys-text)` | `.y-note, .y-footnote:2243` |
| `padding-bottom` | `40px` | `.y-screen.is-launch:2255` |
| `gap` | `18px` | `.y-launch-mark:2262` |
| `padding-left` | `0.24em` | `.y-wordmark:2267` |
| `font` | `var(--ys-title-weight) 46px/1 var(--ys-display)` | `.y-wordmark:2268` |

## 动态样式与 SVG 人工审阅入口

| 文件 | 行 | 源码 |
| --- | --- | --- |
| Dial.vue | 84 | `<svg viewBox="0 0 300 300" aria-hidden="true">` |
| Dial.vue | 118 | `:style="{ '--yw-level': level }"` |
| Dial.vue | 125 | `<svg` |
| Dial.vue | 127 | `viewBox="0 0 240 12"` |
| Dial.vue | 140 | `<div v-else class="yd-paper" :style="{ '--yd-angle': shadowAngle }">` |
| Dial.vue | 142 | `<svg viewBox="0 0 300 300" aria-hidden="true">` |
| ReviewScreen.vue | 125 | `<div class="y-chart" :style="chartStyle" role="img" aria-label="本周每天的专注时长">` |
| ReviewScreen.vue | 133 | `<span class="y-bar"><i :style="{ height: bar.height }" /></span>` |
| ReviewScreen.vue | 159 | `<i :style="{ width: `${(kind.minutes / SAMPLE_WEEK_SUMMARY.minutes) * 100}%` }" />` |
| ReviewScreen.vue | 182 | `:style="cell ? cellStyle(cell.minutes) : undefined"` |

## 草稿展示状态

共 28 个状态，按三套主题、浅深模式复用。展示状态不等于正式 Runtime Variant 或 Case。

| 页面 | 草稿状态 | 名称 |
| --- | --- | --- |
| launch | default | 冷启动品牌静帧 |
| focus | pomodoro-idle | 番茄 · 待开始 |
| focus | pomodoro-running | 番茄 · 进行中 |
| focus | pomodoro-paused | 番茄 · 暂停 |
| focus | short-break | 番茄 · 短休 |
| focus | long-break | 番茄 · 长休 |
| focus | round-done | 番茄 · 本轮完成 |
| focus | abandon | 放弃确认 |
| focus | recovery | 中断后恢复 |
| focus | stopwatch | 正计时 · 计圈 |
| focus | countdown-setup | 倒计时 · 设置时长 |
| focus | countdown-running | 倒计时 · 进行中 |
| focus | countdown-done | 倒计时 · 到点 |
| checkin | partial | 部分完成 |
| checkin | undo | 打卡后撤销提示 |
| checkin | all | 全部完成 |
| checkin | empty | 没有习惯 |
| habit | detail-daily | 详情 · 每天 |
| habit | detail-weekly | 详情 · 每周 N 次 |
| habit | delete | 删除确认 |
| habit | new | 新建习惯 |
| habit | error | 新建 · 校验错误 |
| review | week | 周视图 |
| review | day | 选中某天 |
| review | month | 月视图 |
| review | empty | 没有记录 |
| settings | default | 默认（选择表盘） |
| settings | reset | 重置数据确认 |
