<script setup lang="ts">
import { onBeforeUnmount, ref, useId, watch } from "vue";
import { ArrowLeft, Check, Package, Clock, MapPin } from "lucide-vue-next";
import ThemeSurface from "../studio-shared/ThemeSurface.vue";
import PhoneShell from "@/workbench/PhoneShell.vue";
import PbButton from "@/design-system/components/action/Button.vue";
import BottomSheet from "@/design-system/components/feedback/BottomSheet.vue";
import Toast from "@/design-system/components/feedback/Toast.vue";
import type { Mode } from "../studio-shared/themes";
const props = defineProps<{
  packId: string;
  theme: string;
  mode: Mode;
  component: string;
  scale: number;
  label: string;
}>();
const hostId = `pvs-host-${useId().replaceAll(":", "")}`;
const loading = ref(false);
const done = ref(false);
const sheet = ref(false);
const detent = ref<"content" | "medium" | "expanded">("content");
const toast = ref(false);
const deleted = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;
function submit() {
  if (loading.value) return;
  loading.value = true;
  done.value = false;
  timer = setTimeout(() => {
    loading.value = false;
    done.value = true;
  }, 1200);
}
function remove() {
  deleted.value = true;
  toast.value = true;
}
watch(
  () => props.component,
  () => {
    sheet.value = false;
    toast.value = false;
    loading.value = false;
    done.value = false;
    deleted.value = false;
    clearTimeout(timer);
  },
);
onBeforeUnmount(() => clearTimeout(timer));
</script>
<template>
  <figure class="pvs-phone-figure">
    <div
      class="pvs-phone-slot"
      :style="{ width: `${390 * scale}px`, height: `${740 * scale}px` }"
    >
      <div class="pvs-phone-scaled" :style="{ transform: `scale(${scale})` }">
        <ThemeSurface
          :pack-id="packId"
          :theme="theme"
          :mode="mode"
          device
          class="pvs-phone-surface"
          ><PhoneShell
            :height="740"
            :width="390"
            chrome="inset"
            :dark="mode === 'dark'"
            time="09:41"
            class="pvs-device"
            ><div :id="hostId" class="pvs-phone-host">
              <div class="pvs-device-scroll">
                <header class="pvs-appbar">
                  <ArrowLeft :size="19" /><strong>{{
                    component === "button" ? "操作与状态" : "配送安排"
                  }}</strong
                  ><span>组件预览</span>
                </header>
                <template v-if="component === 'button'">
                  <section class="pvs-device-intro">
                    <span>BUTTON</span>
                    <h2>每次操作，轻重分明</h2>
                    <p>真实组件 · 类型、尺寸和状态</p>
                  </section>
                  <section class="pvs-button-section">
                    <h3>类型 <span>点击体验加载与完成</span></h3>
                    <div class="pvs-button-line">
                      <div>
                        <strong>主要</strong><span>当前最重要的操作</span>
                      </div>
                      <PbButton
                        label="提交工单"
                        :loading="loading"
                        :inspect-id="`${hostId}.primary`"
                        @click="submit"
                      />
                    </div>
                    <div class="pvs-button-line">
                      <div><strong>次要</strong><span>辅助操作</span></div>
                      <PbButton
                        label="保存草稿"
                        kind="secondary"
                        :inspect-id="`${hostId}.secondary`"
                        @click="done = true"
                      />
                    </div>
                    <div class="pvs-button-line">
                      <div><strong>描边</strong><span>补充操作</span></div>
                      <PbButton
                        label="查看详情"
                        kind="outlined"
                        :inspect-id="`${hostId}.outlined`"
                        @click="done = true"
                      />
                    </div>
                  </section>
                  <section class="pvs-button-section">
                    <h3>状态</h3>
                    <div class="pvs-state-line">
                      <div>
                        <PbButton
                          label="提交中"
                          loading
                          :inspect-id="`${hostId}.loading`"
                        /><span>加载 · 阻止重复提交</span>
                      </div>
                      <div>
                        <PbButton
                          label="提交工单"
                          disabled
                          :inspect-id="`${hostId}.disabled`"
                        /><span>禁用 · 条件未满足</span>
                      </div>
                    </div>
                  </section>
                  <section class="pvs-button-section">
                    <h3>尺寸</h3>
                    <div class="pvs-size-line">
                      <PbButton
                        label="小号"
                        size="sm"
                        :inspect-id="`${hostId}.small`"
                        @click="done = true"
                      /><PbButton
                        label="中号"
                        size="md"
                        :inspect-id="`${hostId}.medium`"
                        @click="done = true"
                      /><PbButton
                        label="大号"
                        size="lg"
                        :inspect-id="`${hostId}.large`"
                        @click="done = true"
                      />
                    </div>
                  </section>
                  <p class="pvs-device-feedback" role="status">
                    <Check v-if="done" :size="15" />{{
                      loading
                        ? "正在提交…"
                        : done
                          ? "操作完成，可以继续体验。"
                          : "所有展示与反馈均在设备内。"
                    }}
                  </p>
                </template>
                <template v-else>
                  <section class="pvs-device-intro">
                    <span>{{
                      component === "sheet" ? "BOTTOM SHEET" : "TOAST"
                    }}</span>
                    <h2>
                      {{
                        component === "sheet"
                          ? "保留任务的上下文"
                          : "及时反馈，继续当前任务"
                      }}
                    </h2>
                    <p>
                      {{
                        component === "sheet"
                          ? "打开补充任务，完成后回到这里。"
                          : "撤销、自动消失，都发生在设备内。"
                      }}
                    </p>
                  </section>
                  <section class="pvs-delivery" v-if="!deleted">
                    <div class="pvs-parcel-icon"><Package :size="26" /></div>
                    <span>冷链配送 · CC-2048</span>
                    <h3>静安门店补货</h3>
                    <p><MapPin :size="14" />上海虹桥仓 → 静安门店</p>
                    <div>
                      <span><Clock :size="14" />预计到达</span
                      ><strong>今天 16:30</strong>
                    </div>
                    <div><span>温度要求</span><strong>2–8°C</strong></div>
                  </section>
                  <section v-else class="pvs-delivery is-empty">
                    <Check :size="24" />
                    <h3>配送记录已移除</h3>
                    <p>可在底部提示中撤销。</p>
                  </section>
                  <div class="pvs-device-actions">
                    <PbButton
                      v-if="component === 'sheet'"
                      label="调整配送安排"
                      block
                      :inspect-id="`${hostId}.open`"
                      @click="sheet = true"
                    /><PbButton
                      v-else
                      :label="deleted ? '再次显示撤销提示' : '移除这条记录'"
                      kind="outlined"
                      block
                      :inspect-id="`${hostId}.remove`"
                      @click="remove"
                    />
                    <p>
                      {{
                        component === "sheet"
                          ? "面板中可切换内容、半屏和展开三档。"
                          : "撤销会恢复记录，提示也会自动消失。"
                      }}
                    </p>
                  </div>
                  <p class="pvs-device-feedback" role="status">
                    <Check v-if="done" :size="15" />{{
                      done
                        ? component === "sheet"
                          ? "配送安排已确认。"
                          : "已撤销，配送记录已恢复。"
                        : "点击按钮体验。"
                    }}
                  </p>
                </template>
              </div>
              <BottomSheet
                v-if="component === 'sheet'"
                v-model="sheet"
                v-model:detent="detent"
                :detents="['content', 'medium', 'expanded']"
                title="调整配送安排"
                :attach="`#${hostId}`"
                :inspect-id="`${hostId}.sheet`"
                ><div class="pvs-sheet-content">
                  <strong>今天送达</strong>
                  <p>保持冷链专送，预计 16:30 到达。</p>
                  <div><span>收货门店</span><strong>静安门店</strong></div>
                  <div><span>配送温度</span><strong>2–8°C</strong></div>
                </div>
                <template #actions
                  ><PbButton
                    label="确认安排"
                    block
                    :inspect-id="`${hostId}.confirm`"
                    @click="
                      sheet = false;
                      done = true;
                    " /></template
              ></BottomSheet>
              <Toast
                v-if="component === 'toast'"
                v-model="toast"
                message="配送记录已移除"
                action-label="撤销"
                :attach="`#${hostId}`"
                :inspect-id="`${hostId}.toast`"
                @undo="
                  deleted = false;
                  done = true;
                "
              /></div></PhoneShell
        ></ThemeSurface>
      </div>
    </div>
    <figcaption>
      <i :class="{ 'is-dark': mode === 'dark' }" />{{ label
      }}<span>{{ mode === "light" ? "浅色" : "深色" }}</span>
    </figcaption>
  </figure>
</template>
