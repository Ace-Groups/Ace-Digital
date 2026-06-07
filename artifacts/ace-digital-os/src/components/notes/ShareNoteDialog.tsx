import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useListEmployees } from "@workspace/api-client-react";
import { Search, UserPlus, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { UserAvatar } from "@/components/UserAvatar";

interface ShareNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sharedUserIds: number[];
  onSave: (userIds: number[]) => void;
  saving?: boolean;
}

export function ShareNoteDialog({
  open,
  onOpenChange,
  sharedUserIds,
  onSave,
  saving,
}: ShareNoteDialogProps) {
  const { user: currentUser } = useAuth();
  const { data: employees } = useListEmployees();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number[]>(sharedUserIds);

  // Reset selection when dialog opens
  const prevOpen = useState(open)[0];
  if (open && !prevOpen) {
    // handled via effect below
  }

  // Sync sharedUserIds when they change
  useState(() => {
    setSelected(sharedUserIds);
  });

  const filteredEmployees = useMemo(() => {
    if (!employees) return [];
    return employees.filter((e) => {
      if (e.id === currentUser?.id) return false; // exclude self
      if (e.status === "inactive") return false;
      if (!search.trim()) return true;
      return e.fullName.toLowerCase().includes(search.toLowerCase());
    });
  }, [employees, search, currentUser?.id]);

  const selectedEmployees = useMemo(() => {
    if (!employees) return [];
    return employees.filter((e) => selected.includes(e.id));
  }, [employees, selected]);

  const toggleUser = (userId: number) => {
    setSelected((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSave = () => {
    onSave(selected);
  };

  const getInitials = (name: string) => {
    const parts = name.split(" ");
    return parts
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Share Note
          </DialogTitle>
          <DialogDescription>
            Choose employees who can view and edit this note.
          </DialogDescription>
        </DialogHeader>

        {/* Currently shared */}
        {selectedEmployees.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-2">
            {selectedEmployees.map((emp) => (
              <div
                key={emp.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
              >
                <span>{emp.fullName}</span>
                <button
                  type="button"
                  onClick={() => toggleUser(emp.id)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-primary/20 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Employee list */}
        <ScrollArea className="h-[260px] -mx-2">
          <div className="space-y-0.5 px-2">
            {filteredEmployees.map((emp) => {
              const isSelected = selected.includes(emp.id);
              return (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => toggleUser(emp.id)}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                    isSelected
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-accent border border-transparent"
                  }`}
                >
                  {/* Avatar */}
                  <UserAvatar
                    avatarUrl={emp.avatarUrl}
                    fullName={emp.fullName}
                    className="w-8 h-8 flex-shrink-0"
                    fallbackClassName="bg-primary/15 text-primary text-xs font-bold"
                  />
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {emp.fullName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {emp.jobTitle ?? emp.role}
                      {emp.teamName ? ` · ${emp.teamName}` : ""}
                    </p>
                  </div>
                  {/* Check indicator */}
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSelected
                        ? "bg-primary border-primary"
                        : "border-muted-foreground/30"
                    }`}
                  >
                    {isSelected && (
                      <svg
                        className="w-3 h-3 text-primary-foreground"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
            {filteredEmployees.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                No employees found.
              </p>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
