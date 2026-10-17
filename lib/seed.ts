import type {
  Assignment, AuditEntry, Booking, Decision, Delegation, DocFile, Entity, Hall, Letter,
  Meeting, Note, Notification, Person, RequestItem, Role,
} from "./types";

/* ───────────────────────── الأدوار والصلاحيات ───────────────────────── */

export const roles: Role[] = [
  {
    key: "governor", title: "السيد المحافظ", scope: "كل المحافظة", reach: "الديوان والمديريات",
    summary: "صلاحية تنفيذية عليا: يرى كل العمل التنفيذي ويعتمد ويوجّه ويغلق ضمن المنظومة.",
    grants: { view: "full", create: "full", edit: "full", assign: "full", approve: "full", close: "full", archive: "full", delete: "full" },
  },
  {
    key: "deputy", title: "نائب المحافظ", scope: "كل المحافظة", reach: "الديوان والمديريات",
    summary: "ينوب عن المحافظ في العمل التنفيذي والاعتماد والمتابعة على مستوى المحافظة.",
    grants: { view: "full", create: "full", edit: "full", assign: "full", approve: "full", close: "full", archive: "full", delete: "full" },
  },
  {
    key: "assistant", title: "معاون المحافظ", scope: "الديوان والملفات المكلّف بها", reach: "الديوان",
    summary: "يتابع ويعتمد الملفات المكلّف بها من داخل الديوان، ولا يدخل إدارة المديريات أو بياناتها التشغيلية كمدير عام.",
    grants: { view: "partial", create: "full", edit: "full", assign: "full", approve: "full", close: "full", archive: "partial", delete: "none" },
  },
  {
    key: "secgen", title: "الأمين العام", scope: "تنسيق الديوان ومتابعة الجهات", reach: "تنظيم ورقابة",
    summary: "ينسّق العمل بين الديوان والجهات ويتابع التنفيذ والتقارير دون اعتماد نهائي.",
    grants: { view: "full", create: "full", edit: "full", assign: "full", approve: "none", close: "none", archive: "full", delete: "none" },
  },
  {
    key: "chief", title: "مدير مكتب المحافظ", scope: "مكتب المحافظ", reach: "الديوان",
    summary: "يدير التقويم والاجتماعات والوارد والتكليفات المرتبطة بمكتب المحافظ، دون صلاحية اعتماد نهائي.",
    grants: { view: "full", create: "full", edit: "full", assign: "full", approve: "none", close: "none", archive: "full", delete: "none" },
  },
  {
    key: "followup", title: "مكتب المتابعة", scope: "التكليفات والمؤشرات", reach: "رقابة عابرة للجهات",
    summary: "يراقب التكليفات ومؤشرات الالتزام عبر الجهات للاطلاع والتصعيد فقط، دون تنفيذ أو اعتماد.",
    grants: { view: "full", create: "none", edit: "none", assign: "none", approve: "none", close: "none", archive: "none", delete: "none" },
  },
  {
    key: "director", title: "مدير المديرية", scope: "جهته فقط", reach: "بوابة المديريات",
    summary: "يرى ويدير عمل جهته، يوزّع المهام ويرفع الردود والمعاملات باسم الجهة فقط.",
    grants: { view: "partial", create: "full", edit: "full", assign: "full", approve: "partial", close: "partial", archive: "full", delete: "none" },
  },
  {
    key: "branch", title: "مدير فرع", scope: "فرعه فقط", reach: "بوابة المديريات",
    summary: "يدير فرع جهته في المحافظة بصلاحيات مدير المديرية نفسها: يوزّع المهام ويرفع الردود والمعاملات باسم الفرع فقط.",
    grants: { view: "partial", create: "full", edit: "full", assign: "full", approve: "partial", close: "partial", archive: "full", delete: "none" },
  },
  {
    key: "office", title: "مدير مكتب", scope: "مكتبه", reach: "داخل الجهة",
    summary: "يدير مكتباً داخل جهته: يرى عمل مكتبه والمهام المرتبطة به ويوزّع العمل ضمن حدوده.",
    grants: { view: "partial", create: "full", edit: "partial", assign: "full", approve: "none", close: "none", archive: "none", delete: "none" },
  },
  {
    key: "head", title: "رئيس قسم", scope: "وحدته", reach: "داخل المديرية",
    summary: "يرى عمل وحدته والمهام المرتبطة بها ويوزّع العمل ضمن حدود القسم.",
    grants: { view: "partial", create: "full", edit: "partial", assign: "full", approve: "none", close: "none", archive: "none", delete: "none" },
  },
  {
    key: "employee", title: "موظف منفّذ", scope: "المسند إليه", reach: "مهامه فقط",
    summary: "يرى تكليفاته ومشاركاته واجتماعاته وطلباته فقط ويحدّث التنفيذ ويرفع المرفقات.",
    grants: { view: "partial", create: "none", edit: "partial", assign: "none", approve: "none", close: "none", archive: "none", delete: "none" },
  },
  {
    key: "registry", title: "الديوان وأمانة السر", scope: "المراسلات والمحاضر", reach: "اختصاص أمانة السر",
    summary: "يقيد الوارد والصادر ويدير المحاضر والملفات المرتبطة بعمله، ويرى تكليفاته فقط خارج ذلك.",
    grants: { view: "partial", create: "full", edit: "full", assign: "partial", approve: "none", close: "none", archive: "full", delete: "none" },
  },
  {
    key: "protocol", title: "المراسم والقاعات", scope: "الوفود والزيارات والقاعات", reach: "اختصاص المراسم",
    summary: "يدير الوفود والزيارات والقاعات: يجدول اللقاءات ويؤكد حجوزات القاعات أو يرفضها، ويرى تكليفاته فقط ولا يدخل المديريات.",
    grants: { view: "partial", create: "full", edit: "full", assign: "none", approve: "partial", close: "none", archive: "none", delete: "none" },
  },
  {
    key: "halls", title: "مشرف القاعات", scope: "القاعات والحجوزات", reach: "اختصاص القاعات",
    summary: "يدير القاعات ويؤكد أو يرفض طلبات الحجز ويرى تكليفاته فقط، دون وصول لباقي أعمال الديوان.",
    grants: { view: "partial", create: "full", edit: "full", assign: "none", approve: "partial", close: "none", archive: "none", delete: "none" },
  },
  {
    key: "admin", title: "مدير النظام", scope: "الإعدادات التقنية", reach: "لوحة التحكم فقط",
    summary: "يدير المستخدمين والجهات والأدوار وقواعد التصعيد والسجل، ولا يدخل محتوى العمل التنفيذي.",
    grants: { view: "partial", create: "full", edit: "full", assign: "none", approve: "none", close: "none", archive: "none", delete: "partial" },
  },
]

export const roleOf = (key: string) => roles.find((r) => r.key === key)!;

/* ───────────────────────── الجهات ───────────────────────── */

