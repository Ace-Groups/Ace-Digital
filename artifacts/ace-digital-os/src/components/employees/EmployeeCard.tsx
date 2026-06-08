import type { Employee } from "@workspace/api-client-react";
import { Mail, Phone, Briefcase, MoreVertical, Pencil, Trash2, KeyRound, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency, statusColor, cn } from "@/lib/utils";

interface EmployeeCardProps {
  employee: Employee;
  canEdit: boolean;
  canDelete: boolean;
  canResetPassword: boolean;
  canViewSalaries: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onResetPassword: () => void;
}

export function EmployeeCard({
  employee,
  canEdit,
  canDelete,
  canResetPassword,
  canViewSalaries,
  onView,
  onEdit,
  onDelete,
  onResetPassword,
}: EmployeeCardProps) {
  const showMenu = canEdit || canDelete || canResetPassword;

  return (
    <Card
      data-testid={`employee-card-${employee.id}`}
      className="transition-shadow hover:shadow-md"
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <UserAvatar
            avatarUrl={employee.avatarUrl}
            fullName={employee.fullName}
            className="h-12 w-12 shrink-0"
            fallbackClassName="bg-primary/15 text-primary font-semibold"
            iconSize={20}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{employee.fullName}</p>
                {employee.jobTitle && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <Briefcase size={11} className="shrink-0" />
                    <span className="truncate">{employee.jobTitle}</span>
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Badge
                  variant="outline"
                  className={cn("text-[10px]", statusColor(employee.status ?? "active"))}
                >
                  {employee.status}
                </Badge>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 border-primary/40 text-primary"
                  onClick={onView}
                  aria-label={`View ${employee.fullName}`}
                >
                  <Eye size={17} />
                </Button>
                {showMenu && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        aria-label="Employee actions"
                      >
                        <MoreVertical size={18} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {canEdit && (
                        <DropdownMenuItem onClick={onEdit}>
                          <Pencil size={16} className="mr-2" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      {canResetPassword && (
                        <DropdownMenuItem onClick={onResetPassword}>
                          <KeyRound size={16} className="mr-2" />
                          Reset password…
                        </DropdownMenuItem>
                      )}
                      {canDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={onDelete}
                          >
                            <Trash2 size={16} className="mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              <p className="flex items-center gap-1.5">
                <Mail size={12} className="shrink-0" />
                <span className="truncate">{employee.email}</span>
              </p>
              {employee.phone && (
                <p className="flex items-center gap-1.5">
                  <Phone size={12} className="shrink-0" />
                  {employee.phone}
                </p>
              )}
              <p className="text-[11px] font-mono">
                ID: {employee.employeeCode ?? "—"}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Team</p>
            <p className="text-sm font-medium">{employee.teamName ?? "—"}</p>
          </div>
          {canViewSalaries && (
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Salary</p>
              <p className="text-sm font-semibold text-primary">
                {employee.baseSalary != null ? formatCurrency(employee.baseSalary) : "—"}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
