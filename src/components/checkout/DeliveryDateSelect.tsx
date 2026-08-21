"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import {
  earliestDeliveryIso,
  formatDeliveryDateLabel,
  listUpcomingDeliveryDates,
} from "@/lib/delivery-dates";
import { useT } from "@/lib/locale-store";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function monthLabel(year: number, monthIndex: number) {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthIndex, 1)));
}

function padIso(year: number, monthIndex: number, day: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function DeliveryDateSelect({
  value,
  onChange,
  nextDayOnly = false,
}: {
  value: string;
  onChange: (iso: string) => void;
  /** When true, only the next delivery weekday is offered (no multi-day calendar). */
  nextDayOnly?: boolean;
}) {
  const t = useT();
  const defaultIso = useMemo(() => earliestDeliveryIso(), []);
  const options = useMemo(
    () => listUpcomingDeliveryDates(nextDayOnly ? 1 : 21),
    [nextDayOnly]
  );
  const allowed = useMemo(() => new Set(options.map((option) => option.iso)), [options]);
  const selected = value || defaultIso;

  useEffect(() => {
    if (!nextDayOnly) return;
    const only = options[0]?.iso;
    if (only && value !== only) onChange(only);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextDayOnly, options]);

  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => {
    const iso = value || defaultIso;
    const [y, m] = iso.split("-").map(Number);
    return { year: y, month: m - 1 };
  });
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const firstAllowed = options[0]?.iso;
  const lastAllowed = options[options.length - 1]?.iso;
  const canPrev =
    firstAllowed && padIso(cursor.year, cursor.month, 1) > firstAllowed.slice(0, 7) + "-01";
  const canNext =
    lastAllowed && padIso(cursor.year, cursor.month, 1) < lastAllowed.slice(0, 7) + "-01";

  const firstWeekday = new Date(Date.UTC(cursor.year, cursor.month, 1)).getUTCDay();
  const mondayOffset = (firstWeekday + 6) % 7;
  const daysInMonth = new Date(Date.UTC(cursor.year, cursor.month + 1, 0)).getUTCDate();
  const cells: Array<{ iso: string; day: number } | null> = [
    ...Array.from({ length: mondayOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      return { day, iso: padIso(cursor.year, cursor.month, day) };
    }),
  ];

  return (
    <div ref={rootRef} className="relative">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-espresso">
            {t("checkout.delivery")}{" "}
            <span className="font-medium">{formatDeliveryDateLabel(selected)}</span>
          </p>
          {!nextDayOnly ? (
            <p className="text-xs text-wf-gray mt-0.5">{t("checkout.weekdays")}</p>
          ) : null}
        </div>
        {!nextDayOnly && (
          <button
            type="button"
            onClick={() => {
              const [y, m] = selected.split("-").map(Number);
              setCursor({ year: y, month: m - 1 });
              setOpen((prev) => !prev);
            }}
            aria-expanded={open}
            aria-label="Choose a different delivery date"
            title="Choose a different delivery date"
            className="shrink-0 p-2 border border-wf-border text-espresso hover:border-espresso transition-colors"
          >
            <CalendarDays className="w-5 h-5" />
          </button>
        )}
      </div>

      {!nextDayOnly && open && (
        <div className="absolute right-0 z-20 mt-2 w-[280px] border border-wf-border bg-white p-3 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              disabled={!canPrev}
              onClick={() =>
                setCursor((prev) =>
                  prev.month === 0
                    ? { year: prev.year - 1, month: 11 }
                    : { year: prev.year, month: prev.month - 1 }
                )
              }
              className="p-1 text-espresso disabled:opacity-30"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <p className="text-sm font-medium">{monthLabel(cursor.year, cursor.month)}</p>
            <button
              type="button"
              disabled={!canNext}
              onClick={() =>
                setCursor((prev) =>
                  prev.month === 11
                    ? { year: prev.year + 1, month: 0 }
                    : { year: prev.year, month: prev.month + 1 }
                )
              }
              className="p-1 text-espresso disabled:opacity-30"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wide text-wf-gray mb-1">
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, index) => {
              if (!cell) return <span key={`empty-${index}`} />;
              const enabled = allowed.has(cell.iso);
              const isSelected = cell.iso === selected;
              return (
                <button
                  key={cell.iso}
                  type="button"
                  disabled={!enabled}
                  onClick={() => {
                    onChange(cell.iso);
                    setOpen(false);
                  }}
                  className={`h-8 text-sm ${
                    isSelected
                      ? "bg-espresso text-white"
                      : enabled
                        ? "hover:bg-wf-light text-espresso"
                        : "text-wf-gray/40 cursor-not-allowed"
                  }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