export const entities: Entity[] = [
  // ── مديرية المحافظة (الواجهة الأولى): أجهزة المحافظة نفسها
  { id: "e0", name: "مديرية مكتب المحافظ", short: "مكتب المحافظ", kind: "ديوان", tier: "governorate", managerId: "p3", units: ["السكرتارية", "أمانة السر", "المراسم"], staffCount: 24, active: true, compliance: 96, openTasks: 14, lateTasks: 1, accent: "navy" },
  { id: "e13", name: "مكتب النائب", short: "مكتب النائب", kind: "مكتب", tier: "governorate", managerId: "p2", units: [], staffCount: 1, active: true, compliance: 100, openTasks: 0, lateTasks: 0, accent: "gold" },
  { id: "e14", name: "مكتب النائب الثاني", short: "مكتب النائب الثاني", kind: "مكتب", tier: "governorate", managerId: "p35", units: [], staffCount: 1, active: true, compliance: 100, openTasks: 0, lateTasks: 0, accent: "gold" },
  { id: "e5", name: "المديرية القانونية", short: "القانونية", kind: "مديرية", tier: "governorate", managerId: "p14", units: ["العقود", "الدعاوى", "الاستشارات"], staffCount: 38, active: true, compliance: 83, openTasks: 11, lateTasks: 2, accent: "gold" },
  { id: "e15", name: "مديرية الرقابة الداخلية", short: "الرقابة الداخلية", kind: "مديرية", tier: "governorate", managerId: "p36", units: [], staffCount: 1, active: true, compliance: 100, openTasks: 0, lateTasks: 0, accent: "plum" },
  { id: "e10", name: "مديرية المتابعة والشكاوى", short: "المتابعة والشكاوى", kind: "مديرية", tier: "governorate", managerId: "p32", units: ["دائرة متابعة تنفيذ القرارات", "دائرة المتابعة الميدانية", "دائرة الشكاوى"], staffCount: 1, active: true, compliance: 100, openTasks: 0, lateTasks: 0, accent: "teal" },
  { id: "e7", name: "المديرية المالية", short: "المالية", kind: "مديرية", tier: "governorate", managerId: "p21", units: ["الموازنة", "المحاسبة", "التدقيق"], staffCount: 76, active: true, compliance: 86, openTasks: 13, lateTasks: 1, accent: "plum" },
  { id: "e16", name: "مديرية الشؤون الإدارية", short: "الشؤون الإدارية", kind: "مديرية", tier: "governorate", managerId: "p37", units: [], staffCount: 1, active: true, compliance: 100, openTasks: 0, lateTasks: 0, accent: "navy" },
  { id: "e11", name: "مديرية الإعلام", short: "الإعلام", kind: "مديرية", tier: "governorate", managerId: "p33", units: [], staffCount: 1, active: true, compliance: 100, openTasks: 0, lateTasks: 0, accent: "plum" },
  { id: "e17", name: "مديرية الاستثمار", short: "الاستثمار", kind: "مديرية", tier: "governorate", managerId: "p38", units: [], staffCount: 1, active: true, compliance: 100, openTasks: 0, lateTasks: 0, accent: "gold" },
  { id: "e18", name: "مديرية الدعم التنفيذي", short: "الدعم التنفيذي", kind: "مديرية", tier: "governorate", managerId: "p39", units: [], staffCount: 1, active: true, compliance: 100, openTasks: 0, lateTasks: 0, accent: "teal" },
  { id: "e8", name: "مديرية العلاقات العامة لمحافظة الرقة", short: "العلاقات العامة", kind: "مديرية", tier: "governorate", managerId: "p30", units: ["دائرة العلاقات المجتمعية", "دائرة تنظيم الفعاليات", "دائرة التواصل الحكومي", "دائرة الشراكات والعلاقات المدنية"], staffCount: 1, active: true, compliance: 100, openTasks: 0, lateTasks: 0, accent: "navy" },

  // ── مديريات المحافظة (الواجهة الثانية): المديريات الرئيسية
  { id: "e1", name: "مديرية الخدمات الفنية", short: "الخدمات الفنية", kind: "مديرية", tier: "main", managerId: "p5", units: ["شعبة الصيانة", "قسم الطرق", "قسم الإنارة"], staffCount: 186, active: true, compliance: 74, openTasks: 31, lateTasks: 6, accent: "gold" },
  { id: "e2", name: "مديرية التخطيط العمراني", short: "التخطيط العمراني", kind: "مديرية", tier: "main", managerId: "p8", units: ["قسم الدراسات", "قسم الرخص", "قسم المساحة"], staffCount: 142, active: true, compliance: 88, openTasks: 19, lateTasks: 2, accent: "teal" },
  { id: "e3", name: "مديرية الصحة", short: "الصحة", kind: "مديرية", tier: "main", managerId: "p10", units: ["الرعاية الأولية", "المشافي", "الصحة البيئية"], staffCount: 310, active: true, compliance: 91, openTasks: 22, lateTasks: 1, accent: "plum" },
  { id: "e20", name: "مديرية التربية", short: "التربية", kind: "مديرية", tier: "main", managerId: "p40", units: [], staffCount: 1, active: true, compliance: 100, openTasks: 0, lateTasks: 0, accent: "navy" },
  { id: "e21", name: "مديرية الزراعة", short: "الزراعة", kind: "مديرية", tier: "main", managerId: "p41", units: [], staffCount: 1, active: true, compliance: 100, openTasks: 0, lateTasks: 0, accent: "teal" },
  { id: "e4", name: "المؤسسة العامة للمياه", short: "مؤسسة المياه", kind: "مؤسسة", tier: "main", managerId: "p12", units: ["التشغيل", "الشبكات", "الجباية"], staffCount: 264, active: true, compliance: 69, openTasks: 27, lateTasks: 8, accent: "navy" },
  { id: "e6", name: "مديرية الدفاع المدني", short: "الدفاع المدني", kind: "مديرية", tier: "main", managerId: "p16", units: ["الإطفاء", "الإنقاذ", "خطط الطوارئ"], staffCount: 198, active: true, compliance: 94, openTasks: 9, lateTasks: 0, accent: "teal" },
  { id: "e9", name: "مديرية الدعم والتوريد", short: "الدعم والتوريد", kind: "مديرية", tier: "main", managerId: "p31", units: [], staffCount: 1, active: true, compliance: 100, openTasks: 0, lateTasks: 0, accent: "gold" },

  // فروع الجهات المركزية في المحافظة
  { id: "e12", name: "هيئة الاستثمار السورية — فرع الرقة", short: "هيئة الاستثمار", kind: "هيئة", tier: "main", managerId: "p34", units: [], staffCount: 1, active: true, compliance: 100, openTasks: 0, lateTasks: 0, accent: "navy" },
];

/** حسابات انتقلت إلى جهة أخرى: تُنقل في القواعد القائمة إن كانت ما تزال في جهتها القديمة */
export const moves = [
  { id: "p2", from: "e0", to: "e13" },
  { id: "p17", from: "e19", to: "e0", unit: "المراسم" },
];

/** مراجع الحسابات الملغاة تنتقل إلى مدير جهتها، والقاعات إلى المراسم */
export const reassigned: Record<string, string> = {p4: "p3", p6: "p5", p7: "p5", p9: "p8", p11: "p10", p13: "p12", p15: "p14", p18: "p3", p19: "p17"};

/** جهات وحسابات أُلغيت من الهيكل: تُحذف من القواعد القائمة عند التشغيل */
export const retired = {
  entities: ["a1", "a2", "a3", "h1", "h2", "h3", "e19"],
  people: ["p22", "p23", "p24", "p27", "p28", "p29", "p4", "p6", "p7", "p9", "p11", "p13", "p15", "p18", "p19"],
  roles: ["area"],
};

export const entityOf = (id: string) => entities.find((e) => e.id === id)!;

/* ───────────────────────── الأشخاص ───────────────────────── */

