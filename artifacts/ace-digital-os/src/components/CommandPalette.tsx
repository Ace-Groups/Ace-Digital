import { useEffect, useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  MessageSquare,
  FolderKanban,
  CheckSquare,
  Calendar,
  Users,
  Building2,
  DollarSign,
  StickyNote,
  TrendingUp,
  Settings,
  Bell,
  Sun,
  Moon,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import {
  useListProjects,
  useListEmployees,
  useListClients,
  useListNotes,
} from "@workspace/api-client-react";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { resolvedTheme, setTheme } = useTheme();

  // Load searchable data
  const { data: projects } = useListProjects();
  const { data: employees } = useListEmployees({});
  const { data: clients } = useListClients();
  const { data: notes } = useListNotes();

  // Keyboard shortcut listener: ⌘K or Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Custom event listener for triggering palette from buttons
  useEffect(() => {
    const handleOpen = () => setOpen(true);
    window.addEventListener("open-command-palette", handleOpen);
    return () => window.removeEventListener("open-command-palette", handleOpen);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  const isDark = resolvedTheme === "dark";

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search workspace..." />
      <CommandList className="max-h-[350px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-border">
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Dynamic Search Results */}
        {projects && projects.length > 0 && (
          <CommandGroup heading="Projects">
            {projects.slice(0, 5).map((project) => (
              <CommandItem
                key={`project-${project.id}`}
                value={`project ${project.name}`}
                onSelect={() => runCommand(() => setLocation(`/projects?projectId=${project.id}`))}
                className="flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer hover:bg-muted/80 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FolderKanban size={15} className="text-indigo-500" />
                  <span className="font-medium text-foreground text-xs">{project.name}</span>
                </div>
                <span className="text-[10px] uppercase font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {project.status.replace(/_/g, " ")}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {notes && notes.length > 0 && (
          <CommandGroup heading="Notes & Docs">
            {notes.slice(0, 5).map((note) => (
              <CommandItem
                key={`note-${note.id}`}
                value={`note ${note.title}`}
                onSelect={() => runCommand(() => setLocation(`/notes?id=${note.id}`))}
                className="flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer hover:bg-muted/80 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <StickyNote size={15} className="text-amber-500" />
                  <span className="font-medium text-foreground text-xs truncate max-w-[200px]">
                    {note.title || "Untitled Note"}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  Updated {note.updatedAt ? new Date(note.updatedAt).toLocaleDateString() : ""}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {employees && employees.length > 0 && (
          <CommandGroup heading="Employees">
            {employees.slice(0, 5).map((employee) => (
              <CommandItem
                key={`employee-${employee.id}`}
                value={`employee ${employee.fullName} ${employee.email}`}
                onSelect={() => runCommand(() => setLocation(`/employees`))}
                className="flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer hover:bg-muted/80 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Users size={15} className="text-emerald-500" />
                  <span className="font-medium text-foreground text-xs">{employee.fullName}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{employee.jobTitle || "Member"}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {clients && clients.length > 0 && (
          <CommandGroup heading="Clients">
            {clients.slice(0, 5).map((client) => (
              <CommandItem
                key={`client-${client.id}`}
                value={`client ${client.companyName}`}
                onSelect={() => runCommand(() => setLocation(`/clients`))}
                className="flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer hover:bg-muted/80 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Building2 size={15} className="text-sky-500" />
                  <span className="font-medium text-foreground text-xs">{client.companyName}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{client.contactName}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator className="my-1" />

        {/* Quick Actions */}
        <CommandGroup heading="Quick Actions">
          <CommandItem
            value="Toggle dark theme mode brightness appearance"
            onSelect={() => runCommand(() => setTheme(isDark ? "light" : "dark"))}
            className="flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer hover:bg-muted/80 transition-colors"
          >
            <div className="flex items-center gap-2">
              {isDark ? <Sun size={15} className="text-amber-500" /> : <Moon size={15} className="text-violet-500" />}
              <span className="text-xs">Toggle Color Theme</span>
            </div>
            <span className="text-[10px] text-muted-foreground">Switch Theme Mode</span>
          </CommandItem>

          <CommandItem
            value="Create new task add checklist todo"
            onSelect={() => runCommand(() => setLocation("/tasks"))}
            className="flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer hover:bg-muted/80 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Plus size={15} className="text-primary" />
              <span className="text-xs">Create New Task</span>
            </div>
            <span className="text-[10px] text-muted-foreground">Go to Tasks</span>
          </CommandItem>

          <CommandItem
            value="Create new note document memo note"
            onSelect={() => runCommand(() => setLocation("/notes"))}
            className="flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer hover:bg-muted/80 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Plus size={15} className="text-amber-500" />
              <span className="text-xs">Create New Note</span>
            </div>
            <span className="text-[10px] text-muted-foreground">Go to Notes</span>
          </CommandItem>

          <CommandItem
            value="Refresh workspace reload sync dashboard application"
            onSelect={() => runCommand(() => window.location.reload())}
            className="flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer hover:bg-muted/80 transition-colors"
          >
            <div className="flex items-center gap-2">
              <RefreshCw size={15} className="text-primary" />
              <span className="text-xs">Reload Application</span>
            </div>
            <span className="text-[10px] text-muted-foreground">Ctrl+R / ⌘R</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator className="my-1" />

        {/* Pages / Navigation */}
        <CommandGroup heading="Navigation">
          <CommandItem
            value="go to Dashboard overview stats home"
            onSelect={() => runCommand(() => setLocation("/"))}
            className="flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer hover:bg-muted/80"
          >
            <LayoutDashboard size={15} className="text-muted-foreground" />
            <span className="text-xs">Dashboard</span>
          </CommandItem>
          <CommandItem
            value="go to Channels Chat conversations messaging direct messages"
            onSelect={() => runCommand(() => setLocation("/channels"))}
            className="flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer hover:bg-muted/80"
          >
            <MessageSquare size={15} className="text-muted-foreground" />
            <span className="text-xs">Channels & DMs</span>
          </CommandItem>
          <CommandItem
            value="go to Projects lists workflows board"
            onSelect={() => runCommand(() => setLocation("/projects"))}
            className="flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer hover:bg-muted/80"
          >
            <FolderKanban size={15} className="text-muted-foreground" />
            <span className="text-xs">Projects</span>
          </CommandItem>
          <CommandItem
            value="go to Tasks list checklist actions"
            onSelect={() => runCommand(() => setLocation("/tasks"))}
            className="flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer hover:bg-muted/80"
          >
            <CheckSquare size={15} className="text-muted-foreground" />
            <span className="text-xs">Tasks</span>
          </CommandItem>
          <CommandItem
            value="go to Calendar events schedule"
            onSelect={() => runCommand(() => setLocation("/calendar"))}
            className="flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer hover:bg-muted/80"
          >
            <Calendar size={15} className="text-muted-foreground" />
            <span className="text-xs">Calendar</span>
          </CommandItem>
          <CommandItem
            value="go to Employees team directory coworkers"
            onSelect={() => runCommand(() => setLocation("/employees"))}
            className="flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer hover:bg-muted/80"
          >
            <Users size={15} className="text-muted-foreground" />
            <span className="text-xs">Employees</span>
          </CommandItem>
          <CommandItem
            value="go to Clients companies accounts"
            onSelect={() => runCommand(() => setLocation("/clients"))}
            className="flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer hover:bg-muted/80"
          >
            <Building2 size={15} className="text-muted-foreground" />
            <span className="text-xs">Clients</span>
          </CommandItem>
          <CommandItem
            value="go to Finance revenue budget expenses bills"
            onSelect={() => runCommand(() => setLocation("/finance"))}
            className="flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer hover:bg-muted/80"
          >
            <DollarSign size={15} className="text-muted-foreground" />
            <span className="text-xs">Finance Panel</span>
          </CommandItem>
          <CommandItem
            value="go to Notes collaborative document memos"
            onSelect={() => runCommand(() => setLocation("/notes"))}
            className="flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer hover:bg-muted/80"
          >
            <StickyNote size={15} className="text-muted-foreground" />
            <span className="text-xs">Notes & Docs</span>
          </CommandItem>
          <CommandItem
            value="go to Notifications updates highlights alerts"
            onSelect={() => runCommand(() => setLocation("/notifications"))}
            className="flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer hover:bg-muted/80"
          >
            <Bell size={15} className="text-muted-foreground" />
            <span className="text-xs">Notifications</span>
          </CommandItem>
          <CommandItem
            value="go to Activity logs audit tracking"
            onSelect={() => runCommand(() => setLocation("/activity"))}
            className="flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer hover:bg-muted/80"
          >
            <TrendingUp size={15} className="text-muted-foreground" />
            <span className="text-xs">Activity Log</span>
          </CommandItem>
          <CommandItem
            value="go to Settings profile configuration security"
            onSelect={() => runCommand(() => setLocation("/settings"))}
            className="flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer hover:bg-muted/80"
          >
            <Settings size={15} className="text-muted-foreground" />
            <span className="text-xs">Settings</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
