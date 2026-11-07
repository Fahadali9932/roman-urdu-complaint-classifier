# Developer Guide: Roman Urdu Complaint Classifier
**Institution:** Greenwich University, Karachi, Pakistan  
**Author:** Capstone Development Team  

---

## 1. Prerequisites

Ensure your local workstation has the following installed:
- **Node.js:** v18.0.0 or higher (Tested on `v24.15.0`)
- **npm:** v9.0.0 or higher (Tested on `11.12.1`)
- **Git:** v2.30.0 or higher

---

## 2. Git Branching Strategy & Workflow

This project adheres to a structured Trunk-Based / Feature-Branch workflow:

### Branch Naming Conventions
- `main` — Production-ready, stable code. Direct commits are restricted.
- `feature/<scope>-<description>` — For new features (e.g., `feature/citizen-foundation`, `feature/urdu-nlp-pipeline`).
- `fix/<scope>-<description>` — For bug resolutions (e.g., `fix/word-counter-overflow`).
- `docs/<scope>-<description>` — For documentation enhancements.
- `test/<scope>-<description>` — For automated test additions or test harness updates.

### Workflow Rules
1. Never commit directly to `main`.
2. Always create a branch off the latest `main`:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/your-feature-name
   ```
3. Keep commits atomic and focused on a single change.
4. Verify tests and linting pass before committing:
   ```bash
   npm run lint
   npm test
   npm run build
   ```

---

## 3. Commit Message Standards

We enforce the [Conventional Commits specification](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary in imperative mood>

[optional body explaining WHY the change was made]

[optional footer(s) referencing issue IDs]
```

### Supported Types:
- `feat`: A new user-facing capability or component.
- `fix`: A bug fix.
- `docs`: Documentation changes only.
- `style`: Formatting, whitespace, or visual presentation tweaks without logic changes.
- `refactor`: Code restructuring without fixing a bug or adding a feature.
- `test`: Adding or correcting automated unit / integration tests.
- `chore`: Tooling, dependency updates, build configs, or maintenance tasks.

### Examples:
- `feat(citizen): add 200-word limit counter to complaint submission`
- `docs(arch): update departmental portal routing matrix`
- `test(validation): add boundary tests for Roman Urdu character parsing`
- `chore(deps): configure vitest and tailwind v4 vite plugin`

---

## 4. Local Development Commands

| Command | Description |
| :--- | :--- |
| `npm install` | Installs all project dependencies via npm. |
| `npm run dev` | Starts the Vite development server (default: `http://localhost:5173`). |
| `npm run build` | Type-checks with TypeScript compiler (`tsc -b`) and generates production bundle in `dist/`. |
| `npm run preview` | Serves the production build locally for verification. |
| `npm run lint` | Runs code linter across the repository. |
| `npm test` | Executes the Vitest automated test suite. |

---

## 5. Connecting Remote GitHub Repository

To link your local repository to GitHub:

1. Create a repository on GitHub named `RomanUrdu_ComplaintClassifier` (leave it empty without initializing README or .gitignore).
2. On your local machine, run:
   ```bash
   git remote add origin https://github.com/<your-username>/RomanUrdu_ComplaintClassifier.git
   ```
3. Push the `main` branch:
   ```bash
   git push -u origin main
   ```
4. Push your working feature branch:
   ```bash
   git push -u origin feature/citizen-foundation
   ```

> [!IMPORTANT]
> Never force-push (`git push -f`) to `main`. Always create pull requests for code review.

---

## 6. Code Quality & Standards

- **TypeScript Strict Mode:** All code must pass `tsc` without implicit `any` types.
- **Component Design:** Keep components under 250 lines. Split complex layouts into atomic subcomponents in `src/components/common/` or `src/components/citizen/`.
- **Accessibility:** Ensure all inputs have associated `<label>` tags, interactive controls are keyboard navigable, and color contrast meets WCAG AA standards.
- **Localization:** Never hardcode user-facing strings directly in JSX. Import translations from `src/i18n/` through the `useLanguage` hook.
- **Security & Privacy:** Never commit `.env.local` files, secret keys, or real citizen information. All demonstration records must be explicitly marked as fictional.