export const people: Person[] = [
  { id: "p1", name: "السيد المحافظ", title: "محافظ الرقة", entityId: "e0", role: "governor", phone: "0930 000 001", ext: "100", office: "الطابق الرابع — مكتب المحافظ", duties: ["رسم السياسة التنفيذية للمحافظة", "اعتماد القرارات والتكليفات الكبرى", "ترؤس مجلس المحافظة وخلية الأزمة"], clearance: "سرّي", avgResponseHours: 3, initials: "م" },
  { id: "p2", name: "نائب المحافظ", title: "نائب المحافظ", entityId: "e13", role: "deputy", phone: "0930 000 002", ext: "101", office: "الطابق الرابع", duties: ["الإنابة عن المحافظ", "متابعة الملفات الخدمية", "رئاسة اللجنة التنفيذية"], deputyOf: "p1", clearance: "سرّي", avgResponseHours: 5, initials: "ن" },
  { id: "p35", name: "النائب الثاني", title: "النائب الثاني للمحافظ", entityId: "e14", role: "deputy", phone: "0930 000 035", ext: "105", office: "الطابق الرابع", duties: ["الإنابة عن المحافظ فيما يُكلَّف به", "متابعة الملفات المسندة إلى مكتبه"], deputyOf: "p1", clearance: "سرّي", avgResponseHours: 5, initials: "ث" },
  { id: "p25", name: "معاون المحافظ", title: "معاون المحافظ", entityId: "e0", role: "assistant", phone: "0930 000 025", ext: "103", office: "الطابق الرابع", duties: ["الإنابة في الاعتماد والمتابعة", "الإشراف على الملفات المكلّف بها"], clearance: "سرّي", avgResponseHours: 6, initials: "ع" },
  { id: "p26", name: "الأمين العام", title: "الأمين العام للمحافظة", entityId: "e0", unit: "أمانة السر", role: "secgen", phone: "0930 000 026", ext: "104", office: "الطابق الثالث", duties: ["تنظيم سير العمل بين الديوان والمديريات", "متابعة تنفيذ القرارات وأرشفتها"], clearance: "سرّي", avgResponseHours: 4, initials: "أ" },
  { id: "p3", name: "مدير مكتب المحافظ", title: "مدير مكتب السيد المحافظ", entityId: "e0", unit: "السكرتارية", role: "chief", phone: "0930 000 003", ext: "102", office: "الطابق الرابع — مكتب المدير", duties: ["إدارة تقويم المحافظ والمواعيد", "فرز الوارد وتحديد ما يصل إلى المحافظ", "إصدار التكليفات نيابة عن المحافظ"], clearance: "سرّي", avgResponseHours: 2, initials: "م" },
  { id: "p5", name: "مدير الخدمات الفنية", title: "مدير الخدمات الفنية", entityId: "e1", role: "director", phone: "0930 000 005", ext: "210", office: "مبنى المديريات — الطابق الأول", duties: ["الإشراف على مشاريع الطرق والإنارة", "اعتماد ردود المديرية", "توزيع التكليفات على الأقسام"], clearance: "عادي", avgResponseHours: 9, initials: "خ" },
  { id: "p8", name: "مدير التخطيط العمراني", title: "مدير التخطيط العمراني", entityId: "e2", role: "director", phone: "0930 000 008", ext: "230", office: "مبنى المديريات — الطابق الثاني", duties: ["اعتماد المخططات التنظيمية", "الإشراف على الرخص"], clearance: "عادي", avgResponseHours: 7, initials: "ت" },
  { id: "p10", name: "مدير الصحة", title: "مدير الصحة", entityId: "e3", role: "director", phone: "0930 000 010", ext: "240", office: "مبنى المديريات — الطابق الثالث", duties: ["الإشراف على المراكز الصحية", "خطط الاستجابة الوبائية"], clearance: "سرّي", avgResponseHours: 6, initials: "ص" },
  { id: "p12", name: "مدير مؤسسة المياه", title: "المدير العام لمؤسسة المياه", entityId: "e4", role: "director", phone: "0930 000 012", ext: "250", office: "مبنى المؤسسة", duties: ["إدارة التوريد والشبكات", "خطة معالجة الانقطاعات"], clearance: "عادي", avgResponseHours: 13, initials: "م" },
  { id: "p14", name: "مدير المديرية القانونية", title: "مدير المديرية القانونية", entityId: "e5", role: "director", phone: "0930 000 014", ext: "260", office: "الطابق الثاني", duties: ["مراجعة العقود", "تمثيل المحافظة في الدعاوى"], clearance: "سرّي", avgResponseHours: 8, initials: "ق" },
  { id: "p16", name: "مدير الدفاع المدني", title: "مدير الدفاع المدني", entityId: "e6", role: "director", phone: "0930 000 016", ext: "270", office: "مركز الدفاع المدني", duties: ["خطط الطوارئ الموسمية", "جاهزية فرق الإنقاذ"], clearance: "سرّي", avgResponseHours: 4, initials: "د" },
  { id: "p17", name: "مسؤول المراسم", title: "مسؤول المراسم والقاعات", entityId: "e0", unit: "المراسم", role: "protocol", phone: "0930 000 017", ext: "112", office: "الطابق الرابع", duties: ["برامج الوفود الرسمية وترتيبات التشريفات", "إدارة القاعات وتأكيد الحجوزات"], clearance: "عادي", avgResponseHours: 5, initials: "ر" },
  { id: "p21", name: "مدير المالية", title: "مدير المالية", entityId: "e7", role: "director", phone: "0930 000 021", ext: "290", office: "مبنى المديريات — الطابق الأول", duties: ["إعداد الموازنة ومتابعة تنفيذها", "اعتماد الصرف ضمن السقوف المقررة"], clearance: "سرّي", avgResponseHours: 7, initials: "م" },
  { id: "p30", name: "مدير العلاقات العامة", title: "مدير العلاقات العامة لمحافظة الرقة", entityId: "e8", role: "director", phone: "0930 000 030", ext: "370", office: "مبنى المديريات", duties: ["الإشراف على العلاقات المجتمعية والتواصل الحكومي", "تنظيم الفعاليات وبناء الشراكات المدنية"], clearance: "عادي", avgResponseHours: 8, initials: "ع" },
  { id: "p31", name: "مدير الدعم والتوريد", title: "مدير الدعم والتوريد", entityId: "e9", role: "director", phone: "0930 000 031", ext: "380", office: "مبنى المديريات", duties: ["تأمين احتياجات الجهات من المواد والخدمات", "متابعة عمليات التوريد والتسليم"], clearance: "عادي", avgResponseHours: 8, initials: "د" },
  { id: "p32", name: "مدير المتابعة", title: "مدير مديرية المتابعة والشكاوى", entityId: "e10", role: "director", phone: "0930 000 032", ext: "390", office: "مبنى المديريات", duties: ["متابعة تنفيذ القرارات ميدانياً", "معالجة الشكاوى ورفع نتائجها"], clearance: "عادي", avgResponseHours: 6, initials: "م" },
  { id: "p33", name: "مدير الإعلام", title: "مدير الإعلام في المحافظة", entityId: "e11", role: "director", phone: "0930 000 033", ext: "395", office: "مبنى المديريات", duties: ["إدارة التغطية الإعلامية لأعمال المحافظة", "إصدار البيانات والأخبار الرسمية"], clearance: "عادي", avgResponseHours: 5, initials: "إ" },
  { id: "p34", name: "مدير فرع هيئة الاستثمار", title: "مدير فرع هيئة الاستثمار السورية في الرقة", entityId: "e12", role: "branch", phone: "0930 000 034", ext: "400", office: "مبنى هيئة الاستثمار", duties: ["متابعة المشاريع والفرص الاستثمارية في المحافظة", "التنسيق مع الديوان في ملفات المستثمرين"], clearance: "عادي", avgResponseHours: 8, initials: "س" },
  { id: "p36", name: "مدير الرقابة الداخلية", title: "مدير مديرية الرقابة الداخلية", entityId: "e15", role: "director", phone: "0930 000 036", ext: "410", office: "مبنى المديريات", duties: ["التدقيق على أعمال أجهزة المحافظة", "رفع تقارير الرقابة إلى المحافظ"], clearance: "عادي", avgResponseHours: 8, initials: "ر" },
  { id: "p37", name: "مدير الشؤون الإدارية", title: "مدير مديرية الشؤون الإدارية", entityId: "e16", role: "director", phone: "0930 000 037", ext: "420", office: "مبنى المديريات", duties: ["شؤون العاملين والدوام", "تنظيم الملاكات والقرارات الإدارية"], clearance: "عادي", avgResponseHours: 8, initials: "ش" },
  { id: "p38", name: "مدير الاستثمار", title: "مدير مديرية الاستثمار", entityId: "e17", role: "director", phone: "0930 000 038", ext: "430", office: "مبنى المديريات", duties: ["متابعة المشاريع الاستثمارية في المحافظة", "تسهيل إجراءات المستثمرين"], clearance: "عادي", avgResponseHours: 8, initials: "س" },
  { id: "p39", name: "مدير الدعم التنفيذي", title: "مدير مديرية الدعم التنفيذي", entityId: "e18", role: "director", phone: "0930 000 039", ext: "440", office: "مبنى المديريات", duties: ["دعم تنفيذ قرارات المحافظ", "تنسيق الموارد اللازمة للتنفيذ"], clearance: "عادي", avgResponseHours: 8, initials: "د" },
  { id: "p40", name: "مدير التربية", title: "مدير التربية", entityId: "e20", role: "director", phone: "0930 000 040", ext: "450", office: "مبنى المديريات", duties: ["الإشراف على المدارس والعملية التعليمية", "خطط الامتحانات والعام الدراسي"], clearance: "عادي", avgResponseHours: 8, initials: "ت" },
  { id: "p41", name: "مدير الزراعة", title: "مدير الزراعة", entityId: "e21", role: "director", phone: "0930 000 041", ext: "460", office: "مبنى المديريات", duties: ["خطط المواسم الزراعية", "الإرشاد الزراعي ودعم الفلاحين"], clearance: "عادي", avgResponseHours: 8, initials: "ز" },
  { id: "p20", name: "مدير النظام", title: "مدير النظام", entityId: "e0", role: "admin", phone: "0930 000 020", ext: "119", office: "غرفة النظم", duties: ["إدارة الجهات والأدوار والمستخدمين", "ضبط القوالب وقواعد التصعيد", "مراجعة سجل التدقيق"], clearance: "عادي", avgResponseHours: 2, initials: "ن" },
];

