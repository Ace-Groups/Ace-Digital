import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { updateEmployeeVerifyProfile } from "@/lib/credentials-api";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

type VerifyUserFields = {
  verifySlug?: string | null;
  publicProfileEnabled?: boolean;
  publicBio?: string | null;
  linkedinUrl?: string | null;
  portfolioUrl?: string | null;
  publicPhone?: string | null;
  officeAddress?: string | null;
};

export function PublicCardSettings() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const u = user as (typeof user & VerifyUserFields) | null;
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(u?.publicProfileEnabled ?? false);
  const [bio, setBio] = useState(u?.publicBio ?? "");
  const [linkedin, setLinkedin] = useState(u?.linkedinUrl ?? "");
  const [portfolio, setPortfolio] = useState(u?.portfolioUrl ?? "");
  const [publicPhone, setPublicPhone] = useState(u?.publicPhone ?? "");
  const [officeAddress, setOfficeAddress] = useState(u?.officeAddress ?? "");

  if (!user) return null;

  async function save() {
    setSaving(true);
    try {
      await updateEmployeeVerifyProfile(user!.id, {
        publicProfileEnabled: enabled,
        publicBio: bio || null,
        linkedinUrl: linkedin || null,
        portfolioUrl: portfolio || null,
        publicPhone: publicPhone || null,
        officeAddress: officeAddress || null,
      });
      await refreshUser();
      toast({ title: "Public card updated" });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const verifyPath = u?.verifySlug ? `/v/${u.verifySlug}` : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label>Enable Nexme public card</Label>
          <p className="text-xs text-muted-foreground">
            Show contact actions when someone scans your ID QR (active employees only).
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>
      {verifyPath && (
        <p className="text-xs">
          Preview:{" "}
          <Link href={verifyPath} className="text-primary hover:underline">
            {verifyPath}
          </Link>
        </p>
      )}
      <div className="space-y-2">
        <Label>Tagline</Label>
        <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={2} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>LinkedIn</Label>
          <Input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/..." />
        </div>
        <div className="space-y-2">
          <Label>Portfolio</Label>
          <Input value={portfolio} onChange={(e) => setPortfolio(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Public phone</Label>
          <Input value={publicPhone} onChange={(e) => setPublicPhone(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Office address</Label>
          <Input value={officeAddress} onChange={(e) => setOfficeAddress(e.target.value)} />
        </div>
      </div>
      <Button onClick={() => void save()} disabled={saving}>
        {saving ? "Saving…" : "Save public card"}
      </Button>
    </div>
  );
}
