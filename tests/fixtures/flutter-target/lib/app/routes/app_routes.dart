import 'package:flutter/widgets.dart';
import '../modules/project/task_list_page.dart';

const taskListRoute = '/project/task-list';

final Map<String, WidgetBuilder> appRoutes = {
  taskListRoute: (_) => const TaskListPage(),
};
