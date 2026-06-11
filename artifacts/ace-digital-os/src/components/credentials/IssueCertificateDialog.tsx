import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Award } from "lucide-react";
import { listSignatories, issueInternshipCertificate } from "@/lib/credentials-api";
import { useToast } from "@/hooks/use-toast";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  internshipId: number;
  internName: string;
  onIssued?: () => void;
};

export function IssueCertificateDialog({
  open,
  onOpenChange,
  internshipId,
  internName,
  onIssued,
}: Props) {
  const { toast } = useToast();
  const [issuerId, setIssuerId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const signatoriesQuery = useQuery({
    queryKey: ["/api/v1/credentials/signatories"],
    queryFn: listSignatories,
    enabled: open,
  });

  const enabled = signatoriesQuery.data?.filter((s) => s.profile?.enabled) ?? [];

  async function handleIssue() {
    if (!issuerId) return;
    setLoading(true);
    try {
      const result = await issueInternshipCertificate(internshipId, Number(issuerId));
      toast({
        title: "Certificate issued",
        description: result.emailed ? "Emailed to intern" : "Email could not be sent",
      });
      onIssued?.();
      onOpenChange(false);
    } catch (e) {
      toast({
        title: "Issue failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Issue internship certificate
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Issue and email official certificate for <strong>{internName}</strong>.
        </p>
        <div className="space-y-2">
          <Label>Authorized issuer</Label>
          <Select value={issuerId} onValueChange={setIssuerId}>
            <SelectTrigger>
              <SelectValue placeholder="Select signatory" />
            </SelectTrigger>
            <SelectContent>
              {enabled.map((s) => (
                <SelectItem key={s.userId} value={String(s.userId)}>
                  {s.fullName} — {s.profile?.documentDesignation || s.jobTitle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!issuerId || loading} onClick={() => void handleIssue()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Issue & Email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
