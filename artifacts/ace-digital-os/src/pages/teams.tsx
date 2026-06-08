import { useState, useEffect } from "react";
import { useListTeams, Team } from "@workspace/api-client-react";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Plus, Users2 } from "lucide-react";
import { TeamCard } from "@/components/teams/TeamCard";
import { TeamDetailPanel } from "@/components/teams/TeamDetailPanel";
import { TeamCreateDialog } from "@/components/teams/TeamCreateDialog";
import { AppLayout } from "@/components/layout/AppLayout";

export default function TeamsPage() {
  const { can } = usePermissions();
  const { user } = useAuth();
  const role = user?.role ?? "";
  const { data: teams = [], isLoading } = useListTeams();
  
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Auto-select first team or user's own team
  useEffect(() => {
    if (teams.length > 0 && selectedTeamId === null) {
      if (user?.teamId) {
        setSelectedTeamId(user.teamId);
      } else {
        setSelectedTeamId(teams[0].id);
      }
    }
  }, [teams, selectedTeamId, user?.teamId]);

  // Handle deletion
  function handleDeleted() {
    setSelectedTeamId(null);
  }

  // Filter teams based on role
  const visibleTeams = teams.filter((t) => {
    if (role === "team_lead" || role === "employee") {
      return t.id === user?.teamId;
    }
    return true; // management, super_admin, hr, finance see all
  });

  const selectedTeam = visibleTeams.find((t) => t.id === selectedTeamId) || null;

  // RBAC checks
  const canCreate = can("teams:write");
  const canEdit = can("teams:write");
  const canDelete = can("teams:delete");
  const canManageProjects = can("projects:write") && can("teams:write");
  const canManageMembers = can("teams:write");

  if (isLoading) {
    return (
      <AppLayout title="Teams">
        <div className="flex-1 flex items-center justify-center h-full">
          <div className="animate-pulse flex flex-col items-center gap-4 text-muted-foreground">
            <Users2 className="h-8 w-8" />
            <p>Loading teams...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Teams" fillViewport>
      <div className="flex h-full flex-col overflow-hidden bg-background">
      
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar (Team List) */}
        <div className="w-80 flex-none border-r bg-muted/10 flex flex-col hidden md:flex">
          <div className="p-4 border-b flex items-center justify-between bg-background/50 backdrop-blur-sm z-10">
            <h3 className="font-semibold text-sm text-muted-foreground">All Teams</h3>
            {canCreate && (
              <Button size="icon" variant="ghost" onClick={() => setIsCreateOpen(true)} className="h-8 w-8">
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 flex flex-col gap-3">
              {visibleTeams.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Users2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No teams found</p>
                </div>
              ) : (
                visibleTeams.map((team) => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    isSelected={selectedTeam?.id === team.id}
                    onClick={() => setSelectedTeamId(team.id)}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Main Panel (Team Details) */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {selectedTeam ? (
            <TeamDetailPanel
              team={selectedTeam}
              canEdit={canEdit}
              canDelete={canDelete}
              canManageProjects={canManageProjects}
              canManageMembers={canManageMembers}
              onDeleted={handleDeleted}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground opacity-50">
              <Users2 className="h-16 w-16 mb-4" />
              <p className="text-xl font-medium">No team selected</p>
              <p className="text-sm mt-1">Select a team from the list to view details.</p>
              {canCreate && (
                <Button variant="outline" className="mt-6" onClick={() => setIsCreateOpen(true)}>
                  Create your first team
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

        <TeamCreateDialog 
          open={isCreateOpen} 
          onOpenChange={setIsCreateOpen} 
          onCreated={(t) => setSelectedTeamId(t.id)} 
        />
      </div>
    </AppLayout>
  );
}
