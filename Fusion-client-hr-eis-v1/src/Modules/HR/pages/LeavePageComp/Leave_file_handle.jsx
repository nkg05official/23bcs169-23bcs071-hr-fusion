import React, { useEffect, useState } from "react";
import {
  Button,
  Title,
  Box,
  Grid,
  Text,
  Badge,
  Divider,
  Textarea,
  Group,
  Anchor,
  Table,
} from "@mantine/core";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle, XCircle } from "@phosphor-icons/react";
import HrBreadcrumbs from "../../components/HrBreadcrumbs";
import LoadingComponent from "../../components/Loading";
import { EmptyTable } from "../../components/tables/EmptyTable";
import {
  get_leave_form_by_id,
  handle_leave_file,
  hod_decision_on_leave,
  sanctioning_decision_on_leave,
  download_leave_form_pdf,
} from "../../../../routes/hr";
import { useSelector } from "react-redux";
import { selectHrNormalizedRole } from "../../selectors";
// import "./LeaveFileHandle.css";

const LeaveFileHandle = () => {
  const { id } = useParams();
  const [fetchedformData, setFetchedFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [action, setAction] = useState(null); // "accept" or "reject"
  const [fileRemarks, setFileRemarks] = useState(""); // Remarks for the action
  const [submitting, setSubmitting] = useState(false); // Loading state for submission
  const navigate = useNavigate();
  const normalizedRole = useSelector(selectHrNormalizedRole);
  const isHOD =
    normalizedRole.includes("hod") ||
    normalizedRole.includes("head of department");
  const isSanctioningAuthority = ["dean", "registrar", "director", "principal"].some((item) =>
    normalizedRole.includes(item),
  );

  const exampleItems = [
    { title: "Home", path: "/dashboard" },
    { title: "Human Resources", path: "/hr" },
    { title: "Leave", path: "/hr/leave" },
    { title: "Handle Leave", path: `/hr/leave/handle/${id}` },
  ];

  useEffect(() => {
    const fetchFormData = async () => {
      const token = localStorage.getItem("authToken");
      if (!token) {
        setError("Authentication token is missing.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${get_leave_form_by_id}/${id}`, {
          headers: { Authorization: `Token ${token}` },
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.message || "Network response was not ok");
        }

        const payload = data?.data ?? data;
        const leaveForm = payload?.leave_form || null;
        if (!leaveForm) {
          throw new Error(data?.message || "Leave form data not found");
        }

        setFetchedFormData(leaveForm);
        setLoading(false);
      } catch (error) {
        setError(error?.message || "Failed to fetch form data. Please try again.");
        setLoading(false);
      }
    };

    fetchFormData();
  }, [id]);

  const handleActionSubmit = async () => {
    if (!action) {
      alert("Please select an action (Accept or Reject).");
      return;
    }

    const remarksText = (fileRemarks || "").trim();
    if (action === "reject" && remarksText.length < 10) {
      alert("Rejection remarks must be at least 10 characters long.");
      return;
    }

    const token = localStorage.getItem("authToken");
    if (!token) {
      setError("Authentication token is missing.");
      return;
    }

    setSubmitting(true);

    try {
      const mappedAction = action === "accept" ? "approve" : "reject";
      const useHierarchyEndpoint = isHOD || isSanctioningAuthority;
      const endpoint = isHOD
        ? `${hod_decision_on_leave}/${id}/`
        : isSanctioningAuthority
          ? `${sanctioning_decision_on_leave}/${id}/`
          : `${handle_leave_file}/${id}/`;

      const payload = useHierarchyEndpoint
        ? { action: mappedAction, remarks: fileRemarks }
        : {
            action,
            fileRemarks,
          };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        alert(
          result.error || result.message || "Failed to handle leave action. Please try again.",
        );
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const nextApprover = result?.data?.next_approver;
      const nextDesignation = result?.data?.next_approver_designation;
      const successMsg = nextApprover
        ? `${result.message || "Action completed successfully."} Next: ${nextApprover}${nextDesignation ? ` (${nextDesignation})` : ""}`
        : (result.message || "Action completed successfully.");
      alert(successMsg);
      const returnedState = result?.data?.state;
      setFetchedFormData((prev) => ({
        ...prev,
        status:
          action === "reject"
            ? "Rejected"
            : returnedState === "final_approved"
              ? "Accepted"
              : "Pending",
        state: returnedState || prev.state,
      }));
    } catch (error) {
      alert("You are not authorized to perform this action.");
      setError("Failed to handle leave action. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };
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
        <EmptyTable message="No leave form data found." />
      </>
    );
  }

  return (
    <>
      <HrBreadcrumbs items={exampleItems} />
      {/* Title */}
      <Box
        style={{
          padding: "25px 30px",
          margin: "20px 5px",
          border: "1px solid #e0e0e0",
          borderRadius: "8px",
        }}
      >
        <Title order={2} style={{ fontWeight: "500", marginBottom: "20px" }}>
          Handle Leave Form
        </Title>

        <Grid>
          {/* Left Column: Status Badge */}

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

          {/* Right Column: Track Status Button */}
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
                    // Add functionality to track status
                    navigate(
                      `../FormView/leaveform_track/${fetchedformData.file_id}`,
                    );
                  }}
                >
                  Track Status
                </Button>
              </Grid.Col>
            )}
        </Grid>
        <br />
        {/* Form Data Display */}
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
          {/* Section 1: Employee Details */}
          <Title order={4}>Employee Details</Title>
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

          {/* Section 2: Leave Details */}
          <Title order={4} mt="xl">
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
          {/* Section 3: Complete Leave Types and Balances */}
          <Title order={4} mt="xl" style={{ marginTop: "30px" }}>
            Leave Details
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
                  {[
                    {
                      type: "Casual Leave",
                      applied: fetchedformData.casualLeave,
                    },
                    {
                      type: "Vacation Leave",
                      applied: fetchedformData.vacationLeave,
                    },
                    {
                      type: "Earned Leave",
                      applied: fetchedformData.earnedLeave,
                    },
                    {
                      type: "Commuted Leave",
                      applied: fetchedformData.commutedLeave,
                    },
                    {
                      type: "Special Casual Leave",
                      applied: fetchedformData.specialCasualLeave,
                    },
                    {
                      type: "Restricted Holiday",
                      applied: fetchedformData.restrictedHoliday,
                    },
                    {
                      type: "Half Pay Leave",
                      applied: fetchedformData.halfPayLeave,
                    },
                    {
                      type: "Maternity Leave",
                      applied: fetchedformData.maternityLeave,
                    },
                    {
                      type: "Child Care Leave",
                      applied: fetchedformData.childCareLeave,
                    },
                    {
                      type: "Paternity Leave",
                      applied: fetchedformData.paternityLeave,
                    },
                  ].map((leave, index) => (
                    <tr
                      key={`applied-${index}`}
                      style={{
                        backgroundColor:
                          index % 2 === 0 ? "#ffffff" : "#e8e8e8",
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
                          fontWeight: leave.applied > 0 ? "bold" : "normal",
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
                All Leave Balances
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
                  {[
                    {
                      type: "Casual Leave",
                      balance: fetchedformData.casualLeaveBalance,
                    },
                    {
                      type: "Special Casual Leave",
                      balance: fetchedformData.special_casual_leaveBalance,
                    },
                    {
                      type: "Earned Leave",
                      balance: fetchedformData.earned_leaveBalance,
                    },
                    {
                      type: "Half Pay Leave",
                      balance: fetchedformData.half_pay_leaveBalance,
                    },
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
                  ].map((leave, index) => {
                    const balance = parseFloat(leave.balance) || 0;
                    const isNegative = balance < 0;
                    const isPositive = balance > 0;

                    return (
                      <tr
                        key={`balance-${index}`}
                        style={{
                          backgroundColor:
                            index % 2 === 0 ? "#ffffff" : "#e8e8e8",
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

          {/* Section 4: Station Leave */}
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

          {/* Section 5: Responsibility Transfer */}
          <Title order={4} mt="xl" style={{ marginTop: "30px" }}>
            Responsibility Transfer
          </Title>
          <Divider my="sm" />
          {!fetchedformData.academicResponsibility &&
          !fetchedformData.administrativeResponsibility ? (
            <Text style={{ padding: "0 20px" }}>Not Applicable</Text>
          ) : (
            <Grid gutter="lg" style={{ padding: "0 20px" }}>
              {fetchedformData.academicResponsibility && (
                <Grid.Col
                  span={fetchedformData.administrativeResponsibility ? 6 : 12}
                >
                  <Text style={{ marginBottom: "10px" }}>
                    <strong>Academic Responsibility:</strong>{" "}
                    {fetchedformData.academicResponsibility}
                  </Text>
                  <Text style={{ marginBottom: "10px" }}>
                    <strong>Academic Responsibility Designation:</strong>{" "}
                    {fetchedformData.academicResponsibilityDesignation}
                  </Text>
                  <Text style={{ marginBottom: "10px" }}>
                    <strong>Academic Responsibility Status:</strong>{" "}
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
                <Grid.Col
                  span={fetchedformData.academicResponsibility ? 6 : 12}
                >
                  <Text style={{ marginBottom: "10px" }}>
                    <strong>Administrative Responsibility:</strong>{" "}
                    {fetchedformData.administrativeResponsibility}
                  </Text>
                  <Text style={{ marginBottom: "10px" }}>
                    <strong>Administrative Responsibility Designation:</strong>{" "}
                    {fetchedformData.administrativeResponsibilityDesignation}
                  </Text>
                  <Text style={{ marginBottom: "10px" }}>
                    <strong>Administrative Responsibility Status:</strong>{" "}
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
          )}

          {/* Section 6: Attachments */}
          <Title order={4} mt="xl">
            Attachments
          </Title>
          <Divider my="sm" />
          <Grid gutter="lg" style={{ padding: "0 20px" }}>
            <Grid.Col span={6}>
              <Text>
                <strong>Attached PDF:</strong>{" "}
                {fetchedformData.attachedPdfName ? (
                  <Anchor onClick={(e) => handleDownloadPdf(e)} download>
                    {fetchedformData.attachedPdfName}
                  </Anchor>
                ) : (
                  "No file attached"
                )}
              </Text>
            </Grid.Col>
          </Grid>
          {/* add note that Please Track status of the file before doing any Actions if you don't have current ownership the Action will not be performed */}

          {/* Section 7: Action Buttons */}
          <Title order={4} mt="xl">
            Select Action
          </Title>
          <Text color="red" mt="md" style={{ padding: "0 20px" }}>
            <strong>Note:</strong> Approve/Reject is hierarchy-driven. On approval,
            requests are auto-forwarded to the next configured approver.
          </Text>
          <Divider my="sm" />
          <Group position="center" mt="xl">
            <Button
              leftIcon={<CheckCircle size={20} />}
              onClick={() => setAction("accept")}
              variant={action === "accept" ? "filled" : "outline"}
              disabled={fetchedformData.status !== "Pending"}
            >
              Accept
            </Button>
            <Button
              leftIcon={<XCircle size={20} />}
              onClick={() => setAction("reject")}
              variant={action === "reject" ? "filled" : "outline"}
              disabled={fetchedformData.status !== "Pending"}
            >
              Reject
            </Button>
          </Group>

          {/* Section 5: File Remarks */}
          <Title order={4} mt="xl">
            File Remarks
          </Title>
          <Divider my="sm" />
          <Textarea
            placeholder="Enter remarks for the action"
            value={fileRemarks}
            onChange={(e) => setFileRemarks(e.target.value)}
            style={{ marginBottom: "20px" }}
          />

          {/* Section 6: Submit Button */}
          <Group position="center" mt="xl">
            <Button
              onClick={handleActionSubmit}
              loading={submitting}
              disabled={!action}
            >
              Submit Action
            </Button>
          </Group>
        </Box>
      </Box>
    </>
  );
};

export default LeaveFileHandle;
