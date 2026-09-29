import "server-only";
import { collections, pushNotification } from "./db";
import { slaHours } from "./access";
import type { Assignment } from "./types";

/**
 * إشعار المراجعة — بقرار مكتب السيد المحافظ:
 * «لازم بعد المدة المحددة يجيني إشعار مراجعة، حتى أراجع المكلَّف: شو صار معك؟»
 *
 * يُفحص عند كل تحميل للبيانات: أي تكليف انتهت مهلته ولم يُغلق،
 * يصل إشعار واحد إلى مُصدِره، ثم يُعلَّم حتى لا يتكرر.
 */

const DAY = 24 * 60 * 60 * 1000;

/** هل حان وقت مراجعة هذا التكليف؟ */
export function reviewDue(a: Assignment, now = new Date()): boolean {
  if (["مُغلق", "مُجمَّد"].includes(a.status)) return false;
  if (!a.dueISO) return false;
  const due = new Date(a.dueISO + "T23:59:59");
  return now.getTime() > due.getTime();
}

/** كم يوماً مضى على الاستحقاق */
export function daysLate(a: Assignment, now = new Date()): number {
  if (!a.dueISO) return 0;
  const due = new Date(a.dueISO + "T23:59:59");
  return Math.max(0, Math.floor((now.getTime() - due.getTime()) / DAY));
}

/** نص المهلة المعتمدة لهذه الأولوية */
export function slaText(a: Assignment): string {
  const h = slaHours[a.priority];
  if (h) return `مهلة الرد ${h} ساعة`;
  return a.scheduleDays
    ? `جدول زمني متفق عليه: ${a.scheduleDays} أيام`
    : "جدول زمني يُحدَّد عند الإسناد";
}

/**
 * يرسل إشعارات المراجعة المستحقة لمُصدِر التكليف، ويحدّث حالة المتأخر.
 * يُستدعى من مسار bootstrap فيعمل تلقائياً كلما فتح أحدهم النظام.
 */
export async function runReviewSweep(now = new Date()): Promise<number> {
  const col = await collections.assignments();
  const open = await col
    .find({ status: { $nin: ["مُغلق", "مُجمَّد"] } })
    .toArray();

  let sent = 0;

  for (const raw of open) {
    const a = raw as unknown as Assignment;
    if (!reviewDue(a, now)) continue;

    const late = daysLate(a, now);

    // تغيير الحالة إلى «متأخر» بعد مضي يوم على الاستحقاق
    if (late >= 1 && a.status !== "متأخر" && a.status !== "قيد المراجعة") {
      await col.updateOne({ id: a.id }, { $set: { status: "متأخر" } });
    }

    if (a.reviewNotified) continue;

    // إشعار المراجعة إلى مُصدِر التكليف
    if (a.issuerId) {
      await pushNotification({
        kind: "تصعيد",
        title: "مراجعة مستحقة — انتهت المهلة",
        body: `«${a.title}» انتهت مهلته${late ? ` منذ ${late} يوم` : ""}. راجع المكلَّف: ما الذي أُنجز؟`,
        channel: "تنبيه التطبيق",
        toId: a.issuerId,
        link: { portal: "diwan", section: "assignments" },
        urgent: a.priority === "عاجل جداً" || a.priority === "عاجل",
      });
      sent++;
    }

    // وتنبيه المكلَّف نفسه
    await pushNotification({
      kind: "تكليف",
      title: "انتهت مهلة تكليفك",
      body: `«${a.title}» — ${slaText(a)}. يرجى رفع ما أُنجز.`,
      channel: a.priority === "عاجل جداً" ? "رسالة نصية" : "تنبيه التطبيق",
      toId: a.ownerId,
      link: { portal: "directorates", section: "inbox" },
      urgent: true,
    });

    await col.updateOne({ id: a.id }, { $set: { reviewNotified: true } });
  }

  return sent;
}
