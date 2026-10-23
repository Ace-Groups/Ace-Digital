import { AppLayout } from "@/components/layout/AppLayout";
import { RoleHome } from "@/components/dashboard/RoleHome";

export default function DashboardPage() {
  return (
    <AppLayout title="Home">
      <RoleHome />
    </AppLayout>
  );
}
