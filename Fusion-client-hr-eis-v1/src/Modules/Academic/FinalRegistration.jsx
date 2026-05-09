import React, { useState, useEffect } from "react";
import {
  Card,
  Text,
  TextInput,
  Select,
  FileInput,
  Button,
  Grid,
  Loader,
  Alert,
} from "@mantine/core";
import FusionTable from "../../components/FusionTable";
import {
  finalRegistrationPageRoute,
  finalRegistrationRoute,
} from "../../routes/academicRoutes";

const inputStyle = { width: "100%" };

function FinalRegistration() {
  const [courses, setCourses] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [paymentDetails, setPaymentDetails] = useState({
    semester: "",
    mode: "",
    transaction_id: "",
    fee_receipt: null,
    actual_fee: "",
    fee_paid: "",
    reason: "",
    deposit_date: "",
    utr_number: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("No token found");

        const response = await fetch(finalRegistrationPageRoute, {
          method: "GET",
          headers: {
            Authorization: `Token ${token}`,
          },
        });
        const data = await response.json();

        if (data.final_registration_flag) {
          setMessage("You have already done final registration for next semester.");
        } else if (!data.frd) {
          setMessage("Final Registration has not yet started for the next semester.");
        } else {
          setCourses(data.final_registration || []);
          setPaymentDetails((prev) => ({
            ...prev,
            semester: data.final_registration?.[0]?.semester_id?.id || 1,
          }));
        }
      } catch (error) {
        console.error("Error fetching registration data:", error);
        setMessage("Failed to fetch registration data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [refreshTrigger]);

  const handleInputChange = (field, value) => {
    setPaymentDetails((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      alert("No token found");
      return;
    }

    const formData = new FormData();
    Object.keys(paymentDetails).forEach((key) => {
      if (paymentDetails[key]) formData.append(key, paymentDetails[key]);
    });

    setLoading(true);
    try {
      const response = await fetch(finalRegistrationRoute, {
        method: "POST",
        headers: { Authorization: `Token ${token}` },
        body: formData,
      });
      const result = await response.json();
      alert(result.message || "Registration successful");
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("Failed to submit registration");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card shadow="sm" p="lg" radius="md" withBorder>
        <div
          style={{
            height: "200px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Loader size="lg" color="blue" />
        </div>
      </Card>
    );
  }

  if (message) {
    return (
        <Alert color="yellow"
        >
          {message}
        </Alert>
    );
  }

  const mappedCourses = courses.map((course) => ({
    "Course Code": course.course_id?.code || "N/A",
    "Course Name": course.course_id?.name || "N/A",
    "Registration Type": course.registration_type || "N/A",
    Semester: course.semester_id?.semester_no || "N/A",
    Credits: course.course_id?.credit || 0,
  }));

  const totalCredits = courses.reduce(
    (sum, course) => sum + (course.course_id?.credit || 0),
    0,
  );

  return (
    <Card shadow="sm" p="lg" radius="md" withBorder>
      <Text
        size="lg"
        weight={700}
        mb="md"
        style={{ textAlign: "center", color: "#3B82F6" }}
      >
        Final Registration For This Semester
      </Text>
      <FusionTable
        columnNames={[
          "Course Code",
          "Course Name",
          "Registration Type",
          "Semester",
          "Credits",
        ]}
        elements={mappedCourses}
        width="100%"
      />
      <Text size="md" weight={700} mt="md">
        Total Credits: {totalCredits}
      </Text>

      <Card mt="lg" p="md" shadow="xs" withBorder>
        <Text size="md" weight={700} color="blue" mb="md">
          Payment Details
        </Text>
        <Grid gutter="md">
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Select
              label="Mode of Payment"
              placeholder="Select payment method"
              data={[
                "Axis Easypay",
                "Subpaisa",
                "NEFT",
                "RTGS",
                "Bank Challan",
                "Education Loan",
              ]}
              value={paymentDetails.mode}
              onChange={(value) => handleInputChange("mode", value)}
              style={inputStyle}
            />
          </Grid.Col>
          {paymentDetails.mode === "Education Loan" && (
            <Grid.Col span={{ base: 12, md: 4 }}>
              <TextInput
                label="UTR / Transaction Number"
                placeholder="Enter UTR number"
                value={paymentDetails.utr_number}
                onChange={(e) =>
                  handleInputChange("utr_number", e.target.value)
                }
                style={inputStyle}
              />
            </Grid.Col>
          )}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <TextInput
              label="Challan No / Transaction ID"
              placeholder="Enter transaction ID"
              value={paymentDetails.transaction_id}
              onChange={(e) =>
                handleInputChange("transaction_id", e.target.value)
              }
              style={inputStyle}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <FileInput
              label="Fee Receipt (.pdf)"
              placeholder="Choose File"
              accept="application/pdf"
              onChange={(file) => handleInputChange("fee_receipt", file)}
              style={inputStyle}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <TextInput
              label="Actual Fee Amount"
              placeholder="Enter actual fee amount"
              type="number"
              value={paymentDetails.actual_fee}
              onChange={(e) => handleInputChange("actual_fee", e.target.value)}
              style={inputStyle}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <TextInput
              label="Fee Amount Paid"
              placeholder="Enter paid fee amount"
              type="number"
              value={paymentDetails.fee_paid}
              onChange={(e) => handleInputChange("fee_paid", e.target.value)}
              style={inputStyle}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <TextInput
              label="Reason for Late Fee (if any)"
              placeholder="Enter reason"
              value={paymentDetails.reason}
              onChange={(e) => handleInputChange("reason", e.target.value)}
              style={inputStyle}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <TextInput
              label="Fee Deposit Date"
              placeholder="YYYY-MM-DD"
              type="date"
              value={paymentDetails.deposit_date}
              onChange={(e) =>
                handleInputChange("deposit_date", e.target.value)
              }
              style={inputStyle}
            />
          </Grid.Col>
        </Grid>
        <Button
          color="blue"
          fullWidth
          mt="md"
          onClick={handleSubmit}
          disabled={loading}
        >
          Register
        </Button>
      </Card>
    </Card>
  );
}

export default FinalRegistration;
