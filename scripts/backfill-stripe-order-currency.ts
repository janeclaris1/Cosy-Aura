/**
 * Fix Stripe orders where USD charge was saved into `total` (shown as GHS).
 *
 * Usage:
 *   npx tsx scripts/backfill-stripe-order-currency.ts          # dry run
 *   npx tsx scripts/backfill-stripe-order-currency.ts --apply
 */
import { PrismaClient } from "@prisma/client";
import Stripe from "stripe";
import {
  foreignToGhs,
  orderItemsSubtotalGhs,
} from "../src/lib/order-money";
import { fetchRatesFromGhs, rateFromGhs } from "../src/lib/fx";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function looksMisrecorded(total: number, itemsGhs: number): boolean {
  if (itemsGhs <= 0) return false;
  if (total <= 0) return false;
  return total < itemsGhs * 0.75;
}

async function main() {
  const { rates } = await fetchRatesFromGhs();
  const usdPerGhs = rateFromGhs(rates, "USD");

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const stripe = stripeKey ? new Stripe(stripeKey) : null;

  const orders = await prisma.order.findMany({
    where: {
      paymentProvider: "stripe",
      chargeCurrency: null,
      status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] },
    },
    include: { items: { select: { price: true, quantity: true } } },
    orderBy: { createdAt: "asc" },
  });

  let fixed = 0;
  let skipped = 0;

  for (const order of orders) {
    const itemsGhs = orderItemsSubtotalGhs(order.items);
    if (!looksMisrecorded(order.total, itemsGhs)) {
      skipped += 1;
      continue;
    }

    let chargeAmount = order.total;
    let chargeCurrency = "USD";
    let shippingGhs = order.shippingCost;
    let usdRate = usdPerGhs;

    if (stripe && order.stripeSessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
        if (session.amount_total != null) {
          chargeAmount = session.amount_total / 100;
        }
        if (session.currency) {
          chargeCurrency = session.currency.toUpperCase();
        }
        const metaRate = Number(session.metadata?.usdPerGhs);
        if (metaRate > 0) usdRate = metaRate;

        if (session.shipping_cost?.amount_total != null && chargeCurrency === "USD") {
          shippingGhs = foreignToGhs(
            session.shipping_cost.amount_total / 100,
            usdRate
          );
        }
      } catch (error) {
        console.warn(`  [warn] Stripe session ${order.stripeSessionId}:`, error);
      }
    } else if (order.shippingCost > 0 && order.shippingCost < itemsGhs * 0.25) {
      shippingGhs = foreignToGhs(order.shippingCost, usdRate);
    }

    const totalGhs = round2(itemsGhs + shippingGhs);

    console.log(
      [
        apply ? "FIX" : "DRY",
        order.id.slice(0, 8).toUpperCase(),
        `was total=${order.total}`,
        `→ charge=${chargeAmount} ${chargeCurrency}`,
        `book=${totalGhs} GHS`,
      ].join(" · ")
    );

    if (apply) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          chargeAmount,
          chargeCurrency,
          total: totalGhs,
          shippingCost: shippingGhs,
        },
      });
    }

    fixed += 1;
  }

  console.log(
    `\n${apply ? "Updated" : "Would update"} ${fixed} order(s); skipped ${skipped}.`
  );
  if (!apply && fixed > 0) {
    console.log("Re-run with --apply to write changes.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
