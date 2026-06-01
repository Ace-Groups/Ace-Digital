import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useListEmployees, useCreateEmployee, useListTeams,
  getListEmployeesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Mail, Briefcase, Search } from "lucide-react";
import { formatCurrency, getInitials, statusColor, cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const ROLES = ["employee", "team_lead", "finance", "hr", "management", "super_admin"];

const createSchema = z.object({
  fullName: z.string().min(1, "Name required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Min 6 characters"),
  role: z.string(),
  teamId: z.string().optional(),
  jobTitle: z.string().optional(),
  baseSalary: z.string().optional(),
});
type CreateForm = z.infer<typeof createSchema>;

export default function EmployeesPage() {
  const [search, setSearch] = useState("");
  const { data: employees, isLoading } = useListEmployees({});
  const { data: teams } = useListTeams();
  const createEmployee = useCreateEmployee();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { fullName: "", email: "", password: "", role: "employee" },
  });

  const filtered = employees?.filter(
    (e) =>
      e.fullName.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      (e.teamName ?? "").toLowerCase().includes(search.toLowerCase())
  );

  async function onSubmit(data: CreateForm) {
    await createEmployee.mutateAsync({
      data: {
        fullName: data.fullName,
        email: data.email,
        password: data.password,
        role: data.role,
        teamId: data.teamId ? Number(data.teamId) : undefined,
        jobTitle: data.jobTitle,
        baseSalary: data.baseSalary ? Number(data.baseSalary) : undefined,
      },
    });
    queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
    toast({ title: "Employee added!" });
    setOpen(false);
    form.reset();
  }

  return (
    <AppLayout title="Employees">
      <div className="flex items-center justify-between mb-6">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            data-testid="input-search-employees"
            type="text"
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-[#5483B3]/30"
          />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="btn-add-employee" className="gap-2">
              <Plus size={16} /> Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Add Employee</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="fullName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl><Input data-testid="input-emp-name" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl><Input data-testid="input-emp-email" type="email" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl><Input data-testid="input-emp-password" type="password" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="role" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {ROLES.map((r) => <SelectItem key={r} value={r}>{r.replace("_", " ")}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="teamId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {teams?.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="jobTitle" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Title</FormLabel>
                      <FormControl><Input data-testid="input-emp-title" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="baseSalary" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base Salary (₹)</FormLabel>
                      <FormControl><Input data-testid="input-emp-salary" type="number" {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>
                <Button data-testid="btn-submit-employee" type="submit" className="w-full" disabled={createEmployee.isPending}>
                  Add Employee
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)
        ) : filtered?.map((emp) => (
          <Card key={emp.id} data-testid={`employee-card-${emp.id}`} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <Avatar className="h-11 w-11 shrink-0">
                  <AvatarFallback className="bg-primary/15 text-primary font-semibold">
                    {getInitials(emp.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900">{emp.fullName}</p>
                  {emp.jobTitle && <p className="text-xs text-muted-foreground mt-0.5">{emp.jobTitle}</p>}
                  <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                    <Mail size={11} />
                    <span className="truncate">{emp.email}</span>
                  </div>
                </div>
                <Badge variant="outline" className={cn("text-xs shrink-0", statusColor(emp.status ?? "active"))}>
                  {emp.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                <div>
                  <p className="text-xs text-muted-foreground">Team</p>
                  <p className="text-sm font-medium">{emp.teamName ?? "—"}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Salary</p>
                  <p className="text-sm font-semibold text-primary">
                    {emp.baseSalary ? formatCurrency(emp.baseSalary) : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
}
