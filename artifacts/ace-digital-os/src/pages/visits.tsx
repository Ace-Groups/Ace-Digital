import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { DEFAULT_PIN } from "@/components/visits/MapPinPicker";
import { VisitsView, type VisitDraft } from "@/components/visits/VisitsView";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getListEmployeesQueryKey, useListEmployees } from "@workspace/api-client-react";
import { assignVisit, getVisits, type FieldVisit } from "@/lib/accountability-api";

const ASSIGN_ROLES = new Set(["super_admin", "management", "hr"]);

function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function parsePair(raw: string): { lat: number; lng: number } | null {
  const match = raw.trim().match(/(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  return { lat: Number(match[1]), lng: Number(match[2]) };
}

export default function VisitsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const canAssign = Boolean(user?.role && ASSIGN_ROLES.has(user.role));
  const { data: people } = useListEmployees({}, { query: { queryKey: getListEmployeesQueryKey({}), enabled: canAssign } });
  const [visits, setVisits] = useState<FieldVisit[]>([]);
  const [draft, setDraft] = useState<VisitDraft>({
    clientName: "",
    employeeId: "",
    date: today(),
    windowStart: "10:00",
    windowEnd: "12:00",
    radiusMeters: "200",
    lat: DEFAULT_PIN.lat,
    lng: DEFAULT_PIN.lng,
    paste: "",
  });

  useEffect(() => {
    getVisits(draft.date).then(setVisits).catch(() => setVisits([]));
  }, [draft.date]);

  return (
    <AppLayout title="Visits">
      <VisitsView
        canAssign={canAssign}
        draft={draft}
        employees={(people ?? []).map((person) => ({ id: person.id, fullName: person.fullName }))}
        visits={visits}
        onDraft={setDraft}
        onPaste={() => {
          const pin = parsePair(draft.paste);
          if (!pin) {
            toast({ title: "Could not read those coordinates" });
            return;
          }
          setDraft({ ...draft, lat: pin.lat, lng: pin.lng });
        }}
        onSubmit={() => {
          assignVisit({
            clientName: draft.clientName,
            employeeId: Number(draft.employeeId),
            date: draft.date,
            windowStart: draft.windowStart,
            windowEnd: draft.windowEnd,
            radiusMeters: Number(draft.radiusMeters),
            lat: draft.lat,
            lng: draft.lng,
          })
            .then((visit) => {
              setVisits((current) => [...current, visit]);
              toast({ title: "Visit assigned" });
            })
            .catch((err: Error) => toast({ title: err.message }));
        }}
      />
    </AppLayout>
  );
}
