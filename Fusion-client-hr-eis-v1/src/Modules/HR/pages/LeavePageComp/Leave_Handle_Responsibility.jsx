import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  Button,
  Title,
  Box,
  Grid,
  Text,
  Badge,
  Divider,
  Anchor,
  Group,
} from "@mantine/core";
import { CheckCircle, XCircle } from "@phosphor-icons/react";
import HrBreadcrumbs from "../../components/HrBreadcrumbs";
import LoadingComponent from "../../components/Loading";
import { EmptyTable } from "../../components/tables/EmptyTable";
import { get_leave_form_by_id } from "../../../../routes/hr";
import {
  handle_leave_academic_responsibility,
  handle_leave_administrative_responsibility,
} from "../../../../routes/hr"; // Replace with the correct API route

const LeaveHandleResponsibility = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [fetchedformData, setFetchedFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionStatus, setActionStatus] = useState(null);

  const responsibilityType = searchParams.get("query"); // "academic" or "administrative"

  const exampleItems = [
    { title: "Home", path: "/dashboard" },
    { title: "Human Resources", path: "/hr" },
    { title: "Leave", path: "/hr/leave" },
    {
      title: "Handle Responsibility",
      path: `/hr/leave/handle/${id}?query=${responsibilityType}`,
    },
  ];

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
        setFetchedFormData(data.leave_form); // Assuming the API returns data in a `leave_form` key
        setLoading(false);
      } catch (error) {
        setError("Failed to fetch form data.");
        setLoading(false);
      }
    };

    fetchFormData();
  }, [id]);

  const handleAction = async (action) => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setError("Authentication token is missing.");
      return;
    }
    // if query is academic, then handle academic responsibility
    let apiurl = "";
    if (responsibilityType === "academic") {
      apiurl = handle_leave_academic_responsibility;
    } else {
      apiurl = handle_leave_administrative_responsibility;
    }

    try {
      const response = await fetch(`${apiurl}/${id}/`, {
        method: "POST",
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },

        body: JSON.stringify({ action }), // "accept" or "reject"
      });

      if (!response.ok) {
        throw new Error("Failed to handle responsibility.");
      }

      const result = await response.json();
      setActionStatus(result.message);
      setFetchedFormData((prev) => ({
        ...prev,
        [`${responsibilityType}ResponsibilityStatus`]:
          action === "accept" ? "Accepted" : "Rejected",
        status: action === "reject" ? "Rejected" : prev.status,
      }));
    } catch (error) {
      setError("Failed to handle responsibility.");
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
          Handle{" "}
          {responsibilityType === "academic" ? "Academic" : "Administrative"}{" "}
          Responsibility
        </Title>
        <Grid>
          <Grid.Col span={6}>
            <Text>
              <strong>Application Status:</strong>{" "}
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
          {/* Section 1: Your Details */}
          <Title order={4}>Leave Form Details</Title>
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

          {/* Section 4: Action Buttons */}
          <Title order={4} mt="xl">
            Handle {responsibilityType} Responsibility
          </Title>
          <Divider my="sm" />
          <Group position="center" mt="xl">
            <Button
              leftIcon={<CheckCircle size={20} />}
              onClick={() => handleAction("accept")}
              disabled={
                fetchedformData[`${responsibilityType}ResponsibilityStatus`] !==
                "Pending"
              }
            >
              Accept
            </Button>
            <Button
              leftIcon={<XCircle size={20} />}
              onClick={() => handleAction("reject")}
              disabled={
                fetchedformData[`${responsibilityType}ResponsibilityStatus`] !==
                "Pending"
              }
            >
              Reject
            </Button>
          </Group>

          {/* Action Status Message */}
          {actionStatus && (
            <Text align="center" mt="md" color="green">
              {actionStatus}
            </Text>
          )}

          {/* Error Message */}
          {error && (
            <Text align="center" mt="md" color="red">
              {error}
            </Text>
          )}
        </Box>
      </Box>
    </>
  );
};

export default LeaveHandleResponsibility;
