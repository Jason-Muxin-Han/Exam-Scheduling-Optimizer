/**
 * Bilingual UI strings. This is the ONLY file in the repository that contains
 * Chinese text: it is webpage UI content, not repository documentation.
 *
 * The dictionaries are plain data so they can be imported safely in Node for
 * the key-parity test. DOM access is confined to applyI18n() and is guarded.
 */

export const LANGS = ['en', 'zh'];

export const dictionaries = {
  en: {
    pageTitle: 'Exam Scheduling Optimizer',
    appTitle: 'Exam Scheduling Optimizer',
    appSubtitle: 'Graph coloring under real scheduling constraints',
    repoLink: 'GitHub repo',
    languageLabel: 'Language',
    timetableTitle: 'Timetable',
    comparisonTitle: 'Heuristic comparison',
    graphTitle: 'Conflict graph',
    graphHint: 'An edge joins two subjects that share at least one student. Node color shows the assigned time slot.',
    footerNote: 'Synthetic data only. Import accepts anonymised numeric or hashed IDs exclusively.',
    heuristicLabel: 'Show schedule from',

    heuristicCourseOrder: 'Course order (first-fit)',
    heuristicLargestDegree: 'Highest conflict first',
    heuristicDsatur: 'DSATUR (reference)',

    sectionInstance: '1. Instance data',
    sectionSchedule: '2. Schedule settings',
    sectionSubjects: '3. Subjects',
    sectionPairs: '4. Mutually exclusive electives',
    sectionIO: '5. Import and export',
    seedLabel: 'Random seed',
    regenerate: 'Regenerate',
    subjectCountLabel: 'Total exam subjects',
    electiveRangeLabel: 'Electives per student (min / max)',
    electiveMinLabel: 'Min',
    electiveMaxLabel: 'Max',
    daysLabel: 'Exam days',
    minRestLabel: 'Minimum rest between exams (minutes)',
    minRestHint: 'Measured from the end of one exam to the start of the next, only for subjects sharing a student. At 150 minutes or more, adjacent slots are impossible.',
    disabledSlotsLabel: 'Disabled day / slot',
    disabledHint: 'Click a cell to forbid that time slot. Click again to re-enable it.',

    colSubject: 'Subject',
    colKind: 'Type',
    colDuration: 'Duration (min)',
    colPin: 'Lock time',
    kindCompulsory: 'Compulsory',
    kindElective: 'Elective',
    pinNone: 'Unlocked',
    pairSectionHint: 'Two subjects marked as exclusive are taken by disjoint student groups: students may choose only one of them. They have no conflict edge and can share one time slot, saving a slot.',
    pairSubjectA: 'First subject',
    pairSubjectB: 'Second subject',
    addPair: 'Add pair',
    remove: 'Remove',
    noPairs: 'No exclusive pairs defined.',
    pairSaved: 'exclusive pair(s) active',
    pairInvalid: 'Choose two different elective subjects that are not already paired.',
    pairSuggestionHint: 'Suggested: two electives that currently share students, so adding the pair removes a real conflict edge.',

    importTitle: 'Import anonymised data',
    importHint: 'CSV edge list (student_id,subject_id) or JSON instance. Names, emails and free-text IDs are rejected.',
    importButton: 'Import file',
    loadSample: 'Load sample',
    clearImport: 'Back to synthetic data',
    importedNotice: 'Imported data active: subject count, subject types, elective range and exclusive pairs are locked. Clear the import to edit them again.',
    exportTitle: 'Export',
    exportScheduleCsv: 'Schedule CSV',
    exportScheduleJson: 'Schedule JSON',
    exportGraphJson: 'Conflict graph JSON',
    exportGraphSvg: 'Conflict graph SVG',
    privacyNote: 'Privacy: use numeric or hashed IDs only. Never upload names, emails, student numbers or any personal information.',
    importErrorTitle: 'Import rejected',
    advancedTitle: 'Experiment summary',
    resetAll: 'Reset all settings',

    dayLabel: 'Day',
    slotLabel: 'Slot',
    disabledCell: 'Disabled',
    emptySlot: 'Free',
    pinnedBadge: 'Locked',
    durationUnit: 'min',
    minutesShort: 'min',
    subjectsShort: 'subjects',
    studentsShort: 'students',
    seedShort: 'seed',

    comparisonIntro: 'All three strategies solve the same instance with the same constraints. The first two are the strategies compared in the project brief.',
    metricSlots: 'Slots used',
    metricDays: 'Days used',
    metricMaxPerSlot: 'Max exams / slot',
    metricViolations: 'Violations',
    metricEvaluations: 'Constraint checks',
    bestBadge: 'Best',
    chartTitle: 'Time slots used (fewer is better)',
    savingsMore: 'Highest-conflict-first saves {n} slot(s) versus course order.',
    savingsEqual: 'Both main strategies use the same number of slots.',
    savingsNegative: 'Course order uses {n} fewer slot(s) on this instance.',

    graphNodes: 'Nodes',
    graphEdges: 'Edges',
    graphDensity: 'Density',
    graphLegendSlot: 'Color = time slot',
    graphLegendCompulsory: 'Compulsory',
    graphLegendElective: 'Elective',
    graphExclusive: 'Exclusive pair',

    warningTitle: 'Constraint violations',
    feasibleBadge: 'Feasible schedule',
    infeasibleBadge: 'Infeasible instance',
    noViolations: 'All constraints satisfied.',
    violationsCount: '{n} violation(s)',
    'violation.durationExceedsSlot': 'Exam duration outside the allowed slot length',
    'violation.conflictInSameSlot': 'Conflicting exams placed in the same slot',
    'violation.minRestViolation': 'Minimum rest between exams not met',
    'violation.disabledSlotUsed': 'A disabled time slot was used',
    'violation.pinnedInDisabledSlot': 'A locked subject points to a disabled slot',
    'violation.pinnedConflict': 'A locked subject could not keep its requested slot',
    'violation.colorOutOfRange': 'Assigned slot is outside the configured days',
    'violation.unscheduled': 'Subject could not be scheduled',

    'err.invalidFile': 'Unsupported file type. Use .csv or .json.',
    'err.emptyFile': 'The file contains no enrollment rows.',
    'err.badId': 'IDs must be numeric or hashed tokens (letters, digits, - and _, 8-64 characters). Personal identifiers are not accepted.',
    'err.missingColumn': 'CSV must have the header student_id,subject_id.',
    'err.duplicateId': 'Duplicate subject IDs are not allowed.',
    'err.danglingRef': 'An enrollment row references an unknown subject ID.',
    'err.badDuration': 'Exam durations must be positive numbers.',
    'err.badJson': 'Invalid JSON or missing required fields.',
    'err.tooManySubjects': 'At most 60 subjects can be imported for the interactive view.',
    'err.tooManyRows': 'The enrollment table is too large (200000 rows maximum).',
    'ok.imported': 'Imported {s} subjects and {t} students.',
  },

  zh: {
    pageTitle: '考试安排优化器',
    appTitle: '考试安排优化器',
    appSubtitle: '用图着色处理现实排考约束',
    repoLink: 'GitHub 仓库',
    languageLabel: '语言',
    timetableTitle: '考试课表',
    comparisonTitle: '算法对比',
    graphTitle: '冲突图',
    graphHint: '两门课有共同学生时连一条边；节点颜色表示被分配到的考试时段。',
    footerNote: '默认仅使用虚构数据；导入功能只接受匿名数字 ID 或哈希 ID。',
    heuristicLabel: '显示哪种算法的结果',

    heuristicCourseOrder: '按课程顺序（首次适应）',
    heuristicLargestDegree: '优先安排冲突最多的课程',
    heuristicDsatur: 'DSATUR（参考对照）',

    sectionInstance: '1. 实例数据',
    sectionSchedule: '2. 排考设置',
    sectionSubjects: '3. 科目设置',
    sectionPairs: '4. 二选一互斥选修',
    sectionIO: '5. 导入与导出',
    seedLabel: '随机种子',
    regenerate: '重新生成',
    subjectCountLabel: '总考试科目数',
    electiveRangeLabel: '每名学生选修科目数（最小 / 最大）',
    electiveMinLabel: '最小',
    electiveMaxLabel: '最大',
    daysLabel: '考试天数',
    minRestLabel: '考试之间最小间隔（分钟）',
    minRestHint: '仅对有共同学生的科目计算：上一场结束到下一场开始。设为 150 分钟或以上时，相邻时段将不可同时使用。',
    disabledSlotsLabel: '禁用某天某时段',
    disabledHint: '点击格子禁用该时段，再次点击恢复。',

    colSubject: '科目',
    colKind: '类型',
    colDuration: '时长（分钟）',
    colPin: '锁定时间',
    kindCompulsory: '必修',
    kindElective: '选修',
    pinNone: '未锁定',
    pairSectionHint: '标记为互斥的两门课由互不重叠的学生群体选修，学生只能二选一。它们之间没有冲突边，因此可以排在同一时段，从而省下一个时段。',
    pairSubjectA: '第一门科目',
    pairSubjectB: '第二门科目',
    addPair: '添加科目对',
    remove: '移除',
    noPairs: '尚未定义互斥科目对。',
    pairSaved: '组互斥科目对生效中',
    pairInvalid: '请选择两门不同、且尚未配对的选修科目。',
    pairSuggestionHint: '已为你推荐一对当前存在共同学生（有冲突边）的选修课，添加后会真实地移除这条边。',

    importTitle: '导入匿名数据',
    importHint: 'CSV 选课边表（student_id,subject_id）或 JSON 实例文件。姓名、邮箱、自由文本 ID 一律拒绝。',
    importButton: '导入文件',
    loadSample: '载入示例',
    clearImport: '返回虚构数据',
    importedNotice: '当前使用导入数据：科目数量、科目类型、选修数量范围与互斥科目对已锁定。清除导入后可重新编辑。',
    exportTitle: '导出',
    exportScheduleCsv: '课表 CSV',
    exportScheduleJson: '课表 JSON',
    exportGraphJson: '冲突图 JSON',
    exportGraphSvg: '冲突图 SVG',
    privacyNote: '隐私提示：只能使用数字 ID 或哈希 ID，请勿上传姓名、邮箱、学号或任何个人信息。',
    importErrorTitle: '导入被拒绝',
    advancedTitle: '实验摘要',
    resetAll: '重置全部设置',

    dayLabel: '第',
    slotLabel: '时段',
    disabledCell: '已禁用',
    emptySlot: '空闲',
    pinnedBadge: '已锁定',
    durationUnit: '分钟',
    minutesShort: '分钟',
    subjectsShort: '门科目',
    studentsShort: '名学生',
    seedShort: '种子',

    comparisonIntro: '三种策略在完全相同的实例与约束下求解；前两种是项目要求对比的方法。',
    metricSlots: '使用时段数',
    metricDays: '使用天数',
    metricMaxPerSlot: '单时段最多科目',
    metricViolations: '违规数',
    metricEvaluations: '约束检查次数',
    bestBadge: '最优',
    chartTitle: '使用时段数（越少越好）',
    savingsMore: '「冲突最多的课程优先」比「按课程顺序」少用 {n} 个时段。',
    savingsEqual: '两种主要策略使用的时段数相同。',
    savingsNegative: '本实例中「按课程顺序」少用 {n} 个时段。',

    graphNodes: '节点数',
    graphEdges: '边数',
    graphDensity: '密度',
    graphLegendSlot: '颜色 = 考试时段',
    graphLegendCompulsory: '必修',
    graphLegendElective: '选修',
    graphExclusive: '互斥科目对',

    warningTitle: '约束违规',
    feasibleBadge: '排考可行',
    infeasibleBadge: '当前实例不可行',
    noViolations: '所有约束均已满足。',
    violationsCount: '{n} 条违规',
    'violation.durationExceedsSlot': '考试时长超出时段允许范围',
    'violation.conflictInSameSlot': '有冲突的两门课被排在同一时段',
    'violation.minRestViolation': '考试之间的最小间隔不足',
    'violation.disabledSlotUsed': '使用了已禁用的时段',
    'violation.pinnedInDisabledSlot': '被锁定的科目指向了已禁用时段',
    'violation.pinnedConflict': '被锁定的科目未能保持指定时段',
    'violation.colorOutOfRange': '分配的时段超出设定的考试天数',
    'violation.unscheduled': '科目未能安排',

    'err.invalidFile': '不支持的文件类型，请使用 .csv 或 .json。',
    'err.emptyFile': '文件中没有选课记录。',
    'err.badId': 'ID 只能是数字或哈希串（字母、数字、-、_，长度 8–64）。不接受任何个人身份标识。',
    'err.missingColumn': 'CSV 表头必须为 student_id,subject_id。',
    'err.duplicateId': '不允许重复的科目 ID。',
    'err.danglingRef': '选课记录引用了不存在的科目 ID。',
    'err.badDuration': '考试时长必须为正数。',
    'err.badJson': 'JSON 无效或缺少必需字段。',
    'err.tooManySubjects': '交互界面最多支持导入 60 门科目。',
    'err.tooManyRows': '选课表过大（最多 200000 行）。',
    'ok.imported': '已导入 {s} 门科目、{t} 名学生。',
  },
};

