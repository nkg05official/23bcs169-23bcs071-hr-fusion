// export default Hr_Dashboard;

import React, { useMemo } from "react";
import { SimpleGrid } from "@mantine/core";
// import { Link } from "react-router-dom";
import {
  Briefcase,
  ClipboardText,
  Buildings,
  User,
  FilePlus,
  ShieldCheck,
  ListChecks,
} from "@phosphor-icons/react";
import { useSelector } from "react-redux";
import PerformanceCard from "../components/FormComponent/PerformanceCard";
import classes from "./Hr_Dashboard.module.css";
// import { HeroBanner } from "../components/HeroBanner";
import HrBreadcrumbs from "../components/HrBreadcrumbs";
import { selectHrNormalizedRole } from "../selectors";

const mockdata = [
  {
    title: "Leave Management",
    description: "Manage and apply for leaves effortlessly.",
    icon: Briefcase,
    link: "/hr/leave",
  },
  {
    title: "CPDA Advance",
    description: "Handle CPDA advance requests with ease.",
    icon: ClipboardText,
    link: "/hr/cpda_adv",
  },
  {
    title: "LTC",
    description: "Manage LTC claims and requests seamlessly.",
    icon: Buildings,
    link: "/hr/ltc",
  },
  {
    title: "CPDA Claim",
    description: "Submit and track CPDA claims.",
    icon: FilePlus,
    link: "/hr/cpda_claim",
  },
  {
    title: "Appraisal",
    description: "Performance appraisal management.",
    icon: User,
    link: "/hr/appraisal",
  },
  {
    title: "Review Leave Requests",
    description: "Review and approve departmental leave requests.",
    icon: ListChecks,
    link: "/hr/admin_leave/review_leave_requests",
  },
  {
    title: "Admin Leave Management",
    description: "Manage leave requests across the organization.",
    icon: ShieldCheck,
    link: "/hr/admin_leave",
  },
];


const exampleItems = [
  { title: "Home", path: "/dashboard" },
  { title: "Human Resources", path: "/hr" },
];

function Hr_Dashboard() {
  const role = useSelector(selectHrNormalizedRole);

  const features = useMemo(
    () =>
      mockdata.map((feature) => {
        const isHRAdmin = ["SectionHead_HR", "hr", "hradmin", "admin"].includes(role);
        const isHOD = role && role.includes("hod");
        const isSanctioningAuthority =
          role &&
          ["dean", "registrar", "director", "principal"].some((item) =>
            role.includes(item),
          );
        const isManager = isHRAdmin || isHOD || isSanctioningAuthority;

        if (
          feature.title === "Admin Leave Management" &&
          !isHRAdmin
        ) {
          return null;
        }

        if (
          feature.title === "Review Leave Requests" &&
          !isManager
        ) {
          return null;
        }

        return (
          <PerformanceCard
            key={feature.title}
            IconComponent={feature.icon}
            title={feature.title}
            description={feature.description}
            link={feature.link}
          />
        );
      }),
    [role],
  );

  return (
    <div size="lg" className={classes.hrdashboardContainer}>
      <HrBreadcrumbs items={exampleItems} />
      {/* <HeroBanner /> */}
      <SimpleGrid
        cols={{ base: 1, sm: 2, md: 3 }}
        spacing="xl"
        verticalSpacing="xl"
        mt={20}
      >
        {features}
      </SimpleGrid>
    </div>
  );
}

export default Hr_Dashboard;
