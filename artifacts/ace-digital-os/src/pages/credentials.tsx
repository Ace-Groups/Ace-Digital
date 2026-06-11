import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { CanvasPanel, PageCanvasShell } from "@/components/canvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissions } from "@/hooks/use-permissions";
import { useToast } from "@/hooks/use-toast";
import {
  getMySignatoryProfile,
  updateMySignatoryProfile,
  listSignatories,
  updateSignatory,
  getOrgCredentials,
  updateOrgCredentials,
  listCertificateLedger,
  revokeCertificate,
  listKioskDevices,
  createKioskDevice,
} from "@/lib/credentials-api";
import { ShieldCheck, PenLine, Building2, Monitor } from "lucide-react";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function CredentialsPage() {
  const { can } = usePermissions();
  const { toast } = useToast();
  const qc = useQueryClient();
  const canManage = can("credentials:manage");
  const canSign = can("credentials:sign_self");
  const canIssue = can("certificates:issue");
  const canKiosk = can("verify:manage_kiosk");

  const myQuery = useQuery({
    queryKey: ["/api/v1/credentials/signatory/me"],
    queryFn: getMySignatoryProfile,
    enabled: canSign,
  });

  const signatoriesQuery = useQuery({
    queryKey: ["/api/v1/credentials/signatories"],
    queryFn: listSignatories,
    enabled: canManage,
  });

  const orgQuery = useQuery({
    queryKey: ["/api/v1/credentials/org"],
    queryFn: getOrgCredentials,
    enabled: canManage,
  });

  const ledgerQuery = useQuery({
    queryKey: ["/api/v1/credentials/certificates"],
    queryFn: listCertificateLedger,
    enabled: canIssue,
  });

  const kioskQuery = useQuery({
    queryKey: ["/api/v1/credentials/kiosk-devices"],
    queryFn: listKioskDevices,
    enabled: canKiosk,
  });

  const [designation, setDesignation] = useState("");
  const [signature, setSignature] = useState<string | null>(null);

  const saveMine = useMutation({
    mutationFn: () =>
      updateMySignatoryProfile({
        documentDesignation: designation || myQuery.data?.jobTitle || "",
        signatureDataUrl: signature,
      }),
    onSuccess: () => {
      toast({ title: "Signing profile saved" });
      void qc.invalidateQueries({ queryKey: ["/api/v1/credentials/signatory/me"] });
    },
  });

  const saveOrg = useMutation({
    mutationFn: (body: Record<string, unknown>) => updateOrgCredentials(body),
    onSuccess: () => {
      toast({ title: "Organization assets saved" });
      void qc.invalidateQueries({ queryKey: ["/api/v1/credentials/org"] });
    },
  });

  const defaultTab = canSign ? "signing" : canManage ? "org" : "ledger";

  return (
    <AppLayout title="">
      <PageCanvasShell
        title="Credential Studio"
        description="Manage e-signatures, org seal, verification settings, and certificate issuance."
        metrics={[
          {
            key: "studio",
            label: "Ace Verify",
            value: "Live",
            icon: ShieldCheck,
            iconBg: "bg-primary/10",
            iconColor: "text-primary",
          },
        ]}
      >
        <CanvasPanel>
          <Tabs defaultValue={defaultTab}>
            <TabsList className="mb-6 flex flex-wrap h-auto gap-1">
              {canSign && <TabsTrigger value="signing">My Signing Profile</TabsTrigger>}
              {canManage && <TabsTrigger value="signatories">Signatories</TabsTrigger>}
              {canManage && <TabsTrigger value="org">Organization Assets</TabsTrigger>}
              {canIssue && <TabsTrigger value="ledger">Issuance Ledger</TabsTrigger>}
              {canKiosk && <TabsTrigger value="kiosk">Kiosk Devices</TabsTrigger>}
            </TabsList>

            {canSign && (
              <TabsContent value="signing" className="space-y-4 max-w-lg">
                <p className="text-sm text-muted-foreground">
                  Your e-signature appears on ID cards and internship certificates when you are selected as issuer.
                </p>
                <div className="space-y-2">
                  <Label>Document designation</Label>
                  <Input
                    placeholder={myQuery.data?.jobTitle ?? "Director, HR"}
                    defaultValue={myQuery.data?.profile.documentDesignation}
                    onChange={(e) => setDesignation(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-signature (PNG)</Label>
                  <Input
                    type="file"
                    accept="image/png,image/webp"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void fileToDataUrl(f).then(setSignature);
                    }}
                  />
                  {(signature ?? myQuery.data?.profile.signatureDataUrl) && (
                    <img
                      src={signature ?? myQuery.data?.profile.signatureDataUrl ?? ""}
                      alt="Signature"
                      className="h-16 object-contain border rounded-md p-2 bg-white"
                    />
                  )}
                </div>
                <Button onClick={() => saveMine.mutate()} disabled={saveMine.isPending}>
                  <PenLine className="h-4 w-4 mr-2" />
                  Save signing profile
                </Button>
              </TabsContent>
            )}

            {canManage && (
              <TabsContent value="signatories">
                <div className="space-y-3">
                  {signatoriesQuery.data?.map((s) => (
                    <div
                      key={s.userId}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
                    >
                      <div>
                        <p className="font-semibold">{s.fullName}</p>
                        <p className="text-sm text-muted-foreground">{s.jobTitle} · {s.role}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={s.profile?.enabled ?? false}
                          onCheckedChange={(enabled) => {
                            void updateSignatory(s.userId, { enabled }).then(() =>
                              signatoriesQuery.refetch(),
                            );
                          }}
                        />
                        {s.profile?.signatureDataUrl ? (
                          <img src={s.profile.signatureDataUrl} alt="" className="h-8 object-contain" />
                        ) : (
                          <span className="text-xs text-amber-600">No signature</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            )}

            {canManage && orgQuery.data && (
              <TabsContent value="org" className="space-y-4 max-w-xl">
                <div className="space-y-2">
                  <Label>Company legal name</Label>
                  <Input
                    defaultValue={orgQuery.data.companyLegalName}
                    onBlur={(e) => saveOrg.mutate({ companyLegalName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Verify base URL</Label>
                  <Input
                    defaultValue={orgQuery.data.verifyBaseUrl}
                    onBlur={(e) => saveOrg.mutate({ verifyBaseUrl: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Inactive card message</Label>
                  <Textarea
                    defaultValue={orgQuery.data.verifyInactiveMessage}
                    onBlur={(e) => saveOrg.mutate({ verifyInactiveMessage: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company seal (PNG)</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        void fileToDataUrl(f).then((url) =>
                          saveOrg.mutate({ companySealDataUrl: url }),
                        );
                      }
                    }}
                  />
                  {orgQuery.data.companySealDataUrl && (
                    <img src={orgQuery.data.companySealDataUrl} alt="Seal" className="h-20 w-20 object-contain" />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Default ID card signatory (user ID)</Label>
                  <Input
                    type="number"
                    defaultValue={orgQuery.data.defaultIdCardSignatoryUserId ?? ""}
                    onBlur={(e) =>
                      saveOrg.mutate({
                        defaultIdCardSignatoryUserId: e.target.value
                          ? Number(e.target.value)
                          : null,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Default certificate issuer (user ID)</Label>
                  <Input
                    type="number"
                    defaultValue={orgQuery.data.defaultCertificateSignatoryUserId ?? ""}
                    onBlur={(e) =>
                      saveOrg.mutate({
                        defaultCertificateSignatoryUserId: e.target.value
                          ? Number(e.target.value)
                          : null,
                      })
                    }
                  />
                </div>
                <Button variant="outline" onClick={() => saveOrg.mutate(orgQuery.data!)}>
                  <Building2 className="h-4 w-4 mr-2" />
                  Save all org settings
                </Button>
              </TabsContent>
            )}

            {canIssue && (
              <TabsContent value="ledger">
                <div className="space-y-2">
                  {ledgerQuery.data?.map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-xl border p-4">
                      <div>
                        <p className="font-mono text-sm text-primary">{c.certificateCode}</p>
                        <p className="text-xs text-muted-foreground">
                          Issued {new Date(c.issuedAt).toLocaleDateString()} · {c.status}
                        </p>
                      </div>
                      {c.status === "active" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            void revokeCertificate(c.id, "Revoked via Credential Studio").then(() =>
                              ledgerQuery.refetch(),
                            )
                          }
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  ))}
                  {!ledgerQuery.data?.length && (
                    <p className="text-sm text-muted-foreground">No certificates issued yet.</p>
                  )}
                </div>
              </TabsContent>
            )}

            {canKiosk && (
              <TabsContent value="kiosk" className="space-y-4">
                <Button
                  onClick={() =>
                    void createKioskDevice({
                      name: `Kiosk ${(kioskQuery.data?.length ?? 0) + 1}`,
                    }).then(() => kioskQuery.refetch())
                  }
                >
                  <Monitor className="h-4 w-4 mr-2" />
                  Add kiosk device
                </Button>
                {kioskQuery.data?.map((d) => (
                  <div key={d.id} className="rounded-xl border p-4 space-y-2">
                    <p className="font-semibold">{d.name}</p>
                    <p className="text-xs font-mono break-all">Token: {d.deviceToken}</p>
                    <p className="text-xs text-muted-foreground">
                      Append ?kiosk=TOKEN to verify URL on wall tablets
                    </p>
                  </div>
                ))}
              </TabsContent>
            )}
          </Tabs>
        </CanvasPanel>
      </PageCanvasShell>
    </AppLayout>
  );
}
