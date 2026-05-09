# Fusion Frontend

## Overview

This Project is the frontend of the Fusion - IIITDMJ's ERP Portal. We've migrated the frontend of fusion from Django templates to a modern React-based architecture.

## Tech Stack

- [ReactJS](https://react.dev/learn) as the main frontend library
- [Mantine UI](https://mantine.dev/getting-started/) for UI components
- [Redux](https://redux-toolkit.js.org/introduction/getting-started) for state management
- [Phosphor-icons](https://phosphoricons.com/) for icons
- [Mantine-React-Table](https://v2.mantine-react-table.com/docs/examples/basic) for tables

Check the `package.json` file for more information about all the libraries being used.
This project is using Eslint and Prettier for linting and formatting the code.

## Module-Wise Sync Targets

For production synchronization targets, refer to: [Fusion-README](https://github.com/FusionIIIT/Fusion-README)

## Full-Stack Module-Wise Git Workflow Guide

This section outlines the repository setup, branch management, and contribution workflow for teams working on the Fusion ERP Frontend.

### Phase 1: Team Lead Setup

1. **Fork the Main Repository:**

   * Go to [https://github.com/FusionIIIT/Fusion-client](https://github.com/FusionIIIT/Fusion-client) and click **Fork, **Uncheck** **the ****Checkbox,** **andclick ****Create fork.****
2. **Share:**

   * Distribute your forked repository URL to your team members

### Phase 2: Team Member Setup

1. **Fork the Team Lead's Repository:**

   * Navigate to your Team Lead's fork and fork it to your own GitHub account
2. **Clone Locally:**

   ```sh
   git clone https://github.com/<Your-Username>/Fusion-client.git
   ```
3. **Set Upstream:**

   ```sh
   cd Fusion-client
   git remote add upstream https://github.com/<TeamLead-Username>/Fusion-client.git
   ```

### Phase 3: Module-Wise Branch Switching

**Note:** v1 (MANUAL : Work on Existing Codebase) and v2 (AI : Work from Scracth according to documnets and Fusion README) - If you are assigned to the AI group, replace `v1` with `v2` in the commands below.

Fetch upstream data first:

```sh
cd Fusion-client
git fetch upstream
```

Then run your specific module command:

* **Examination:** `git checkout -b examination-v1 upstream/examination-v1`
* **LMS:** `git checkout -b lms-v1 upstream/lms-v1`
* **Award & Scholarship:** `git checkout -b scholarships-v1 upstream/scholarships-v1`
* **Department:** `git checkout -b department-v1 upstream/department-v1`
* **Other Academic Procedure:** `git checkout -b academic-procedures-v1 upstream/academic-procedures-v1`
* **Announcements:** `git checkout -b announcements-v1 upstream/announcements-v1`
* **Placement Cell + PBI:** `git checkout -b placement-pbi-v1 upstream/placement-pbi-v1`
* **Gymkhana:** `git checkout -b gymkhana-v1 upstream/gymkhana-v1`
* **Primary Health Center:** `git checkout -b health-center-v1 upstream/health-center-v1`
* **Hostel Management:** `git checkout -b hostel-management-v1 upstream/hostel-management-v1`
* **Mess Management:** `git checkout -b mess-management-v1 upstream/mess-management-v1`
* **Visitor Hostel:** `git checkout -b visitor-hostel-v1 upstream/visitor-hostel-v1`
* **Visitor Management System:** `git checkout -b visitor-management-v1 upstream/visitor-management-v1`
* **Dashboards:** `git checkout -b dashboards-v1 upstream/dashboards-v1`
* **File Tracking System:** `git checkout -b file-tracking-v1 upstream/file-tracking-v1`
* **RSPC:** `git checkout -b rspc-v1 upstream/rspc-v1`
* **P&S Management:** `git checkout -b ps-management-v1 upstream/ps-management-v1`
* **HR (EIS):** `git checkout -b hr-eis-v1 upstream/hr-eis-v1`
* **Patent Management System:** `git checkout -b patent-management-v1 upstream/patent-management-v1`
* **Institute Works Department:** `git checkout -b institute-works-v1 upstream/institute-works-v1`
* **Internal Audit and Accounts:** `git checkout -b audit-accounts-v1 upstream/audit-accounts-v1`
* **Complaint Management:** `git checkout -b complaint-management-v1 upstream/complaint-management-v1`

## Setting up the project

1. Fork the repository (as described above)
2. Clone **your forked** repository
3. Change directory to the project folder: `cd Fusion-client`
4. Install all dependencies:
   ```sh
   npm install
   ```
5. Run the development server:
   ```sh
   npm run dev
   ```

   The development server will start at `http://localhost:5173/`

**Important:** Make sure that your backend server is running properly before starting the frontend server.

## Phase 4: Syncing, Committing, and PRs

### Production Sync Targets

* **Frontend Production Branch:** `acad-main`

### Workflow

1. **Sync with Production:**

   * Frequently pull the latest changes from your specific module's production branch to avoid merge conflicts later
   * Team lead syncs first, then team members sync from the team lead's fork

   ```sh
   git pull upstream <your-assigned-branch>
   ```
2. **Make Changes:**

   * Make your code changes and commit them locally to your active module branch
3. **Committing:**

   ```sh
   git add .
   git commit -m "Your descriptive commit message"
   ```
4. **Pushing:**

   ```sh
   git push origin <your-assigned-branch>
   ```
5. **Create Pull Request:**

   * Go to `https://github.com/<your_user_name>/Fusion-client/tree/<your-assigned-branch>` and create a Pull Request
   * **Important:** Target the Team Lead's fork, NOT the main FusionIIIT repository

## Project Structure and important information

1. All the required assets(images, audio, videos) for the project are in the `src/assets` folder.
2. The routes for all the web pages are defined in the `src/App.jsx` file.
3. All the API routes are stored as constants in the `src/routes/api_routes.jsx` file.
4. Only the **global** components are in the `src/components` folder.
5. Only the **global** web pages are in the `src/pages` folder.
6. All the web pages related to a a **module** are in `src/modules/<module-name>` folder.
7. All the components related to a **module** are in the `src/modules/<module-name>/components` folder.
8. All the styles related to a **module** are in the `src/modules/<module-name>/styles` folder.
9. All the state management related code is in the `src/redux` folder. The `src/redux/userSlice.jsx` file contains user-related states.

- Note: You can access the username and role of the user using the `useSelector` hook.

```jsx
import { useSelector } from 'react-redux';

const ExampleComponent = () => {
  const role = useSelector(state => state.user.role);
  const username = useSelector(state => state.user.username);
  return (
    <div>
      {username}
      {role}
    </div>
  );
}
```

- For styles, you can use the `mantine` library for components and css-modules for custom styles(Refer this [guide](https://mantine.dev/styles/css-modules/)).

## Style Guide

- All the folder names should be in kebab-case.
- All the file names should be in camelCase.
- All the constants should be in UPPERCASE.

**Note**: Please make sure to follow the project structure and naming conventions while adding new files or folders to the project.
