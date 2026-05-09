import React from "react";
import { Container, SimpleGrid, Title } from "@mantine/core";
import { ShieldCheck, PencilSimple } from "@phosphor-icons/react";

import PerformanceCard from "../../components/FormComponent/PerformanceCard";
import HrBreadcrumbs from "../../components/HrBreadcrumbs";

function AdminLeaveManagement() {
  // Card for reviewing leave balances.
  const reviewLeaveCard = {
    title: "Employees Leave Balance",
    description: "Review employee leave balances.",
    icon: ShieldCheck,
    link: "/hr/admin_leave/view_employees_leave_balance",
  };

  // Card for managing offline leave form.
  const manageOfflineLeaveCard = {
    title: "Manage Offline Leave Form",
    description: "Handle offline leave submissions.",
    icon: PencilSimple,
    link: "/hr/admin_leave/manage_offline_leave_form",
  };
  // Card for review employee Leave Requests.
  const reviewLeaveRequests = {
    title: "Review Leave Requests",
    description: "Review and manage employee leave requests.",
    icon: PencilSimple,
    link: "/hr/admin_leave/review_leave_requests",
  };

  const exampleItems = [
    { title: "Home", path: "/dashboard" },
    { title: "Human Resources", path: "/hr" },
    { title: "Admin Leave Management", path: "/hr/admin_leave" },
  ];

  return (
    <>
      <HrBreadcrumbs items={exampleItems} />
      <Container size="xxl" py="xl">
        <Title order={2} mb="xl">
          Admin Leave Management
        </Title>
        <SimpleGrid
          cols={{ base: 1, sm: 2, md: 3 }}
          spacing="xl"
          verticalSpacing="xl"
          mt={20}
        >
          <PerformanceCard
            IconComponent={reviewLeaveCard.icon}
            title={reviewLeaveCard.title}
            description={reviewLeaveCard.description}
            link={reviewLeaveCard.link}
          />
          <PerformanceCard
            IconComponent={reviewLeaveRequests.icon}
            title={reviewLeaveRequests.title}
            description={reviewLeaveRequests.description}
            link={reviewLeaveRequests.link}
          />
          <PerformanceCard
            IconComponent={manageOfflineLeaveCard.icon}
            title={manageOfflineLeaveCard.title}
            description={manageOfflineLeaveCard.description}
            link={manageOfflineLeaveCard.link}
          />
        </SimpleGrid>
      </Container>
    </>
  );
}

export default AdminLeaveManagement;
