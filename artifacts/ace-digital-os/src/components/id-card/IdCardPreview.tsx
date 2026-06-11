import { useEffect, useState } from "react";
import {
  Loader2,
  Mail,
  Printer,
  Download,
  Copy,
  ExternalLink,
  ShieldCheck,
  QrCode,
  CreditCard,
} from "lucide-react";
import { downloadIdCardPdf } from "@/lib/credentials-api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  emailEmployeeIdCard,
  getEmployeeIdCard,
  type IdCardResponse,
} from "@/lib/internships-api";
import { useToast } from "@/hooks/use-toast";
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
  const [animating, setAnimating] = useState(false);

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

  function switchSide(next: "front" | "back") {
    if (next === side) return;
    setAnimating(true);
    setSide(next);
    window.setTimeout(() => setAnimating(false), 320);
  }

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
      <div className={cn("id-card-preview id-card-preview--loading", className)}>
        <Loader2 className="id-card-preview-spinner" />
        <p>Generating secure ID card…</p>
      </div>
    );
  }

  if (!card) return null;

  const svg = side === "front" ? card.frontSvg : card.backSvg;
  const rawPreview = side === "front" ? card.frontPngUrl : card.backPngUrl;
  const previewUrl = rawPreview
    ? `${rawPreview}${rawPreview.includes("?") ? "&" : "?"}t=${encodeURIComponent(card.issuedAt ?? Date.now().toString())}`
    : null;
  const isPortrait = card.frontSvg.includes('height="856"') || card.frontSvg.includes("height='856'");

  return (
    <div className={cn("id-card-preview", className)}>
      <div className="id-card-preview-meta no-print">
        <div className="id-card-preview-badge">
          <ShieldCheck className="h-4 w-4" />
          <span>{card.variant === "intern" ? "Intern access card" : "Employee secure ID"}</span>
        </div>
        <span className="id-card-preview-code">{card.employeeCode}</span>
      </div>

      <div className="id-card-preview-toolbar no-print">
        <div className="id-card-side-toggle" role="tablist" aria-label="Card side">
          <button
            type="button"
            role="tab"
            aria-selected={side === "front"}
            className={cn("id-card-side-btn", side === "front" && "id-card-side-btn--active")}
            onClick={() => switchSide("front")}
          >
            <CreditCard className="h-3.5 w-3.5" />
            Front
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={side === "back"}
            className={cn("id-card-side-btn", side === "back" && "id-card-side-btn--active")}
            onClick={() => switchSide("back")}
          >
            <QrCode className="h-3.5 w-3.5" />
            Back
          </button>
        </div>
        <div className="id-card-preview-actions">
          {canEmail && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="id-card-action-btn"
              disabled={emailing}
              onClick={() => void handleEmail()}
            >
              {emailing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Email
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="id-card-action-btn"
            disabled={downloading}
            onClick={() => void handleDownloadPdf()}
          >
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            PDF
          </Button>
          <Button type="button" size="sm" className="id-card-action-btn id-card-action-btn--primary" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      {card.verifyUrl && (
        <div className="id-card-verify-bar no-print">
          <span className="id-card-verify-label">Ace Verify</span>
          <a href={card.verifyUrl} target="_blank" rel="noreferrer" className="id-card-verify-url">
            {card.verifyUrl}
          </a>
          <Button type="button" size="icon" variant="ghost" className="id-card-verify-icon" onClick={copyVerifyUrl}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="id-card-verify-icon" asChild>
            <a href={card.verifyUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      )}

      <div className="id-card-print-area">
        <div className="id-card-stage no-print">
          <div className="id-card-stage-glow" aria-hidden />
          <div
            className={cn(
              "id-card-frame",
              isPortrait && "id-card-frame--portrait",
              animating && "id-card-frame--animating",
            )}
          >
            <div className="id-card-lanyard" aria-hidden />
            <div className="id-card-svg-wrap">
              {svg ? (
                <div className="id-card-svg-render" dangerouslySetInnerHTML={{ __html: svg }} />
              ) : previewUrl ? (
                <img src={previewUrl} alt={`ID card ${side}`} className="id-card-preview-img" />
              ) : null}
            </div>
          </div>
          <p className="id-card-stage-caption">
            {side === "front" ? "Front · portrait CR80" : "Back · scan QR to verify"}
          </p>
        </div>

        <div className="id-card-print-only">
          <div className="id-card-svg-wrap id-card-svg-wrap--print" dangerouslySetInnerHTML={{ __html: svg }} />
        </div>
      </div>
    </div>
  );
}
