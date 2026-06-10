import { AlertCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AiMessageMetadata } from "@workspace/api-client-react";

type AiMessageContentProps = {
  body?: string | null;
  metadata?: AiMessageMetadata | null;
};

export function AiMessageContent({ body, metadata }: AiMessageContentProps) {
  if (!metadata?.layout) return null;

  if (metadata.layout === "table" && metadata.tableData) {
    const tableData = metadata.tableData as {
      columns?: string[];
      rows?: Record<string, unknown>[];
    };
    if (!tableData.columns?.length || !tableData.rows) return null;
    return (
      <div className="mt-2 overflow-hidden rounded-md border border-border bg-card text-xs">
        <div className="flex items-center justify-between border-b border-border bg-muted/45 px-3 py-1.5 font-semibold text-muted-foreground">
          <span>System data</span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        </div>
        <div className="overflow-x-auto">
          <Table className="min-w-[400px]">
            <TableHeader className="border-b border-border bg-muted/30">
              <TableRow className="hover:bg-transparent">
                {tableData.columns.map((col, idx) => (
                  <TableHead
                    key={idx}
                    className="h-8 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground"
                  >
                    {col}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.rows.map((row, rowIdx) => (
                <TableRow key={rowIdx} className="border-b border-border/60 hover:bg-muted/40">
                  {tableData.columns!.map((col, colIdx) => (
                    <TableCell key={colIdx} className="px-3 py-2 text-foreground/90">
                      {String(row[col] ?? "")}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (metadata.layout === "permission_denied") {
    return (
      <div className="mt-2 overflow-hidden rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs">
        <div className="mb-2 flex items-center gap-2 font-semibold text-destructive">
          <AlertCircle size={16} />
          <span>Access denied</span>
        </div>
        <div className="rounded border border-destructive/15 bg-background/60 p-2 text-foreground">
          <p>{body || "You do not have permission to view this record."}</p>
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
          <span>SEC-403-RBAC</span>
          <span>System</span>
        </div>
      </div>
    );
  }

  return null;
}
