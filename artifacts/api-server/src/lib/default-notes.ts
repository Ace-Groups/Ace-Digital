import { store } from "@workspace/db";

function getRoleDisplay(role: string): string {
  switch (role) {
    case "super_admin": return "Super Admin";
    case "management": return "Management";
    case "finance": return "Finance Head";
    case "hr": return "HR Manager";
    case "client_manager": return "Client Manager";
    case "team_lead": return "Team Lead";
    case "employee": return "Employee";
    default: return role;
  }
}

function generateWelcomeContent(fullName: string, role: string): string {
  const roleDisplay = getRoleDisplay(role);
  return `<h2>Welcome to Ace Digital OS, ${fullName}!</h2>
<p>We are excited to have you on board. This platform is your central hub for everything happening at Ace Digital.</p>
<p>Here are a few quick tips to help you get started:</p>
<ul>
  <li><strong>Real-time Chat:</strong> Engage with your team in channels or direct messages under the <strong>Chat</strong> tab.</li>
  <li><strong>Collaborative Notes:</strong> You are reading one right now! You can create, edit, share, and collaborate on notes in real-time with other employees, or share them directly into chat.</li>
  <li><strong>Task Management:</strong> Check out your active tasks, progress boards, and deadlines on the <strong>Tasks</strong> page.</li>
</ul>
<p>If you have any questions or need technical support, head over to the <strong>Service Desk</strong> to submit a ticket to our IT Operations team.</p>
<p>Have a great day ahead! 🚀</p>`;
}

function generateGuideContent(role: string): string {
  const roleDisplay = getRoleDisplay(role);
  let permissionsContent = "";

  switch (role) {
    case "super_admin":
      permissionsContent = `<h2>Super Admin Clearance Level</h2>
<p>You have full, unrestricted clearance to all modules in Ace Digital OS.</p>
<h3>Allowed Operations:</h3>
<ul>
  <li><strong>System Administration:</strong> Add, edit, or remove user profiles, customize job titles, and alter security clearances.</li>
  <li><strong>Full Financial Access:</strong> Manage salary records, post payments, authorize budget requests, and run payroll runs.</li>
  <li><strong>Workspace Operations:</strong> Manage all projects, tasks, clients, and approve any pending requests.</li>
  <li><strong>Team Communications:</strong> Create public/private channels and direct messages.</li>
</ul>
<h3>Restrictions:</h3>
<ul>
  <li>None. Your account has global owner clearance. Ensure proper security protocols when performing admin operations.</li>
</ul>`;
      break;

    case "management":
      permissionsContent = `<h2>Management Clearance Level</h2>
<p>You have full organizational oversight to manage the company's daily operations.</p>
<h3>Allowed Operations:</h3>
<ul>
  <li><strong>Project Oversight:</strong> Create and modify all client projects, tracking progress and deadlines.</li>
  <li><strong>Approvals Queue:</strong> Authorize <strong>Leave</strong>, <strong>Expense</strong>, <strong>Hiring</strong>, and <strong>Project Budget</strong> requests.</li>
  <li><strong>Reports Generation:</strong> Generate and view revenue sheets, status updates, and expense summaries.</li>
  <li><strong>Team Management:</strong> View and manage employee directories and teams.</li>
</ul>
<h3>Restrictions:</h3>
<ul>
  <li><strong>Salary Posting:</strong> Cannot directly post monthly or project-based salaries (restricted to Finance and Super Admin roles).</li>
  <li><strong>Security Clearance:</strong> Cannot promote or assign <strong>super_admin</strong> roles.</li>
</ul>`;
      break;

    case "finance":
      permissionsContent = `<h2>Finance & Payroll Clearance Level</h2>
<p>You manage the financial transactions, budget releases, and payroll postings for Ace Digital.</p>
<h3>Allowed Operations:</h3>
<ul>
  <li><strong>Payroll Management:</strong> Calculate and post monthly and project-based employee salary items.</li>
  <li><strong>Approvals Queue:</strong> Review and authorize <strong>Expense</strong> and <strong>Project Budget</strong> requests.</li>
  <li><strong>Financial Reports:</strong> Access, generate, and review company payroll and expense reports.</li>
</ul>
<h3>Restrictions:</h3>
<ul>
  <li><strong>Employee Directory:</strong> Cannot add or delete employee profiles (restricted to HR, Management, and Super Admin).</li>
  <li><strong>Leave Approvals:</strong> Cannot approve employee leave requests.</li>
</ul>`;
      break;

    case "hr":
      permissionsContent = `<h2>Human Resources Clearance Level</h2>
<p>You manage the employee directory, recruitment/hiring approvals, and onboarding.</p>
<h3>Allowed Operations:</h3>
<ul>
  <li><strong>Employee Records:</strong> Create, edit, and archive employee profiles.</li>
  <li><strong>Leave Management:</strong> Review and approve all employee leave requests.</li>
  <li><strong>Hiring Approvals:</strong> Review and approve <strong>Hiring</strong> requests.</li>
</ul>
<h3>Restrictions:</h3>
<ul>
  <li><strong>Salary Fields Hidden:</strong> For security and compliance, you cannot view base salaries, bonuses, or financial reports.</li>
  <li><strong>Finance & Budgets:</strong> Cannot approve expense sheets or project budgets.</li>
</ul>`;
      break;

    case "client_manager":
      permissionsContent = `<h2>Client Manager Clearance Level</h2>
<p>You are the primary interface for our client database and accounts.</p>
<h3>Allowed Operations:</h3>
<ul>
  <li><strong>Client Management:</strong> Add, edit, and manage client contact records.</li>
  <li><strong>Project Tracking:</strong> View projects linked to your clients.</li>
</ul>
<h3>Restrictions:</h3>
<ul>
  <li><strong>No Task Controls:</strong> Cannot edit tasks or task boards (read-only client views).</li>
  <li><strong>No Financials:</strong> Cannot access payroll, expense reports, or salary fields.</li>
</ul>`;
      break;

    case "team_lead":
      permissionsContent = `<h2>Team Lead Clearance Level</h2>
<p>You direct and supervise team projects, tasks, and members.</p>
<h3>Allowed Operations:</h3>
<ul>
  <li><strong>Project Management:</strong> Create tasks, assign them to team members, set due dates, and update progress.</li>
  <li><strong>Leave Approvals:</strong> Authorize leave requests for members of your own team.</li>
</ul>
<h3>Restrictions:</h3>
<ul>
  <li><strong>Financial Boundaries:</strong> Cannot approve expenses, project budgets, or post salaries.</li>
  <li><strong>Global Controls:</strong> Cannot edit client records or global company settings.</li>
</ul>`;
      break;

    default: // employee and others
      permissionsContent = `<h2>Employee Workspace Access</h2>
<p>Welcome to your personal work dashboard.</p>
<h3>Allowed Operations:</h3>
<ul>
  <li><strong>Personal Tasks:</strong> View your assigned tasks, update task status (Todo, In Progress, Review, Done), and log progress.</li>
  <li><strong>Collaborative Notes:</strong> Create personal notes, share them with colleagues, and sync edits in real-time.</li>
  <li><strong>Finance & Payslips:</strong> View your own payslips and detailed project payout breakdowns.</li>
  <li><strong>Service Tickets:</strong> Submit support tickets to the IT Operations team if you face technical blockers.</li>
</ul>
<h3>Restrictions:</h3>
<ul>
  <li><strong>Directory Isolation:</strong> Cannot view other employees' salary figures or edit global project boards.</li>
  <li><strong>Approval Gates:</strong> Cannot approve leave, expense, or hiring requests.</li>
</ul>`;
      break;
  }

  return `<h2>App Guide: ${roleDisplay} Permissions</h2>
<p>This role-specific guide outlines your capabilities and boundaries within the Ace Digital OS workspace.</p>
<hr />
${permissionsContent}
<hr />
<p><em>Note: If your organizational role is changed by an administrator, this guide will update automatically on your next page reload.</em></p>`;
}

