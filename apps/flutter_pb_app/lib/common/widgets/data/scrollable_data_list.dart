import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:pull_to_refresh_flutter3/pull_to_refresh_flutter3.dart';

import '../../../theme/ts.dart';
import '../action/button.dart';
import '../display/spinner.dart';

/// `ListView` + `pull_to_refresh_flutter3` 的刷新/加载壳。
///
/// 使用 Clamping physics、有限越界和高阻尼 spring，隔离 Flutter 3 上完成刷新后
/// 二次回弹的问题；刷新和加载回调均有互斥锁。
class CommonScrollableDataList extends StatefulWidget {
  const CommonScrollableDataList({
    super.key,
    required this.itemCount,
    required this.itemBuilder,
    this.onRefresh,
    this.onLoadMore,
    this.hasMore = false,
    this.disabled = false,
    this.padding,
    this.separatorBuilder,
  });

  final int itemCount;
  final IndexedWidgetBuilder itemBuilder;
  final Future<void> Function()? onRefresh;
  final Future<void> Function()? onLoadMore;
  final bool hasMore;
  final bool disabled;
  final EdgeInsetsGeometry? padding;
  final IndexedWidgetBuilder? separatorBuilder;

  @override
  State<CommonScrollableDataList> createState() =>
      _CommonScrollableDataListState();
}

class _CommonScrollableDataListState extends State<CommonScrollableDataList> {
  final RefreshController _controller = RefreshController();
  bool _refreshing = false;
  bool _loading = false;

  Future<void> _onRefresh() async {
    if (_refreshing || widget.disabled || widget.onRefresh == null) return;
    _refreshing = true;
    try {
      await widget.onRefresh!.call();
      _controller.refreshCompleted(resetFooterState: true);
    } catch (_) {
      _controller.refreshFailed();
    } finally {
      _refreshing = false;
    }
  }

  Future<void> _onLoading() async {
    if (_loading || widget.disabled) return;
    if (!widget.hasMore || widget.onLoadMore == null) {
      _controller.loadNoData();
      return;
    }
    _loading = true;
    try {
      await widget.onLoadMore!.call();
      if (!mounted) return;
      widget.hasMore ? _controller.loadComplete() : _controller.loadNoData();
    } catch (_) {
      _controller.loadFailed();
    } finally {
      _loading = false;
    }
  }

  @override
  void didUpdateWidget(covariant CommonScrollableDataList oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!oldWidget.hasMore && widget.hasMore) _controller.resetNoData();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final refreshEnabled = !widget.disabled && widget.onRefresh != null;
    final loadEnabled = !widget.disabled && widget.onLoadMore != null;
    final muted = TS.colors.onSurfaceMuted;
    final caption = TS.textStyle.caption;

    final list = widget.separatorBuilder == null
        ? ListView.builder(
            padding: widget.padding,
            physics: const ClampingScrollPhysics(
              parent: AlwaysScrollableScrollPhysics(),
            ),
            itemCount: widget.itemCount,
            itemBuilder: widget.itemBuilder,
          )
        : ListView.separated(
            padding: widget.padding,
            physics: const ClampingScrollPhysics(
              parent: AlwaysScrollableScrollPhysics(),
            ),
            itemCount: widget.itemCount,
            itemBuilder: widget.itemBuilder,
            separatorBuilder: widget.separatorBuilder!,
          );

    return Opacity(
      opacity: widget.disabled ? TS.opacity.disabled : TS.opacity.visible,
      child: RefreshConfiguration(
        headerTriggerDistance: TS.layout.pullRefreshThreshold,
        maxOverScrollExtent: TS.layout.pullRefreshMaxDistance,
        maxUnderScrollExtent: TS.layout.pullRefreshThreshold,
        enableBallisticRefresh: false,
        enableBallisticLoad: false,
        enableScrollWhenRefreshCompleted: false,
        springDescription: const SpringDescription(
          mass: 1,
          stiffness: 280,
          damping: 28,
        ),
        child: SmartRefresher(
          controller: _controller,
          physics: const ClampingScrollPhysics(
            parent: AlwaysScrollableScrollPhysics(),
          ),
          enablePullDown: refreshEnabled,
          enablePullUp: loadEnabled,
          onRefresh: refreshEnabled ? _onRefresh : null,
          onLoading: loadEnabled ? _onLoading : null,
          header: ClassicHeader(
            height: TS.layout.pullRefreshThreshold,
            spacing: TS.spacing.xs,
            textStyle: caption.copyWith(color: muted),
            idleText: '下拉刷新',
            releaseText: '松开刷新',
            refreshingText: '正在刷新',
            completeText: '刷新完成',
            failedText: '刷新失败',
            idleIcon: Icon(
              LucideIcons.refreshCw,
              size: TS.sizing.iconSm,
              color: muted,
            ),
            releaseIcon: Icon(
              LucideIcons.refreshCw,
              size: TS.sizing.iconSm,
              color: TS.colors.primary,
            ),
            completeIcon: Icon(
              LucideIcons.check,
              size: TS.sizing.iconSm,
              color: TS.colors.success,
            ),
            failedIcon: Icon(
              LucideIcons.circleAlert,
              size: TS.sizing.iconSm,
              color: TS.colors.error,
            ),
            refreshingIcon: SizedBox(
              width: TS.sizing.iconSm,
              height: TS.sizing.iconSm,
              child: CircularProgressIndicator(
                strokeWidth: TS.sizing.progressStroke,
                color: TS.colors.primary,
              ),
            ),
          ),
          footer: CustomFooter(
            builder: (context, mode) {
              if (mode == LoadStatus.loading) {
                return Padding(
                  padding: EdgeInsets.symmetric(vertical: TS.spacing.md),
                  child: const Center(
                    child: CommonSpinner(size: CommonControlSize.sm),
                  ),
                );
              }
              if (mode == LoadStatus.noMore) {
                return Padding(
                  padding: EdgeInsets.all(TS.spacing.md),
                  child: Center(
                    child: Text('没有更多了', style: caption.copyWith(color: muted)),
                  ),
                );
              }
              return const SizedBox.shrink();
            },
          ),
          child: list,
        ),
      ),
    );
  }
}
