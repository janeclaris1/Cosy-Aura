import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Cosy Aura admin brand colour */
export const ADMIN_BRAND = "#03045e";

/** Shared admin design tokens */
export const adminPageWrap = "max-w-6xl space-y-6 font-roboto";

/** Pill tab bar container (Accounting / HR hub style) */
export const adminTabBarClass =
  "inline-flex flex-wrap rounded-2xl bg-[#fafafa] p-1 ring-1 ring-stone-200/80";

/** Active / inactive tab button classes */
export function adminTabButtonClass(active: boolean, size: "sm" | "md" = "md") {
  return cn(
    "font-roboto transition-all",
    size === "md" ? "rounded-xl px-5 py-2.5 text-sm" : "rounded-xl px-3 py-1.5 text-xs",
    active
      ? "bg-[#03045e] text-white shadow-sm font-medium"
      : "text-mocha hover:text-espresso hover:bg-white/80"
  );
}

/** Sidebar nav link on navy chrome */
export function adminSidebarLinkClass(active: boolean) {
  return cn(
    "group flex items-center gap-3 px-3.5 py-2.5 text-[13px] font-roboto rounded-xl transition-all duration-200",
    active
      ? "bg-white text-[#03045e] font-semibold shadow-sm"
      : "text-white/75 font-medium hover:bg-white/10 hover:text-white"
  );
}

export function AdminTabBar<T extends string>({
  tabs,
  value,
  onChange,
  size = "md",
  className,
}: {
  tabs: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div className={cn(adminTabBarClass, className)} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={adminTabButtonClass(value === t.id, size)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function AdminTabLinks({
  items,
  activeId,
  size = "md",
  className,
}: {
  items: { id: string; label: string; href: string }[];
  activeId: string;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div className={cn(adminTabBarClass, className)}>
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className={adminTabButtonClass(activeId === item.id, size)}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

/** Navy section header bar (chart of accounts, tables) */
export function AdminSectionBar({
  title,
  meta,
  icon: Icon,
  className,
}: {
  title: string;
  meta?: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-[#03045e] px-4 sm:px-5 py-3 flex items-center justify-between gap-3",
        className
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {Icon ? (
          <Icon className="w-4 h-4 text-white/90 shrink-0" strokeWidth={1.75} />
        ) : null}
        <h3 className="font-playfair text-white text-lg truncate">{title}</h3>
      </div>
      {meta ? (
        <span className="text-[11px] uppercase tracking-[0.12em] text-white/70 shrink-0">
          {meta}
        </span>
      ) : null}
    </div>
  );
}

/** Summary stat tile (accounting dashboard style) */
export function AdminStatTile({
  label,
  value,
  icon: Icon,
  active,
  onClick,
  className,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "rounded-2xl px-3 py-3 text-left transition-all ring-1 w-full",
        active
          ? "bg-[#03045e] text-white ring-[#03045e]/40 shadow-sm"
          : "bg-white text-espresso ring-stone-200/80 hover:ring-[#03045e]/20",
        onClick && "cursor-pointer",
        className
      )}
    >
      {Icon ? (
        <div className="flex items-center gap-2">
          <Icon
            className={cn("w-4 h-4 shrink-0", active ? "text-white/90" : "text-[#03045e]")}
            strokeWidth={1.75}
          />
          <span className="text-[10px] uppercase tracking-[0.14em] font-medium opacity-80">
            {label}
          </span>
        </div>
      ) : (
        <span className="text-[10px] uppercase tracking-[0.14em] font-medium text-mocha">
          {label}
        </span>
      )}
      <p className="text-2xl font-semibold tabular-nums mt-1">{value}</p>
    </Tag>
  );
}
export const adminInputClass =
  "w-full font-roboto rounded-xl bg-[#fafafa] border border-stone-200/90 px-3 py-2.5 text-sm text-espresso focus:outline-none focus:border-[#03045e]/40 focus:bg-white transition-colors";
export const adminSelectClass = adminInputClass;
export const adminLabelClass =
  "block font-roboto text-[10px] uppercase tracking-[0.16em] text-mocha mb-1.5";
export const adminBodyClass = "text-sm font-roboto text-mocha leading-relaxed";
export const adminHeadingClass = "font-playfair text-[#03045e]";

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4",
        className
      )}
    >
      <div>
        {eyebrow && (
          <p className="font-roboto text-[11px] uppercase tracking-[0.2em] text-mocha mb-2">
            {eyebrow}
          </p>
        )}
        <h1 className={`${adminHeadingClass} text-3xl`}>{title}</h1>
        {description && (
          <p className={`${adminBodyClass} mt-2 max-w-2xl`}>
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </header>
  );
}

export function AdminCard({
  children,
  className,
  padding = "default",
}: {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "default" | "lg";
}) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl shadow-sm ring-1 ring-stone-200/80 overflow-hidden",
        padding === "default" && "p-4 sm:p-5",
        padding === "lg" && "p-5 sm:p-6",
        className
      )}
    >
      {children}
    </div>
  );
}

