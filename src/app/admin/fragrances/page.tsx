import Image from "next/image";
import Link from "next/link";
import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { formatPrice, conditionLabel } from "@/lib/utils";
import { DeleteFragranceButton } from "@/components/admin/DeleteFragranceButton";
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
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="font-playfair text-3xl">Fragrances</h1>
        <Link href="/admin/fragrances/new" className="btn-gold">
          Add Fragrance
        </Link>
      </div>

      <form className="mb-6" action="/admin/fragrances" method="get">
        <div className="flex flex-wrap gap-2 max-w-lg">
          <input
            name="q"
            defaultValue={q || ""}
            placeholder="Search by name, brand, or reference…"
            className="flex-1 min-w-[200px] px-3 py-2 border border-wf-border rounded text-sm bg-white focus:outline-none focus:border-gold"
          />
          <button type="submit" className="btn-outline text-sm py-2 px-4">
            Search
          </button>
          {q ? (
            <Link href="/admin/fragrances" className="btn-outline text-sm py-2 px-4">
              Clear
            </Link>
          ) : null}
        </div>
      </form>

      {q ? (
        <p className="text-sm text-wf-gray mb-4">
          {fragrances.length} result{fragrances.length === 1 ? "" : "s"} for &ldquo;{q}&rdquo;
        </p>
      ) : null}

      <div className="border border-wf-border rounded-lg overflow-hidden bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[880px]">
          <thead className="bg-wf-light">
            <tr>
              <th className="text-left p-3 font-medium w-16">Image</th>
              <th className="text-left p-3 font-medium">Brand</th>
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium">Reference</th>
              <th className="text-left p-3 font-medium">Category</th>
              <th className="text-left p-3 font-medium">Price</th>
              <th className="text-left p-3 font-medium">Condition</th>
              <th className="text-left p-3 font-medium">Featured</th>
              <th className="text-left p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {fragrances.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-wf-gray">
                  {q ? `No fragrances match “${q}”.` : "No fragrances yet."}
                </td>
              </tr>
            ) : (
              fragrances.map((fragrance) => {
              const image = fragrance.images[0];
              return (
                <tr key={fragrance.id} className="border-t border-wf-border">
                  <td className="p-2 pl-3">
                    <Link
                      href={`/admin/fragrances/${fragrance.id}/edit`}
                      className="relative block w-14 h-14 bg-wf-light overflow-hidden border border-wf-border"
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
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] text-wf-gray">
                          No image
                        </span>
                      )}
                    </Link>
                  </td>
                  <td className="p-3">{fragrance.brand.name}</td>
                  <td className="p-3">{fragrance.model}</td>
                  <td className="p-3 text-wf-gray">{fragrance.reference}</td>
                  <td className="p-3 text-wf-gray">{fragrance.category || "-"}</td>
                  <td className="p-3">{formatPrice(fragrance.price)}</td>
                  <td className="p-3">{conditionLabel(fragrance.condition)}</td>
                  <td className="p-3">{fragrance.featured ? "Yes" : "No"}</td>
                  <td className="p-3 space-x-3">
                    <Link
                      href={`/admin/fragrances/${fragrance.id}/edit`}
                      className="text-gold hover:underline"
                    >
                      Edit
                    </Link>
                    <DeleteFragranceButton id={fragrance.id} />
                  </td>
                </tr>
              );
            })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
