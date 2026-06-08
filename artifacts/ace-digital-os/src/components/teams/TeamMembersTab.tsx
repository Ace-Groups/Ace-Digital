import { useState, useMemo } from "react";
import { Employee, useUpdateEmployee } from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, UserMinus, UserPlus, Users2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getGetTeamMembersQueryKey, getListTeamsQueryKey } from "@workspace/api-client-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

interface TeamMembersTabProps {
  teamId: number;
  members: Employee[];
  canManageMembers: boolean;
}

function getRoleColor(role: string) {
  switch (role) {
    case "super_admin": return "bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400";
    case "management": return "bg-indigo-500/15 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400";
    case "hr": return "bg-rose-500/15 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400";
    case "finance": return "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400";
    case "client_manager": return "bg-cyan-500/15 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400";
    case "team_lead": return "bg-teal-500/15 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400";
    default: return "bg-slate-500/15 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400";
  }
}

export function TeamMembersTab({ teamId, members, canManageMembers }: TeamMembersTabProps) {
  const [search, setSearch] = useState("");
  const updateEmployee = useUpdateEmployee();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const filtered = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter((m) => m.fullName.toLowerCase().includes(q) || m.jobTitle?.toLowerCase().includes(q));
  }, [members, search]);

  async function handleRemove(member: Employee) {
    if (!confirm(`Remove ${member.fullName} from this team?`)) return;
    try {
      await updateEmployee.mutateAsync({ id: member.id, data: { teamId: null } as any });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetTeamMembersQueryKey(teamId) }),
        queryClient.invalidateQueries({ queryKey: getListTeamsQueryKey() })
      ]);
      toast({ title: "Member removed" });
    } catch {
      toast({ title: "Failed to remove member", variant: "destructive" });
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search members..." 
            className="pl-9 bg-background/50 backdrop-blur-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1 -mx-4 px-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center opacity-50">
            <Users2 className="h-12 w-12 mb-4 text-muted-foreground" />
            <p className="text-lg font-medium">No members found</p>
            <p className="text-sm">This team looks empty.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pb-6">
            {filtered.map((member) => (
              <div key={member.id} className="group flex items-center gap-3 rounded-lg border bg-card p-3 shadow-sm transition-all hover:border-primary/20">
                <Avatar className="h-10 w-10 border">
                  <AvatarImage src={member.avatarUrl || undefined} />
                  <AvatarFallback>{member.fullName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-medium leading-none">{member.fullName}</p>
                    {canManageMembers && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="text-destructive" onClick={() => handleRemove(member)}>
                            <UserMinus className="mr-2 h-4 w-4" />
                            Remove from team
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Badge variant="secondary" className={`text-[10px] font-medium leading-none px-1.5 py-0.5 ${getRoleColor(member.role)}`}>
                      {member.role.replace("_", " ")}
                    </Badge>
                    <span className="truncate text-xs text-muted-foreground">{member.jobTitle || "Employee"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
