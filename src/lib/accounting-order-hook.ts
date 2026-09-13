import { postCreditSaleJournalIfNeeded } from "@/lib/accounting-credit-post";
import { postOrderCogsJournalIfNeeded } from "@/lib/accounting-cogs-post";
import { postOrderSalesJournalIfNeeded } from "@/lib/accounting-sales-post";

/** Fire-and-forget sales + COGS ledger posts for Ghana orders. */
export function hookOrderSalesJournal(
  orderId: string,
  options?: { previousStatus?: string; actorUserId?: string; isCreditSale?: boolean }
) {
  const postSales = options?.isCreditSale
    ? postCreditSaleJournalIfNeeded(orderId, options?.actorUserId)
    : postOrderSalesJournalIfNeeded(orderId, options);

  void postSales.then((entry) => {
    if (entry) {
      console.info("[accounting] posted sales journal", orderId, entry.reference);
    }
  });
  if (!options?.isCreditSale) {
    void postOrderCogsJournalIfNeeded(orderId, options).then((entry) => {
      if (entry) {
        console.info("[accounting] posted COGS journal", orderId, entry.reference);
      }
    });
  }
}

/** Post COGS when a credit sale is fully paid and goods are released. */
export function hookCreditOrderCogsJournal(
  orderId: string,
  options?: { actorUserId?: string }
) {
  void postOrderCogsJournalIfNeeded(orderId, options).then((entry) => {
    if (entry) {
      console.info("[accounting] posted credit COGS journal", orderId, entry.reference);
    }
  });
}
