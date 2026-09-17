import Image from "next/image";
import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-page";
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
import {
  adminCatalogPath,
  getCatalog,
  isPerfumeProduct,
  type CatalogSlug,
} from "@/lib/product-catalog";
import type { Prisma } from "@prisma/client";

type AdminCatalogProductsPageProps = {
  catalog: CatalogSlug;
  searchParams: { q?: string };
};

export async function AdminCatalogProductsPage({
  catalog,
  searchParams,
}: AdminCatalogProductsPageProps) {
  await requireAdminPage();

  const config = getCatalog(catalog);
  const adminPath = adminCatalogPath(catalog);
  const q = searchParams.q?.trim();
  const perfume = isPerfumeProduct(config.productType);

  const where: Prisma.FragranceWhereInput = {
    productType: config.productType,
    ...(q
      ? {
          OR: [
            { model: { contains: q, mode: "insensitive" } },
            { brand: { name: { contains: q, mode: "insensitive" } } },
            { reference: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const products = await prisma.fragrance.findMany({
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

  const emptyLabel = config.adminLabel.toLowerCase();

  return (
    <div className={adminPageWrap}>
      <AdminPageHeader
        eyebrow="Catalogue"
        title={config.adminLabel}
        description={`Manage ${emptyLabel}, pricing, images, and barcodes for the storefront and POS.`}
        actions={<AdminButton href={`${adminPath}/new`}>{config.adminAddLabel}</AdminButton>}
      />

      <AdminSearchForm
        action={adminPath}
        placeholder="Search by name, brand, or reference…"
        defaultValue={q}
        clearHref={adminPath}
      />

      {q ? (
        <p className="text-sm text-mocha">
          {products.length} result{products.length === 1 ? "" : "s"} for &ldquo;{q}&rdquo;
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
            {products.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <AdminEmptyState
                    message={
                      q
                        ? `No ${emptyLabel} match “${q}”.`
                        : `No ${emptyLabel} yet.`
                    }
                  />
                </td>
              </tr>
            ) : (
              products.map((product) => {
                const image = product.images[0];
                return (
                  <tr key={product.id} className={adminTrClass}>
                    <td className={adminTdClass}>
                      <Link
                        href={`/admin/fragrances/${product.id}/edit`}
                        className="relative block w-14 h-14 bg-[#fafafa] overflow-hidden ring-1 ring-stone-200/80"
                      >
                        {image ? (
                          <Image
                            src={image.url}
                            alt={
                              image.alt || `${product.brand.name} ${product.model}`
                            }
                            fill
                            className={perfume ? "object-contain" : "object-cover"}
                            sizes="56px"
                          />
                        ) : (
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] text-mocha">
                            No image
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className={adminTdClass}>{product.brand.name}</td>
                    <td className={adminTdClass}>{product.model}</td>
                    <td className={`${adminTdClass} text-mocha`}>{product.reference}</td>
                    <td className={`${adminTdClass} text-mocha`}>
                      {product.category || "—"}
                    </td>
                    <td className={adminTdClass}>
                      {perfume ? (
                        <div className="tabular-nums text-xs space-y-0.5">
                          <p className="font-semibold text-[#03045e]">
                            {formatPrice(salePriceForSize(50, product.slug))}
                            <span className="font-normal text-mocha"> · 50ml</span>
                          </p>
                          <p className="text-[10px] text-mocha">
                            30ml {formatPrice(salePriceForSize(30, product.slug))}
                            {" · "}
                            100ml {formatPrice(salePriceForSize(100, product.slug))}
                          </p>
                        </div>
                      ) : (
                        <p className="font-semibold text-[#03045e] tabular-nums">
                          {formatPrice(product.price)}
                        </p>
                      )}
                    </td>
                    <td className={adminTdClass}>
                      {conditionLabel(product.condition)}
                    </td>
                    <td className={adminTdClass}>
                      {product.featured ? "Yes" : "No"}
                    </td>
                    <td className={adminTdClass}>
                      <AdminTableActions>
                        <AdminLink href={`/admin/fragrances/${product.id}/edit`}>
                          Edit
                        </AdminLink>
                        <DeleteFragranceButton id={product.id} />
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
