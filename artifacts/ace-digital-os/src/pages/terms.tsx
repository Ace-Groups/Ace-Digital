import { Link } from "wouter";
import { ArrowLeft, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import aceLogo from "@/assets/ace-logo.png";

export default function TermsPage() {
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
                <Scale size={14} className="text-cyan-400" />
                Terms of Use & Conditions
              </div>
            </div>
            <Button variant="ghost" asChild className="self-start gap-2 text-xs border border-border/40 bg-background/30 backdrop-blur-md">
              <Link href="/login">
                <ArrowLeft size={14} />
                Back to Login
              </Link>
            </Button>
          </div>

          {/* Terms Text Container */}
          <div className="prose prose-invert max-w-none text-muted-foreground text-sm leading-relaxed space-y-6 max-h-[60vh] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-border/60 scrollbar-track-transparent">
            <h1 className="text-3xl font-bold text-foreground tracking-tight border-b border-border/20 pb-2">
              Ace Digital Operating System Terms of Use
            </h1>
            <p className="text-xs text-cyan-400/80 font-medium uppercase tracking-wider">
              Last Updated: June 19, 2026 | Effective Date: June 19, 2026
            </p>
            <p>
              These Terms of Use ("Terms", "Agreement") constitute a legally binding agreement between Ace Digital ("Ace Digital", "Company", "We", "Our", "Us") and you, as an authorized employee, independent contractor, or provisioned user ("Employee", "User", "You"). This Agreement governs your access to and use of the Ace Digital Operating System ("OS", "System", "Application"), including all databases, collaboration boards, chat channels, payroll hubs, client portals, and administrative utilities accessible via desktop and mobile.
            </p>
            <p className="font-semibold text-foreground">
              ATTENTION: ACCESS TO THIS APPLICATION IS RESTRICTED STRICTLY TO CURRENT EMPLOYEES OF ACE DIGITAL. UNAUTHORIZED LOGINS, ACCESS ATTEMPTS, OR BRUTE-FORCE PENETRATIONS ARE CLASSIFIED AS SECURITY VIOLATIONS. BY ACCESSING THIS SYSTEM, YOU AGREE TO COMPLY WITH ALL INTERNAL POLICIES, CONFIDENTIALITY AGREEMENTS, AND LABOR RULES OF THE COMPANY.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8 border-b border-border/10 pb-1">
              1. Provisioning of Accounts and Credential Security
            </h2>
            <p>
              Your system user account is provisioned directly by the Human Resources (HR) department in collaboration with the IT Administration division. Self-registration is disabled.
            </p>
            <p>
              You are entirely responsible for maintaining the confidentiality of your login credentials (username, password, and multi-factor authentication codes). You agree:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Not to disclose your credentials to any third party, including family members, colleagues, or administrative assistants.</li>
              <li>Not to allow any other individual to access the System using your credentials.</li>
              <li>To immediately notify the IT Security team at admin@acedigital.cc if you suspect that your login credentials have been compromised or that unauthorized access has occurred.</li>
              <li>To perform a mandatory password change upon your first system login to guarantee credential isolation.</li>
            </ul>
            <p>
              Ace Digital utilizes hardware encryption keys on mobile devices via SecureStore. Modifying, jailbreaking, or rooting your device in a manner that compromises these cryptographic enclaves is a violation of this Agreement.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8 border-b border-border/10 pb-1">
              2. Acceptable Use and Corporate Confidentiality
            </h2>
            <p>
              The System contains proprietary commercial data, employee records, financial plans, client lists, and strategic notes. As an employee, you are bound by the following acceptable use rules:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong className="text-foreground">Exclusive Professional Focus:</strong> Use the System solely for tasks related to your assigned role, project completion, HR inquiries, and official company communications. Non-business usage, commercial solicitations, and personal data storage are prohibited.
              </li>
              <li>
                <strong className="text-foreground">Strict Information Confidentiality:</strong> You are strictly prohibited from exporting, sharing, copying, screenshotting, or disseminating any internal chat messages, project deliverables, financial audits, client details, employee profiles, or document structures to external parties. All such communications are protected as Corporate Trade Secrets.
              </li>
              <li>
                <strong className="text-foreground">Prohibition of Harassment and Misconduct:</strong> All communication within the System's chat channels and direct messages must adhere to the Ace Digital Code of Conduct. Harassment, discrimination, abusive language, or sharing of non-professional or graphic media is grounds for immediate disciplinary action, up to and including termination of employment.
              </li>
              <li>
                <strong className="text-foreground">System Integrity:</strong> You must not upload, transmit, or introduce malware, spyware, unauthorized scripts, or security audit tools into the System. Any attempt to modify system components, bypass API endpoints, or traverse database directories beyond your assigned Role-Based Access Control (RBAC) levels is strictly prohibited.
              </li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground mt-8 border-b border-border/10 pb-1">
              3. System Auditing and Monitoring Notice
            </h2>
            <p>
              To maintain system performance, satisfy regulatory audits, and prevent corporate data leaks, Ace Digital reserves the right to log, audit, and monitor all activities conducted within this System:
            </p>
            <p>
              <strong className="text-foreground">EMPLOYEES HAVE NO EXPECTATION OF PRIVACY REGARDING DATA UPLOADED, SENT, OR CONDUCTED WITHIN THIS SYSTEM.</strong>
            </p>
            <p>
              This includes, but is not limited to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>All chat messages, attachments, reactions, and RSVP logs.</li>
              <li>Chronological logs of logins, API requests, updates to employee profiles, expense submissions, and approval clicks.</li>
              <li>Device identifiers, browser configurations, IP address routing, and access location details.</li>
            </ul>
            <p>
              Auditing trails are archived securely and may be referenced by HR, IT Security, and Executive Management during standard compliance evaluations, incident responses, or internal investigations.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8 border-b border-border/10 pb-1">
              4. Intellectual Property and Work Ownership
            </h2>
            <p>
              All assets, codebases, graphics, workflows, databases, documentation, and materials developed, modified, or updated through this System are the sole and exclusive intellectual property of Ace Digital.
            </p>
            <p>
              Additionally, any work product generated by you during your employment—including project boards, task checklists, administrative forms, and collaborative notes—is classified as "Work for Hire" under applicable intellectual property regulations and remains the property of the Company. You are granted a limited, non-exclusive, non-transferable, and revocable license to access these materials strictly to perform your daily job duties.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8 border-b border-border/10 pb-1">
              5. Account Termination and Deactivation Protocols
            </h2>
            <p>
              Your access to the System is tied directly to your active employment status at Ace Digital:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Upon resignation, termination, contract expiry, or suspension of your employment, your system credentials will be immediately deactivated by HR.
              </li>
              <li>
                We reserve the right to suspend or block access to the System at any time, without prior notice, if a security breach, data leak, or policy violation is detected or suspected on your account.
              </li>
              <li>
                In the event that you utilize the self-service "Delete Account" button in the mobile app, your credentials will be deactivated, and your personal data will be purged/de-identified in accordance with our Privacy Policy. However, historical messages, task updates, and operational logs will remain part of the corporate archive to preserve collaboration histories.
              </li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground mt-8 border-b border-border/10 pb-1">
              6. Limitation of Liability and System Availability Disclaimer
            </h2>
            <p>
              The Operating System is provided on an "as is" and "as available" basis for internal operational purposes. While we strive to maintain high system availability and fix performance issues (such as optimizing database queries to reduce loading delays), the Company:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Does not warrant that the System will run completely error-free or experience 100% uninterrupted uptime.</li>
              <li>Is not liable for operational delays, lost task logs, or communication interruptions caused by network connectivity issues, server maintenance, or third-party service failures.</li>
              <li>Is not liable for data loss on personal devices resulting from system crashes or incorrect local storage syncing.</li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground mt-8 border-b border-border/10 pb-1">
              7. Governing Law and Dispute Resolution
            </h2>
            <p>
              This Agreement and any disputes arising out of your use of the System shall be governed by, and construed in accordance with, the employment laws and corporate regulations of the jurisdiction in which Ace Digital's primary corporate entity is registered. Any issues, disputes, or complaints regarding system access or policies should first be raised with the HR compliance department or the IT Administration team.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-8 border-b border-border/10 pb-1">
              8. Acknowledgments and Amendments
            </h2>
            <p>
              We reserve the right to update these Terms at our discretion. Any updates will be posted on this page, and your continued login and usage of the System after updates are posted indicates your acceptance of the revised terms.
            </p>
            <p>
              If you have any questions or require clarification regarding these Terms of Use, please contact IT Security at admin@acedigital.cc before continuing system usage.
            </p>
          </div>

          {/* Footer branding */}
          <div className="mt-8 pt-6 border-t border-border/40 text-center text-xs text-muted-foreground/60">
            &copy; 2026 Ace Digital. All rights reserved. Access is restricted to authorized company employees only.
          </div>
        </div>
      </div>
    </div>
  );
}