export const personOf = (id: string) => people.find((p) => p.id === id)!;

/** كلمة المرور الأولى لحسابات البذرة ما لم يُضبط SEED_PASSWORD */
export const defaultPassword = "Aleppo@2026";

/** اسم الدخول لكل شخص */
export const usernames: Record<string, string> = {
  p1: "governor", p2: "deputy", p3: "office.chief",
  p5: "tech.director", p8: "urban.director", p10: "health.director", p12: "water.director",
  p14: "legal.director", p16: "civil.defense", p17: "protocol", p20: "sysadmin",
  p21: "finance.director",
  p25: "assistant", p26: "secgen",
  p30: "pr.director", p31: "supply.director", p32: "followup.director", p33: "media.director",
  p34: "investment.branch", p35: "deputy2",
  p36: "audit.director", p37: "hr.director", p38: "investment.director", p39: "support.director",
  p40: "education.director", p41: "agriculture.director",
};

/* ───────────────────────── القاعات والحجوزات ───────────────────────── */

export const halls: Hall[] = [
  { id: "h1", name: "قاعة الاجتماعات الكبرى", building: "المبنى الرئيسي", floor: "الطابق الأول", capacity: 120, layout: "مسرحي", equipment: ["شاشة عرض", "نظام صوت", "اتصال مرئي", "تسجيل", "ترجمة فورية"], protocol: "رسمية", supervisorId: "p17", hours: "الأحد–الخميس · 8:00–16:00", policy: "تتطلب موافقة مشرف القاعة", occupancy: 78, notes: ["جهاز الترجمة الفورية بحاجة معايرة قبل الجلسات الدولية"] },
  { id: "h2", name: "صالون التشريفات", building: "المبنى الرئيسي", floor: "الطابق الرابع", capacity: 30, layout: "صالون", equipment: ["ضيافة كاملة", "تغطية إعلامية", "نظام صوت"], protocol: "تشريفات", supervisorId: "p17", hours: "حسب برنامج المحافظ", policy: "حجز بموافقة مدير المكتب حصراً", occupancy: 54, notes: ["يُمنع الحجز دون تنسيق مسبق مع المراسم"] },
  { id: "h3", name: "قاعة المجلس", building: "مبنى المجلس", floor: "الطابق الثاني", capacity: 70, layout: "حرف U", equipment: ["شاشة عرض", "نظام صوت", "تسجيل", "منصة تصويت"], protocol: "رسمية", supervisorId: "p17", hours: "الأحد–الخميس · 9:00–15:00", policy: "أولوية لجلسات المجلس", occupancy: 61, notes: [] },
  { id: "h4", name: "قاعة خلية الأزمة", building: "المبنى الرئيسي", floor: "الطابق الأرضي", capacity: 24, layout: "مستطيل", equipment: ["شاشات متابعة", "اتصال مرئي", "خط اتصال مؤمّن"], protocol: "رسمية", supervisorId: "p16", hours: "على مدار الساعة", policy: "متاحة فوراً في حالات الطوارئ", occupancy: 35, notes: ["تبقى مجهّزة دائماً — يُمنع استخدامها لاجتماعات عادية"] },
  { id: "h5", name: "قاعة التدريب", building: "مبنى المديريات", floor: "الطابق الأرضي", capacity: 45, layout: "صفوف", equipment: ["شاشة عرض", "سبورة ذكية", "حواسيب"], protocol: "عادية", supervisorId: "p17", hours: "الأحد–الخميس · 8:00–18:00", policy: "حجز مباشر لمدراء الجهات", occupancy: 42, notes: [] },
  { id: "h6", name: "قاعة الاجتماعات الفرعية", building: "المبنى الرئيسي", floor: "الطابق الثالث", capacity: 18, layout: "مستطيل", equipment: ["شاشة عرض", "اتصال مرئي"], protocol: "عادية", supervisorId: "p17", hours: "الأحد–الخميس · 8:00–16:00", policy: "حجز مباشر", occupancy: 88, notes: ["الإقبال عليها مرتفع — يُنصح بالحجز قبل 48 ساعة"] },
];

export const hallOf = (id: string) => halls.find((h) => h.id === id)!;

export const bookings: Booking[] = [
  { id: "b1", hallId: "h1", title: "اجتماع خلية الأزمة الدوري", requesterId: "p3", entityId: "e0", day: "اليوم", start: "10:00", end: "11:30", attendees: 22, status: "مؤكد", protocolPriority: true, prep: [{ label: "تجهيز الشاشات", done: true }, { label: "الضيافة", done: true }, { label: "توزيع جدول الأعمال", done: false }] },
  { id: "b2", hallId: "h2", title: "استقبال وفد غرفة التجارة", requesterId: "p17", entityId: "e0", day: "اليوم", start: "13:00", end: "14:30", attendees: 16, status: "مؤكد", protocolPriority: true, prep: [{ label: "الترتيبات البروتوكولية", done: true }, { label: "التغطية الإعلامية", done: false }] },
  { id: "b3", hallId: "h3", title: "جلسة مجلس المحافظة", requesterId: "p3", entityId: "e7", day: "غداً", start: "09:00", end: "12:00", attendees: 58, status: "مؤكد", protocolPriority: false, prep: [{ label: "منصة التصويت", done: false }, { label: "المحضر والتسجيل", done: true }] },
  { id: "b4", hallId: "h6", title: "اجتماع فني — شبكات المياه", requesterId: "p12", entityId: "e4", day: "غداً", start: "11:00", end: "12:30", attendees: 12, status: "بانتظار الموافقة", protocolPriority: false, prep: [{ label: "تجهيز العرض", done: false }] },
  { id: "b5", hallId: "h5", title: "تدريب موظفي الرخص على النظام", requesterId: "p8", entityId: "e2", day: "بعد غد", start: "09:30", end: "13:00", attendees: 28, status: "مؤكد", protocolPriority: false, prep: [{ label: "تجهيز الحواسيب", done: true }] },
  { id: "b6", hallId: "h1", title: "اللجنة التنفيذية لمتابعة المشاريع", requesterId: "p2", entityId: "e0", day: "غداً", start: "11:30", end: "13:30", attendees: 34, status: "مؤكد", protocolPriority: true, prep: [{ label: "تقارير الإنجاز", done: true }, { label: "الاتصال المرئي مع المناطق", done: false }] },
  { id: "b7", hallId: "h6", title: "مراجعة عقود المشاريع الخدمية", requesterId: "p14", entityId: "e5", day: "اليوم", start: "14:00", end: "15:00", attendees: 8, status: "مرفوض", protocolPriority: false, prep: [] },
];

/* ───────────────────────── التكليفات ───────────────────────── */

