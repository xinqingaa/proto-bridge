import 'package:equatable/equatable.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../translations/en_US.dart';
import '../translations/zh_CN.dart';

enum AppLocaleMode { zhCN, enUS }

class AppPreferencesState extends Equatable {
  const AppPreferencesState({
    this.themeMode = ThemeMode.light,
    this.localeMode = AppLocaleMode.zhCN,
  });

  final ThemeMode themeMode;
  final AppLocaleMode localeMode;

  bool get isDark => themeMode == ThemeMode.dark;
  bool get isEnglish => localeMode == AppLocaleMode.enUS;

  AppPreferencesState copyWith({
    ThemeMode? themeMode,
    AppLocaleMode? localeMode,
  }) {
    return AppPreferencesState(
      themeMode: themeMode ?? this.themeMode,
      localeMode: localeMode ?? this.localeMode,
    );
  }

  @override
  List<Object> get props => [themeMode, localeMode];
}

class AppPreferencesCubit extends Cubit<AppPreferencesState> {
  AppPreferencesCubit() : super(const AppPreferencesState());

  void toggleTheme() {
    emit(
      state.copyWith(
        themeMode: state.isDark ? ThemeMode.light : ThemeMode.dark,
      ),
    );
  }

  void toggleLocale() {
    emit(
      state.copyWith(
        localeMode: state.isEnglish ? AppLocaleMode.zhCN : AppLocaleMode.enUS,
      ),
    );
  }
}

extension AppPreferencesContext on BuildContext {
  AppPreferencesState get preferences => watch<AppPreferencesCubit>().state;
  AppPreferencesCubit get preferencesCubit => read<AppPreferencesCubit>();

  String t(String key) {
    final localeMode = watch<AppPreferencesCubit>().state.localeMode;
    final table = localeMode == AppLocaleMode.zhCN ? zhCN : enUS;
    return table[key] ?? key;
  }
}
