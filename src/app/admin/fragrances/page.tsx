import Image from "next/image";
import Link from "next/link";
import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { formatPrice, conditionLabel } from "@/lib/utils";
import { salePriceForSize } from "@/lib/pricing";
import { DeleteFragranceButton } from "@/components/admin/DeleteFragranceButton";
import {
  AdminButton,
  AdminEmptyState,
  AdminLink,
  AdminPageHeader,
  AdminSearchForm,
  AdminTableActions,
  AdminTableWrap,
  adminPageWrap,
  adminTdClass,
  adminThClass,
  adminTheadClass,
  adminTrClass,
  adminTableClass,
} from "@/components/admin/admin-ui";
import type { Prisma } from "@prisma/client";

export default async function AdminFragrancesPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  await requireAdminPage();

  const q = searchParams.q?.trim();
  const where: Prisma.FragranceWhereInput = q
    ? {
        OR: [
          { model: { contains: q, mode: "insensitive" } },
          { brand: { name: { contains: q, mode: "insensitive" } } },
          { reference: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  const fragrances = await prisma.fragrance.findMany({
    where,
    include: {
      brand: true,
      images: {
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className={adminPageWrap}>
      <AdminPageHeader
        eyebrow="Catalogue"
        title="Fragrances"
        description="Manage products, pricing, images, and barcodes for the storefront and POS."
        actions={<AdminButton href="/admin/fragrances/new">Add fragrance</AdminButton>}
      />

      <AdminSearchForm
        action="/admin/fragrances"
        placeholder="Search by name, brand, or reference…"
        defaultValue={q}
        clearHref="/admin/fragrances"
      />

      {q ? (
        <p className="text-sm text-mocha">
          {fragrances.length} result{fragrances.length === 1 ? "" : "s"} for &ldquo;{q}&rdquo;
        </p>
      ) : null}

      <AdminTableWrap>
        <table className={`${adminTableClass} min-w-[880px]`}>
          <thead className={adminTheadClass}>
            <tr>
              <th className={`${adminThClass} w-16`}>Image</th>
              <th className={adminThClass}>Brand</th>
              <th className={adminThClass}>Name</th>
              <th className={adminThClass}>Reference</th>
              <th className={adminThClass}>Category</th>
              <th className={adminThClass}>Retail (GHS)</th>
              <th className={adminThClass}>Condition</th>
              <th className={adminThClass}>Featured</th>
              <th className={adminThClass}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {fragrances.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <AdminEmptyState
                    message={q ? `No fragrances match “${q}”.` : "No fragrances yet."}
                  />
                </td>
              </tr>
            ) : (
              fragrances.map((fragrance) => {
                const image = fragrance.images[0];
                return (
                  <tr key={fragrance.id} className={adminTrClass}>
                    <td className={adminTdClass}>
                      <Link
                        href={`/admin/fragrances/${fragrance.id}/edit`}
                        className="relative block w-14 h-14 bg-[#fafafa] overflow-hidden ring-1 ring-stone-200/80"
                      >
                        {image ? (
                          <Image
                            src={image.url}
                            alt={
                              image.alt ||
                              `${fragrance.brand.name} ${fragrance.model}`
                            }
                            fill
                            className="object-contain"
                            sizes="56px"
                          />
                        ) : (
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] text-mocha">
                            No image
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className={adminTdClass}>{fragrance.brand.name}</td>
                    <td className={adminTdClass}>{fragrance.model}</td>
                    <td className={`${adminTdClass} text-mocha`}>{fragrance.reference}</td>
                    <td className={`${adminTdClass} text-mocha`}>
                      {fragrance.category || "—"}
                    </td>
                    <td className={adminTdClass}>
                      <div className="tabular-nums text-xs space-y-0.5">
                        <p className="font-semibold text-[#03045e]">
                          {formatPrice(salePriceForSize(50, fragrance.slug))}
                          <span className="font-normal text-mocha"> · 50ml</span>
                        </p>
                        <p className="text-[10px] text-mocha">
                          30ml {formatPrice(salePriceForSize(30, fragrance.slug))}
                          {" · "}
                          100ml {formatPrice(salePriceForSize(100, fragrance.slug))}
                        </p>
                      </div>
                    </td>
                    <td className={adminTdClass}>
                      {conditionLabel(fragrance.condition)}
                    </td>
                    <td className={adminTdClass}>
                      {fragrance.featured ? "Yes" : "No"}
                    </td>
                    <td className={adminTdClass}>
                      <AdminTableActions>
                        <AdminLink href={`/admin/fragrances/${fragrance.id}/edit`}>
                          Edit
                        </AdminLink>
                        <DeleteFragranceButton id={fragrance.id} />
                      </AdminTableActions>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </AdminTableWrap>
    </div>
  );
}
