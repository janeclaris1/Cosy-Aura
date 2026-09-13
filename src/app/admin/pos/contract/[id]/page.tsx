import { redirect } from "next/navigation";

/** Legacy POS contract URL — contracts live under Legal. */
export default function LegacyPosContractRedirect({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/admin/legal/credit-contracts/${params.id}`);
}