export function AdminSectionTitle({
  title,
  description,
  className,
}: {
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-4", className)}>
      <h2 className={`${adminHeadingClass} text-lg`}>{title}</h2>
      {description && <p className="text-xs font-roboto text-mocha mt-1">{description}</p>}
    </div>
  );
}

type AdminButtonProps = {
  children: React.ReactNode;
  href?: string;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export function AdminButton({
  children,
  href,
  variant = "primary",
  className,
  type = "button",
  ...props
}: AdminButtonProps) {
  const styles = cn(
    "inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-medium font-roboto transition-all duration-200 disabled:opacity-50",
    variant === "primary" &&
      "bg-[#03045e] text-white border border-[#03045e] hover:bg-[#020338] active:scale-[0.98]",
    variant === "secondary" &&
      "bg-white text-[#03045e] border border-[#03045e]/15 hover:border-[#03045e]/30 hover:bg-[#f7f6f3] active:scale-[0.98]",
    variant === "ghost" &&
      "text-[#03045e] border border-transparent hover:bg-[#03045e]/5",
    className
  );

  if (href) {
    return (
      <Link href={href} className={styles}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={styles} {...props}>
      {children}
    </button>
  );
}

export function AdminTableWrap({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <AdminCard padding="none" className={cn("overflow-x-auto", className)}>
      {children}
    </AdminCard>
  );
}

export const adminTableClass = "w-full text-sm font-roboto";
export const adminTheadClass =
  "text-left font-roboto text-[10px] uppercase tracking-[0.14em] text-white bg-[#03045e] border-b border-[#020338]";
export const adminThClass = "px-4 py-3 font-medium font-roboto text-white";
export const adminTdClass = "px-4 py-3.5 align-middle font-roboto";
export const adminTrClass = "border-b border-stone-100 last:border-0 hover:bg-[#fafafa]/60 transition-colors";

export function AdminEmptyState({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return (
    <p className={cn("py-12 text-center text-sm font-roboto text-mocha", className)}>{message}</p>
  );
}

export function AdminLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("text-[#03045e] hover:underline text-sm font-medium", className)}
    >
      {children}
    </Link>
  );
}

export function AdminSearchForm({
  action,
  placeholder,
  defaultValue,
  clearHref,
}: {
  action: string;
  placeholder?: string;
  defaultValue?: string;
  clearHref?: string;
}) {
  return (
    <AdminCard className="!p-3">
      <form action={action} method="get" className="flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={defaultValue || ""}
          placeholder={placeholder || "Search…"}
          className={cn(adminInputClass, "flex-1 min-w-[12rem]")}
        />
        <AdminButton type="submit" variant="secondary">
          Search
        </AdminButton>
        {clearHref && defaultValue ? (
          <AdminButton href={clearHref} variant="ghost">
            Clear
          </AdminButton>
        ) : null}
      </form>
    </AdminCard>
  );
}

export function AdminFilterPills({
  items,
  activeId,
  size = "sm",
}: {
  items: { id: string; label: string; href: string }[];
  activeId: string;
  size?: "sm" | "md";
}) {
  return <AdminTabLinks items={items} activeId={activeId} size={size} />;
}
