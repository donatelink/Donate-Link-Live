import { useRouter } from "next/router";
import NgoDashboard from "@/pages/ngo/dashboard";

// Admin-only, read-only view of one NGO's full dashboard.
// NgoDashboard checks the signed-in user is an admin before loading anything.
export default function AdminNgoView() {
  const router = useRouter();
  const { id } = router.query;
  if (!router.isReady || typeof id !== "string") return null;
  return <NgoDashboard key={id} adminNgoId={id} />;
}
