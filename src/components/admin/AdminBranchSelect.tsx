"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Building2, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type AdminBranchOption = {
  id: string;
  name: string;
  country: string;
  isDefault?: boolean;
};

function formatBranchLabel(branch: AdminBranchOption): string {
  return `${branch.name} · ${branch.country}`;
}

export function AdminBranchSelect({
  branches,
  value,
  onChange,
  disabled,
  label = "Branch",
  variant = "light",
  className,
  hideWhenSingle = false,
}: {
  branches: AdminBranchOption[];
  value: string;
  onChange: (branchId: string) => void;
  disabled?: boolean;
  label?: string;
  variant?: "light" | "sidebar";
  className?: string;
  /** Hide entirely when only one branch (sidebar default). */
  hideWhenSingle?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (hideWhenSingle && branches.length < 2) return null;
  if (!branches.length) return null;

  const isSidebar = variant === "sidebar";
  const selected = branches.find((b) => b.id === value) ?? branches[0];
  const isDisabled = disabled || branches.length <= 1;

  const shellClass = cn(
    "block min-w-[14rem]",
    isSidebar
      ? "rounded-2xl bg-white border border-[#03045e]/15 px-3.5 py-2.5"
      : "rounded-lg bg-[#fafafa] border border-stone-200/90 px-3 py-2.5",
    className
  );

  const labelClass = cn(
    "flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] mb-1.5",
    isSidebar ? "text-[#03045e]/55" : "text-mocha"
  );

  const triggerClass = cn(
    "flex w-full items-center justify-between gap-2 text-left text-sm font-medium transition-colors",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#03045e]/20 rounded-lg -mx-0.5 px-0.5",
    isDisabled ? "cursor-default opacity-70" : "cursor-pointer hover:text-[#0077b6]",
    "text-[#03045e]"
  );

  const menuClass = cn(
    "absolute left-0 right-0 z-50 overflow-hidden",
    "rounded-xl border bg-white shadow-lg shadow-black/10",
    isSidebar
      ? "bottom-[calc(100%+0.375rem)] border-[#03045e]/15"
      : "top-[calc(100%+0.375rem)] border-stone-200/90"
  );

  return (
    <div ref={rootRef} className={cn(shellClass, "relative")}>
      <p className={labelClass}>
        <Building2 className="w-3 h-3 shrink-0" strokeWidth={1.75} />
        {label}
      </p>

      <button
        type="button"
        id={`${listboxId}-trigger`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${listboxId}-listbox`}
        disabled={isDisabled}
        onClick={() => !isDisabled && setOpen((v) => !v)}
        className={triggerClass}
      >
        <span className="truncate">{selected ? formatBranchLabel(selected) : "Select branch"}</span>
        {!isDisabled && (
          <ChevronDown
            className={cn(
              "w-4 h-4 shrink-0 transition-transform duration-200",
              isSidebar ? "text-[#03045e]/45" : "text-mocha/60",
              open && "rotate-180"
            )}
            strokeWidth={1.75}
            aria-hidden
          />
        )}
      </button>

      {open && !isDisabled && (
        <ul
          id={`${listboxId}-listbox`}
          role="listbox"
          aria-labelledby={`${listboxId}-trigger`}
          className={menuClass}
        >
          {branches.map((branch) => {
            const active = branch.id === value;
            return (
              <li key={branch.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(branch.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors",
                    active
                      ? "bg-[#03045e]/[0.06] font-medium text-[#03045e]"
                      : "text-[#03045e]/85 hover:bg-[#f7f6f3] hover:text-[#03045e]"
                  )}
                >
                  <Check
                    className={cn(
                      "w-3.5 h-3.5 shrink-0",
                      active ? "text-[#03045e] opacity-100" : "opacity-0"
                    )}
                    strokeWidth={2}
                    aria-hidden
                  />
                  <span className="truncate">{formatBranchLabel(branch)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
