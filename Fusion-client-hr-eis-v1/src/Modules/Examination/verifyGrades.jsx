import React, { useState, useEffect } from "react";
import {
  Card,
  Paper,
  Grid,
  Select,
  Text,
  Button,
  Alert,
  TextInput,
  Group,
  Title,
  Table,
  LoadingOverlay,
  Badge,
} from "@mantine/core";
import axios from "axios";
import {
  get_student_grades_academic_years,
  update_grades,
  update_enter_grades,
  moderate_student_grades,
} from "./routes/examinationRoutes";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

// Helper function: Returns a random "3D-like" vibrant color.
const getRandom3dColor = () => {
  const colors = [
    "#FF5733", // Warm red
    "#FFC300", // Vivid yellow
    "#DAF7A6", // Light green
    "#900C3F", // Dark red
    "#581845", // Deep purple
    "#33FF57", // Vibrant green
    "#33A1FF", // Vivid blue
    "#FF33B8", // Bold pink
    "#33FFF3", // Aqua
    "#FF8C33", // Orange
  ];
  const randomIndex = Math.floor(Math.random() * colors.length);
  return colors[randomIndex];
};

function VerifyGrades() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showContent, setShowContent] = useState(false);
  const userRole = useSelector((state) => state.user.role);
  const [courses, setCourses] = useState([]);
  const [years, setYears] = useState([]);
  const [semesterTypes] = useState([
    { value: "Odd Semester", label: "Odd Semester" },
    { value: "Even Semester", label: "Even Semester" },
    { value: "Summer Semester", label: "Summer Semester" },
  ]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("");
  const [selectedSemesterType, setSelectedSemesterType] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedCourseName, setSelectedCourseName] = useState("");
  const [registrations, setRegistrations] = useState([]);
  const [gradesStats, setGradesStats] = useState([]);
  const [isAlreadyVerified, setIsAlreadyVerified] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchAcademicYears() {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("authToken");
        const { data } = await axios.get(
          get_student_grades_academic_years,
          { headers: { Authorization: `Token ${token}` } }
        );
        setYears(data.academic_years.map((y) => ({ value: y, label: y })));
      } catch {
        setError("Failed to load academic years.");
      } finally {
        setLoading(false);
      }
    }
    fetchAcademicYears();
  }, []);

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("authToken");
      if (!token) {
        setError("No authentication token found!");
        setLoading(false);
        return;
      }
      try {
        const requestData = {
          Role: userRole,
          academic_year: selectedAcademicYear,
          semester_type: selectedSemesterType,
        };
        const { data } = await axios.post(update_grades, requestData, {
          headers: { Authorization: `Token ${token}` },
        });
        // Format courses for dropdown (Course Code - Course Name)
        const formattedCourses = data.courses_info.map((c) => ({
          value: c.id.toString(),
          label: `${c.code} - ${c.name}`,
          code: c.code,
          name: c.name,
        }));
        setCourses(formattedCourses);
      } catch (err) {
        setError(`Error fetching courses: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (selectedAcademicYear && selectedSemesterType) {
      fetchCourses();
    }
  }, [selectedAcademicYear, selectedSemesterType, userRole]);

  // Only display course select when both academic year and semester type are chosen.
  const showCourseSelect = selectedAcademicYear && selectedSemesterType;

  const handleSearch = async () => {
    if (!selectedCourse || !selectedAcademicYear || !selectedSemesterType) {
      setError("Please select academic year, semester type, and course.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setIsAlreadyVerified(false);
    const token = localStorage.getItem("authToken");
    if (!token) {
      setError("No authentication token found!");
      setLoading(false);
      return;
    }
    try {
      const requestData = {
        Role: userRole,
        course: selectedCourse,
        year: selectedAcademicYear,
        semester_type: selectedSemesterType,
      };
      const response = await axios.post(update_enter_grades, requestData, {
        headers: { Authorization: `Token ${token}` },
      });
      if (response.data.message === "This course is already verified.") {
        setIsAlreadyVerified(true);
        setSuccessMessage("This course is already verified");
        setRegistrations([]);
        setShowContent(false);
      } else if (response.data.registrations) {
        setRegistrations(response.data.registrations);
        // Calculate grade statistics for pie chart with random 3D colours.
        const gradeCount = {};
        response.data.registrations.forEach((reg) => {
          gradeCount[reg.grade] = (gradeCount[reg.grade] || 0) + 1;
        });
        const stats = Object.keys(gradeCount).map((grade) => ({
          name: grade,
          value: gradeCount[grade],
          color: getRandom3dColor(),
        }));
        setGradesStats(stats);
        setShowContent(true);
        const courseInfo = courses.find((c) => c.value === selectedCourse);
        setSelectedCourseName(
          courseInfo ? `${courseInfo.code} - ${courseInfo.name}` : selectedCourse
        );
      }
    } catch (err) {
      if (err.response) {
        switch (err.response.status) {
          case 404:
            setError("This course is not submitted by the instructor.");
            break;
          case 403:
            setError("Access denied. You don't have permission to view this data.");
            break;
          case 400:
            setError(err.response.data.error || "Invalid request parameters.");
            break;
          default:
            setError(`Error fetching grades: ${err.response.data.error || err.message}`);
        }
      } else {
        setError(`Network error: ${err.message}`);
      }
      setShowContent(false);
    } finally {
      setLoading(false);
    }
  };

  const handleRemarkChange = (id, newRemarks) => {
    const updatedRegistrations = registrations.map((reg) =>
      reg.id === id ? { ...reg, remarks: newRemarks } : reg
    );
    setRegistrations(updatedRegistrations);
  };

  const handleVerify = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    const token = localStorage.getItem("authToken");
    if (!token) {
      setError("No authentication token found!");
      setLoading(false);
      return;
    }
    try {
      const studentIds = registrations.map((reg) => reg.roll_no);
      const semesterIds = registrations.map((reg) => reg.semester);
      const courseIds = registrations.map((reg) => reg.course_id_id);
      const grades = registrations.map((reg) => reg.grade);
      const remarks = registrations.map((reg) => reg.remarks || "");
      // Check if any registrations need resubmission
      const allowResubmission = registrations.some(
        (reg) => reg.remarks.trim() !== ""
      )
        ? "YES"
        : "NO";
      const requestData = {
        Role: userRole,
        student_ids: studentIds,
        semester_ids: semesterIds,
        course_ids: courseIds,
        grades: grades,
        allow_resubmission: allowResubmission,
        remarks: remarks,
      };
      const response = await axios.post(moderate_student_grades, requestData, {
        headers: { Authorization: `Token ${token}` },
        responseType: "blob",
      });
      // Download CSV file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `${selectedCourseName.replace(/ /g, "_")}_grades_${selectedAcademicYear}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      setSuccessMessage("Grades verified and CSV downloaded successfully!");
      setIsAlreadyVerified(true);
    } catch (err) {
      if (err.response) {
        switch (err.response.status) {
          case 403:
            setError("Access denied. You don't have permission to verify grades.");
            break;
          case 400:
            setError(err.response.data.error || "Invalid grade data provided.");
            break;
          default:
            setError(`Error verifying grades: ${err.response.data?.error || err.message}`);
        }
      } else {
        setError(`Network error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Build table rows for registrations.
  const rows = registrations.map((item) => {
    const gradeObj = gradesStats.find((stat) => stat.name === item.grade);
    const cellColor = gradeObj ? gradeObj.color : "gray";
    return (
      <tr key={item.id}>
        <td>{item.roll_no}</td>
        <td>{item.batch}</td>
        <td>{item.semester}</td>
        <td>{selectedCourseName}</td>
        <td
          style={{
            backgroundColor: cellColor,
            color: "#fff",
            textAlign: "center",
            fontWeight: "bold",
          }}
        >
          {item.grade}
        </td>
        <td>
          <TextInput
            value={item.remarks || ""}
            onChange={(e) => handleRemarkChange(item.id, e.target.value)}
            placeholder="Add remarks"
            disabled={isAlreadyVerified}
          />
        </td>
      </tr>
    );
  });

  return (
    <Card shadow="sm" p="md" radius="md" withBorder>
      <Paper p="md" style={{ position: "relative" }}>
        <h1>
          Verify Grades
        </h1>
        {error && (
          <Alert color="red" mb="md" title="Error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {successMessage && (
          <Alert color="green" mb="md" title="Success" onClose={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        )}
        <Grid gutter="md">
          <Grid.Col xs={12} sm={4}>
            <Select
              label="Academic Year"
              placeholder="Select academic year"
              value={selectedAcademicYear}
              onChange={setSelectedAcademicYear}
              data={years}
              disabled={loading}
              required
            />
          </Grid.Col>
          <Grid.Col xs={12} sm={4}>
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
        {showCourseSelect && (
          <Grid gutter="md" mt="md">
            <Grid.Col xs={12} sm={8}>
              <Select
                label="Course"
                placeholder="Select course"
                value={selectedCourse}
                onChange={(value) => {
                  setSelectedCourse(value);
                  const courseInfo = courses.find((c) => c.value === value);
                  setSelectedCourseName(
                    courseInfo ? `${courseInfo.code} - ${courseInfo.name}` : value
                  );
                }}
                data={courses}
                disabled={loading}
                searchable
                required
              />
            </Grid.Col>
            <Grid.Col xs={12} sm={4} style={{ display: "flex", alignItems: "flex-end" }}>
              <Button
                onClick={handleSearch}
                fullWidth
                disabled={!selectedCourse || !selectedAcademicYear || !selectedSemesterType || loading}
                size="md"
              >
                Search
              </Button>
            </Grid.Col>
          </Grid>
        )}
        {showContent && (
          <>
            {registrations.length > 0 ? (
              <Table striped highlightOnHover captionSide="top" mt="md">
                <caption>
                  <Group position="apart">
                    <Text size="lg" weight={500}>
                      {selectedCourseName} - {selectedAcademicYear} ({registrations.length} students)
                    </Text>
                    <Badge color={isAlreadyVerified ? "green" : "blue"} size="md">
                      {isAlreadyVerified ? "Verified" : "Pending Verification"}
                    </Badge>
                  </Group>
                </caption>
                <thead>
                  <tr>
                    <th>Student ID</th>
                    <th>Batch</th>
                    <th>Semester</th>
                    <th>Course</th>
                    <th>Grade</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>{rows}</tbody>
              </Table>
            ) : (
              <Text align="center" color="dimmed" mt="md">
                No records found
              </Text>
            )}
            {registrations.length > 0 && (
              <Grid mt="xl">
                <Grid.Col xs={12} md={6}>
                  <Paper p="md" radius="sm" shadow="none">
                    <Title order={4} mb="sm">
                      Grade Distribution
                    </Title>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          dataKey="value"
                          data={gradesStats}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {gradesStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} students`, "Count"]} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </Paper>
                </Grid.Col>
                <Grid.Col
                  xs={12}
                  md={6}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <Button
                    size="lg"
                    onClick={handleVerify}
                    color="blue"
                    disabled={isAlreadyVerified || registrations.length === 0 || loading}
                  >
                    Verify and Download
                  </Button>
                </Grid.Col>
              </Grid>
            )}
          </>
        )}
        <LoadingOverlay visible={loading} />
      </Paper>
    </Card>
  );
}

export default VerifyGrades;
