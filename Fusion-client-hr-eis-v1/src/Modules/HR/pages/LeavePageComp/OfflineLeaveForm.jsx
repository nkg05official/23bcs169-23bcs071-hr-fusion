import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TextInput,
  Checkbox,
  Button,
  Title,
  Box,
  Grid,
  Group,
  Textarea,
} from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import {
  get_employee_initials,
  offline_leave_form,
} from "../../../../routes/hr";
import "./LeaveForm.css";
import SearchAndSelectUser from "../../components/SearchAndSelectUser";
import { fetchJsonWithAuth, submitFormDataWithAuth } from "../../services/hrService";

import HrBreadcrumbs from "../../components/HrBreadcrumbs";

function OfflineLeaveForm() {
  // --- Form and Leave states ---
  const [stationLeave, setStationLeave] = useState(false);
  const [academicResponsibility, setAcademicResponsibility] = useState(null);
  const [administrativeResponsibility, setAdministrativeResponsibility] =
    useState(null);
  const [forwardTo, setForwardTo] = useState(null);
  const [attachedPdf, setAttachedPdf] = useState(null);

  const [formData, setFormData] = useState({
    leaveStartDate: "",
    leaveEndDate: "",
    purpose: "",
    casualLeave: "0",
    vacationLeave: "0",
    earnedLeave: "0",
    commutedLeave: "0",
    specialCasualLeave: "0",
    restrictedHoliday: "0",
    halfPayLeave: "0",
    maternityLeave: "0",
    childCareLeave: "0",
    paternityLeave: "0",
    remarks: "",
    stationLeaveStartDate: "",
    stationLeaveEndDate: "",
    stationLeaveAddress: "",
  });

  const today = new Date().toISOString().split("T")[0];
  const navigate = useNavigate();
  const [activeSubmit, setActiveSubmit] = useState(true);

  // --- Employee Details states ---
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const exampleItems = [
    { title: "Home", path: "/dashboard" },
    { title: "Human Resources", path: "/hr" },
    { title: "Admin Leave Management", path: "/hr/admin_leave" },
    {
      title: "Offline Leave Form",
      path: "/hr/admin_leave/manage_offline_leave_form",
    },
  ];

  const fetchEmployeeDetails = async (employeeId) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJsonWithAuth(
        `${get_employee_initials}/${employeeId}`,
        "Failed to fetch employee details.",
      );
      setDetails(data);
    } catch (err) {
      const message = err?.message || "Failed to fetch employee details.";
      setError(message);
      showNotification({ color: "red", title: "Error", message });
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeSelect = (user) => {
    setSelectedEmployee(user);
    fetchEmployeeDetails(user.id);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") {
      setAttachedPdf(file);
    } else {
      showNotification({
        color: "red",
        title: "Invalid file",
        message: "Please upload a valid PDF file.",
      });
    }
  };

  const handleSubmit = async () => {
    setActiveSubmit(false);

    // Validation checks for required core fields.
    const missingFields = [];
    if (!formData.leaveStartDate) missingFields.push("Leave start date");
    if (!formData.leaveEndDate) missingFields.push("Leave end date");
    if (!formData.purpose?.trim()) missingFields.push("Purpose of leave");
    if (!forwardTo?.id) missingFields.push("Forward application user");

    if (missingFields.length > 0) {
      showNotification({
        color: "red",
        title: "Missing fields",
        message: `Please provide: ${missingFields.join(", ")}.`,
      });
      setActiveSubmit(true);
      return;
    }

    if (
      stationLeave &&
      (!formData.stationLeaveStartDate ||
        !formData.stationLeaveEndDate ||
        !formData.stationLeaveAddress)
    ) {
      showNotification({
        color: "red",
        title: "Missing station leave details",
        message:
          "Station leave details are required when station leave is checked.",
      });
      setActiveSubmit(true);
      return;
    }

    // Ensure number of leaves are non-negative integers
    const leaveFields = [
      "casualLeave",
      "vacationLeave",
      "earnedLeave",
      "commutedLeave",
      "specialCasualLeave",
      "restrictedHoliday",
      "halfPayLeave",
      "maternityLeave",
      "childCareLeave",
      "paternityLeave",
    ];

    const invalidField = leaveFields.find(
      (field) => !/^\d+$/.test(formData[field]),
    );

    if (invalidField) {
      showNotification({
        color: "red",
        title: "Invalid leave count",
        message: `"${invalidField.replace(/([A-Z])/g, " $1")}" must be a non-negative integer.`,
      });
      setActiveSubmit(true);
      return;
    }

    // Prepare the data object to be sent
    const submissionData = {
      employeeDetails: {
        id: selectedEmployee?.id,
        name: details?.name,
        designation: selectedEmployee?.designation,
        pfno: details?.pfno || "N/A",
        department: details?.department || "N/A",
      },
      leaveDetails: {
        leaveStartDate: formData.leaveStartDate,
        leaveEndDate: formData.leaveEndDate,
        purpose: formData.purpose.trim(),
        casualLeave: formData.casualLeave,
        vacationLeave: formData.vacationLeave,
        earnedLeave: formData.earnedLeave,
        commutedLeave: formData.commutedLeave,
        specialCasualLeave: formData.specialCasualLeave,
        restrictedHoliday: formData.restrictedHoliday,
        halfPayLeave: formData.halfPayLeave,
        maternityLeave: formData.maternityLeave,
        childCareLeave: formData.childCareLeave,
        paternityLeave: formData.paternityLeave,
        remarks: formData.remarks || "N/A",
      },
      stationLeave: stationLeave
        ? {
            isStationLeave: true,
            stationLeaveStartDate: formData.stationLeaveStartDate,
            stationLeaveEndDate: formData.stationLeaveEndDate,
            stationLeaveAddress: formData.stationLeaveAddress,
          }
        : null,
      responsibilityTransfer: {
        academicResponsibility: academicResponsibility
          ? {
              id: academicResponsibility.id,
              name: academicResponsibility.name,
              designation: academicResponsibility.designation,
            }
          : null,
        administrativeResponsibility: administrativeResponsibility
          ? {
              id: administrativeResponsibility.id,
              name: administrativeResponsibility.name,
              designation: administrativeResponsibility.designation,
            }
          : null,
      },
      forwardTo: forwardTo
        ? {
            id: forwardTo.id,
            name: forwardTo.name,
            designation: forwardTo.designation,
          }
        : null,
      attachedPdf: attachedPdf ? attachedPdf.name : null,
    };

    const formDataObj = new FormData();

    // Stringify nested objects before appending
    formDataObj.append(
      "employeeDetails",
      JSON.stringify(submissionData.employeeDetails),
    );
    formDataObj.append(
      "leaveDetails",
      JSON.stringify(submissionData.leaveDetails),
    );
    if (submissionData.stationLeave) {
      formDataObj.append(
        "stationLeave",
        JSON.stringify(submissionData.stationLeave),
      );
    }
    if (submissionData.responsibilityTransfer) {
      formDataObj.append(
        "responsibilityTransfer",
        JSON.stringify(submissionData.responsibilityTransfer),
      );
    }
    formDataObj.append("forwardTo", JSON.stringify(submissionData.forwardTo));
    if (attachedPdf) {
      formDataObj.append("attachedPdf", attachedPdf);
    }

    try {
      const result = await submitFormDataWithAuth(
        offline_leave_form,
        formDataObj,
        "Failed to submit offline leave form.",
      );

      showNotification({
        color: "green",
        title: "Success",
        message: result.message || "Form submitted successfully.",
      });

      // redirec to /hr/admin_leave/review_leave_requests?emp=mayur
      navigate(
        `/hr/admin_leave/review_leave_requests?emp=${selectedEmployee.username}`,
      );
    } catch (er) {
      showNotification({
        color: "red",
        title: "Submission failed",
        message: er?.message || "Failed to submit the form. Please try again later.",
      });
    } finally {
      setActiveSubmit(true);
    }
  };

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
        {/* Section: Employee Selection */}
        <Title order={4}>Select Employee</Title>
        <SearchAndSelectUser onUserSelect={handleEmployeeSelect} />

        {/* Conditionally render the "Employee Details" section after an employee is selected */}
        {selectedEmployee && (
          <>
            <br />
            <Title order={4}>Employee Details</Title>
            {loading && <p>Loading employee details...</p>}
            {error && <p style={{ color: "red" }}>{error}</p>}

            {details && (
              <Grid gutter="lg" style={{ padding: "0 20px" }}>
                <Grid.Col span={6}>
                  <TextInput
                    label="Name"
                    value={details.name || "N/A"}
                    disabled
                    sx={{ maxWidth: "300px", color: "black" }}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <TextInput
                    label="Designation"
                    value={
                      selectedEmployee?.designation ||
                      details.last_selected_role ||
                      "N/A"
                    }
                    disabled
                    sx={{ maxWidth: "300px" }}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <TextInput
                    label="Personal File Number"
                    value={details.pfno || "N/A"}
                    disabled
                    sx={{ maxWidth: "300px" }}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <TextInput
                    label="Department/Discipline"
                    value={details.department || "N/A"}
                    disabled
                    sx={{ maxWidth: "300px" }}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <TextInput
                    label="Date"
                    type="date"
                    defaultValue={today}
                    disabled
                    style={{ maxWidth: "300px" }}
                  />
                </Grid.Col>
              </Grid>
            )}
          </>
        )}

        {/* Section 2: Leave Details */}
        <br />
        <Title order={4} sx={{ marginBottom: "20px" }}>
          Leave Details
        </Title>
        <br />

        <Grid gutter="lg" style={{ padding: "0 20px" }}>
          <Grid.Col span={4}>
            <TextInput
              label="Leave Start Date"
              name="leaveStartDate"
              value={formData.leaveStartDate}
              onChange={handleInputChange}
              required
              type="date"
              style={{ maxWidth: "300px" }}
            />
          </Grid.Col>
          <Grid.Col span={4}>
            <TextInput
              label="Leave End Date"
              name="leaveEndDate"
              value={formData.leaveEndDate}
              onChange={handleInputChange}
              required
              type="date"
              style={{ maxWidth: "300px" }}
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <Textarea
              label="Purpose of Leave"
              name="purpose"
              value={formData.purpose}
              onChange={handleInputChange}
              placeholder="Enter purpose of leave"
              required
              style={{ maxWidth: "800px" }}
            />
          </Grid.Col>

          {/* Number of Leaves Fields */}
          <Grid.Col span={12}>
            <p style={{ color: "#023f60" }}>
              Note: &nbsp; Please check your leave balance before applying to
              avoid rejection
            </p>
          </Grid.Col>

          {/* Original leave types */}
          <Grid.Col span={4}>
            <TextInput
              label="No. of Casual Leave"
              name="casualLeave"
              value={formData.casualLeave}
              onChange={handleInputChange}
              type="number"
              placeholder="0"
              style={{ maxWidth: "300px" }}
            />
          </Grid.Col>
          <Grid.Col span={4}>
            <TextInput
              label="No. of Vacation Leave"
              name="vacationLeave"
              value={formData.vacationLeave}
              onChange={handleInputChange}
              type="number"
              placeholder="0"
              style={{ maxWidth: "300px" }}
            />
          </Grid.Col>
          <Grid.Col span={4}>
            <TextInput
              label="No. of Earned Leave"
              name="earnedLeave"
              value={formData.earnedLeave}
              onChange={handleInputChange}
              type="number"
              placeholder="0"
              style={{ maxWidth: "300px" }}
            />
          </Grid.Col>
          <Grid.Col span={4}>
            <TextInput
              label="No. of Commuted Leave"
              name="commutedLeave"
              value={formData.commutedLeave}
              onChange={handleInputChange}
              type="number"
              placeholder="0"
              style={{ maxWidth: "300px" }}
            />
          </Grid.Col>
          <Grid.Col span={4}>
            <TextInput
              label="No. of Special Casual Leave"
              name="specialCasualLeave"
              value={formData.specialCasualLeave}
              onChange={handleInputChange}
              type="number"
              placeholder="0"
              style={{ maxWidth: "300px" }}
            />
          </Grid.Col>
          <Grid.Col span={4}>
            <TextInput
              label="No. of Restricted Holiday"
              name="restrictedHoliday"
              value={formData.restrictedHoliday}
              onChange={handleInputChange}
              type="number"
              placeholder="0"
              style={{ maxWidth: "300px" }}
            />
          </Grid.Col>

          {/* New leave types */}
          <Grid.Col span={4}>
            <TextInput
              label="No. of Half Pay Leave"
              name="halfPayLeave"
              value={formData.halfPayLeave}
              onChange={handleInputChange}
              type="number"
              placeholder="0"
              style={{ maxWidth: "300px" }}
            />
          </Grid.Col>
          <Grid.Col span={4}>
            <TextInput
              label="No. of Maternity Leave"
              name="maternityLeave"
              value={formData.maternityLeave}
              onChange={handleInputChange}
              type="number"
              placeholder="0"
              style={{ maxWidth: "300px" }}
            />
          </Grid.Col>
          <Grid.Col span={4}>
            <TextInput
              label="No. of Child Care Leave"
              name="childCareLeave"
              value={formData.childCareLeave}
              onChange={handleInputChange}
              type="number"
              placeholder="0"
              style={{ maxWidth: "300px" }}
            />
          </Grid.Col>
          <Grid.Col span={4}>
            <TextInput
              label="No. of Paternity Leave"
              name="paternityLeave"
              value={formData.paternityLeave}
              onChange={handleInputChange}
              type="number"
              placeholder="0"
              style={{ maxWidth: "300px" }}
            />
          </Grid.Col>

          <Grid.Col span={12}>
            <Textarea
              label="Remarks (optional)"
              name="remarks"
              value={formData.remarks}
              onChange={handleInputChange}
              placeholder="Enter remarks if any"
              style={{ maxWidth: "800px" }}
            />
          </Grid.Col>

          <Grid.Col span={12}>
            <TextInput
              label="Attach Supporting Document (PDF, optional)"
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              style={{ maxWidth: "350px" }}
            />
          </Grid.Col>
        </Grid>

        {/* Subsection: Station Leave */}
        <br />
        <Checkbox
          label="Do you want to take station leave?"
          checked={stationLeave}
          onChange={(e) => setStationLeave(e.currentTarget.checked)}
          stule={{ margin: "20px 0" }}
        />
        <br />
        {stationLeave && (
          <Grid gutter="lg" style={{ padding: "0 20px" }}>
            <Grid.Col span={4}>
              <TextInput
                label="Station Leave Start Date"
                name="stationLeaveStartDate"
                value={formData.stationLeaveStartDate}
                onChange={handleInputChange}
                type="date"
                required={stationLeave}
                style={{ maxWidth: "300px" }}
              />
            </Grid.Col>
            <Grid.Col span={4}>
              <TextInput
                label="Station Leave End Date"
                name="stationLeaveEndDate"
                value={formData.stationLeaveEndDate}
                onChange={handleInputChange}
                type="date"
                required={stationLeave}
                style={{ maxWidth: "300px" }}
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <Textarea
                label="Address During Station Leave"
                name="stationLeaveAddress"
                value={formData.stationLeaveAddress}
                onChange={handleInputChange}
                placeholder="Enter address"
                required={stationLeave}
                style={{ maxWidth: "800px" }}
              />
            </Grid.Col>
          </Grid>
        )}

        {/* Section 3: Responsibility Transfer (optional) */}
        <br />
        <Title order={4} sx={{ marginBottom: "20px" }}>
          Responsibility Transfer During Period (optional)
        </Title>
        <Grid gutter="lg" style={{ padding: "0 20px" }}>
          <Grid.Col span={6}>
            <Title
              order={6}
              style={{ marginBottom: "10px", marginTop: "20px" }}
            >
              Academic Responsibility (optional)
            </Title>
            <SearchAndSelectUser
              onUserSelect={(user) => setAcademicResponsibility(user)}
            />
          </Grid.Col>

          <Grid.Col span={6}>
            <Title
              order={6}
              style={{ marginBottom: "10px", marginTop: "20px" }}
            >
              Administrative Responsibility (optional)
            </Title>
            <SearchAndSelectUser
              onUserSelect={(user) => setAdministrativeResponsibility(user)}
            />
          </Grid.Col>
        </Grid>

        {/* Section 4: Forward Application */}
        <br />
        <Title order={4} style={{ marginBottom: "10px" }}>
          Application approved by
        </Title>
        <SearchAndSelectUser onUserSelect={(user) => setForwardTo(user)} />

        {/* Submit Button */}
        <Group position="center" mt="xl">
          <Button
            onClick={handleSubmit}
            sx={{
              backgroundColor: "#15abff",
              "&:hover": { backgroundColor: "#0e8ad8" },
            }}
            disabled={!activeSubmit}
          >
            Submit
          </Button>
        </Group>
      </Box>
    </>
  );
}

export default OfflineLeaveForm;
