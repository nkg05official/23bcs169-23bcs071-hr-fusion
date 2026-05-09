import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Container,
  Title,
  Card,
  Text,
  Divider,
  Loader,
  Table,
  TextInput,
  Select,
  Flex,
  Button,
} from "@mantine/core";
import { useNavigate } from "react-router-dom";
import HrBreadcrumbs from "../../components/HrBreadcrumbs";
import { admin_get_all_leave_balances } from "../../../../routes/hr";
import { fetchJsonWithAuth } from "../../services/hrService";

function ViewEmployeeLB() {
  const navigate = useNavigate();
  const [allEmployees, setAllEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abbreviationRef = useRef(null);

  const leaveTypes = [
    {
      key: "casual_leave",
      allottedKey: "casual_leave_allotted",
      takenKey: "casual_leave_taken",
      abbrev: "CL",
      fullName: "Casual Leave",
    },
    {
      key: "special_casual_leave",
      allottedKey: "special_casual_leave_allotted",
      takenKey: "special_casual_leave_taken",
      abbrev: "SCL",
      fullName: "Special Casual Leave",
    },
    {
      key: "earned_leave",
      allottedKey: "earned_leave_allotted",
      takenKey: "earned_leave_taken",
      abbrev: "EL",
      fullName: "Earned Leave",
    },
    {
      key: "half_pay_leave",
      allottedKey: "half_pay_leave_allotted",
      takenKey: "half_pay_leave_taken",
      abbrev: "HPL",
      fullName: "Half Pay Leave",
    },
    {
      key: "maternity_leave",
      allottedKey: "maternity_leave_allotted",
      takenKey: "maternity_leave_taken",
      abbrev: "ML",
      fullName: "Maternity Leave",
    },
    {
      key: "child_care_leave",
      allottedKey: "child_care_leave_allotted",
      takenKey: "child_care_leave_taken",
      abbrev: "CCL",
      fullName: "Child Care Leave",
    },
    {
      key: "paternity_leave",
      allottedKey: "paternity_leave_allotted",
      takenKey: "paternity_leave_taken",
      abbrev: "PL",
      fullName: "Paternity Leave",
    },
    {
      key: "leave_encashment",
      allottedKey: "leave_encashment_allotted",
      takenKey: "leave_encashment_taken",
      abbrev: "LE",
      fullName: "Leave Encashment",
    },
    {
      key: "restricted_holiday",
      allottedKey: "restricted_holiday_allotted",
      takenKey: "restricted_holiday_taken",
      abbrev: "RH",
      fullName: "Restricted Holiday",
    },
  ];

  // Fetch employee/leave details from the API.
  useEffect(() => {
    const fetchEmployeesAndLeaveData = async () => {
      setLoading(true);
      try {
        const data = await fetchJsonWithAuth(
          admin_get_all_leave_balances,
          "Failed to fetch leave details",
        );
        const mergedData = data.leave_balances.map((emp) => {
          const { employee_id, employee_username, employee_fullname, ...rest } =
            emp;
          return {
            id: employee_id,
            username: employee_username,
            name: employee_fullname,
            ...rest,
          };
        });
        setAllEmployees(mergedData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployeesAndLeaveData();
  }, []);

  // Compute unique department options if available.
  const departmentOptions = Array.from(
    new Set(
      allEmployees
        .map((emp) => emp.department)
        .filter((dept) => dept && dept.trim() !== ""),
    ),
  ).sort();

  // Handle search and department filter changes.
  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleDepartmentChange = (value) => {
    setDepartmentFilter(value);
  };

  const filteredEmployees = useMemo(() => {
    let filtered = allEmployees;
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (normalizedQuery) {
      filtered = filtered.filter(
        (emp) =>
          emp.name.toLowerCase().includes(normalizedQuery) ||
          emp.username.toLowerCase().includes(normalizedQuery),
      );
    }

    if (departmentFilter !== "All") {
      filtered = filtered.filter((emp) => emp.department === departmentFilter);
    }

    return filtered;
  }, [allEmployees, searchQuery, departmentFilter]);

  // Handle row click to navigate to employee's leave review page
  const handleRowClick = (username) => {
    navigate(`/hr/admin_leave/review_leave_requests?emp=${username}`);
  };

  // Standard table cell styling.
  const headerCellStyle = {
    padding: "8px",
    border: "1px solid #ccc",
    textAlign: "left",
    backgroundColor: "#e9ecef",
    fontWeight: "bold",
  };

  const cellStyle = {
    padding: "8px",
    border: "1px solid #ccc",
    textAlign: "left",
    cursor: "pointer", // Add pointer cursor to indicate clickable rows
  };

  const scrollToAbbreviations = () => {
    abbreviationRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  // Breadcrumbs for navigation.
  const exampleItems = [
    { title: "Home", path: "/dashboard" },
    { title: "Human Resources", path: "/hr" },
    { title: "Admin Leave Management", path: "/hr/admin_leave" },
    {
      title: "Review Employee's Leave Balances",
      path: "/hr/admin_leave/view_employees_leave_balance",
    },
  ];

  return (
    <>
      <HrBreadcrumbs items={exampleItems} />
      <Container size="xl" py="xl">
        <Title order={2} mb="lg">
          Employees List with Leave Details
        </Title>

        {/* Top Section: Search/Filter Panel & Abbreviation Chart */}

        <Flex gap="md" align="flex-end">
          <TextInput
            placeholder="Search by name or username"
            label="Search Employees"
            value={searchQuery}
            onChange={handleSearchChange}
            style={{ maxWidth: "300px", flex: 1 }}
          />
          <Select
            label="Filter by Department"
            placeholder="Select Department"
            data={["All", ...departmentOptions]}
            value={departmentFilter}
            onChange={handleDepartmentChange}
            style={{ maxWidth: "300px", flex: 1 }}
          />
          {/* a button to take it to abbreviatio */}
          <Button variant="outline" onClick={scrollToAbbreviations}>
            View Abbreviations
          </Button>
        </Flex>

        <Divider mb="xl" />

        {/* Main Employee List Table */}
        {loading ? (
          <Loader />
        ) : error ? (
          <Text color="red">{error}</Text>
        ) : filteredEmployees.length ? (
          <div
            className="striped-table-container"
            style={{ overflowX: "auto" }}
          >
            <style>{`
              .striped-table-container table tbody tr:nth-child(odd) {
                background-color: #e8e8e8 !important;
              }
              .striped-table-container table tbody tr:nth-child(even) {
                background-color: #ffffff !important;
              }
              .striped-table-container table tbody tr:hover {
                background-color: #f1f3f5 !important;
              }
            `}</style>
            <Text style={{ fontWeight: "bold", marginBottom: "25px" }}>
              Total Matched Employees: {filteredEmployees.length}
            </Text>
            <Table
              striped
              highlightOnHover
              horizontalSpacing="md"
              verticalSpacing="md"
            >
              <thead>
                <tr>
                  <th style={headerCellStyle}>#</th>
                  <th style={headerCellStyle}>ID</th>
                  <th style={headerCellStyle}>Name</th>
                  <th style={headerCellStyle}>Username</th>
                  <th style={headerCellStyle}>Department</th>
                  {leaveTypes.map((leave) => (
                    <React.Fragment key={leave.key}>
                      <th style={headerCellStyle}>{leave.abbrev} A</th>
                      <th style={headerCellStyle}>{leave.abbrev} T</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp, index) => (
                  <tr
                    key={emp.id}
                    onClick={() => handleRowClick(emp.username)}
                    style={{ cursor: "pointer" }} // Make rows look clickable
                  >
                    <td style={cellStyle}>{index + 1}</td>
                    <td style={cellStyle}>{emp.id}</td>
                    <td style={cellStyle}>{emp.name}</td>
                    <td style={cellStyle}>{emp.username}</td>
                    <td style={cellStyle}>{emp.department || "N/A"}</td>
                    {leaveTypes.map((leave) => (
                      <React.Fragment key={leave.key}>
                        <td style={cellStyle}>
                          {emp[leave.allottedKey] !== undefined
                            ? emp[leave.allottedKey]
                            : "-"}
                        </td>
                        <td style={cellStyle}>
                          {emp[leave.takenKey] !== undefined
                            ? emp[leave.takenKey]
                            : "-"}
                        </td>
                      </React.Fragment>
                    ))}
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        ) : (
          <Text>No employees found.</Text>
        )}
        <br />
        <Divider mb="xl" />
        <Card
          ref={abbreviationRef}
          withBorder
          shadow="sm"
          p="md"
          mb="xl"
          style={{ overflowX: "auto" }}
        >
          <Title order={4} mb="sm" style={{ fontSize: "1.1rem" }}>
            Leave Type Abbreviations
          </Title>
          <Table
            striped
            highlightOnHover={false}
            fontSize="sm"
            verticalSpacing="xs"
            horizontalSpacing="md"
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "left",
                    padding: "12px",
                    backgroundColor: "#f8f9fa",
                  }}
                >
                  Leave Type
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "12px",
                    backgroundColor: "#f8f9fa",
                  }}
                >
                  Abbreviation
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "12px",
                    backgroundColor: "#f8f9fa",
                  }}
                >
                  Allotted
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "12px",
                    backgroundColor: "#f8f9fa",
                  }}
                >
                  Taken
                </th>
              </tr>
            </thead>
            <tbody>
              {leaveTypes.map((leave) => (
                <tr key={leave.key}>
                  <td style={{ padding: "12px" }}>{leave.fullName}</td>
                  <td style={{ padding: "12px", fontWeight: 600 }}>
                    {leave.abbrev}
                  </td>
                  <td style={{ padding: "12px" }}>{`${leave.abbrev} A`}</td>
                  <td style={{ padding: "12px" }}>{`${leave.abbrev} T`}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </Container>
    </>
  );
}

export default ViewEmployeeLB;
