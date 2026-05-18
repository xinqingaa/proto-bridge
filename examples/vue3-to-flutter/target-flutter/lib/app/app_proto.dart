import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import 'preferences/app_preferences_cubit.dart';
import 'routes/app_pages_proto.dart';
import 'routes/app_routes.dart';
import 'theme/app_theme.dart';

class ProtoBridgeGeneratedApp extends StatelessWidget {
  const ProtoBridgeGeneratedApp({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => AppPreferencesCubit(),
      child: BlocBuilder<AppPreferencesCubit, AppPreferencesState>(
        builder: (context, preferences) {
          return MaterialApp(
            title: 'ProtoBridge Generated Target',
            debugShowCheckedModeBanner: false,
            theme: buildAppTheme(),
            darkTheme: buildAppTheme(brightness: Brightness.dark),
            themeMode: preferences.themeMode,
            initialRoute: Routes.home,
            onGenerateRoute: AppPagesProto.onGenerateRoute,
          );
        },
      ),
    );
  }
}
