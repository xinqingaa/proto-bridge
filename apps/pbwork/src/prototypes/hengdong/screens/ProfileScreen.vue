<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Avatar from "@/design-system/components/display/Avatar.vue";
import Badge from "@/design-system/components/display/Badge.vue";
import Card from "@/design-system/components/display/Card.vue";
import DataList from "@/design-system/components/data/DataList.vue";
import ScrollableDataList from "@/design-system/components/data/ScrollableDataList.vue";
import SwitchControl from "@/design-system/components/input/SwitchControl.vue";
import Toast from "@/design-system/components/feedback/Toast.vue";
import HengdongRoot from "../HengdongRoot.vue";
import { openHengdongScreen, replaceHengdongScreen } from "../nav";
import { getProfile, saveThemePreference } from "../storage";
import "../hengdong.css";

const route = useRoute();
const router = useRouter();
const profile = getProfile();
const isDark = ref(route.query.theme === "dark");
const toast = ref(false);
const variant = computed(() => String(route.query.variant ?? "default"));

function changeTheme(value: boolean) {
  isDark.value = value;
  const theme = value ? "dark" : "light";
  saveThemePreference(theme);
  toast.value = true;
  void router.replace({ query: { ...route.query, theme } });
}
</script>

<template>
  <HengdongRoot active="profile" screen-id="hengdong.profile">
    <section
      class="hd-page"
      data-pb-id="hengdong.profile.root"
      data-pb-role="page"
      data-pb-token-background="color.background"
      data-pb-token-color="color.on-background"
    >
      <ScrollableDataList
        class="hd-scroll"
        :pull-refresh="false"
        :load-more="false"
        inspect-id="hengdong.profile.scroll-list"
      >
        <div class="hd-content">
          <Card semantic-role="summary" inspect-id="hengdong.profile.identity">
            <div class="hd-card-body hd-profile-head">
              <Avatar
                :name="profile.name"
                size="lg"
                inspect-id="hengdong.profile.avatar"
              />
              <div class="hd-row-main">
                <h1 class="hd-card-title">{{ profile.name }}</h1>
                <span class="hd-muted">{{ profile.email }}</span
                ><span class="hd-inline"
                  ><Badge
                    label="连续 6 天"
                    tone="success"
                    inspect-id="hengdong.profile.streak"
                  /><span class="hd-caption">从 2026 年 7 月开始</span></span
                >
              </div>
            </div>
          </Card>
          <Card semantic-role="summary" inspect-id="hengdong.profile.lifetime">
            <div class="hd-card-body">
              <h2 class="hd-card-title">累计数据</h2>
              <div class="hd-metrics">
                <div class="hd-metric">
                  <strong>28</strong><span>完成训练</span>
                </div>
                <div class="hd-metric">
                  <strong>612</strong><span>累计分钟</span>
                </div>
                <div class="hd-metric">
                  <strong>11</strong><span>最长连续</span>
                </div>
              </div>
            </div>
          </Card>
          <DataList inspect-id="hengdong.profile.settings-list">
            <button
              type="button"
              class="hd-row hd-list-button"
              data-pb-id="hengdong.profile.open-goals"
              data-pb-role="button"
              data-pb-token-background="transparent"
              data-pb-token-color="color.on-surface"
              data-pb-token-spacing="spacing.md"
              data-pb-action="open-goals"
              @click="openHengdongScreen(router, route, 'goals')"
            >
              <span class="hd-row-main"
                ><h3>目标与提醒</h3>
                <span class="hd-caption">每周 4 次 · 20:30 提醒</span></span
              ><strong>›</strong>
            </button>
            <button
              type="button"
              class="hd-row hd-list-button"
              @click="openHengdongScreen(router, route, 'stats')"
            >
              <span class="hd-row-main"
                ><h3>训练趋势</h3>
                <span class="hd-caption">查看周/月完成情况</span></span
              ><strong>›</strong>
            </button>
            <div class="hd-row">
              <span class="hd-row-main"
                ><h3>深色主题</h3>
                <span class="hd-caption">跟随你的当前偏好</span></span
              ><SwitchControl
                :model-value="isDark"
                label=""
                inspect-id="hengdong.profile.theme"
                @update:model-value="changeTheme"
              />
            </div>
          </DataList>
          <button
            v-if="variant === 'signed-out'"
            type="button"
            class="hd-row hd-list-button hd-signout"
            data-pb-id="hengdong.profile.signed-out"
            data-pb-role="status"
            data-pb-token-background="color.error-soft"
            data-pb-token-color="color.error"
            data-pb-token-radius="radius.md"
            @click="replaceHengdongScreen(router, route, 'login')"
          >
            已退出本地账号，返回登录
          </button>
        </div>
      </ScrollableDataList>
      <Toast
        v-model="toast"
        message="主题偏好已保存"
        inspect-id="hengdong.profile.toast"
      />
    </section>
  </HengdongRoot>
</template>

<style scoped>
.hd-profile-head {
  flex-direction: row;
}
.hd-signout {
  border-radius: var(--pb-radius-md);
  background: var(--pb-color-error-soft);
  color: var(--pb-color-error);
}
</style>
