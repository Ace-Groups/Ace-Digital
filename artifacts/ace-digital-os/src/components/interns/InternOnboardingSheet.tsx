import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListTeams } from "@workspace/api-client-react";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Loader2, Sparkles } from "lucide-react";
import { createInternship } from "@/lib/internships-api";
import { useToast } from "@/hooks/use-toast";

type InternOnboardingSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function InternOnboardingSheet({ open, onOpenChange }: InternOnboardingSheetProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: teams } = useListTeams();
  const [submitting, setSubmitting] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [university, setUniversity] = useState("");
  const [program, setProgram] = useState("Ace Digital Internship");
  const [teamId, setTeamId] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) return;
    setSubmitting(true);
    try {
      await createInternship({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        university: university.trim() || undefined,
        program: program.trim() || undefined,
        teamId: teamId ? Number(teamId) : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        notes: notes.trim() || undefined,
        sendWelcomeEmail: true,
      });
      toast({
        title: "Intern onboarded",
        description: "Account, emails, and ID card pipeline completed.",
      });
      void queryClient.invalidateQueries({ queryKey: ["/api/v1/internships"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/v1/employees"] });
      onOpenChange(false);
      setFullName("");
      setEmail("");
      setPhone("");
      setUniversity("");
      setNotes("");
    } catch (err) {
      toast({
        title: "Onboarding failed",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ResponsiveSheet open={open} onOpenChange={onOpenChange} title="Start intern onboarding">
      <form onSubmit={(e) => void handleSubmit(e)} className="mobile-form space-y-4">
        <p className="text-sm text-muted-foreground">
          Creates the intern account, runs the full pipeline (welcome emails, credentials, ID card
          front &amp; back), and emails everything automatically.
        </p>

        <div className="space-y-2">
          <Label htmlFor="intern-name">Full name</Label>
          <Input id="intern-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="intern-email">Email</Label>
            <Input id="intern-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="intern-phone">Phone</Label>
            <Input id="intern-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="intern-uni">University</Label>
            <Input id="intern-uni" value={university} onChange={(e) => setUniversity(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="intern-program">Program</Label>
            <Input id="intern-program" value={program} onChange={(e) => setProgram(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Team</Label>
          <Select value={teamId} onValueChange={setTeamId}>
            <SelectTrigger>
              <SelectValue placeholder="Assign team" />
            </SelectTrigger>
            <SelectContent>
              {teams?.map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Start date</Label>
            <DatePicker value={startDate} onChange={setStartDate} placeholder="Internship start" />
          </div>
          <div className="space-y-2">
            <Label>End date</Label>
            <DatePicker value={endDate} onChange={setEndDate} placeholder="Internship end" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="intern-notes">Notes for HR</Label>
          <Textarea id="intern-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <Button type="submit" className="w-full gap-2" disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Launch onboarding pipeline
        </Button>
      </form>
    </ResponsiveSheet>
  );
}