export const assignments: Assignment[] = [
  {
    id: "a1", ref: "3655473-2026", title: "إعداد دراسة شاملة لتطوير شبكة الطرق الشمالية", source: "قرار اجتماع اللجنة التنفيذية", entityId: "e1", issuerId: "p2", ownerId: "p5", partnerIds: ["p8"],
    priority: "هام", due: "30 أيلول 2026", dueISO: "2026-09-30", closeCriteria: "تقرير فني معتمد + جدول كميات + تقدير كلفة", progress: 45, status: "قيد التنفيذ",
    chain: { sent: "12 أيلول · 09:10", delivered: "12 أيلول · 09:11", read: "12 أيلول · 10:40", acknowledged: "12 أيلول · 11:02", started: "13 أيلول · 08:30" },
    attachments: [{ name: "المخطط الأولي.pdf", size: "4.2 م.ب" }], meetingId: "m2", classification: "عادي", escalation: 0,
  },
  {
    id: "a2", ref: "3655474-2026", title: "مراجعة العقود القانونية للمشاريع الخدمية", source: "توجيه السيد المحافظ", entityId: "e5", issuerId: "p1", ownerId: "p14", partnerIds: [],
    priority: "عاجل وسري", due: "18 أيلول 2026", dueISO: "2026-09-18", closeCriteria: "مذكرة رأي قانوني موقّعة لكل عقد", progress: 80, status: "متأخر",
    chain: { sent: "08 أيلول · 08:00", delivered: "08 أيلول · 08:00", read: "08 أيلول · 08:22", acknowledged: "08 أيلول · 08:40", started: "08 أيلول · 12:00" },
    attachments: [{ name: "العقود المرفقة.zip", size: "18.6 م.ب" }], classification: "سرّي", escalation: 3,
  },
  {
    id: "a3", ref: "3655475-2026", title: "تجهيز قاعة المؤتمرات لاستقبال الوفد الاستثماري", source: "برنامج المراسم", entityId: "e0", issuerId: "p3", ownerId: "p17", partnerIds: [],
    priority: "عادي", scheduleDays: 7, due: "26 أيلول 2026", dueISO: "2026-09-26", closeCriteria: "محضر جاهزية موقّع من المراسم", progress: 100, status: "مُغلق",
    chain: { sent: "15 أيلول · 10:00", delivered: "15 أيلول · 10:00", read: "15 أيلول · 10:05", acknowledged: "15 أيلول · 10:06", started: "15 أيلول · 11:00", submitted: "19 أيلول · 16:20" },
    attachments: [{ name: "محضر الجاهزية.pdf", size: "820 ك.ب" }], classification: "عادي", escalation: 0,
  },
  {
    id: "a4", ref: "3655476-2026", title: "حصر احتياجات مراكز خدمة المواطن في الأحياء الشرقية", source: "توجيه السيد المحافظ", entityId: "e3", issuerId: "p1", ownerId: "p10", partnerIds: [],
    priority: "هام", due: "02 تشرين الأول 2026", dueISO: "2026-10-02", closeCriteria: "جدول احتياجات معتمد من مدير الصحة", progress: 28, status: "قيد التنفيذ",
    chain: { sent: "16 أيلول · 09:00", delivered: "16 أيلول · 09:01", read: "16 أيلول · 13:15", acknowledged: "16 أيلول · 13:30", started: "17 أيلول · 09:00" },
    attachments: [], classification: "عادي", escalation: 0,
  },
  {
    id: "a5", ref: "3655477-2026", title: "إعداد خطة الاستجابة لموسم الشتاء", source: "قرار خلية الأزمة", entityId: "e6", issuerId: "p1", ownerId: "p16", partnerIds: ["p5", "p12"],
    priority: "عاجل", due: "05 تشرين الأول 2026", dueISO: "2026-10-05", closeCriteria: "خطة معتمدة + جدول جاهزية الفرق والآليات", progress: 62, status: "قيد التنفيذ",
    chain: { sent: "10 أيلول · 08:30", delivered: "10 أيلول · 08:30", read: "10 أيلول · 08:35", acknowledged: "10 أيلول · 08:36", started: "10 أيلول · 10:00" },
    attachments: [{ name: "خطة العام الماضي.pdf", size: "2.1 م.ب" }], meetingId: "m1", classification: "عادي", escalation: 0,
  },
  {
    id: "a6", ref: "3655478-2026", title: "معالجة انقطاع المياه في حي الثكنة", source: "توجيه السيد المحافظ", entityId: "e4", issuerId: "p1", ownerId: "p12", partnerIds: [],
    priority: "عاجل وسري", due: "23 أيلول 2026", dueISO: "2026-09-23", closeCriteria: "تقرير ميداني + صور + تأكيد عودة الضخ", progress: 15, status: "مُسند",
    chain: { sent: "21 أيلول · 17:40", delivered: "21 أيلول · 17:41" },
    attachments: [], classification: "سرّي", escalation: 1,
  },
  {
    id: "a7", ref: "3655479-2026", title: "رفع تقرير المخالفات العمرانية الربعي", source: "خطة سنوية", entityId: "e2", issuerId: "p3", ownerId: "p8", partnerIds: [],
    priority: "عادي", scheduleDays: 10, due: "10 تشرين الأول 2026", dueISO: "2026-10-10", closeCriteria: "تقرير ربعي وفق القالب المعتمد", progress: 55, status: "قيد المراجعة",
    chain: { sent: "05 أيلول · 09:00", delivered: "05 أيلول · 09:00", read: "05 أيلول · 09:30", acknowledged: "05 أيلول · 09:45", started: "06 أيلول · 08:00", submitted: "20 أيلول · 14:10" },
    attachments: [{ name: "التقرير الربعي.docx", size: "1.4 م.ب" }], classification: "عادي", escalation: 0,
  },
  {
    id: "a8", ref: "3655480-2026", title: "تأهيل الإنارة على الطريق الدولي", source: "قرار اجتماع مديري المديريات", entityId: "e1", issuerId: "p2", ownerId: "p5", partnerIds: [],
    priority: "هام", due: "28 أيلول 2026", dueISO: "2026-09-28", closeCriteria: "تشغيل تجريبي ناجح + محضر استلام", progress: 38, status: "مُعاد للتصحيح",
    chain: { sent: "11 أيلول · 10:00", delivered: "11 أيلول · 10:00", read: "11 أيلول · 11:00", acknowledged: "11 أيلول · 11:20", started: "12 أيلول · 08:00", submitted: "19 أيلول · 15:00" },
    attachments: [{ name: "تقرير أولي.pdf", size: "980 ك.ب" }], classification: "عادي", escalation: 1,
  },
  {
    id: "a9", ref: "3655481-2026", title: "إعداد الدراسة الفنية لتقاطع الجامعة", source: "قرار اجتماع اللجنة التنفيذية", entityId: "e1", issuerId: "p2", ownerId: "p5", partnerIds: [],
    priority: "عادي", scheduleDays: 14, due: "12 تشرين الأول 2026", dueISO: "2026-10-12", closeCriteria: "دراسة فنية مع بدائل التنفيذ", progress: 12, status: "مُستلَم",
    chain: { sent: "19 أيلول · 09:00", delivered: "19 أيلول · 09:00", read: "19 أيلول · 09:50", acknowledged: "19 أيلول · 10:05" },
    attachments: [], meetingId: "m2", classification: "عادي", escalation: 0,
  },
  {
    id: "a10", ref: "3655482-2026", title: "تحديث سجل الأصول الثابتة للمديرية", source: "خطة سنوية", entityId: "e4", issuerId: "p26", ownerId: "p12", partnerIds: [],
    priority: "عادي", scheduleDays: 21, due: "20 تشرين الأول 2026", dueISO: "2026-10-20", closeCriteria: "سجل محدّث ومصادق عليه", progress: 0, status: "مُجمَّد",
    chain: { sent: "02 أيلول · 09:00", delivered: "02 أيلول · 09:00", read: "02 أيلول · 10:00" },
    attachments: [], classification: "عادي", escalation: 0,
  },
  {
    id: "a11", ref: "3655483-2026", title: "تجهيز تقرير الجاهزية الصحية لموسم الشتاء", source: "قرار خلية الأزمة", entityId: "e3", issuerId: "p1", ownerId: "p10", partnerIds: [],
    priority: "عاجل", due: "29 أيلول 2026", dueISO: "2026-09-29", closeCriteria: "تقرير جاهزية المراكز والمخزون الدوائي", progress: 70, status: "قيد التنفيذ",
    chain: { sent: "14 أيلول · 08:00", delivered: "14 أيلول · 08:00", read: "14 أيلول · 08:10", acknowledged: "14 أيلول · 08:15", started: "14 أيلول · 09:00" },
    attachments: [], meetingId: "m1", classification: "عادي", escalation: 0,
  },
  {
    id: "a12", ref: "3655484-2026", title: "إعداد مقترح تعديل الرسوم البلدية", source: "طلب مجلس المحافظة", entityId: "e7", issuerId: "p26", ownerId: "p3", partnerIds: ["p14"],
    priority: "هام", due: "08 تشرين الأول 2026", dueISO: "2026-10-08", closeCriteria: "مقترح مدروس مع الأثر المالي", progress: 34, status: "قيد التنفيذ",
    chain: { sent: "13 أيلول · 11:00", delivered: "13 أيلول · 11:00", read: "13 أيلول · 12:00", acknowledged: "13 أيلول · 12:30", started: "14 أيلول · 09:00" },
    attachments: [], classification: "عادي", escalation: 0,
  },
];

