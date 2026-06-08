import { useState } from "react";
import { Team, useGetTeamMembers, useListProjects, useListTasks } from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users2, FolderKanban, BarChart3, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TeamMembersTab } from "./TeamMembersTab";
import { TeamProjectsTab } from "./TeamProjectsTab";
import { TeamOverviewTab } from "./TeamOverviewTab";
import { TeamEditDialog } from "./TeamEditDialog";

interface TeamDetailPanelProps {
  team: Team;
  canEdit: boolean;
  canDelete: boolean;
  canManageProjects: boolean;
  canManageMembers: boolean;
  onDeleted?: () => void;
}

export function TeamDetailPanel({ 
  team, 
  canEdit, 
  canDelete, 
  canManageProjects, 
  canManageMembers,
  onDeleted 
}: TeamDetailPanelProps) {
  const [activeTab, setActiveTab] = useState("members");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Fetch data specific to this team
  const { data: members = [] } = useGetTeamMembers(team.id);
  const { data: projects = [] } = useListProjects({ teamId: team.id });
  const { data: tasks = [] } = useListTasks({ teamId: team.id });

  return (
    <div className="flex h-full flex-col bg-background relative overflow-hidden">
      {/* Decorative gradient background at top */}
      <div 
        className="absolute top-0 left-0 w-full h-32 opacity-[0.03] pointer-events-none transition-colors duration-500"
        style={{ 
          background: `linear-gradient(to bottom, ${team.color || "hsl(var(--primary))"}, transparent)` 
        }}
      />

      <div className="flex-none px-6 pt-6 pb-2 border-b relative z-10 bg-background/80 backdrop-blur-md">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div 
              className="h-10 w-10 rounded-lg shadow-sm flex items-center justify-center text-white"
              style={{ backgroundColor: team.color || "hsl(var(--primary))" }}
            >
              <span className="font-bold text-lg leading-none">{team.name.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{team.name}</h2>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                <span className="flex items-center gap-1"><Users2 className="h-3.5 w-3.5" /> {members.length} members</span>
                <span className="flex items-center gap-1"><FolderKanban className="h-3.5 w-3.5" /> {projects.filter(p => p.status !== 'DONE').length} active projects</span>
              </div>
            </div>
          </div>
          
          {(canEdit || canDelete) && (
            <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-transparent border-b w-full justify-start rounded-none p-0 h-auto space-x-6">
            <TabsTrigger 
              value="members" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 pb-3 pt-2 font-medium"
            >
              <Users2 className="h-4 w-4 mr-2" />
              Members
            </TabsTrigger>
            <TabsTrigger 
              value="projects" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 pb-3 pt-2 font-medium"
            >
              <FolderKanban className="h-4 w-4 mr-2" />
              Projects
            </TabsTrigger>
            <TabsTrigger 
              value="overview" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 pb-3 pt-2 font-medium"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-hidden px-6 pt-6 relative z-10">
        <div className={activeTab === "members" ? "h-full block" : "hidden"}>
          <TeamMembersTab 
            teamId={team.id} 
            members={members} 
            canManageMembers={canManageMembers} 
          />
        </div>
        <div className={activeTab === "projects" ? "h-full block" : "hidden"}>
          <TeamProjectsTab 
            teamId={team.id} 
            projects={projects} 
            canManageProjects={canManageProjects} 
            onProjectClick={() => {}} // TODO: link to project view
          />
        </div>
        <div className={activeTab === "overview" ? "h-full block" : "hidden"}>
          <TeamOverviewTab 
            teamId={team.id} 
            members={members} 
            projects={projects} 
            tasks={tasks} 
          />
        </div>
      </div>

      <TeamEditDialog 
        team={team} 
        open={isEditDialogOpen} 
        onOpenChange={setIsEditDialogOpen}
        canEdit={canEdit}
        canDelete={canDelete}
        onDeleted={onDeleted}
      />
    </div>
  );
}
