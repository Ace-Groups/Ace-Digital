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
import { encodeEmployeeIdentityImages } from "@/lib/avatar";
import { defaultMascotForRole } from "@/lib/mascots";
import { getDocumentName, readEmployeeDocument } from "@/lib/employee-documents";
import { ProfilePhotoUpload } from "@/components/employees/ProfilePhotoUpload";
import { FilePickControl } from "@/components/ui/file-pick-control";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Tamil Nadu",
  "Telangana",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
] as const;

const QUALIFICATION_OPTIONS = [
  "High School",
  "Higher Secondary",
  "Diploma",
  "Bachelor's Degree",
  "Master's Degree",
  "Doctorate",
  "Professional Certification",
  "Other",
] as const;

const INITIAL_FORM = {
  fullName: "",
  email: "",
  phone: "",
  dob: "",
  gender: "",
  nationality: "Indian",
  maritalStatus: "",
  profilePhotoUrl: "",
  address: "",
  addressLine2: "",
  city: "",
  state: "",
  zipCode: "",
  country: "India",
  aadhaarNumber: "",
  aadhaarDocument: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  bloodGroup: "",
  highestQualification: "",
  university: "",
  program: "Ace Digital Internship",
  teamId: "",
  startDate: "",
  endDate: "",
  notes: "",
};

type InternOnboardingSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-xl border border-border/70 bg-muted/20 p-4">
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function InternOnboardingSheet({ open, onOpenChange }: InternOnboardingSheetProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: teams } = useListTeams();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);

  function setField<K extends keyof typeof INITIAL_FORM>(key: K, value: (typeof INITIAL_FORM)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setForm(INITIAL_FORM);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fullName.trim() || !form.email.trim()) return;
    setSubmitting(true);
    try {
      const mascotId = defaultMascotForRole("employee").replace("mascot:", "");
      const avatarUrl =
        encodeEmployeeIdentityImages({
          profilePhotoUrl: form.profilePhotoUrl || null,
          mascotId,
        }) ?? defaultMascotForRole("employee");

      const optional = (value: string) => value.trim() || undefined;

      await createInternship({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: optional(form.phone),
        dob: optional(form.dob),
        gender: optional(form.gender),
        nationality: optional(form.nationality),
        maritalStatus: optional(form.maritalStatus),
        avatarUrl,
        address: optional(form.address),
        addressLine2: optional(form.addressLine2),
        city: optional(form.city),
        state: optional(form.state),
        zipCode: optional(form.zipCode),
        country: optional(form.country),
        aadhaarNumber: optional(form.aadhaarNumber),
        aadhaarDocument: form.aadhaarDocument || undefined,
        emergencyContactName: optional(form.emergencyContactName),
        emergencyContactPhone: optional(form.emergencyContactPhone),
        bloodGroup: optional(form.bloodGroup),
        highestQualification: optional(form.highestQualification),
        university: optional(form.university),
        program: optional(form.program),
        teamId: form.teamId ? Number(form.teamId) : undefined,
        startDate: optional(form.startDate),
        endDate: optional(form.endDate),
        notes: optional(form.notes),
        sendWelcomeEmail: true,
      });
      toast({
        title: "Intern onboarded",
        description: "Account, emails, and ID card pipeline completed.",
      });
      void queryClient.invalidateQueries({ queryKey: ["/api/v1/internships"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/v1/employees"] });
      onOpenChange(false);
      resetForm();
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

  const aadhaarFileName = getDocumentName(form.aadhaarDocument);

  return (
    <ResponsiveSheet open={open} onOpenChange={onOpenChange} title="Start intern onboarding">
      <form onSubmit={(e) => void handleSubmit(e)} className="mobile-form space-y-5">
        <p className="text-sm text-muted-foreground">
          Collect intern HR details (photo, Aadhaar, contact, address), then run the full pipeline:
          welcome emails, credentials, and ID card front &amp; back.
        </p>

        <FormSection
          title="Profile photo"
          description="Used on the intern ID card and employee profile. Recommended before launching the pipeline."
        >
          <ProfilePhotoUpload
            value={form.profilePhotoUrl}
            onChange={(url) => setField("profilePhotoUrl", url)}
            label="Intern photo"
            altName={form.fullName || "Intern"}
          />
        </FormSection>

        <FormSection title="Personal details">
          <div className="space-y-2">
            <Label htmlFor="intern-name">Full name</Label>
            <Input
              id="intern-name"
              className="min-h-11"
              value={form.fullName}
              onChange={(e) => setField("fullName", e.target.value)}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="intern-email">Email</Label>
              <Input
                id="intern-email"
                type="email"
                className="min-h-11"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="intern-phone">Phone</Label>
              <Input
                id="intern-phone"
                className="min-h-11"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Date of birth</Label>
              <DatePicker
                value={form.dob}
                onChange={(v) => setField("dob", v)}
                placeholder="Date of birth"
              />
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={(v) => setField("gender", v)}>
                <SelectTrigger className="min-h-11">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="intern-nationality">Nationality</Label>
              <Input
                id="intern-nationality"
                className="min-h-11"
                list="intern-nationality-options"
                value={form.nationality}
                onChange={(e) => setField("nationality", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Marital status</Label>
              <Select value={form.maritalStatus} onValueChange={(v) => setField("maritalStatus", v)}>
                <SelectTrigger className="min-h-11">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="married">Married</SelectItem>
                  <SelectItem value="divorced">Divorced</SelectItem>
                  <SelectItem value="widowed">Widowed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </FormSection>

        <FormSection title="Address">
          <div className="space-y-2">
            <Label htmlFor="intern-address">Address line 1</Label>
            <Input
              id="intern-address"
              className="min-h-11"
              value={form.address}
              onChange={(e) => setField("address", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="intern-address2">Address line 2</Label>
            <Input
              id="intern-address2"
              className="min-h-11"
              value={form.addressLine2}
              onChange={(e) => setField("addressLine2", e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="intern-city">City</Label>
              <Input
                id="intern-city"
                className="min-h-11"
                value={form.city}
                onChange={(e) => setField("city", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Select value={form.state} onValueChange={(v) => setField("state", v)}>
                <SelectTrigger className="min-h-11">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {INDIAN_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="intern-zip">Zip code</Label>
              <Input
                id="intern-zip"
                className="min-h-11"
                inputMode="numeric"
                placeholder="600001"
                value={form.zipCode}
                onChange={(e) => setField("zipCode", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="intern-country">Country</Label>
              <Input
                id="intern-country"
                className="min-h-11"
                list="intern-country-options"
                value={form.country}
                onChange={(e) => setField("country", e.target.value)}
              />
            </div>
          </div>
        </FormSection>

        <FormSection title="Identity documents" description="Aadhaar is stored securely for HR records.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="intern-aadhaar">Aadhaar number</Label>
              <Input
                id="intern-aadhaar"
                className="min-h-11"
                inputMode="numeric"
                placeholder="XXXX XXXX XXXX"
                value={form.aadhaarNumber}
                onChange={(e) => setField("aadhaarNumber", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Aadhaar card copy</Label>
              <FilePickControl
                accept="image/*,.pdf"
                aria-label="Upload Aadhaar card copy"
                className="inline-flex w-full"
                onFile={(file) => {
                  void readEmployeeDocument(file)
                    .then((doc) => setField("aadhaarDocument", doc))
                    .catch((err) => {
                      toast({
                        title: "Could not read Aadhaar file",
                        description: err instanceof Error ? err.message : "Try a smaller file",
                        variant: "destructive",
                      });
                    });
                }}
              >
                <span className={cn(buttonVariants({ variant: "outline" }), "min-h-11 w-full gap-2")}>
                  Choose file
                </span>
              </FilePickControl>
              {aadhaarFileName ? (
                <p className="text-xs text-muted-foreground">Attached: {aadhaarFileName}</p>
              ) : null}
            </div>
          </div>
        </FormSection>

        <FormSection title="Emergency & medical">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="intern-emergency-name">Emergency contact name</Label>
              <Input
                id="intern-emergency-name"
                className="min-h-11"
                value={form.emergencyContactName}
                onChange={(e) => setField("emergencyContactName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="intern-emergency-phone">Emergency contact phone</Label>
              <Input
                id="intern-emergency-phone"
                className="min-h-11"
                inputMode="tel"
                value={form.emergencyContactPhone}
                onChange={(e) => setField("emergencyContactPhone", e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="intern-qualification">Highest qualification</Label>
              <Input
                id="intern-qualification"
                className="min-h-11"
                list="intern-qualification-options"
                placeholder="Bachelor's Degree"
                value={form.highestQualification}
                onChange={(e) => setField("highestQualification", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Blood group</Label>
              <Select value={form.bloodGroup} onValueChange={(v) => setField("bloodGroup", v)}>
                <SelectTrigger className="min-h-11">
                  <SelectValue placeholder="Select blood group" />
                </SelectTrigger>
                <SelectContent>
                  {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((group) => (
                    <SelectItem key={group} value={group}>
                      {group}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </FormSection>

        <FormSection title="Internship details">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="intern-uni">University</Label>
              <Input
                id="intern-uni"
                className="min-h-11"
                value={form.university}
                onChange={(e) => setField("university", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="intern-program">Program</Label>
              <Input
                id="intern-program"
                className="min-h-11"
                value={form.program}
                onChange={(e) => setField("program", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Team</Label>
            <Select value={form.teamId} onValueChange={(v) => setField("teamId", v)}>
              <SelectTrigger className="min-h-11">
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
              <DatePicker
                value={form.startDate}
                onChange={(v) => setField("startDate", v)}
                placeholder="Internship start"
              />
            </div>
            <div className="space-y-2">
              <Label>End date</Label>
              <DatePicker
                value={form.endDate}
                onChange={(v) => setField("endDate", v)}
                placeholder="Internship end"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="intern-notes">Notes for HR</Label>
            <Textarea
              id="intern-notes"
              rows={3}
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
            />
          </div>
        </FormSection>

        <datalist id="intern-country-options">
          {["India", "United Arab Emirates", "United States", "United Kingdom", "Singapore", "Canada"].map(
            (country) => (
              <option key={country} value={country} />
            ),
          )}
        </datalist>
        <datalist id="intern-nationality-options">
          {["Indian", "Emirati", "American", "British", "Singaporean", "Canadian", "Other"].map(
            (nationality) => (
              <option key={nationality} value={nationality} />
            ),
          )}
        </datalist>
        <datalist id="intern-qualification-options">
          {QUALIFICATION_OPTIONS.map((qualification) => (
            <option key={qualification} value={qualification} />
          ))}
        </datalist>

        <Button type="submit" className="w-full gap-2 min-h-11" disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Launch onboarding pipeline
        </Button>
      </form>
    </ResponsiveSheet>
  );
}
