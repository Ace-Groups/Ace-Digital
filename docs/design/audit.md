# Design audit

Heuristic review of the web app before this redesign. Scores use Nielsen's 0–4 scale (0 is a failure, 4 is excellent). The review covers login, home, attendance, tasks, leave, payroll, chat, and admin settings, on a phone and on a desktop.

The owner was looking at a dark, neon workspace by default. Light mode existed, but the first paint forced dark unless someone had already chosen light.

## Ranked problems

### 1. Critical — the morning job was not the page

Home opened into a command bar, metric tiles, a donut, activity, and mascots. Check-in was one card among many. An employee had to find tasks, leave, and pay in a long nav. An owner did not see today's roster, waiting approvals, or pay status together. Daily work took more than two taps.

Heuristics: match between system and the real world 1, recognition rather than recall 1, aesthetic and minimalist design 1.

### 2. Critical — two accents, and the default theme shouted

Light mode used a washed mid blue (`#5483B3`) for buttons. White text on that blue sits near the WCAG 4.5:1 line and fails it for small labels. Dark mode switched the accent to cyan (`hsl(184 100% 50%)`) with glow, glass, and gradients. That is a second brand, and it was the one people saw first. Status, links, and charts added green, amber, and purple on the same screen.

Heuristics: consistency and standards 1, aesthetic and minimalist design 0.

### 3. High — login was a campaign, then a cube

Desktop login was a particle logo, a mountain, and the line "Inspiring Youth Empowering Nation." Mobile login was a different layout with a cyan button and a shield icon. While the desktop chunk loaded, the whole screen was a 3D cube. Neither screen said "sign in and start the day" first. Placeholder contrast and the light-blue button were weak.

Heuristics: aesthetic and minimalist design 1, error prevention 2, visibility of system status 1.

### 4. High — touch targets and focus were uneven

Several header and sidebar controls were 40px or smaller. Inputs dropped from 44px to 40px on desktop. Select triggers dropped to 36px. Focus rings were a faint `ring/40` or a 1px ring. The bottom nav was a floating glass pill, easy to miss against the page.

Heuristics: flexibility and efficiency 2, consistency 2. WCAG 2.2 target size and focus appearance were not met across the shell.

### 5. Medium — navigation did not follow the role

Every role got Home and Chat pinned, then whatever filled the bar. Employees did not get Tasks and Leave in the thumb zone. Owners did not get Roster and Approvals there. The rest lived under More, which is a third tap.

Heuristics: flexibility and efficiency 2, user control 2.

### 6. Medium — weight before the first useful pixel

`index.html` blocked on Inter from Google Fonts and Clash Display from Fontshare. The home pulled charts, a particle field, and several motion libraries into the first route. Routes were already lazy, but the shell and the home were not lean.

Heuristics: this is performance, not a Nielsen score. It made the cube in problem 3 last longer.

### 7. Low — copy and chrome

Uppercase tracked labels ("ACE DIGITAL", "Operating System", "TODAY") sat above headings that could have stood alone. A password-copied toast used an emoji. Empty, loading, and error states existed, but each page invented its own.

Heuristics: consistency 2, help users recognize 2.

## What already worked

- Bottom nav on phones and a sidebar on desktop were the right bones.
- Check-in, roster, tasks, leave, payroll, and chat already had routes and data.
- Reduced-motion hooks existed on page transitions.
- Forms had labels. Login errors named the problem.
- Routes were code-split.

## What this redesign changes

The problems above are the scope of the visual replacement. API behavior stays. See `docs/design/system.md` for the tokens and components, and the home, login, and shell in the app for the flows.
