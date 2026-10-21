import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../common/widgets/navigation/launch_screen.dart';
import '../storage/app_prefs.dart';
import '../storage/providers.dart';
import '../theme/ts.dart';
import 'app.dart';

/// Initializes the app once. Route changes and foreground resumes keep it ready.
class AppStartup extends StatefulWidget {
  const AppStartup({super.key, required this.openPreferences});

  final Future<AppPrefs> Function() openPreferences;

  @override
  State<AppStartup> createState() => _AppStartupState();
}

class _AppStartupState extends State<AppStartup> {
  late Future<AppPrefs> _preferences;

  @override
  void initState() {
    super.initState();
    _prepare();
  }

  void _prepare() {
    _preferences = Future.sync(widget.openPreferences);
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<AppPrefs>(
    future: _preferences,
    builder: (context, snapshot) {
      if (snapshot.hasData) {
        return ProviderScope(
          overrides: [appPrefsProvider.overrideWithValue(snapshot.requireData)],
          child: const PbApp(),
        );
      }
      final ts = TS(brightness: MediaQuery.platformBrightnessOf(context));
      return MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: ts.toThemeData(),
        home: AnnotatedRegion<SystemUiOverlayStyle>(
          value: ts.systemOverlayStyle,
          child: Scaffold(
            body:
                snapshot.connectionState == ConnectionState.done &&
                    snapshot.hasError
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text('应用准备失败，请重试'),
                        TextButton(
                          onPressed: () => setState(_prepare),
                          child: const Text('重试'),
                        ),
                      ],
                    ),
                  )
                : const CommonLaunchScreen(
                    brandName: 'PBWork',
                    mode: CommonLaunchMode.launch,
                  ),
          ),
        ),
      );
    },
  );
}
