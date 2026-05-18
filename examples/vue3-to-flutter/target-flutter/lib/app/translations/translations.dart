import 'en_US.dart';
import 'zh_CN.dart';

const _locale = 'en_US';

extension AppTranslate on String {
  String get tr {
    const table = _locale == 'zh_CN' ? zhCN : enUS;
    return table[this] ?? this;
  }
}
