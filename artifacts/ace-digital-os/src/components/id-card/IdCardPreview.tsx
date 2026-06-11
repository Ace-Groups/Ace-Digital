import { useEffect, useState } from "react";
import { Loader2, Mail, Printer, Download, Copy, ExternalLink } from "lucide-react";
import { downloadIdCardPdf } from "@/lib/credentials-api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  emailEmployeeIdCard,
  getEmployeeIdCard,
  type IdCardResponse,
} from "@/lib/internships-api";
import { useToast } from "@/hooks/use-toast";
import aceLogo from "@/assets/ace-logo.png";
import "@/styles/id-card.css";

type IdCardPreviewProps = {
  employeeId: number;
  canEmail?: boolean;
  className?: string;
};

export function IdCardPreview({ employeeId, canEmail, className }: IdCardPreviewProps) {
  const { toast } = useToast();
  const [card, setCard] = useState<IdCardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [side, setSide] = useState<"front" | "back">("front");
  const [emailing, setEmailing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void getEmployeeIdCard(employeeId)
      .then((data) => {
        if (!cancelled) setCard(data);
      })
      .catch(() => {
        if (!cancelled) {
          toast({ title: "Could not load ID card", variant: "destructive" });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [employeeId, toast]);

  function handlePrint() {
    window.print();
  }

  async function handleDownloadPdf() {
    setDownloading(true);
    try {
      await downloadIdCardPdf(employeeId);
      toast({ title: "ID card PDF downloaded" });
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  }

  function copyVerifyUrl() {
    if (!card?.verifyUrl) return;
    void navigator.clipboard.writeText(card.verifyUrl);
    toast({ title: "Verify link copied" });
  }

  async function handleEmail() {
    setEmailing(true);
    try {
      const { sent } = await emailEmployeeIdCard(employeeId);
      toast({
        title: sent ? "ID card emailed" : "Email could not be sent",
        variant: sent ? "default" : "destructive",
      });
    } catch {
      toast({ title: "Email failed", variant: "destructive" });
    } finally {
      setEmailing(false);
    }
  }

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center py-16", className)}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!card) return null;

  const svg = side === "front" ? card.frontSvg : card.backSvg;

  return (
    <div className={cn("id-card-preview", className)}>
      <div className="id-card-preview-toolbar no-print">
        <div className="flex rounded-lg border border-border/60 p-0.5">
          <button
            type="button"
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-semibold",
              side === "front" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
            onClick={() => setSide("front")}
          >
            Front
          </button>
          <button
            type="button"
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-semibold",
              side === "back" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
            onClick={() => setSide("back")}
          >
            Back
          </button>
        </div>
        <div className="flex gap-2">
          {canEmail && (
            <Button type="button" size="sm" variant="outline" disabled={emailing} onClick={() => void handleEmail()}>
              {emailing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              <span className="ml-1.5">Email card</span>
            </Button>
          )}
          <Button type="button" size="sm" variant="outline" disabled={downloading} onClick={() => void handleDownloadPdf()}>
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            <span className="ml-1.5">PDF</span>
          </Button>
          <Button type="button" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            <span className="ml-1.5">Print</span>
          </Button>
        </div>
      </div>

      {card.verifyUrl && (
        <div className="no-print mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs">
          <span className="text-muted-foreground">Ace Verify:</span>
          <a href={card.verifyUrl} target="_blank" rel="noreferrer" className="font-mono text-primary hover:underline truncate max-w-[200px] sm:max-w-none">
            {card.verifyUrl}
          </a>
          <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={copyVerifyUrl}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-7 w-7" asChild>
            <a href={card.verifyUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      )}

      <div className="id-card-print-area">
        <div className="id-card-brand no-print">
          <img src={aceLogo} alt="" className="h-6 w-auto opacity-80" />
          <span className="text-xs font-medium text-muted-foreground">
            {card.variant === "intern" ? "Intern access card" : "Employee ID"} · {card.employeeCode}
          </span>
        </div>
        <div
          className="id-card-svg-wrap"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
    </div>
  );
}
