/**
 * Every word the user sees, in English and Arabic. Pick the language in the Settings tab.
 * t_('key', a, b) replaces {0}, {1} … with the extra arguments.
 */

const STRINGS = {
  en: {
    menu: 'Drive Cleanup',
    m_scan: '1 · Scan sharing (read-only)',
    m_plan: '2 · Build sharing plan (read-only)',
    m_apply: '3 · Apply ticked sharing changes',
    m_find: '4 · Find clean-up candidates (read-only)',
    m_trash: '5 · Move ticked items to trash',
    m_reset: 'Stop and reset',

    tab_summary: 'Summary',
    tab_shared: 'Shared items',
    tab_people: 'People',
    tab_notmine: 'Not owned by me',
    tab_plan: 'Sharing plan',
    tab_plan_people: 'Plan by person',
    tab_cand: 'Clean-up candidates',

    h_summary: ['Item', 'Count'],
    h_shared: ['Name', 'Type', 'Folder', 'Link sharing', 'Editors', 'Commenters', 'Viewers', 'Open', 'ID', 'Parent ID', 'Anyone role'],
    h_people: ['Email', 'On your keep list', 'Items', 'Editor', 'Commenter', 'Viewer', 'Examples'],
    h_notmine: ['Name', 'Type', 'Owner', 'Folder', 'Open'],
    h_plan: ['Apply', 'Name', 'Type', 'Folder', 'Remove these people', 'Link change', 'Status', 'ID', 'Link action', 'Depth'],
    h_plan_people: ['Email', 'Items they lose access to'],
    h_cand: ['Trash', 'Kind', 'Name', 'Size (MB)', 'Folder', 'Modified', 'Open', 'Status', 'ID', 'Group', 'Kind code', 'State'],

    root: 'My Drive',
    phase_folders: 'reading folders',
    phase_owned: 'reading your items',
    phase_notmine: 'reading items you do not own',
    phase_summary: 'writing the summary',

    link_none: 'No',
    link_anyone: 'Anyone with the link · {0}',
    link_public: ' (public on the web)',
    link_domain: 'Domain {0} · {1}',
    role_writer: 'editor',
    role_commenter: 'commenter',
    role_reader: 'viewer',
    keep_everywhere: 'Yes, everywhere',
    keep_scoped: 'Only inside chosen folders',
    keep_no: 'No',

    s_owned: 'Items you own',
    s_shared: 'Your items shared with someone',
    s_links: 'Your items open to anyone with the link',
    s_links_edit: '… of which anyone can edit',
    s_people: 'People with access to your items',
    s_outside: '… of which not on your keep list',
    s_notmine: 'Items in your Drive owned by someone else',
    s_by_owner: 'Items you do not own, by owner',
    s_date: 'Scanned at',
    s_note: 'Note',
    s_note_v: 'Read-only scan. Nothing in your Drive was changed.',

    scan_progress: 'Still scanning ({0}; {1} of your items so far). It continues by itself in about a minute.',
    scan_done: 'Scan finished: {0} of your items are shared, {1} are open to anyone with the link. See the Summary tab.',
    need_scan: 'Run "1 · Scan sharing" first.',
    need_plan: 'Run "2 · Build sharing plan" first.',
    need_find: 'Run "4 · Find clean-up candidates" first.',
    nothing_ticked: 'There are no ticked rows left to do.',

    keep_empty_warn: 'Your keep list is empty, so the plan removes everyone except you. Add people in the Settings tab if that is not what you want.',
    bad_folder_warn: 'The folder for {0} could not be read, so they are kept everywhere to be safe.',
    plan_done: 'Plan ready: {0} items change, {1} people lose access, {2} links change. Nothing has changed yet. Untick any row you want to skip.',
    plan_empty: 'Nothing to change: your sharing already matches your keep list.',
    link_act_view: 'Make view-only',
    link_act_remove: 'Remove link',
    confirm_apply: 'Apply {0} ticked rows? People will lose access and links will change. It runs in batches and continues by itself.',
    apply_progress: 'Applied {0} rows, {1} left. It continues by itself in about a minute.',
    apply_done: 'Done. Check the Status column, then run the scan again to confirm.',
    st_removed: 'removed {0}',
    st_link_view: 'link is now view-only',
    st_link_removed: 'link removed',
    st_nothing: 'Nothing left to do (a parent folder already handled it)',
    st_failed: 'Failed: {0}',
    st_read_error: 'Could not read the sharing: {0}',
    hint_inherited: ': access comes from a parent folder. If that folder is not yours, move this item into a folder you own and run the plan again.',

    k_dup_keep: 'Duplicate · original, kept',
    k_dup_extra: 'Duplicate · extra copy',
    k_empty_folder: 'Empty folder',
    k_empty_file: 'Empty file',
    k_large: 'Large file · your call',
    cand_done: 'Found {0} extra duplicate copies ({1} MB), {2} empty folders, {3} empty files and {4} large files. Your trash already holds {5} MB. Review the ticks, then run "5 · Move ticked items to trash".',
    cand_partial: '{0} untitled Google files were not opened because of the time limit.',
    confirm_trash: 'Move {0} ticked items to the trash? You can restore them from Drive\'s trash for 30 days.',
    trash_progress: 'Moved {0} to the trash, {1} left. It continues by itself in about a minute.',
    trash_done: 'Done: {0} items moved to the trash. See the Status column.',
    st_trashed: 'Moved to trash',
    st_already: 'Already in trash',
    st_not_owner: 'Skipped: you are not the owner',
    st_not_empty: 'Skipped: the folder is no longer empty',
    st_last_copy: 'Kept: last copy of this file',
    st_not_found: 'Skipped: not found',

    reset_done: 'Background runs stopped and scan progress cleared. Nothing in Drive was changed.',

    type_folder: 'Folder', type_doc: 'Doc', type_sheet: 'Sheet', type_slides: 'Slides', type_form: 'Form',
    type_shortcut: 'Shortcut', type_pdf: 'PDF', type_image: 'Image', type_video: 'Video', type_audio: 'Audio', type_file: 'File'
  },

  ar: {
    menu: 'تنظيف الدرايف',
    m_scan: '١ · فحص المشاركة (قراءة فقط)',
    m_plan: '٢ · إعداد خطة المشاركة (قراءة فقط)',
    m_apply: '٣ · تنفيذ التغييرات المحددة',
    m_find: '٤ · البحث عمّا يمكن حذفه (قراءة فقط)',
    m_trash: '٥ · نقل المحدد إلى سلة المهملات',
    m_reset: 'إيقاف وإعادة ضبط',

    tab_summary: 'الملخص',
    tab_shared: 'العناصر المشاركة',
    tab_people: 'الأشخاص',
    tab_notmine: 'ليست ملكي',
    tab_plan: 'خطة المشاركة',
    tab_plan_people: 'الخطة حسب الشخص',
    tab_cand: 'مرشحات الحذف',

    h_summary: ['البند', 'العدد'],
    h_shared: ['الاسم', 'النوع', 'المجلد', 'المشاركة بالرابط', 'محررون', 'معلّقون', 'عارضون', 'فتح', 'المعرّف', 'المجلد الأب', 'صلاحية الرابط'],
    h_people: ['البريد', 'في قائمة من يبقى', 'العناصر', 'محرر', 'معلّق', 'عارض', 'أمثلة'],
    h_notmine: ['الاسم', 'النوع', 'المالك', 'المجلد', 'فتح'],
    h_plan: ['تنفيذ', 'الاسم', 'النوع', 'المجلد', 'إزالة هؤلاء', 'تغيير الرابط', 'الحالة', 'المعرّف', 'إجراء الرابط', 'العمق'],
    h_plan_people: ['البريد', 'عدد العناصر التي سيفقد الوصول إليها'],
    h_cand: ['حذف', 'النوع', 'الاسم', 'الحجم (MB)', 'المجلد', 'آخر تعديل', 'فتح', 'الحالة', 'المعرّف', 'المجموعة', 'رمز النوع', 'الوضع'],

    root: 'ملفاتي',
    phase_folders: 'قراءة المجلدات',
    phase_owned: 'قراءة عناصرك',
    phase_notmine: 'قراءة العناصر التي لا تملكها',
    phase_summary: 'كتابة الملخص',

    link_none: 'لا',
    link_anyone: 'أي شخص لديه الرابط · {0}',
    link_public: ' (عام على الإنترنت)',
    link_domain: 'النطاق {0} · {1}',
    role_writer: 'محرر',
    role_commenter: 'معلّق',
    role_reader: 'عارض',
    keep_everywhere: 'نعم، في كل مكان',
    keep_scoped: 'داخل مجلدات محددة فقط',
    keep_no: 'لا',

    s_owned: 'العناصر التي تملكها',
    s_shared: 'عناصرك المشاركة مع أحد',
    s_links: 'عناصرك المفتوحة لأي شخص لديه الرابط',
    s_links_edit: '… منها يستطيع أي شخص تعديلها',
    s_people: 'أشخاص لديهم صلاحية على عناصرك',
    s_outside: '… منهم ليسوا في قائمة من يبقى',
    s_notmine: 'عناصر في درايفك يملكها غيرك',
    s_by_owner: 'العناصر التي لا تملكها، حسب المالك',
    s_date: 'تاريخ الفحص',
    s_note: 'ملاحظة',
    s_note_v: 'فحص للقراءة فقط. لم يتغير شيء في الدرايف.',

    scan_progress: 'ما زال الفحص جارياً ({0}، قُرئ {1} من عناصرك حتى الآن). يكمل وحده بعد دقيقة تقريباً.',
    scan_done: 'انتهى الفحص: {0} من عناصرك مشاركة، و{1} مفتوحة لأي شخص لديه الرابط. راجع تبويب «الملخص».',
    need_scan: 'شغّل «١ · فحص المشاركة» أولاً.',
    need_plan: 'شغّل «٢ · إعداد خطة المشاركة» أولاً.',
    need_find: 'شغّل «٤ · البحث عمّا يمكن حذفه» أولاً.',
    nothing_ticked: 'لا توجد صفوف محددة متبقية.',

    keep_empty_warn: 'قائمة من يبقى فارغة، لذلك تزيل الخطة الجميع ما عداك. أضف الأشخاص في تبويب الإعدادات إن لم يكن هذا ما تريده.',
    bad_folder_warn: 'تعذّرت قراءة المجلد الخاص بـ {0}، لذلك يبقى في كل مكان احتياطاً.',
    plan_done: 'الخطة جاهزة: سيتغير {0} عنصر، ويفقد {1} شخص الوصول، ويتغير {2} رابط. لم يتغير شيء بعد. ألغِ تحديد أي صف لا تريد تنفيذه.',
    plan_empty: 'لا شيء يحتاج إلى تغيير: المشاركة مطابقة لقائمة من يبقى.',
    link_act_view: 'تحويله إلى عرض فقط',
    link_act_remove: 'حذف الرابط',
    confirm_apply: 'تنفيذ {0} صف محدد؟ سيفقد أشخاص الوصول وستتغير روابط. يعمل على دفعات ويكمل وحده.',
    apply_progress: 'نُفّذ {0} صف، وبقي {1}. يكمل وحده بعد دقيقة تقريباً.',
    apply_done: 'انتهى التنفيذ. راجع عمود «الحالة»، ثم شغّل الفحص مرة أخرى للتأكد.',
    st_removed: 'أُزيل {0}',
    st_link_view: 'أصبح الرابط للعرض فقط',
    st_link_removed: 'حُذف الرابط',
    st_nothing: 'لا شيء متبقٍ (عالجه المجلد الأعلى)',
    st_failed: 'لم يتم: {0}',
    st_read_error: 'تعذّرت قراءة المشاركة: {0}',
    hint_inherited: ': الصلاحية موروثة من مجلد أعلى. إن لم يكن المجلد ملكك، انقل هذا العنصر إلى مجلد تملكه ثم شغّل الخطة مرة أخرى.',

    k_dup_keep: 'مكرر · الأصل، يبقى',
    k_dup_extra: 'مكرر · نسخة زائدة',
    k_empty_folder: 'مجلد فارغ',
    k_empty_file: 'ملف فارغ',
    k_large: 'ملف كبير · القرار لك',
    cand_done: 'وُجد {0} نسخة مكررة زائدة ({1} MB)، و{2} مجلد فارغ، و{3} ملف فارغ، و{4} ملف كبير. في سلة المهملات حالياً {5} MB. راجع التحديد ثم شغّل «٥ · نقل المحدد إلى سلة المهملات».',
    cand_partial: 'لم يُفتح {0} ملف Google بلا عنوان بسبب حد الوقت.',
    confirm_trash: 'نقل {0} عنصر محدد إلى سلة المهملات؟ يمكنك استرجاعها من سلة الدرايف خلال 30 يوماً.',
    trash_progress: 'نُقل {0} إلى السلة، وبقي {1}. يكمل وحده بعد دقيقة تقريباً.',
    trash_done: 'انتهى: نُقل {0} عنصر إلى سلة المهملات. راجع عمود «الحالة».',
    st_trashed: 'نُقل إلى السلة',
    st_already: 'في السلة أصلاً',
    st_not_owner: 'تُرك: لست المالك',
    st_not_empty: 'تُرك: لم يعد المجلد فارغاً',
    st_last_copy: 'بقي: آخر نسخة من هذا الملف',
    st_not_found: 'تُرك: غير موجود',

    reset_done: 'توقفت عمليات الخلفية ومُسح تقدّم الفحص. لم يتغير شيء في الدرايف.',

    type_folder: 'مجلد', type_doc: 'مستند', type_sheet: 'جدول', type_slides: 'عرض', type_form: 'نموذج',
    type_shortcut: 'اختصار', type_pdf: 'PDF', type_image: 'صورة', type_video: 'فيديو', type_audio: 'صوت', type_file: 'ملف'
  }
};

function lang_() {
  try { return settings_().lang; } catch (e) { return 'en'; }
}

function t_(key) {
  const args = Array.prototype.slice.call(arguments, 1);
  const v = (STRINGS[lang_()] || STRINGS.en)[key];
  const s = v === undefined ? STRINGS.en[key] : v;
  if (s === undefined) return key;
  if (Array.isArray(s)) return s;
  return s.replace(/\{(\d+)\}/g, function (m, i) { return args[i] === undefined ? m : String(args[i]); });
}