const STORAGE_KEY = 'eso-lang';

export function isLang(value) {
  return LANGS.includes(value) ? value : null;
}

/** Resolve the initial language: URL override > stored choice > browser > English. */
export function detectLang(search, stored, browserLang) {
  const fromUrl = isLang(new URLSearchParams(search || '').get('lang'));
  if (fromUrl) return fromUrl;
  if (isLang(stored)) return stored;
  if (browserLang && /^zh/i.test(browserLang)) return 'zh';
  return 'en';
}

export function t(key, lang = 'en') {
  const dict = dictionaries[isLang(lang) ? lang : 'en'];
  return dict[key] ?? dictionaries.en[key] ?? key;
}

/** Interpolate {name} placeholders. */
export function tf(key, lang, values = {}) {
  return t(key, lang).replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? `{${name}}`));
}

/**
 * Apply translations to static markup. Guarded so Node can import this module
 * for the dictionary parity test without a DOM.
 */
export function applyI18n(lang = 'en', root) {
  if (typeof document === 'undefined') return;
  const scope = root || document;
  scope.querySelectorAll('[data-i18n]').forEach((node) => {
    node.textContent = t(node.getAttribute('data-i18n'), lang);
  });
  scope.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
    node.setAttribute('placeholder', t(node.getAttribute('data-i18n-placeholder'), lang));
  });
  scope.querySelectorAll('[data-i18n-title]').forEach((node) => {
    node.setAttribute('title', t(node.getAttribute('data-i18n-title'), lang));
  });
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
}

export function readStoredLang() {
  if (typeof localStorage === 'undefined') return null;
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

export function storeLang(lang) {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* storage may be blocked */ }
}
