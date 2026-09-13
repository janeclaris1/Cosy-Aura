-- Backfill active credit POS orders from PROCESSING → PARTIALLY_PAID
UPDATE "Order" o
SET status = 'PARTIALLY_PAID'
FROM "CreditAgreement" ca
WHERE o.id = ca."orderId"
  AND ca.status = 'ACTIVE'
  AND o.status = 'PROCESSING'
  AND o."posPaymentMethod" = 'CREDIT';
