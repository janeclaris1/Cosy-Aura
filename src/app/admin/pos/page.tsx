import { requireAdminPage } from "@/lib/admin";
import { PosTerminal } from "@/components/admin/PosTerminal";

export default async function AdminPosPage() {
  await requireAdminPage("pos.read");
  return <PosTerminal />;
}
