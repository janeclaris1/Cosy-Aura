/** Survives React Strict Mode remounts so new orders are not missed. */

let listenerStartedAt = 0;
const seenNotificationIds = new Set<string>();
let lastOpenOrderCount: number | null = null;

export function adminOrderListenerStartedAt(): number {
  if (!listenerStartedAt) {
    listenerStartedAt = Date.now();
  }
  return listenerStartedAt;
}

export function markAdminNotificationsSeen(ids: string[]): void {
  for (const id of ids) seenNotificationIds.add(id);
}

export type OrderAlertNotification = {
  id: string;
  type: string;
  createdAt: string;
};

/** Returns true when open order count increased since the previous poll. */
export function detectOpenOrderCountIncrease(total: number): boolean {
  if (lastOpenOrderCount === null) {
    lastOpenOrderCount = total;
    return false;
  }
  const increased = total > lastOpenOrderCount;
  lastOpenOrderCount = total;
  return increased;
}

export function filterNewPaidOrderAlerts(
  notifications: OrderAlertNotification[]
): OrderAlertNotification[] {
  const startedAt = adminOrderListenerStartedAt();
  return notifications.filter((notification) => {
    if (notification.type !== "ORDER_PAID") return false;
    if (seenNotificationIds.has(notification.id)) return false;
    const createdAt = new Date(notification.createdAt).getTime();
    if (!Number.isFinite(createdAt)) return false;
    return createdAt >= startedAt - 3000;
  });
}
