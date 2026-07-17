import 'package:flutter/material.dart';
import '../../common/widgets/common_app_bar.dart';

class TaskListPage extends StatelessWidget {
  const TaskListPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const CommonAppBar(title: '任务列表'),
      body: ListView(children: const [Card(child: ListTile(title: Text('梳理需求')))]),
    );
  }
}