/* ───────────────────────── الاجتماعات ───────────────────────── */

export const meetings: Meeting[] = [
  {
    id: "m1", title: "اجتماع خلية الأزمة الدوري", kind: "خلية الأزمة", day: "اليوم", time: "10:00 ص", hallId: "h1",
    chairId: "p1", secretaryId: "p3", inviteeIds: ["p1", "p2", "p3", "p5", "p10", "p12", "p16"],
    confirmed: ["p1", "p2", "p3", "p5", "p10", "p16"], apologized: ["p12"],
    agenda: ["الاستعدادات لموسم الأمطار", "نقاط الضعف في شبكة التصريف", "جاهزية فرق الإنقاذ", "المخزون الدوائي في المراكز"],
    minutes: "استُعرضت جاهزية الجهات لموسم الشتاء. تبيّن تأخر في تأهيل نقاط التصريف الحرجة، وتقرر رفع خطة موحّدة خلال أسبوعين، مع تكليف الدفاع المدني بإعداد خطة الاستجابة وتكليف الصحة بتقرير الجاهزية.",
    minutesApproved: true, status: "جارٍ الآن",
    summary: "متابعة الاستعدادات لموسم الأمطار وتحديد نقاط الضعف في البنية التحتية.",
    outcomes: [
      { id: "o1", text: "إعداد خطة الاستجابة لموسم الشتاء خلال أسبوعين", assignmentRef: "3655477-2026", ownerId: "p16", closed: false },
      { id: "o2", text: "تقرير الجاهزية الصحية والمخزون الدوائي", assignmentRef: "3655483-2026", ownerId: "p10", closed: false },
      { id: "o3", text: "حصر نقاط التصريف الحرجة ورفعها للديوان", ownerId: "p5", closed: false },
      { id: "o4", text: "دراسة استئجار آليات شفط إضافية", closed: true, reason: "أُغلق: تقرر الاكتفاء بآليات المحافظة بعد الصيانة" },
    ],
  },
  {
    id: "m2", title: "اللجنة التنفيذية لمتابعة المشاريع", kind: "اللجنة التنفيذية", day: "غداً", time: "11:30 ص", hallId: "h1",
    chairId: "p2", secretaryId: "p3", inviteeIds: ["p2", "p3", "p5", "p8", "p12", "p14"],
    confirmed: ["p2", "p3", "p5", "p8"], apologized: [],
    agenda: ["نسب إنجاز المشاريع الاستراتيجية", "معوقات التنفيذ", "المشاريع المتلكئة", "ما لم يُنفّذ من الاجتماع السابق"],
    minutesApproved: false, status: "قادم",
    summary: "استعراض نسب الإنجاز للمشاريع الاستراتيجية ومعالجة معوقات التنفيذ.",
    outcomes: [
      { id: "o5", text: "دراسة شاملة لتطوير شبكة الطرق الشمالية", assignmentRef: "3655473-2026", ownerId: "p5", closed: false },
      { id: "o6", text: "الدراسة الفنية لتقاطع الجامعة", assignmentRef: "3655481-2026", ownerId: "p5", closed: false },
    ],
  },
  {
    id: "m3", title: "جلسة مجلس المحافظة الاعتيادية", kind: "مجلس المحافظة", day: "غداً", time: "09:00 ص", hallId: "h3",
    chairId: "p1", secretaryId: "p3", inviteeIds: ["p1", "p2", "p3", "p14", "p8"],
    confirmed: ["p1", "p3", "p14"], apologized: ["p8"],
    agenda: ["مقترح تعديل الرسوم البلدية", "تقرير الأداء الربعي", "طلبات الأعضاء"],
    minutesApproved: false, status: "قادم",
    summary: "مناقشة المقترحات المعروضة على المجلس والتصويت عليها.",
    outcomes: [{ id: "o7", text: "إعداد مقترح تعديل الرسوم البلدية مع الأثر المالي", assignmentRef: "3655484-2026", ownerId: "p3", closed: false }],
  },
  {
    id: "m4", title: "اجتماع مديري المديريات", kind: "اجتماع دوري", day: "27 أيلول", time: "12:00 م", online: true,
    chairId: "p2", secretaryId: "p3", inviteeIds: ["p2", "p3", "p5", "p8", "p10", "p12", "p14", "p16"],
    confirmed: ["p2", "p3", "p5", "p10", "p16"], apologized: [],
    agenda: ["تنسيق خطط الخدمات", "الشكاوى ذات الأولوية", "التزام الجهات بالمواعيد"],
    minutesApproved: false, status: "قادم",
    summary: "تنسيق خطط الخدمات والشكاوى ذات الأولوية بين المديريات.",
    outcomes: [{ id: "o8", text: "تأهيل الإنارة على الطريق الدولي", assignmentRef: "3655480-2026", ownerId: "p5", closed: false }],
  },
  {
    id: "m5", title: "لقاء وفد غرفة التجارة والصناعة", kind: "لقاء وفد رسمي", day: "اليوم", time: "01:00 م", hallId: "h2",
    chairId: "p1", secretaryId: "p17", inviteeIds: ["p1", "p3", "p8", "p17"],
    confirmed: ["p1", "p3", "p17", "p8"], apologized: [],
    agenda: ["تسهيلات الاستثمار الصناعي", "معوقات التراخيص", "المنطقة الصناعية"],
    minutesApproved: false, status: "قادم",
    summary: "بحث تسهيلات الاستثمار الصناعي ومعوقات التراخيص.",
    outcomes: [],
  },
  {
    id: "m6", title: "اجتماع سابق — متابعة مشاريع المياه", kind: "اجتماع دوري", day: "14 أيلول", time: "10:00 ص", hallId: "h6",
    chairId: "p2", secretaryId: "p3", inviteeIds: ["p2", "p12", "p3"],
    confirmed: ["p2", "p12", "p3"], apologized: [],
    agenda: ["نسب الهدر في الشبكة", "خطة معالجة الانقطاعات"],
    minutes: "نوقشت نسب الهدر المرتفعة في شبكة النقل الرئيسية، وتقرر تحديث سجل الأصول وإعداد خطة صيانة وقائية.",
    minutesApproved: true, status: "منعقد",
    summary: "متابعة نسب الهدر وخطة معالجة الانقطاعات في شبكة المياه.",
    outcomes: [
      { id: "o9", text: "تحديث سجل الأصول الثابتة", assignmentRef: "3655482-2026", ownerId: "p12", closed: false },
      { id: "o10", text: "معالجة انقطاع المياه في حي الثكنة", assignmentRef: "3655478-2026", ownerId: "p12", closed: false },
    ],
  },
];

/* ───────────────────────── المراسلات ───────────────────────── */

export const letters: Letter[] = [
  { id: "l1", number: "WR-2026-0891", direction: "وارد", party: "وزارة الداخلية", date: "21 أيلول 2026", subject: "بشأن التنسيق الأمني للفعاليات القادمة", referredTo: "إدارة الأمن", action: "للدراسة وإبداء الرأي", registrarId: "p3", classification: "سرّي", dueHours: 48, handled: false },
  { id: "l2", number: "SD-2026-1102", direction: "صادر", party: "وزارة المالية", date: "20 أيلول 2026", subject: "طلب اعتماد الموازنة الإضافية للمشاريع الخدمية", referredTo: "الشؤون المالية", action: "اعتماد عاجل", registrarId: "p3", classification: "عادي", handled: true },
  { id: "l3", number: "AR-2026-0450", direction: "مؤرشف", party: "بلدية مركز المحافظة", date: "18 أيلول 2026", subject: "تحديثات خطة التشجير السنوية", referredTo: "إدارة الخدمات", action: "للعلم والحفظ", registrarId: "p3", classification: "عادي", handled: true },
  { id: "l4", number: "WR-2026-0895", direction: "وارد", party: "هيئة الاستثمار", date: "21 أيلول 2026", subject: "مقترح تطوير المنطقة الصناعية الثانية", referredTo: "التخطيط العمراني", action: "للدراسة والعرض", registrarId: "p3", classification: "عادي", dueHours: 72, handled: false },
  { id: "l5", number: "SD-2026-1114", direction: "صادر", party: "مديرية الصحة", date: "19 أيلول 2026", subject: "تعميم خطة الطوارئ للمراكز الصحية", referredTo: "مكتب المتابعة", action: "متابعة التنفيذ", registrarId: "p3", classification: "عادي", handled: true },
  { id: "l6", number: "WR-2026-0899", direction: "وارد", party: "اتحاد الحرفيين", date: "22 أيلول 2026", subject: "طلب تخصيص مقر بديل للمعرض الحرفي", referredTo: "مكتب السيد المحافظ", action: "للعرض على السيد المحافظ", registrarId: "p3", classification: "عادي", dueHours: 24, handled: false },
  { id: "l7", number: "WR-2026-0901", direction: "وارد", party: "وزارة الإدارة المحلية", date: "22 أيلول 2026", subject: "تعميم بشأن أتمتة المعاملات الإدارية", referredTo: "مدير النظام", action: "للتنفيذ", registrarId: "p3", classification: "عادي", dueHours: 96, handled: false },
];

