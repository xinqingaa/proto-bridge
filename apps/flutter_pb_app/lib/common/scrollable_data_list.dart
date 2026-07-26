import 'package:flutter/material.dart';
import 'package:pull_to_refresh_flutter3/pull_to_refresh_flutter3.dart';

import '../theme/ts.dart';
import 'spinner.dart';

/// 对齐 pbwork `ScrollableDataList` — [ListView] + pull_to_refresh。
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

    return SmartRefresher(
      controller: _controller,
      enablePullDown: widget.onRefresh != null,
      enablePullUp: enablePullUp,
      onRefresh: widget.onRefresh == null ? null : _onRefresh,
      onLoading: enablePullUp ? _onLoading : null,
      header: WaterDropHeader(
        waterDropColor: TS.colors.primary,
        complete: Icon(Icons.check, color: TS.colors.success),
      ),
      footer: CustomFooter(
        builder: (context, mode) {
          if (mode == LoadStatus.loading) {
            return const Center(child: CommonSpinner());
          }
          if (mode == LoadStatus.noMore) {
            return Padding(
              padding: EdgeInsets.all(TS.spacing.md),
              child: Center(
                child: Text('没有更多了', style: TS.textStyle.caption),
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
