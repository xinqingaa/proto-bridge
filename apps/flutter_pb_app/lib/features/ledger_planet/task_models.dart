/// Mock tasks aligned with pbwork `prototypes/ledger-planet` evidence.
enum TaskStatus { todo, done }

enum RewardState { locked, claimable, claimed }

class BenefitTask {
  const BenefitTask({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.status,
    required this.progress,
    required this.target,
    required this.cycle,
    required this.reward,
    required this.rewardState,
  });

  final String id;
  final String title;
  final String subtitle;
  final TaskStatus status;
  final int progress;
  final int target;
  final String cycle;
  final String reward;
  final RewardState rewardState;
}

const List<BenefitTask> kLedgerTasks = [
  BenefitTask(
    id: 't1',
    title: '记一笔',
    subtitle: '今日完成 1 笔记账',
    status: TaskStatus.todo,
    progress: 0,
    target: 1,
    cycle: '每日',
    reward: '3 星币',
    rewardState: RewardState.locked,
  ),
  BenefitTask(
    id: 't2',
    title: '查看本周图表',
    subtitle: '打开图表分析页',
    status: TaskStatus.done,
    progress: 1,
    target: 1,
    cycle: '每周',
    reward: '5 星币',
    rewardState: RewardState.claimable,
  ),
  BenefitTask(
    id: 't3',
    title: '连续记账 3 天',
    subtitle: '成长任务',
    status: TaskStatus.todo,
    progress: 1,
    target: 3,
    cycle: '成长',
    reward: '¥3 体验券',
    rewardState: RewardState.locked,
  ),
];

({String primary, String hint}) faceValue(String reward) {
  final yen = RegExp(r'¥\s*(\d+)').firstMatch(reward);
  if (yen != null) {
    return (primary: '¥${yen.group(1)}', hint: '体验券');
  }
  final coins = RegExp(r'(\d+)\s*星币').firstMatch(reward);
  if (coins != null) {
    return (primary: coins.group(1)!, hint: '星币');
  }
  return (primary: '奖', hint: '奖励');
}

BenefitTask taskById(String id) {
  return kLedgerTasks.firstWhere(
    (task) => task.id == id,
    orElse: () => kLedgerTasks.first,
  );
}
