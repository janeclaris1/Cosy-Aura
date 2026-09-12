"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, UserRound } from "lucide-react";
import { adminLabelClass } from "@/components/admin/admin-ui";
import { cn } from "@/lib/utils";

export type EmployeeSelectOption = {
  id: string;
  name: string;
  email: string;
  jobTitle?: string | null;
  balance?: { entitled: number; used: number };
};

function initials(name: string, email: string) {
  const source = name.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function EmployeeSelect({
  employees,
  value,
  onChange,
  disabled,
  label = "Employee",
  placeholder = "Search or choose staff…",
  className,
}: {
  employees: EmployeeSelectOption[];
  value: string;
  onChange: (employeeId: string) => void;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const selected = employees.find((e) => e.id === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.jobTitle || "").toLowerCase().includes(q)
    );
  }, [employees, query]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => searchRef.current?.focus(), 50);
      return () => window.clearTimeout(t);
    }
    setQuery("");
  }, [open]);

  const isDisabled = disabled || !employees.length;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <label className={adminLabelClass}>{label}</label>

      <button
        type="button"
        id={`${listboxId}-trigger`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${listboxId}-listbox`}
        disabled={isDisabled}
        onClick={() => !isDisabled && setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl border bg-white px-3 py-2.5 text-left transition-all",
          "border-stone-200/90 hover:border-[#03045e]/25 focus:outline-none focus:border-[#03045e]/40 focus:ring-2 focus:ring-[#03045e]/10",
          open && "border-[#03045e]/35 ring-2 ring-[#03045e]/10",
          isDisabled && "cursor-not-allowed opacity-60 bg-[#fafafa]"
        )}
      >
        {selected ? (
          <>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#03045e]/8 text-xs font-semibold text-[#03045e]">
              {initials(selected.name, selected.email)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-espresso">
                {selected.name}
              </span>
              <span className="block truncate text-xs text-mocha">
                {selected.jobTitle || selected.email}
              </span>
            </span>
          </>
        ) : (
          <>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fafafa] ring-1 ring-stone-200/80">
              <UserRound className="h-4 w-4 text-mocha/70" strokeWidth={1.75} />
            </span>
            <span className="flex-1 text-sm text-mocha">{placeholder}</span>
          </>
        )}
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-mocha/60 transition-transform duration-200",
            open && "rotate-180"
          )}
          strokeWidth={1.75}
          aria-hidden
        />
      </button>

      {selected?.balance && !open && (
        <p className="mt-2 text-xs text-mocha">
          Annual balance:{" "}
          <span className="font-medium text-espresso">
            {selected.balance.used}/{selected.balance.entitled} days used
          </span>
        </p>
      )}

      {open && !isDisabled && (
        <div
          className={cn(
            "absolute left-0 right-0 z-50 mt-1.5 overflow-hidden rounded-xl",
            "border border-stone-200/90 bg-white shadow-lg shadow-black/10"
          )}
        >
          <div className="border-b border-stone-100 p-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mocha/50"
                strokeWidth={1.75}
              />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or email…"
                className="w-full rounded-lg border border-stone-200/90 bg-[#fafafa] py-2 pl-9 pr-3 text-sm text-espresso placeholder:text-mocha/60 focus:border-[#03045e]/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#03045e]/10"
              />
            </div>
          </div>

          <ul
            id={`${listboxId}-listbox`}
            role="listbox"
            aria-labelledby={`${listboxId}-trigger`}
            className="max-h-64 overflow-y-auto py-1"
          >
            {filtered.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-mocha">
                No staff match “{query.trim()}”
              </li>
            ) : (
              filtered.map((employee) => {
                const active = employee.id === value;
                return (
                  <li key={employee.id} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        onChange(employee.id);
                        setOpen(false);
                        setQuery("");
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                        active
                          ? "bg-[#03045e]/[0.06]"
                          : "hover:bg-[#fafafa]"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                          active
                            ? "bg-[#03045e] text-white"
                            : "bg-[#03045e]/8 text-[#03045e]"
                        )}
                      >
                        {initials(employee.name, employee.email)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span
                            className={cn(
                              "truncate text-sm",
                              active ? "font-medium text-[#03045e]" : "text-espresso"
                            )}
                          >
                            {employee.name}
                          </span>
                          {employee.balance && (
                            <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] text-mocha">
                              {employee.balance.used}/{employee.balance.entitled}d
                            </span>
                          )}
                        </span>
                        <span className="block truncate text-xs text-mocha">
                          {employee.jobTitle
                            ? `${employee.jobTitle} · ${employee.email}`
                            : employee.email}
                        </span>
                      </span>
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0 text-[#03045e]",
                          active ? "opacity-100" : "opacity-0"
                        )}
                        strokeWidth={2}
                        aria-hidden
                      />
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
