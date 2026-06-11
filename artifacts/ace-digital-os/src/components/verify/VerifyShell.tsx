import type { ReactNode } from "react";
import aceLogo from "@/assets/ace-logo.png";
import "@/styles/verify.css";

type VerifyShellProps = {
  subtitle?: string;
  children: ReactNode;
};

export function VerifyShell({ subtitle = "Ace Verify", children }: VerifyShellProps) {
  return (
    <div className="verify-page">
      <div className="verify-page-mesh" aria-hidden />
      <header className="verify-brand">
        <img src={aceLogo} alt="Ace Digital" />
        <span>{subtitle}</span>
      </header>
      <main className="verify-main">{children}</main>
    </div>
  );
}
