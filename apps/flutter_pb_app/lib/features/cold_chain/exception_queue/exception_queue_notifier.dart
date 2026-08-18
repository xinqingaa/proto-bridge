import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'exception_queue_model.dart';

final exceptionQueueProvider =
    NotifierProvider<ExceptionQueueNotifier, ExceptionQueueState>(
      ExceptionQueueNotifier.new,
    );

class ExceptionQueueNotifier extends Notifier<ExceptionQueueState> {
  @override
  ExceptionQueueState build() => const ExceptionQueueState();

  void selectFilter(ExceptionQueueFilter filter) {
    state = state.copyWith(filter: filter);
  }

  void setQuery(String query) {
    state = state.copyWith(query: query);
  }

  void setStatus(ExceptionQueueStatus status) {
    state = state.copyWith(status: status);
  }

  void reload() {
    state = const ExceptionQueueState();
  }
}
