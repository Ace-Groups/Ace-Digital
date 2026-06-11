import type { ReactNode } from "react";
import aceLogo from "@/assets/ace-logo.png";
import "@/styles/verify.css";

type VerifyShellProps = {
  subtitle?: string;
  children: ReactNode;
};

export function VerifyShell({ subtitle = "Verified by Ace Digital OS", children }: VerifyShellProps) {
  return (
    <div className="verify-page">
      <header className="verify-header">
        <img src={aceLogo} alt="Ace Digital" />
        <span>{subtitle}</span>
      </header>
      {children}
    </div>
  );
}
