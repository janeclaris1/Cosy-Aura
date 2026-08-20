import type { OrderStatus } from "@prisma/client";
import {
  ORDER_STATUS_STEPS,
  orderStatusDescription,
  orderStatusLabel,
  timelineStepIndex,
} from "@/lib/order-tracking";

export function OrderStatusTimeline({ status }: { status: OrderStatus }) {
  if (status === "CANCELLED" || status === "REFUNDED") {
    return (
      <div className="border border-wf-border bg-wf-light p-4">
        <p className="font-medium">{orderStatusLabel(status)}</p>
        <p className="text-sm text-wf-gray mt-1">
          {orderStatusDescription(status)}
        </p>
      </div>
    );
  }

  if (status === "PENDING") {
    return (
      <div className="border border-wf-border bg-wf-light p-4">
        <p className="font-medium">Pending payment</p>
        <p className="text-sm text-wf-gray mt-1">
          {orderStatusDescription(status)}
        </p>
      </div>
    );
  }

  const active = timelineStepIndex(status);

  return (
    <ol className="space-y-0">
      {ORDER_STATUS_STEPS.map((step, index) => {
        const done = index <= active;
        const current = index === active;
        return (
          <li key={step} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span
                className={`w-3 h-3 rounded-full border ${
                  done
                    ? "bg-gold border-gold"
                    : "bg-white border-wf-border"
                }`}
              />
              {index < ORDER_STATUS_STEPS.length - 1 && (
                <span
                  className={`w-px flex-1 min-h-[28px] ${
                    index < active ? "bg-gold" : "bg-wf-border"
                  }`}
                />
              )}
            </div>
            <div className={`pb-6 ${current ? "" : "opacity-70"}`}>
              <p
                className={`text-sm font-medium ${
                  current ? "text-wf-black" : "text-wf-gray"
                }`}
              >
                {orderStatusLabel(step)}
              </p>
              {current && (
                <p className="text-sm text-wf-gray mt-0.5">
                  {orderStatusDescription(step)}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
