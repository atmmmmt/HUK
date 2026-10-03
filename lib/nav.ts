import type { Portal } from "./types";

export interface NavItem {
  key: string;
  label: string;
  icon: string;
  group: string;
  title: string;
  sub: string;
}

export const navByPortal: Record<Portal, NavItem[]> = {
  diwan: [
    { key: "overview", label: "لوحة اليوم", icon: "LayoutGrid", group: "المكتب", title: "لوحة اليوم", sub: "صورة المحافظة في شاشة واحدة — ما يحتاج قراركم الآن" },
    { key: "calendar", label: "التقويم والمواعيد", icon: "CalendarDays", group: "المكتب", title: "التقويم والمواعيد", sub: "برنامج اليوم والاستقبالات وطلبات المقابلة" },
    { key: "meetings", label: "الاجتماعات والمخرجات", icon: "Users", group: "المكتب", title: "الاجتماعات واللقاءات", sub: "من الدعوة إلى المحضر إلى تحويل كل قرار إلى تكليف" },
    { key: "decisions", label: "بانتظار الاعتماد", icon: "Stamp", group: "المكتب", title: "القرارات بانتظار الاعتماد", sub: "صندوق التوقيع — ما لا يمضي إلا بقراركم" },
    { key: "assignments", label: "التكليفات الصادرة", icon: "ListTodo", group: "المتابعة", title: "التكليفات ومتابعتها حسب الوصول", sub: "لكل تكليف مالك وموعد ومعيار إغلاق وسلسلة وصول" },
    { key: "correspondence", label: "الوارد والصادر", icon: "Inbox", group: "المتابعة", title: "المراسلات والإحالات", sub: "قيد الكتب وترقيمها وإحالتها ومتابعة المهل" },
    { key: "halls", label: "القاعات والصالات", icon: "DoorOpen", group: "الموارد", title: "القاعات والصالات", sub: "حجز مركزي بلا تعارض مع إدارة التجهيزات والأولوية البروتوكولية" },
    { key: "delegations", label: "الوفود والمراسم", icon: "Flag", group: "الموارد", title: "الوفود والفعاليات", sub: "برامج الزيارات والترتيبات البروتوكولية" },
    { key: "files", label: "الملفات والأرشيف", icon: "FolderOpen", group: "الموارد", title: "الملفات والأرشيف", sub: "أرشيف رقمي قابل للبحث مصنّف حسب درجة السرّية" },
    { key: "people", label: "الأشخاص والمهام", icon: "IdCard", group: "الموارد", title: "الأشخاص ومهامهم", sub: "لكل شخص ملف واحد: دوره وصلاحياته ومهامه المفتوحة" },
    { key: "notes", label: "الملاحظات", icon: "StickyNote", group: "الموارد", title: "لوح الملاحظات", sub: "ملاحظات مرتبطة بكل عنصر في المنظومة" },
  ],
  directorates: [
    { key: "entities", label: "الجهات", icon: "Network", group: "المديريات", title: "مديريات المحافظة ومؤسساتها", sub: "قائمة ديناميكية تُدار من لوحة التحكم" },
    { key: "inbox", label: "الوارد إلينا", icon: "Inbox", group: "العمل", title: "الوارد إلى المديرية", sub: "التكليفات والكتب الواردة من الديوان وحالة كل منها" },
    { key: "tasks", label: "المهام الداخلية", icon: "ListTodo", group: "العمل", title: "المهام الداخلية وتوزيعها", sub: "توزيع العمل على الأقسام والموظفين ومتابعة الأحمال" },
    { key: "replies", label: "الردود والتقارير", icon: "Send", group: "العمل", title: "الردود والتقارير المرفوعة", sub: "ما سُلّم إلى الديوان وما ينتظر الاعتماد" },
    { key: "decisions", label: "معاملات للتوقيع", icon: "Stamp", group: "العمل", title: "المعاملات المرفوعة للتوقيع", sub: "ارفع معاملة مع كتبها ومرفقاتها إلى المحافظ وتابع حالتها" },
    { key: "requests", label: "الطلبات إلى الديوان", icon: "MailQuestion", group: "العمل", title: "الطلبات المرفوعة إلى الديوان", sub: "حجز قاعة · موعد لدى المحافظ · طلب اجتماع · تمديد مهلة" },
    { key: "structure", label: "هيكل المديرية", icon: "GitFork", group: "الجهة", title: "الهيكل والموظفون", sub: "الأقسام والموظفون ومهام كل شخص" },
    { key: "performance", label: "مؤشرات الأداء", icon: "TrendingUp", group: "الجهة", title: "مؤشرات أداء الجهة", sub: "الالتزام بالمواعيد وتوزيع الأحمال ومواضع الاختناق" },
  ],
  admin: [
    { key: "entities", label: "الجهات والوحدات", icon: "Building2", group: "الهيكل", title: "الجهات والمؤسسات", sub: "إضافة مديرية أو مؤسسة وتعديل شجرتها دون أي تدخل برمجي" },
    { key: "users", label: "المستخدمون", icon: "Users", group: "الهيكل", title: "المستخدمون والحسابات", sub: "إنشاء الحسابات وإسناد الأدوار والجهات وإدارة الإنابات" },
    { key: "roles", label: "الأدوار والصلاحيات", icon: "ShieldCheck", group: "الصلاحيات", title: "الأدوار والصلاحيات", sub: "من يرى ماذا ومن يعتمد ماذا — من المحافظ نزولاً" },
    { key: "escalation", label: "قواعد التصعيد", icon: "AlarmClock", group: "الصلاحيات", title: "المهل وقواعد التصعيد", sub: "متى يُنبَّه ومن يُبلَّغ ومتى يصل الأمر إلى المحافظ" },
    { key: "audit", label: "سجل التدقيق", icon: "ScrollText", group: "الرقابة", title: "سجل التدقيق", sub: "كل إجراء مسجّل باسم صاحبه — ولا يملك أحد حذفه" },
  ],
};

export const portalHome: Record<Portal, string> = {
  diwan: "overview",
  directorates: "entities",
  admin: "entities",
};

export function metaOf(portal: Portal, section: string): NavItem {
  return navByPortal[portal].find((n) => n.key === section) ?? navByPortal[portal][0];
}