export async function ensureDefaultNotes(userId: number) {
  const user = await store.findUserById(userId);
  if (!user) return;

  const role = user.role;
  const fullName = user.fullName;

  // Fetch all notes for this user
  const userNotes = await store.listNotes(userId);

  const welcomeTitle = "👋 Welcome to Ace Digital OS";
  const guideTitlePrefix = "📖 App Guide:";
  const expectedGuideTitle = `📖 App Guide: ${getRoleDisplay(role)} Capabilities`;

  const welcomeContent = generateWelcomeContent(fullName, role);
  const guideContent = generateGuideContent(role);

  // 1. Welcome Note
  const welcomeNote = userNotes.find((n) => n.title === welcomeTitle && n.createdById === userId);
  if (!welcomeNote) {
    await store.createNote({
      title: welcomeTitle,
      content: welcomeContent,
      createdById: userId,
      sharedUserIds: [],
    });
  } else {
    const expectedHeader = `Welcome to Ace Digital OS, ${fullName}!`;
    if (!welcomeNote.content.includes(expectedHeader)) {
      await store.updateNote(welcomeNote.id, {
        content: welcomeContent,
      });
    }
  }

  // 2. Guide Note
  const guideNote = userNotes.find((n) => n.title.startsWith(guideTitlePrefix) && n.createdById === userId);
  if (!guideNote) {
    await store.createNote({
      title: expectedGuideTitle,
      content: guideContent,
      createdById: userId,
      sharedUserIds: [],
    });
  } else {
    // If user's role is changed, or if content was updated
    if (guideNote.title !== expectedGuideTitle || guideNote.content !== guideContent) {
      await store.updateNote(guideNote.id, {
        title: expectedGuideTitle,
        content: guideContent,
      });
    }
  }
}
