import { AppLayout } from "@/components/layout/AppLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { DashboardMobile } from "@/components/dashboard/DashboardMobile";
import { DashboardDesktop } from "@/components/dashboard/DashboardDesktop";

export default function DashboardPage() {
  const isMobile = useIsMobile();

  return (
    <AppLayout title="Dashboard">
      {isMobile ? <DashboardMobile /> : <DashboardDesktop />}
    </AppLayout>
  );
}
