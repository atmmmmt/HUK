import type Anthropic from "@anthropic-ai/sdk";

/**
 * أدوات المساعد الذكي. تُعرَّف هنا مرة واحدة: الخادم يرسلها إلى النموذج،
 * والمتصفح ينفّذها بجلسة المستخدم نفسه — فلا يتجاوز المساعد صلاحيات صاحبه أبداً.
 */

type Tool = Anthropic.Beta.BetaTool;

const obj = (properties: Record<string, unknown>, required: string[] = Object.keys(properties)) => ({
  type: "object" as const,
  properties,
  required,
  additionalProperties: false,
});

const STATUSES = ["مُسند", "مُستلَم", "قيد التنفيذ", "قيد المراجعة", "مُغلق", "مُعاد للتصحيح"];

export const assistantTools: Tool[] = [
  {
    name: "navigate",
    description: "يفتح شاشة في المنظومة للمستخدم. استخدمه عندما يطلب المستخدم فتح قسم أو الذهاب إليه، أو بعد إجابة تحتاج أن يرى الشاشة. المسار بصيغة /portal/section/ مثل /diwan/halls/.",
    input_schema: obj({ path: { type: "string", description: "المسار، مثل /diwan/assignments/ أو /guide/" } }),
    strict: true,
  },
  {
    name: "search",
    description: "بحث نصي في التكليفات والأشخاص والجهات والاجتماعات المرئية للمستخدم. يعيد نتائج مختصرة بمعرّفاتها.",
    input_schema: obj({ query: { type: "string" } }),
    strict: true,
  },
  {
    name: "list_assignments",
    description: "يعرض التكليفات المرئية للمستخدم مع حالتها وجهتها ومكلَّفها وموعدها ونسبة إنجازها. مرّر نصاً فارغاً للحقول غير المطلوبة.",
    input_schema: obj({
      status: { type: "string", description: "حالة محددة أو «متأخر»، أو فارغ للكل" },
      entity: { type: "string", description: "اسم الجهة أو جزء منه، أو فارغ" },
    }),
    strict: true,
  },
  {
    name: "advance_assignment",
    description: "ينقل تكليفاً إلى حالته التالية (إقرار الاستلام، بدء التنفيذ، تسليم للمراجعة، اعتماد وإغلاق، إعادة للتصحيح). يتطلّب تأكيد المستخدم، ويرفضه الخادم إن لم تسمح صلاحيته.",
    input_schema: obj({
      assignment_id: { type: "string", description: "معرّف التكليف كما ورد في نتائج list_assignments" },
      to_status: { type: "string", enum: STATUSES },
    }),
    strict: true,
  },
  {
    name: "list_decisions",
    description: "يعرض المعاملات والقرارات بانتظار الاعتماد.",
    input_schema: obj({}),
    strict: true,
  },
  {
    name: "resolve_decision",
    description: "يعتمد معاملة أو يعيدها. يتطلّب تأكيد المستخدم، ولا يملكه إلا المحافظ ونائبه ومعاونه ومدير المكتب.",
    input_schema: obj({
      decision_id: { type: "string" },
      action: { type: "string", enum: ["approve", "return"] },
    }),
    strict: true,
  },
  {
    name: "list_meetings",
    description: "يعرض الاجتماعات القادمة والجارية والمنعقدة.",
    input_schema: obj({}),
    strict: true,
  },
  {
    name: "list_bookings",
    description: "يعرض حجوزات القاعات وحالتها.",
    input_schema: obj({}),
    strict: true,
  },
  {
    name: "set_booking_status",
    description: "يوافق على حجز قاعة أو يرفضه. يتطلّب تأكيد المستخدم وصلاحية مشرف القاعات أو من فوقه.",
    input_schema: obj({
      booking_id: { type: "string" },
      status: { type: "string", enum: ["مؤكد", "مرفوض"] },
    }),
    strict: true,
  },
  {
    name: "list_notifications",
    description: "يعرض إشعارات المستخدم غير المقروءة وآخر الإشعارات.",
    input_schema: obj({}),
    strict: true,
  },
  {
    name: "mark_all_notifications_read",
    description: "يعلّم كل إشعارات المستخدم مقروءة.",
    input_schema: obj({}),
    strict: true,
  },
  {
    name: "add_note",
    description: "يضيف ملاحظة. النطاق: خاصة (للمستخدم وحده)، الوحدة، رسمية، أو توجيه المحافظ (للمحافظ فقط). يتطلّب تأكيد المستخدم.",
    input_schema: obj({
      text: { type: "string" },
      scope: { type: "string", enum: ["خاصة", "الوحدة", "رسمية", "توجيه المحافظ"] },
      about: { type: "string", description: "عنوان العنصر الذي تخصّه الملاحظة، أو «عام»" },
    }),
    strict: true,
  },
];

/** الأدوات التي تغيّر بيانات — لا تُنفَّذ إلا بعد ضغط المستخدم «تأكيد» */
export const CONFIRM_TOOLS = new Set(["advance_assignment", "resolve_decision", "set_booking_status", "add_note"]);
