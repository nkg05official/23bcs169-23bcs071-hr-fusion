import React, { useState, useEffect } from "react";
import {
  Card,
  Paper,
  Select,
  Grid,
  Button,
  Table,
  Stack,
  Text,
  Group,
  Center,
  Alert,
} from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";
import { showNotification } from "@mantine/notifications";
import axios from "axios";
import { useSelector } from "react-redux";
import {
  get_student_grades_academic_years,
  grade_summary,
} from "./routes/examinationRoutes.jsx";

export default function GradeSummary() {
  const userRole = useSelector((state) => state.user.role);
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(false);
  const [gradeSummaryData, setGradeSummaryData] = useState([]);
  const [error, setError] = useState(null);

  const [selectedAcademicYear, setSelectedAcademicYear] = useState("");
  const [selectedSemesterType, setSelectedSemesterType] = useState("");

  const semesterTypes = [
    { value: "Odd Semester", label: "Odd Semester" },
    { value: "Even Semester", label: "Even Semester" },
    { value: "Summer Semester", label: "Summer Semester" },
  ];

  useEffect(() => {
    const fetchAcademicYears = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const response = await axios.get(get_student_grades_academic_years, {
          headers: { Authorization: `Token ${token}` },
        });
        setAcademicYears(
          response.data.academic_years.map((year) => ({
            value: year,
            label: year,
          }))
        );
      } catch (error) {
        console.error("Error fetching academic years:", error);
        showNotification({
          title: "Error",
          message: "Failed to fetch academic years",
          color: "red",
        });
      }
    };

    fetchAcademicYears();
  }, []);

  const fetchGradeSummary = async () => {
    if (!selectedAcademicYear || !selectedSemesterType) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("authToken");
      const response = await axios.post(
        grade_summary,
        {
          Role: userRole,
          academic_year: selectedAcademicYear,
          semester_type: selectedSemesterType,
        },
        {
          headers: { Authorization: `Token ${token}` },
        }
      );

      setGradeSummaryData(response.data.grade_summary);
    } catch (error) {
      console.error("Error fetching grade summary:", error);
      setError("Failed to fetch grade summary data");
      showNotification({
        title: "Error",
        message: "Failed to fetch grade summary data",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const headers = [
      "S.No.",
      "Course Code",
      "Course Name",
      "Course Instructor",
      "O",
      "A+",
      "A",
      "B+",
      "B",
      "C+",
      "C",
      "D+",
      "D",
      "F",
      "CD",
      "S",
      "X",
      "Total Students",
    ];

    const csvContent = [
      headers.join(","),
      ...gradeSummaryData.map((course) =>
        [
          course.sno,
          course.course_code,
          `"${course.course_name}"`,
          `"${course.course_instructor || "N/A"}"`,
          course.grade_o,
          course.grade_a_plus,
          course.grade_a,
          course.grade_b_plus,
          course.grade_b,
          course.grade_c_plus,
          course.grade_c,
          course.grade_d_plus,
          course.grade_d,
          course.grade_f,
          course.grade_cd,
          course.grade_s,
          course.grade_x,
          course.total_students,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Grade_Summary_${selectedAcademicYear}_${selectedSemesterType.replace(" ", "_")}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showNotification({
      title: "Export Successful",
      message: "Grade summary data exported to Excel successfully",
      color: "green",
    });
  };

  const renderTable = () => {
    if (gradeSummaryData.length === 0) {
      return (
        <Center style={{ minHeight: 200 }}>
          <Text c="dimmed">No data available for the selected filters</Text>
        </Center>
      );
    }

    const rows = gradeSummaryData.map((course) => (
      <Table.Tr key={course.sno}>
        <Table.Td style={{ textAlign: "center", backgroundColor: "#f8f9fa" }}>
          <Text size="sm" fw={500}>{course.sno}</Text>
        </Table.Td>
        <Table.Td style={{ minWidth: "100px" }}>
          <Text fw={600} c="blue">{course.course_code}</Text>
        </Table.Td>
        <Table.Td style={{ minWidth: "250px" }}>
          <Text size="sm" fw={500}>{course.course_name}</Text>
        </Table.Td>
        <Table.Td style={{ minWidth: "200px" }}>
          <Text size="sm" c="dimmed">{course.course_instructor || "N/A"}</Text>
        </Table.Td>
        <Table.Td style={{ textAlign: "center", backgroundColor: "#e7f5ff" }}>
          <Text size="sm" fw={500}>{course.grade_o}</Text>
        </Table.Td>
        <Table.Td style={{ textAlign: "center", backgroundColor: "#e7f5ff" }}>
          <Text size="sm" fw={500}>{course.grade_a_plus}</Text>
        </Table.Td>
        <Table.Td style={{ textAlign: "center", backgroundColor: "#e7f5ff" }}>
          <Text size="sm" fw={500}>{course.grade_a}</Text>
        </Table.Td>
        <Table.Td style={{ textAlign: "center", backgroundColor: "#fff3e0" }}>
          <Text size="sm" fw={500}>{course.grade_b_plus}</Text>
        </Table.Td>
        <Table.Td style={{ textAlign: "center", backgroundColor: "#fff3e0" }}>
          <Text size="sm" fw={500}>{course.grade_b}</Text>
        </Table.Td>
        <Table.Td style={{ textAlign: "center", backgroundColor: "#fff9e6" }}>
          <Text size="sm" fw={500}>{course.grade_c_plus}</Text>
        </Table.Td>
        <Table.Td style={{ textAlign: "center", backgroundColor: "#fff9e6" }}>
          <Text size="sm" fw={500}>{course.grade_c}</Text>
        </Table.Td>
        <Table.Td style={{ textAlign: "center", backgroundColor: "#ffeee6" }}>
          <Text size="sm" fw={500}>{course.grade_d_plus}</Text>
        </Table.Td>
        <Table.Td style={{ textAlign: "center", backgroundColor: "#ffeee6" }}>
          <Text size="sm" fw={500}>{course.grade_d}</Text>
        </Table.Td>
        <Table.Td style={{ textAlign: "center", backgroundColor: "#ffe6e6" }}>
          <Text size="sm" fw={600} c="red">{course.grade_f}</Text>
        </Table.Td>
        <Table.Td style={{ textAlign: "center", backgroundColor: "#f3f4f6" }}>
          <Text size="sm" fw={500}>{course.grade_cd}</Text>
        </Table.Td>
        <Table.Td style={{ textAlign: "center", backgroundColor: "#f3f4f6" }}>
          <Text size="sm" fw={500}>{course.grade_s}</Text>
        </Table.Td>
        <Table.Td style={{ textAlign: "center", backgroundColor: "#f3f4f6" }}>
          <Text size="sm" fw={500}>{course.grade_x}</Text>
        </Table.Td>
        <Table.Td style={{ textAlign: "center", backgroundColor: "#e8f5e9" }}>
          <Text size="sm" fw={700} c="green">{course.total_students}</Text>
        </Table.Td>
      </Table.Tr>
    ));

    return (
      <Table striped={false} highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr style={{ backgroundColor: "#f1f3f5" }}>
            <Table.Th style={{ textAlign: "center", fontWeight: 600 }}>S.No.</Table.Th>
            <Table.Th style={{ fontWeight: 600 }}>Course Code</Table.Th>
            <Table.Th style={{ fontWeight: 600 }}>Course Name</Table.Th>
            <Table.Th style={{ fontWeight: 600 }}>Course Instructor</Table.Th>
            <Table.Th style={{ textAlign: "center", fontWeight: 600, backgroundColor: "#d0ebff" }}>O</Table.Th>
            <Table.Th style={{ textAlign: "center", fontWeight: 600, backgroundColor: "#d0ebff" }}>A+</Table.Th>
            <Table.Th style={{ textAlign: "center", fontWeight: 600, backgroundColor: "#d0ebff" }}>A</Table.Th>
            <Table.Th style={{ textAlign: "center", fontWeight: 600, backgroundColor: "#ffe0b2" }}>B+</Table.Th>
            <Table.Th style={{ textAlign: "center", fontWeight: 600, backgroundColor: "#ffe0b2" }}>B</Table.Th>
            <Table.Th style={{ textAlign: "center", fontWeight: 600, backgroundColor: "#fff4cc" }}>C+</Table.Th>
            <Table.Th style={{ textAlign: "center", fontWeight: 600, backgroundColor: "#fff4cc" }}>C</Table.Th>
            <Table.Th style={{ textAlign: "center", fontWeight: 600, backgroundColor: "#ffd9cc" }}>D+</Table.Th>
            <Table.Th style={{ textAlign: "center", fontWeight: 600, backgroundColor: "#ffd9cc" }}>D</Table.Th>
            <Table.Th style={{ textAlign: "center", fontWeight: 600, backgroundColor: "#ffcccc" }}>F</Table.Th>
            <Table.Th style={{ textAlign: "center", fontWeight: 600, backgroundColor: "#e9ecef" }}>CD</Table.Th>
            <Table.Th style={{ textAlign: "center", fontWeight: 600, backgroundColor: "#e9ecef" }}>S</Table.Th>
            <Table.Th style={{ textAlign: "center", fontWeight: 600, backgroundColor: "#e9ecef" }}>X</Table.Th>
            <Table.Th style={{ textAlign: "center", fontWeight: 600, backgroundColor: "#c8e6c9" }}>Total</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    );
  };

  return (
    <Card shadow="sm" p="md" radius="md" withBorder>
      <Paper p="md" style={{ position: "relative" }}>
        <h1>Grade Summary</h1>

        {error && (
          <Alert
            color="red"
            mb="md"
            title="Error"
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        <Grid gutter="md">
          <Grid.Col xs={12} sm={6}>
            <Select
              label="Academic Year"
              placeholder="Select academic year"
              value={selectedAcademicYear}
              onChange={setSelectedAcademicYear}
              data={academicYears}
              disabled={loading}
              required
            />
          </Grid.Col>
          <Grid.Col xs={12} sm={6}>
            <Select
              label="Semester Type"
              placeholder="Select semester type"
              value={selectedSemesterType}
              onChange={setSelectedSemesterType}
              data={semesterTypes}
              disabled={loading}
              required
            />
          </Grid.Col>
        </Grid>

        {selectedAcademicYear && selectedSemesterType && (
          <Grid gutter="md" mt="md">
            <Grid.Col xs={12} sm={8}></Grid.Col>
            <Grid.Col
              xs={12}
              sm={4}
              style={{ display: "flex", alignItems: "flex-end" }}
            >
              <Button
                onClick={fetchGradeSummary}
                fullWidth
                disabled={
                  !selectedAcademicYear || !selectedSemesterType || loading
                }
                size="md"
                loading={loading}
              >
                View Grade Summary
              </Button>
            </Grid.Col>
          </Grid>
        )}

        {selectedAcademicYear &&
          selectedSemesterType &&
          !loading &&
          gradeSummaryData.length > 0 && (
            <Stack spacing="md" mt="md">
              <Group justify="space-between" align="center">
                <Text fw={600}>
                  Grade Summary - {selectedAcademicYear} ({selectedSemesterType}
                  )
                </Text>
                <Button
                  onClick={exportToExcel}
                  leftSection={<IconDownload size={16} />}
                  variant="outline"
                  color="blue"
                  size="sm"
                >
                  Export Excel
                </Button>
              </Group>

              <Paper withBorder style={{ overflow: "auto" }}>
                {renderTable()}
              </Paper>
            </Stack>
          )}

        {selectedAcademicYear &&
          selectedSemesterType &&
          !loading &&
          gradeSummaryData.length === 0 && (
            <Paper mt="xl" p="xl" withBorder>
              <Center>
                <Stack align="center" spacing="md">
                  <Text size="lg" fw={500} c="dimmed">
                    No grades submitted yet
                  </Text>
                  <Text size="sm" c="dimmed">
                    Grades have not been submitted for {selectedAcademicYear} - {selectedSemesterType}
                  </Text>
                </Stack>
              </Center>
            </Paper>
          )}
      </Paper>
    </Card>
  );
}