/* ───────────────────────── القرارات بانتظار الاعتماد ───────────────────────── */

export const decisions: Decision[] = [
  { id: "d1", title: "المصادقة على المخطط التنظيمي للتوسع الشمالي", source: "مديرية التخطيط العمراني", entityId: "e2", age: "منذ يومين", priority: "عاجل", awaiting: "governor" },
  { id: "d2", title: "تخصيص موازنة طوارئ لمديرية الصحة", source: "مديرية الصحة", entityId: "e3", age: "منذ 4 ساعات", priority: "عاجل وسري", awaiting: "governor", amount: "180 مليون ل.س" },
  { id: "d3", title: "اعتماد برنامج الوفد الاستثماري", source: "إدارة المراسم", entityId: "e0", age: "منذ ساعة", priority: "هام", awaiting: "chief" },
  { id: "d4", title: "الموافقة على عقد صيانة شبكة الإنارة", source: "مديرية الخدمات الفنية", entityId: "e1", age: "منذ 6 ساعات", priority: "هام", awaiting: "deputy", amount: "95 مليون ل.س" },
  { id: "d5", title: "اعتماد خطة الاستجابة الشتوية الموحّدة", source: "الدفاع المدني", entityId: "e6", age: "منذ يوم", priority: "عاجل", awaiting: "governor" },
];

/* ───────────────────────── الوفود ───────────────────────── */

export const delegations: Delegation[] = [
  {
    id: "g1", name: "وفد وزارة التخطيط", purpose: "زيارة تفقدية للمشاريع القومية", arrival: "25 أيلول · 09:00 ص", departure: "27 أيلول · 05:00 م", status: "قيد التنفيذ", progress: 60, hostId: "p17",
    program: [{ time: "09:00", item: "استقبال رسمي", place: "صالون التشريفات" }, { time: "10:30", item: "جولة على مشروع الطرق الشمالية", place: "الموقع" }, { time: "13:00", item: "جلسة عمل", place: "قاعة الاجتماعات الكبرى" }],
  },
  {
    id: "g2", name: "وفد الاستثمار الصناعي", purpose: "بحث فرص تطوير المنطقة الصناعية", arrival: "30 أيلول · 10:30 ص", departure: "01 تشرين الأول · 04:00 م", status: "جارٍ الإعداد", progress: 35, hostId: "p17",
    program: [{ time: "10:30", item: "عرض الفرص الاستثمارية", place: "قاعة الاجتماعات الكبرى" }, { time: "12:30", item: "زيارة المنطقة الصناعية", place: "الموقع" }],
  },
  {
    id: "g3", name: "لجنة الإسكان البرلمانية", purpose: "جولة على مشاريع السكن الشبابي", arrival: "03 تشرين الأول · 09:00 ص", departure: "03 تشرين الأول · 06:00 م", status: "بانتظار التأكيد", progress: 18, hostId: "p17",
    program: [{ time: "09:00", item: "اجتماع تمهيدي", place: "قاعة المجلس" }],
  },
];

/* ───────────────────────── الملفات ───────────────────────── */

export const docFiles: DocFile[] = [
  { id: "f1", name: "مشروع تطوير الطرق الشمالية", ref: "PRJ-2026-045", kind: "مشروع", items: 18, updated: "منذ 20 دقيقة", ownerId: "p5", entityId: "e1", classification: "عادي" },
  { id: "f2", name: "خطة الطوارئ لموسم الشتاء", ref: "PLN-2026-021", kind: "خطة", items: 12, updated: "منذ ساعتين", ownerId: "p16", entityId: "e6", classification: "عادي" },
  { id: "f3", name: "ملف الوفد الاستثماري", ref: "DEL-2026-008", kind: "وفد", items: 9, updated: "أمس", ownerId: "p17", entityId: "e0", classification: "عادي" },
  { id: "f4", name: "مراسلات الموازنة الإضافية", ref: "COR-2026-114", kind: "مراسلات", items: 24, updated: "20 أيلول", ownerId: "p3", entityId: "e0", classification: "سرّي" },
  { id: "f5", name: "محاضر اجتماعات الديوان", ref: "MTG-2026-031", kind: "اجتماعات", items: 31, updated: "18 أيلول", ownerId: "p3", entityId: "e0", classification: "عادي" },
  { id: "f6", name: "تقارير أداء الجهات", ref: "RPT-2026-019", kind: "تقارير", items: 14, updated: "17 أيلول", ownerId: "p3", entityId: "e0", classification: "عادي" },
  { id: "f7", name: "عقود المشاريع الخدمية", ref: "LGL-2026-077", kind: "عقود", items: 21, updated: "16 أيلول", ownerId: "p14", entityId: "e5", classification: "سرّي" },
  { id: "f8", name: "سجل شبكات المياه", ref: "NET-2026-012", kind: "سجل فني", items: 16, updated: "15 أيلول", ownerId: "p12", entityId: "e4", classification: "عادي" },
];

/* ───────────────────────── الطلبات ───────────────────────── */

export const requests: RequestItem[] = [
  { id: "r1", kind: "حجز قاعة", title: "حجز قاعة الاجتماعات الفرعية — اجتماع فني", entityId: "e4", byId: "p12", at: "منذ ساعة", status: "بانتظار الرد", detail: "غداً · 11:00–12:30 · 12 شخصاً" },
  { id: "r2", kind: "موعد لدى المحافظ", title: "طلب مقابلة لعرض خطة معالجة الانقطاعات", entityId: "e4", byId: "p12", at: "منذ 3 ساعات", status: "بانتظار الرد", detail: "مدة مطلوبة: 30 دقيقة" },
  { id: "r3", kind: "تمديد مهلة", title: "تمديد مهلة تقرير المخالفات العمرانية", entityId: "e2", byId: "p8", at: "أمس", status: "موافق", detail: "تمديد 5 أيام لاستكمال المسح الميداني" },
  { id: "r4", kind: "طلب اجتماع", title: "اجتماع مشترك مع الخدمات الفنية حول التقاطعات", entityId: "e2", byId: "p8", at: "أمس", status: "موافق", detail: "الأسبوع القادم" },
  { id: "r5", kind: "حجز قاعة", title: "حجز قاعة التدريب لدورة الرخص", entityId: "e2", byId: "p8", at: "منذ يومين", status: "موافق", detail: "بعد غد · 09:30–13:00" },
  { id: "r7", kind: "موعد لدى المحافظ", title: "المصادقة على المخطط التنظيمي للتوسع الشمالي", entityId: "e2", byId: "p8", at: "منذ 5 ساعات", status: "بانتظار الرد", detail: "مدة مطلوبة: 20 دقيقة" },
  { id: "r8", kind: "موعد لدى المحافظ", title: "جاهزية فرق الإنقاذ قبل الموسم", entityId: "e6", byId: "p16", at: "أمس", status: "بانتظار الرد", detail: "مدة مطلوبة: 15 دقيقة" },
  { id: "r6", kind: "تمديد مهلة", title: "تمديد مهلة تحديث سجل الأصول", entityId: "e4", byId: "p12", at: "منذ 4 أيام", status: "مرفوض", detail: "السبب: لم يُقدَّم مبرر كافٍ" },
];

/* ───────────────────────── الإشعارات ───────────────────────── */

