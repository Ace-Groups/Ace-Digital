import { Link } from "wouter";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import aceLogo from "@/assets/ace-logo.png";

export default function PrivacyPage() {
  return (
    <div className="relative flex min-h-dvh w-full items-center justify-center overflow-y-auto v2-ambient-bg px-4 py-12 sm:px-6 lg:px-8">
      {/* Background Grids & Ambient Glows */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.25]"
        aria-hidden
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--border) / 0.45) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border) / 0.45) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 80% 70% at 50% 40%, black, transparent)",
        }}
      />
      <div
        className="pointer-events-none absolute left-1/3 top-1/4 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-1/3 bottom-1/4 h-96 w-96 rounded-full bg-primary/10 blur-[120px]"
        aria-hidden
      />

      <div className="relative z-10 w-full max-w-4xl my-8">
        <div className="rounded-3xl border border-border/40 bg-card/75 p-6 shadow-v2-2xl backdrop-blur-xl sm:p-10 sm:rounded-[32px] overflow-hidden">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/40 pb-6 mb-8 gap-4">
            <div className="flex items-center gap-3">
              <img src={aceLogo} alt="Ace Digital" className="h-9 w-auto opacity-95" />
              <div className="h-6 w-px bg-border/50 hidden sm:block" />
              <div className="flex items-center gap-2 text-cyan-400 font-semibold tracking-wide uppercase text-xs">
                <Shield size={14} className="text-cyan-400" />
                Employee Privacy Policy
              </div>
            </div>
            <Button variant="ghost" asChild className="self-start gap-2 text-xs border border-border/40 bg-background/30 backdrop-blur-md">
              <Link href="/login">
                <ArrowLeft size={14} />
                Back to Login
              </Link>
            </Button>
          </div>

          {/* Policy Text Container */}
          <div className="prose prose-invert max-w-none text-muted-foreground text-sm leading-relaxed space-y-6 max-h-[60vh] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-border/60 scrollbar-track-transparent">
            <h1 className="text-3xl font-bold text-foreground tracking-tight border-b border-border/20 pb-2">
              Ace Digital Internal OS Privacy Policy
            </h1>
            <p className="text-xs text-cyan-400/80 font-medium uppercase tracking-wider">
              Last Updated: June 19, 2026 | Effective Date: June 19, 2026
            </p>
            <p>
              This Employee Privacy Policy ("Policy") governs the processing of personal data collected, stored, and managed through the Ace Digital Operating System ("OS", "System", "Application"), which includes our desktop web portal and companion mobile applications. This System is an internal company tool designed exclusively for authorized employees, contractors, administrators, and executives of Ace Digital ("Ace Digital", "Company", "We", "Our", "Us").
            </p>
            <p className="font-semibold text-foreground">
              PLEASE READ THIS PRIVACY POLICY CAREFULLY. THIS APP IS NOT INTENDED FOR PUBLIC USE. ACCESS IS RESTRICTED TO CURRENT ACTIVE EMPLOYEES OF ACE DIGITAL. SELF-REGISTERED ACCOUNTS ARE PROHIBITED, AND SYSTEM LOGINS ARE PROVISIONED STRICTLY BY THE HUMAN RESOURCES (HR) DEPARTMENT.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8 border-b border-border/10 pb-1">
              1. Scope and Applicability
            </h2>
            <p>
              This Policy outlines the Company's standards, rights, and protocols regarding the handling of your professional and personal information as an employee of Ace Digital. By utilizing this System on corporate or personal devices, you acknowledge the terms of this Policy. Because the Operating System serves as the primary gateway for corporate communication, project management, payroll administration, task allocation, and support ticket management, using this application is an essential part of your employment. Consequently, data processing described herein is performed under the legal grounds of employment contract fulfillment, statutory labor requirements, and the legitimate business interests of the Company.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8 border-b border-border/10 pb-1">
              2. Information We Collect
            </h2>
            <p>
              To maintain standard operations, ensure corporate security, and facilitate collaboration, the System processes several categories of data:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong className="text-foreground">Corporate Profile & Identity Data:</strong> Full name, professional title, department, assigned team, unique employee code, corporate email address, and profile photo/avatar.
              </li>
              <li>
                <strong className="text-foreground">Authentication & Session Credentials:</strong> Cryptographic password hashes, session tokens, multi-factor verification statuses (such as OTP records), and secure device tokens.
              </li>
              <li>
                <strong className="text-foreground">Financial & Payroll Information:</strong> Bank account numbers, IFSC codes, PAN details, salary structures, payroll histories, bonus records, tax calculations, and payslip documents generated by the HR system.
              </li>
              <li>
                <strong className="text-foreground">Statutory Verification Documents:</strong> In some jurisdictions, scanned copies of government identification (such as Aadhaar or equivalent residency documents) are stored securely to fulfill statutory audit and onboarding requirements.
              </li>
              <li>
                <strong className="text-foreground">Operational & Collaboration Data:</strong> Chat messages exchanged within internal channels and direct messaging, file attachments, task status updates, project boards, calendar items, poll responses, and approval requests.
              </li>
              <li>
                <strong className="text-foreground">System logs & Device Telemetry:</strong> Action audit trails (creation, modification, or deletion of files, records, or messages), IP addresses, device operating system type, screen sizes, browser user-agents, push notification tokens, and timestamps of system events.
              </li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground mt-8 border-b border-border/10 pb-1">
              3. Processing Purposes and System Operation
            </h2>
            <p>
              We process the collected data for specific, delimited corporate purposes, which are directly aligned with daily operations and regulatory requirements:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong className="text-foreground">Payroll & Employee Benefits:</strong> Accessing bank and profile structures to compute and disburse salaries, log bonus allocations, calculate tax withholdings, and deliver payslips.
              </li>
              <li>
                <strong className="text-foreground">Resource Allocation & Task Management:</strong> Facilitating project assignments, tracking milestones, assessing performance metrics, and managing collaborative workspaces.
              </li>
              <li>
                <strong className="text-foreground">Corporate Communications:</strong> Operating realtime chat servers, channel distributions, and document collaboration tools so employees can collaborate dynamically.
              </li>
              <li>
                <strong className="text-foreground">Corporate Support & Service Desk:</strong> Managing employee support tickets, IT requests, and administrative approvals.
              </li>
              <li>
                <strong className="text-foreground">Audit & Regulatory Compliance:</strong> Maintaining chronological records of approvals, expense submissions, and document signings to fulfill tax and employment regulations.
              </li>
              <li>
                <strong className="text-foreground">System Defense and Security:</strong> Detecting, preventing, and auditing security violations, unauthorized access, malware propagation, data leaks, and intellectual property theft.
              </li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground mt-8 border-b border-border/10 pb-1">
              4. Data Sharing and Third-Party Transfer
            </h2>
            <p>
              Ace Digital enforces a strict policy against selling, renting, or trading employee data. Personal data processed in this Operating System is shared only with select entities:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong className="text-foreground">Cloud Service Providers:</strong> Google Cloud Platform (GCP) for Firestore, Realtime Database, Cloud Functions, and Firebase Storage hosting, under strict institutional data processing agreements.
              </li>
              <li>
                <strong className="text-foreground">Transactional Service Operators:</strong> System service operators like Resend or Twilio for system notification emails, password reset alerts, and multi-factor authentication messages.
              </li>
              <li>
                <strong className="text-foreground">Regulatory Authorities:</strong> Government agencies, statutory bodies, tax departments, or law enforcement only when strictly required by local labor laws or valid court directives.
              </li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground mt-8 border-b border-border/10 pb-1">
              5. Data Retention and Archiving Policies
            </h2>
            <p>
              Because this is an enterprise system representing official corporate records, data is retained in accordance with legal requirements:
            </p>
            <p>
              Official records—including payroll runs, tax allocations, attendance sheets, task histories, and corporate emails—are retained for the duration of the employee's relationship and archived for up to <strong className="text-foreground">seven (7) years</strong> following the termination of employment. This retention period satisfies local statutory requirements for employment history verification, accounting audits, and regulatory compliance.
            </p>
            <p>
              Transient files, chat attachments, and operational notification logs may be subject to automated cleanup protocols that purge files older than twelve (12) months, provided they do not represent official records required for business persistence.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8 border-b border-border/10 pb-1">
              6. Data Security and Storage Infrastructure
            </h2>
            <p>
              Ace Digital employs modern security architectures to protect sensitive data. Access control is regulated using Role-Based Access Control (RBAC) levels (Admin, Employee, Intern, Client, and Super Admin) that strictly partition database collections.
            </p>
            <p>
              All traffic between endpoints and servers is encrypted in transit using Transport Layer Security (TLS 1.3). Sensitive credentials and push notification tokens on mobile are stored using device-level hardware keychains through Expo SecureStore (iOS Keychain and Android Keystore). Backup archives are encrypted at rest using AES-256 standards, and database rules are regularly audited to prevent external traversal of employee data.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8 border-b border-border/10 pb-1">
              7. Employee Rights and Self-Service Account Deletion
            </h2>
            <p>
              Active employees have the right to request access to their professional file, rectify incorrect phone numbers or bank details, and verify profile photo metadata. Rectification can be performed directly through the profile editing fields or by escalating requests to HR.
            </p>
            <p>
              In compliance with global privacy regulations and mobile App Store guidelines, our companion mobile application features a <strong className="text-foreground">Delete Account</strong> option under Settings.
            </p>
            <p>
              When an employee triggers this action, the System executes a secure de-identification process:
            </p>
            <ol className="list-decimal pl-6 space-y-2">
              <li>
                The user's authentication credentials (password hashes, secure sessions, and device push tokens) are permanently destroyed, blocking any future access.
              </li>
              <li>
                Sensitive PII—such as email addresses, bank accounts, profile pictures, Aadhaar, and phone numbers—is permanently purged from active tables.
              </li>
              <li>
                Operational message histories, comments, and task modifications are preserved to prevent breaking collaborative databases, but they are dynamically de-identified (linked to a randomized string placeholder, e.g., "Deleted User").
              </li>
              <li>
                A secure, separate archive containing basic details (e.g., historical payroll data and employment duration) is moved to our encrypted archiving tables to fulfill the legally mandated 7-year statutory retention obligations.
              </li>
            </ol>

            <h2 className="text-xl font-semibold text-foreground mt-8 border-b border-border/10 pb-1">
              8. Updates to this Policy
            </h2>
            <p>
              We reserve the right to modify this Policy as the Operating System adds features or as employment laws evolve. Any changes will be posted directly within the Operating System portal, and continuation of system usage following an update constitutes acknowledgment of the revised policy.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8 border-b border-border/10 pb-1">
              9. Contact and Escalation
            </h2>
            <p>
              For questions regarding this Policy, data access requests, or issues with self-service profile updates, please contact the IT Administrator or the HR Department directly at:
              <br />
              <strong className="text-foreground">Email:</strong> admin@acedigital.cc
              <br />
              <strong className="text-foreground">Address:</strong> Ace Digital Corporate Offices, Security & Compliance Division.
            </p>
          </div>

          {/* Footer branding */}
          <div className="mt-8 pt-6 border-t border-border/40 text-center text-xs text-muted-foreground/60">
            &copy; 2026 Ace Digital. All rights reserved. This document is confidential and intended solely for internal employees.
          </div>
        </div>
      </div>
    </div>
  );
}
