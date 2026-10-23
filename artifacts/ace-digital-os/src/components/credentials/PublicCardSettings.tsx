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
      <div className="flex min-h-11 items-center justify-between gap-4">
        <div>
          <Label id="public-card-enabled">Enable public card</Label>
          <p className="text-xs text-muted-foreground">
            Show contact actions when someone scans your ID QR.
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} aria-labelledby="public-card-enabled" />
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
        <Label htmlFor="public-card-bio">Tagline</Label>
        <Textarea id="public-card-bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={2} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="public-card-linkedin">LinkedIn</Label>
          <Input id="public-card-linkedin" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/..." />
        </div>
        <div className="space-y-2">
          <Label htmlFor="public-card-portfolio">Portfolio</Label>
          <Input id="public-card-portfolio" value={portfolio} onChange={(e) => setPortfolio(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="public-card-phone">Public phone</Label>
          <Input id="public-card-phone" value={publicPhone} onChange={(e) => setPublicPhone(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="public-card-address">Office address</Label>
          <Input id="public-card-address" value={officeAddress} onChange={(e) => setOfficeAddress(e.target.value)} />
        </div>
      </div>
      <Button className="min-h-11" onClick={() => void save()} disabled={saving}>
        {saving ? "Saving…" : "Save public card"}
      </Button>
    </div>
  );
}
