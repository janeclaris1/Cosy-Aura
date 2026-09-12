import { postOrderCogsJournalIfNeeded } from "@/lib/accounting-cogs-post";
import { postOrderSalesJournalIfNeeded } from "@/lib/accounting-sales-post";

/** Fire-and-forget sales + COGS ledger posts for Ghana orders. */
export function hookOrderSalesJournal(
  orderId: string,
  options?: { previousStatus?: string; actorUserId?: string }
) {
  void postOrderSalesJournalIfNeeded(orderId, options).then((entry) => {
    if (entry) {
      console.info("[accounting] posted sales journal", orderId, entry.reference);
    }
  });
  void postOrderCogsJournalIfNeeded(orderId, options).then((entry) => {
    if (entry) {
      console.info("[accounting] posted COGS journal", orderId, entry.reference);
    }
  });
}
