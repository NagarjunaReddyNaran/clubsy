# Clubsy — Claude Code Instructions

## Documentation Rule (MANDATORY)

After every task that involves a **major change**, update `DOCS.md` to reflect the new state.

### What counts as a major change?

| Change type | DOCS.md section to update |
|-------------|--------------------------|
| New API route or endpoint change | §5 API Design |
| New database model, field, or enum | §4 Database Design |
| New page or screen | §6 UI/UX Design |
| New component with broad usage | §6 UI/UX Design → Key Components |
| New npm dependency | §3 Tech Stack |
| New environment variable | §8 Deployment Guide |
| Security change (auth, validation, rate limit) | §7 Security Design |
| Schema migration | §4 Database Design |

### What does NOT require a doc update?

- Bug fixes with no API/schema/UI change
- Style/CSS tweaks
- Seed data changes
- Refactoring internals without changing behaviour

### How to update DOCS.md

1. Locate the relevant section using the table above.
2. Edit only that section — do not rewrite unaffected sections.
3. Update the **Version History** table at the bottom of DOCS.md with a one-line entry:
   ```
   | 1.x.x | YYYY-MM-DD | Short description of what changed |
   ```
4. Increment the patch version for small additions, minor version for new features.

---

## General Coding Rules

- Always filter database queries by `clubId` from `session.user.clubId` in admin routes.
- Validate all API request bodies with a Zod schema from `src/lib/validations.ts`.
- Use `<Suspense>` around all client components that use `useSearchParams()`.
- Keep server components as the default; use `"use client"` only when necessary.
- Run `npm run build` to verify no TypeScript errors after significant changes.
