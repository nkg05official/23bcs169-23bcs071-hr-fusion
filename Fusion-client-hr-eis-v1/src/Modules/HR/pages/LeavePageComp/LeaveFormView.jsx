import React, { useEffect, useState } from "react";
import {
  Button,
  Title,
  Box,
  Grid,
  Text,
  Badge,
  Divider,
  Anchor,
  Table,
  SimpleGrid,
} from "@mantine/core";
import { useNavigate, useParams } from "react-router-dom";
import HrBreadcrumbs from "../../components/HrBreadcrumbs";
import LoadingComponent from "../../components/Loading";
import { EmptyTable } from "../../components/tables/EmptyTable";
import {
  get_leave_form_by_id,
  download_leave_form_pdf,
} from "../../../../routes/hr";
import "./LeaveFormView.css";

const LeaveFormView = () => {
  const { id } = useParams();
  const [fetchedformData, setFetchedFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const admin = new URLSearchParams(window.location.search).get("admin");
  const [exampleItems, setExampleItems] = useState([]);

  useEffect(() => {
    if (admin) {
      setExampleItems([
        { title: "Home", path: "/dashboard" },
        { title: "Human Resources", path: "/hr" },
        { title: "Admin Leave Management", path: "/hr/admin_leave" },
        {
          title: "Leave Requests",
          path: "/hr/admin_leave/review_leave_requests",
        },
        { title: "View Form", path: `/hr/leave/view/${id}?admin=true` },
      ]);
    } else {
      setExampleItems([
        { title: "Home", path: "/dashboard" },
        { title: "Human Resources", path: "/hr" },
        { title: "Leave", path: "/hr/leave" },
        { title: "View Form", path: `/hr/leave/view/${id}` },
      ]);
    }
  }, [admin]);

  useEffect(() => {
    const fetchFormData = async () => {
      const token = localStorage.getItem("authToken");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${get_leave_form_by_id}/${id}`, {
          headers: { Authorization: `Token ${token}` },
        });

        if (!response.ok) {
          throw new Error("Network response was not ok");
        }

        const data = await response.json();
        // Adjust status for null responsibilities
        const adjustedData = {
          ...data.leave_form,
          academicResponsibilityStatus: data.leave_form.academicResponsibility
            ? data.leave_form.academicResponsibilityStatus
            : "Accepted",
          administrativeResponsibilityStatus: data.leave_form
            .administrativeResponsibility
            ? data.leave_form.administrativeResponsibilityStatus
            : "Accepted",
        };
        setFetchedFormData(adjustedData);
        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    };

    fetchFormData();
  }, [id]);

  const handleDownloadPdf = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      return;
    }

    try {
      const response = await fetch(`${download_leave_form_pdf}/${id}`, {
        headers: { Authorization: `Token ${token}` },
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fetchedformData.attachedPdfName;
      a.click();
    } catch (error) {
    }
  };

  if (loading) {
    return <LoadingComponent />;
  }

  if (!fetchedformData) {
    return (
      <>
        <HrBreadcrumbs items={exampleItems} />
        <EmptyTable message="No view data found." />
      </>
    );
  }

  // Leave balances table data
  const leaveBalances = [
    { type: "Casual Leave", balance: fetchedformData.casualLeaveBalance },
    {
      type: "Special Casual Leave",
      balance: fetchedformData.special_casual_leaveBalance,
    },
    { type: "Earned Leave", balance: fetchedformData.earned_leaveBalance },
    { type: "Half Pay Leave", balance: fetchedformData.half_pay_leaveBalance },
    {
      type: "Maternity Leave",
      balance: fetchedformData.maternity_leaveBalance,
    },
    {
      type: "Child Care Leave",
      balance: fetchedformData.child_care_leaveBalance,
    },
    {
      type: "Paternity Leave",
      balance: fetchedformData.paternity_leaveBalance,
    },
  ];

  // Leave types applied data
  const leaveTypesApplied = [
    { type: "Casual Leave", applied: fetchedformData.casualLeave },
    { type: "Vacation Leave", applied: fetchedformData.vacationLeave },
    { type: "Earned Leave", applied: fetchedformData.earnedLeave },
    { type: "Commuted Leave", applied: fetchedformData.commutedLeave },
    {
      type: "Special Casual Leave",
      applied: fetchedformData.specialCasualLeave,
    },
    { type: "Restricted Holiday", applied: fetchedformData.restrictedHoliday },
    { type: "Half Pay Leave", applied: fetchedformData.halfPayLeave },
    { type: "Maternity Leave", applied: fetchedformData.maternityLeave },
    { type: "Child Care Leave", applied: fetchedformData.childCareLeave },
    { type: "Paternity Leave", applied: fetchedformData.paternityLeave },
  ];

  return (
    <>
      <HrBreadcrumbs items={exampleItems} />
      <Box
        style={{
          padding: "25px 30px",
          margin: "20px 5px",
          border: "1px solid #e0e0e0",
          borderRadius: "8px",
        }}
      >
        <Title order={2} style={{ fontWeight: "500", marginBottom: "20px" }}>
          Leave Form Details
        </Title>
        <Grid>
          <Grid.Col span={6}>
            <Text>
              <strong>Status:</strong>{" "}
              <Badge
                color={
                  fetchedformData.status === "Accepted"
                    ? "green"
                    : fetchedformData.status === "Rejected"
                      ? "red"
                      : "yellow"
                }
              >
                {fetchedformData.status}
              </Badge>
            </Text>
          </Grid.Col>

          {fetchedformData.academicResponsibilityStatus === "Accepted" &&
            fetchedformData.administrativeResponsibilityStatus ===
              "Accepted" && (
              <Grid.Col
                span={6}
                style={{ display: "flex", justifyContent: "flex-end" }}
              >
                <Button
                  variant="outline"
                  onClick={() => {
                    if (admin) {
                      navigate(
                        `../FormView/leaveform_track/${fetchedformData.file_id}?admin=true`,
                      );
                    } else {
                      navigate(
                        `../FormView/leaveform_track/${fetchedformData.file_id}`,
                      );
                    }
                  }}
                >
                  Track Status
                </Button>
              </Grid.Col>
            )}
        </Grid>

        <Box
          sx={{
            maxWidth: "850px",
            margin: "auto",
            padding: "30px",
            border: "1px solid #ddd",
            borderRadius: "8px",
            backgroundColor: "#f9f9f9",
          }}
        >
          {/* Employee Details */}
          <Title order={4} style={{ marginTop: "30px" }}>
            Employee Details
          </Title>
          <Divider my="sm" />
          <Grid gutter="lg" style={{ padding: "0 20px" }}>
            <Grid.Col span={6}>
              <Text>
                <strong>Name:</strong> {fetchedformData.name}
              </Text>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text>
                <strong>Designation:</strong> {fetchedformData.designation}
              </Text>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text>
                <strong>Personal File Number:</strong> {fetchedformData.pfno}
              </Text>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text>
                <strong>Department:</strong> {fetchedformData.department}
              </Text>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text>
                <strong>Application Type:</strong>{" "}
                <Badge
                  color={
                    fetchedformData.application_type === "Online"
                      ? "blue"
                      : "green"
                  }
                >
                  {fetchedformData.application_type}
                </Badge>
              </Text>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text>
                <strong>Submission Date:</strong>{" "}
                {fetchedformData.submissionDate}
              </Text>
            </Grid.Col>
          </Grid>

          {/* Leave Details */}
          <Title order={4} mt="xl" style={{ marginTop: "30px" }}>
            Leave Details
          </Title>
          <Divider my="sm" />
          <Grid gutter="lg" style={{ padding: "0 20px" }}>
            <Grid.Col span={6}>
              <Text>
                <strong>Leave Start Date:</strong>{" "}
                {fetchedformData.leaveStartDate}
              </Text>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text>
                <strong>Leave End Date:</strong> {fetchedformData.leaveEndDate}
              </Text>
            </Grid.Col>
            <Grid.Col span={12}>
              <Text>
                <strong>Purpose of Leave:</strong> {fetchedformData.purpose}
              </Text>
            </Grid.Col>
            <Grid.Col span={12}>
              <Text>
                <strong>Remarks:</strong> {fetchedformData.remarks}
              </Text>
            </Grid.Col>
          </Grid>

          {/* Combined Leave Types and Balances Section */}
          <Title order={4} mt="xl" style={{ marginTop: "30px" }}>
            Leave Type Details
          </Title>
          <Divider my="sm" />
          <Grid gutter="xl">
            <Grid.Col
              span={6}
              style={{ borderRight: "1px solid #ccc", paddingRight: "24px" }}
            >
              <Title order={5} mb="sm" style={{ textAlign: "center" }}>
                Leave Types Applied
              </Title>
              <Table>
                <thead>
                  <tr style={{ backgroundColor: "#e9ecef" }}>
                    <th
                      style={{
                        padding: "8px",
                        border: "1px solid #ccc",
                        textAlign: "left",
                        fontWeight: "bold",
                      }}
                    >
                      Leave Type
                    </th>
                    <th
                      style={{
                        padding: "8px",
                        border: "1px solid #ccc",
                        textAlign: "center",
                        fontWeight: "bold",
                      }}
                    >
                      Days Applied
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leaveTypesApplied.map((leave, index) => (
                    <tr
                      key={`applied-${index}`}
                      style={{
                        backgroundColor:
                          index % 2 === 0 ? "#ffffff" : "#e8e8e8",
                        "&:hover": {
                          backgroundColor: "#f1f3f5",
                        },
                      }}
                    >
                      <td
                        style={{
                          padding: "8px",
                          border: "1px solid #ccc",
                          textAlign: "left",
                        }}
                      >
                        {leave.type}
                      </td>
                      <td
                        style={{
                          padding: "8px",
                          border: "1px solid #ccc",
                          textAlign: "center",
                        }}
                      >
                        {leave.applied || "0"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Grid.Col>

            <Grid.Col span={6} style={{ paddingLeft: "24px" }}>
              <Title order={5} mb="sm" style={{ textAlign: "center" }}>
                Leave Balances
              </Title>
              <Table>
                <thead>
                  <tr style={{ backgroundColor: "#e9ecef" }}>
                    <th
                      style={{
                        padding: "8px",
                        border: "1px solid #ccc",
                        textAlign: "left",
                        fontWeight: "bold",
                      }}
                    >
                      Leave Type
                    </th>
                    <th
                      style={{
                        padding: "8px",
                        border: "1px solid #ccc",
                        textAlign: "center",
                        fontWeight: "bold",
                      }}
                    >
                      Balance (Days)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leaveBalances.map((leave, index) => {
                    const balance = parseFloat(leave.balance) || 0;
                    const isNegative = balance < 0;
                    const isPositive = balance > 0;

                    return (
                      <tr
                        key={`balance-${index}`}
                        style={{
                          backgroundColor:
                            index % 2 === 0 ? "#ffffff" : "#e8e8e8",
                          "&:hover": {
                            backgroundColor: "#f1f3f5",
                          },
                        }}
                      >
                        <td
                          style={{
                            padding: "8px",
                            border: "1px solid #ccc",
                            textAlign: "left",
                          }}
                        >
                          {leave.type}
                        </td>
                        <td
                          style={{
                            padding: "8px",
                            border: "1px solid #ccc",
                            textAlign: "center",
                            color: isNegative
                              ? "#ff0000"
                              : isPositive
                                ? "#28a745"
                                : "inherit",
                            fontWeight:
                              isNegative || isPositive ? "bold" : "normal",
                          }}
                        >
                          {leave.balance || "0"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </Grid.Col>
          </Grid>

          {/* Station Leave */}
          {fetchedformData.stationLeave && (
            <>
              <Title order={4} mt="xl" style={{ marginTop: "30px" }}>
                Station Leave Details
              </Title>
              <Divider my="sm" />
              <Grid gutter="lg" style={{ padding: "0 20px" }}>
                <Grid.Col span={6}>
                  <Text>
                    <strong>Station Leave Start Date:</strong>{" "}
                    {fetchedformData.stationLeaveStartDate}
                  </Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text>
                    <strong>Station Leave End Date:</strong>{" "}
                    {fetchedformData.stationLeaveEndDate}
                  </Text>
                </Grid.Col>
                <Grid.Col span={12}>
                  <Text>
                    <strong>Address During Station Leave:</strong>{" "}
                    {fetchedformData.stationLeaveAddress}
                  </Text>
                </Grid.Col>
              </Grid>
            </>
          )}

          {/* Responsibility Transfer - Only show if at least one exists */}
          {(fetchedformData.academicResponsibility ||
            fetchedformData.administrativeResponsibility) && (
            <>
              <Title order={4} mt="xl" style={{ marginTop: "30px" }}>
                Responsibility Transfer
              </Title>
              <Divider my="sm" />
              <Grid gutter="lg" style={{ padding: "0 20px" }}>
                {fetchedformData.academicResponsibility && (
                  <Grid.Col span={6}>
                    <Text style={{ marginBottom: "10px" }}>
                      <strong>Academic Responsibility:</strong>{" "}
                      {fetchedformData.academicResponsibility}
                    </Text>
                    <Text style={{ marginBottom: "10px" }}>
                      <strong>Designation:</strong>{" "}
                      {fetchedformData.academicResponsibilityDesignation}
                    </Text>
                    <Text style={{ marginBottom: "10px" }}>
                      <strong>Status:</strong>{" "}
                      <Badge
                        color={
                          fetchedformData.academicResponsibilityStatus ===
                          "Accepted"
                            ? "green"
                            : fetchedformData.academicResponsibilityStatus ===
                                "Rejected"
                              ? "red"
                              : "yellow"
                        }
                      >
                        {fetchedformData.academicResponsibilityStatus}
                      </Badge>
                    </Text>
                  </Grid.Col>
                )}
                {fetchedformData.administrativeResponsibility && (
                  <Grid.Col span={6}>
                    <Text style={{ marginBottom: "10px" }}>
                      <strong>Administrative Responsibility:</strong>{" "}
                      {fetchedformData.administrativeResponsibility}
                    </Text>
                    <Text style={{ marginBottom: "10px" }}>
                      <strong>Designation:</strong>{" "}
                      {fetchedformData.administrativeResponsibilityDesignation}
                    </Text>
                    <Text style={{ marginBottom: "10px" }}>
                      <strong>Status:</strong>{" "}
                      <Badge
                        color={
                          fetchedformData.administrativeResponsibilityStatus ===
                          "Accepted"
                            ? "green"
                            : fetchedformData.administrativeResponsibilityStatus ===
                                "Rejected"
                              ? "red"
                              : "yellow"
                        }
                      >
                        {fetchedformData.administrativeResponsibilityStatus}
                      </Badge>
                    </Text>
                  </Grid.Col>
                )}
              </Grid>
            </>
          )}

          {/* Attachments */}
          <Title order={4} mt="xl">
            Attachments
          </Title>
          <Divider my="sm" />
          <Grid gutter="lg" style={{ padding: "0 20px" }}>
            <Grid.Col span={6}>
              <Text>
                <strong>Attached PDF:</strong>{" "}
                {fetchedformData.attachedPdfName ? (
                  <Anchor onClick={handleDownloadPdf} download>
                    {fetchedformData.attachedPdfName}
                  </Anchor>
                ) : (
                  "No file attached"
                )}
              </Text>
            </Grid.Col>
          </Grid>

          {/* Forward Application */}
          {fetchedformData.status === "Pending" &&
            (fetchedformData.academicResponsibilityStatus === "Pending" ||
              fetchedformData.administrativeResponsibilityStatus ===
                "Pending") && (
              <>
                <Title order={4} style={{ marginTop: "30px" }}>
                  Forward Application
                </Title>
                <Divider my="sm" />
                <Grid gutter="lg" style={{ padding: "0 20px" }}>
                  <Grid.Col span={6}>
                    <Text>
                      <strong>Next receiver:</strong>{" "}
                      {fetchedformData.firstRecievedBy}
                    </Text>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text>
                      <strong>Next receiver's Designation:</strong>{" "}
                      {fetchedformData.firstRecievedByDesignation}
                    </Text>
                  </Grid.Col>
                </Grid>
              </>
            )}

          {/* Approval */}
          {fetchedformData.status === "Accepted" &&
            fetchedformData.approvedBy && (
              <>
                <Title order={4} mt="xl">
                  Approval
                </Title>
                <Divider my="sm" />
                <Grid gutter="lg" style={{ padding: "0 20px" }}>
                  <Grid.Col span={6}>
                    <Text>
                      <strong>Approved By:</strong> {fetchedformData.approvedBy}
                    </Text>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text>
                      <strong>Designation:</strong>{" "}
                      {fetchedformData.approvedByDesignation}
                    </Text>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text>
                      <strong>Approved Date:</strong>{" "}
                      {fetchedformData.approvedDate}
                    </Text>
                  </Grid.Col>
                </Grid>
              </>
            )}
        </Box>
      </Box>
    </>
  );
};

export default LeaveFormView;
