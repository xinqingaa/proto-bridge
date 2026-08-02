import 'package:flutter/material.dart';
import 'package:pull_to_refresh_flutter3/pull_to_refresh_flutter3.dart';

import '../../theme/ts.dart';
import 'button.dart';
import 'spinner.dart';

/// 对齐 pbwork `ScrollableDataList` — [ListView] + pull_to_refresh。
///
/// 刷新头对齐原型：下拉刷新 / 松开刷新 / 正在刷新 + Spinner，不用水滴动画。
class CommonScrollableDataList extends StatefulWidget {
  const CommonScrollableDataList({
    super.key,
    required this.itemCount,
    required this.itemBuilder,
    this.onRefresh,
    this.onLoadMore,
    this.hasMore = false,
    this.padding,
    this.separatorBuilder,
  });

  final int itemCount;
  final IndexedWidgetBuilder itemBuilder;
  final Future<void> Function()? onRefresh;
  final Future<void> Function()? onLoadMore;
  final bool hasMore;
  final EdgeInsetsGeometry? padding;
  final IndexedWidgetBuilder? separatorBuilder;

  @override
  State<CommonScrollableDataList> createState() =>
      _CommonScrollableDataListState();
}

class _CommonScrollableDataListState extends State<CommonScrollableDataList> {
  final RefreshController _controller =
      RefreshController(initialRefresh: false);

  Future<void> _onRefresh() async {
    try {
      await widget.onRefresh?.call();
      _controller.refreshCompleted();
    } catch (_) {
      _controller.refreshFailed();
    }
  }

  Future<void> _onLoading() async {
    if (!widget.hasMore || widget.onLoadMore == null) {
      _controller.loadNoData();
      return;
    }
    try {
      await widget.onLoadMore!();
      if (!mounted) return;
      if (widget.hasMore) {
        _controller.loadComplete();
      } else {
        _controller.loadNoData();
      }
    } catch (_) {
      _controller.loadFailed();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final enablePullUp = widget.onLoadMore != null;
    final muted = TS.colors.onSurfaceMuted;
    final primary = TS.colors.primary;
    final caption = TS.textStyle.caption;

    return SmartRefresher(
      controller: _controller,
      enablePullDown: widget.onRefresh != null,
      enablePullUp: enablePullUp,
      onRefresh: widget.onRefresh == null ? null : _onRefresh,
      onLoading: enablePullUp ? _onLoading : null,
      header: ClassicHeader(
        height: 52,
        spacing: TS.spacing.xs,
        textStyle: caption.copyWith(color: muted),
        idleText: '下拉刷新',
        releaseText: '松开刷新',
        refreshingText: '正在刷新',
        completeText: '刷新完成',
        failedText: '刷新失败',
        idleIcon: Icon(Icons.refresh, size: TS.sizing.iconSm, color: muted),
        releaseIcon: Icon(Icons.refresh, size: TS.sizing.iconSm, color: primary),
        completeIcon:
            Icon(Icons.check, size: TS.sizing.iconSm, color: TS.colors.success),
        failedIcon:
            Icon(Icons.error_outline, size: TS.sizing.iconSm, color: TS.colors.error),
        refreshingIcon: SizedBox(
          width: TS.sizing.iconSm,
          height: TS.sizing.iconSm,
          child: CircularProgressIndicator(
            strokeWidth: 2,
            color: primary,
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
      child: widget.separatorBuilder == null
          ? ListView.builder(
              padding: widget.padding,
              itemCount: widget.itemCount,
              itemBuilder: widget.itemBuilder,
            )
          : ListView.separated(
              padding: widget.padding,
              itemCount: widget.itemCount,
              itemBuilder: widget.itemBuilder,
              separatorBuilder: widget.separatorBuilder!,
            ),
    );
  }
}