export const notifications: Notification[] = [
  { id: "n1", kind: "تصعيد", title: "تكليف متأخر ثلاثة أيام", body: "«مراجعة العقود القانونية للمشاريع الخدمية» تجاوز موعده — صُعّد إلى مدير المكتب.", at: "منذ 12 دقيقة", read: false, channel: "تنبيه التطبيق", toId: "p1", link: { portal: "diwan", section: "assignments" }, urgent: true },
  { id: "n2", kind: "تكليف", title: "تكليف جديد أُسند إليك", body: "«معالجة انقطاع المياه في حي الثكنة» — عاجل وسري، يستحق خلال يومين.", at: "منذ 35 دقيقة", read: false, channel: "رسالة نصية", toId: "p12", link: { portal: "directorates", section: "inbox" }, urgent: true },
  { id: "n3", kind: "اجتماع", title: "تذكير باجتماع بعد ساعة", body: "اجتماع خلية الأزمة الدوري — قاعة الاجتماعات الكبرى · 10:00 ص.", at: "منذ ساعة", read: false, channel: "تنبيه التطبيق", toId: "p1", link: { portal: "diwan", section: "meetings" } },
  { id: "n4", kind: "قاعة", title: "طلب حجز بانتظار موافقتك", body: "مؤسسة المياه تطلب حجز قاعة الاجتماعات الفرعية غداً 11:00.", at: "منذ ساعة", read: false, channel: "تنبيه التطبيق", toId: "p17", link: { portal: "diwan", section: "halls" } },
  { id: "n5", kind: "مراسلة", title: "كتاب وارد مُحال إليك", body: "«تعميم بشأن أتمتة المعاملات الإدارية» من وزارة الإدارة المحلية.", at: "منذ 3 ساعات", read: true, channel: "تنبيه التطبيق", toId: "p20", link: { portal: "diwan", section: "correspondence" } },
  { id: "n6", kind: "تكليف", title: "تسليم بانتظار الاعتماد", body: "«رفع تقرير المخالفات العمرانية الربعي» سُلّم وينتظر اعتمادك.", at: "منذ 5 ساعات", read: true, channel: "تنبيه التطبيق", toId: "p8", link: { portal: "directorates", section: "replies" } },
  { id: "n7", kind: "طوارئ", title: "بث عاجل — إنذار بأمطار غزيرة", body: "الأرصاد تتوقع هطولاً غزيراً خلال 24 ساعة. جاهزية فرق الدفاع المدني مطلوبة فوراً.", at: "منذ 6 ساعات", read: true, channel: "رسالة نصية", toId: "p16", urgent: true },
  { id: "n8", kind: "تكليف", title: "تكليف أُعيد للتصحيح", body: "«تأهيل الإنارة على الطريق الدولي» أُعيد مع ملاحظات مدير المكتب.", at: "أمس", read: true, channel: "تنبيه التطبيق", toId: "p5", link: { portal: "directorates", section: "tasks" } },
];

/* ───────────────────────── الملاحظات ───────────────────────── */

export const notes: Note[] = [
  { id: "t1", target: "a2", targetLabel: "تكليف 3655474-2026", authorId: "p1", text: "هذا الملف لا يحتمل تأخيراً إضافياً. أبلغوني شخصياً بأي معوق خلال ساعات.", at: "منذ ساعتين", scope: "توجيه المحافظ" },
  { id: "t2", target: "a2", targetLabel: "تكليف 3655474-2026", authorId: "p14", text: "تبقّى عقدان فقط، وسيُرفع الرأي القانوني غداً صباحاً.", at: "منذ ساعة", scope: "رسمية" },
  { id: "t3", target: "m1", targetLabel: "اجتماع خلية الأزمة", authorId: "p3", text: "تذكير: إحضار تقرير الأرصاد المحدّث قبل الجلسة.", at: "صباح اليوم", scope: "خاصة" },
  { id: "t4", target: "h1", targetLabel: "قاعة الاجتماعات الكبرى", authorId: "p17", text: "جهاز الترجمة الفورية بحاجة معايرة قبل أي جلسة دولية.", at: "أمس", scope: "الوحدة" },
  { id: "t5", target: "a6", targetLabel: "تكليف 3655478-2026", authorId: "p3", text: "يرجى إقرار الاستلام فوراً — مضى أكثر من 12 ساعة دون رد.", at: "منذ 20 دقيقة", scope: "رسمية", mentions: ["p12"] },
  { id: "t6", target: "e4", targetLabel: "مؤسسة المياه", authorId: "p3", text: "الالتزام بالمواعيد في هذه الجهة الأدنى بين الجهات — يحتاج معالجة إدارية.", at: "منذ يومين", scope: "رسمية" },
];

/* ───────────────────────── سجل التدقيق ───────────────────────── */

export const audit: AuditEntry[] = [
  { id: "x1", at: "اليوم · 09:42", actorId: "p3", action: "أنشأ تكليفاً", target: "3655478-2026", ip: "10.12.4.21" },
  { id: "x2", at: "اليوم · 09:15", actorId: "p1", action: "اعتمد قراراً", target: "اعتماد برنامج الوفد الاستثماري", ip: "10.12.4.10" },
  { id: "x3", at: "اليوم · 08:55", actorId: "p17", action: "أكّد حجزاً", target: "قاعة الاجتماعات الكبرى — خلية الأزمة", ip: "10.12.4.55" },
  { id: "x4", at: "أمس · 16:30", actorId: "p14", action: "رفع مرفقاً", target: "3655474-2026 / العقود المرفقة.zip", ip: "10.12.4.33" },
  { id: "x5", at: "أمس · 15:02", actorId: "p20", action: "عدّل صلاحية دور", target: "رئيس قسم — إضافة صلاحية الإسناد", ip: "10.12.4.99" },
  { id: "x6", at: "أمس · 11:20", actorId: "p3", action: "صعّد تكليفاً", target: "3655474-2026 → مدير المكتب", ip: "10.12.4.44" },
  { id: "x7", at: "20 أيلول · 14:10", actorId: "p8", action: "سلّم تكليفاً", target: "3655479-2026", ip: "10.12.4.77" },
  { id: "x8", at: "20 أيلول · 10:05", actorId: "p3", action: "قيّد كتاباً وارداً", target: "WR-2026-0895", ip: "10.12.4.66" },
];

/* ───────────────────────── جداول مرجعية ───────────────────────── */

export const escalationRules = [
  { when: "تكليف عاجل وسري أو عاجل", act: "يجب أن يصل رد خلال 24 ساعة", to: "المكلَّف", level: 1 },
  { when: "تكليف هام", act: "يجب أن يصل رد خلال 48 ساعة كحد أقصى", to: "المكلَّف", level: 1 },
  { when: "تكليف عادي", act: "يُحدَّد جدوله الزمني عند الإسناد (مثال: خمسة أيام)", to: "المكلَّف", level: 0 },
  { when: "انتهاء الجدول الزمني المحدد", act: "إشعار مراجعة إلى مُصدِر التكليف ليراجع المكلَّف", to: "مُصدِر التكليف", level: 2 },
  { when: "مضي المهلة دون رد", act: "تنبيه ثانٍ وتغيير الحالة إلى «متأخر»", to: "المكلَّف ومدير جهته", level: 2 },
  { when: "استمرار التأخير", act: "إدراج في لوحة السيد المحافظ", to: "السيد المحافظ", level: 3 },
];

export const lifecycle = [
  { key: "جديد", hint: "أُنشئ ولم يُسند" },
  { key: "مُسند", hint: "وصل إلى مكلَّف محدد" },
  { key: "مُستلَم", hint: "أقرّ المكلَّف الاستلام" },
  { key: "قيد التنفيذ", hint: "تحديثات ونِسب إنجاز" },
  { key: "قيد المراجعة", hint: "سُلّم وبانتظار الاعتماد" },
  { key: "مُغلق", hint: "اعتُمد وأُرشف" },
];

export const todaySchedule = [
  { time: "09:00", title: "اجتماع مع وزير الإدارة المحلية", place: "قاعة الاجتماعات الكبرى", status: "منتهٍ", tone: "done" },
  { time: "10:00", title: "اجتماع خلية الأزمة الدوري", place: "قاعة الاجتماعات الكبرى", status: "جارٍ الآن", tone: "now" },
  { time: "13:00", title: "استقبال وفد غرفة التجارة", place: "صالون التشريفات", status: "مؤكد", tone: "next" },
  { time: "15:30", title: "مراجعة تقرير الخدمات الأسبوعي", place: "مكتب السيد المحافظ", status: "داخلي", tone: "next" },
];
