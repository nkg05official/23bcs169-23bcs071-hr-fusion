import React, { useEffect, useState } from "react";
import {
  Select,
  Button,
  Card,
  Title,
  Group,
  Loader,
  Alert,
  Text,
  Badge,
  Stack,
  Divider,
} from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import axios from "axios";
import { useSelector } from "react-redux";
import { get_courses_prof, download_grades_prof, get_student_grades_academic_years } from "./routes/examinationRoutes";

export default function GradesDownloadPage() {
  const userRole = useSelector((s) => s.user.role);
  const currentYear = new Date().getFullYear();

  

  const semesterOptions = [
    { value: "Odd Semester", label: "Odd" },
    { value: "Even Semester", label: "Even" },
  ];
  
  const programmeTypes = [
    { value: "UG", label: "UG (Undergraduate)" },
    { value: "PG", label: "PG (Postgraduate)" },
  ];

  const [year, setYear] = useState("");
  const [academicYears, setAcademicYears] = useState([]); 
  const [semester, setSemester] = useState("");
  const [programmeType, setProgrammeType] = useState("UG");
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(null);
  const [error, setError] = useState("");

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
        setAcademicYears(data.academic_years.map((y) => ({ value: y, label: y })));
      } catch {
        setError("Failed to load academic years.");
      } finally {
        setLoading(false);
      }
    }
    fetchAcademicYears();
  }, []);


  const fetchCourses = async () => {
    if (!year || !semester || !programmeType) {
      showNotification({ title: "Error", message: "Select year, semester & programme type", color: "red" });
      return;
    }
    setLoading(true);
    setError(""); // Clear previous errors before new request
    try {
      const token = localStorage.getItem("authToken");
      const { data } = await axios.post(
        get_courses_prof,
        { 
          Role: userRole, 
          academic_year: year, 
          semester_type: semester,
          programme_type: programmeType
        },
        { headers: { Authorization: `Token ${token}` } }
      );
      setCourses(data.courses || []);
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to fetch courses";
      setError(msg);
      showNotification({ title: "Error", message: msg, color: "red" });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (courseId) => {
    setDownloadLoading(courseId);
    setError(""); // Clear previous error before new download attempt
    try {
      const token = localStorage.getItem("authToken");
      const resp = await axios.post(
        download_grades_prof,
        { 
          Role: userRole, 
          academic_year: year, 
          course_id: courseId, 
          semester_type: semester,
          programme_type: programmeType
        },
        { headers: { Authorization: `Token ${token}` }, responseType: "blob" }
      );
      
      // Filename: CourseCode_CourseName_grades_AcademicYear.pdf
      const selectedCourse = courses.find(c => c.id === courseId);
      let courseCode = 'Course';
      let courseName = 'Grades';
      
      if (selectedCourse) {
        courseCode = selectedCourse.code || 'Course';
        courseName = selectedCourse.name || 'Grades';
      }
      
      const courseNameClean = courseName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
      const filename = `${courseCode}_${courseNameClean}_Grades_${year}.pdf`;
      
      const url = URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      showNotification({ title: "Downloaded", message: "PDF saved", color: "green" });
    } catch (err) {
      const msg = err.response?.data?.error || "Download failed";
      setError(msg);
      showNotification({ title: "Error", message: msg, color: "red" });
    } finally {
      setDownloadLoading(null);
    }
  };

  return (
    <Card withBorder p="lg">
      <Stack spacing="md">
        <Title order={1}>Download Course Grades</Title>

        {error && (
          <Alert color="red" withCloseButton onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        <Group spacing="sm">
          <Select
            placeholder="Academic Year"
            data={academicYears}
            value={year}
            onChange={setYear}
            disabled={loading}
          />
          <Select
            placeholder="Semester"
            data={semesterOptions}
            value={semester}
            onChange={setSemester}
            disabled={loading}
          />
          <Select
            placeholder="Programme Type"
            data={programmeTypes}
            value={programmeType}
            onChange={setProgrammeType}
            disabled={loading}
            required
          />
          <Button variant="outline" onClick={fetchCourses} loading={loading}>
            Fetch
          </Button>
        </Group>

        <Divider />

        <Stack spacing="sm">
          {courses.length > 0 ? (
            courses.map((course) => (
              <Card key={course.id} withBorder shadow="sm" p="sm">
                <Group position="apart" align="flex-start">
                  <Stack spacing={4}>
                    <Text weight={600}>{course.name}</Text>
                    <Text size="sm" color="dimmed">
                      {course.code}
                    </Text>
                    <Group spacing="xs" mt={4}>
                      <Badge color="blue">{course.credit} cr</Badge>
                      {course.latest_version && <Badge color="green">Latest</Badge>}
                    </Group>
                  </Stack>
                  <Button
                    size="xs"
                    variant="light"
                    onClick={() => handleDownload(course.id)}
                    loading={downloadLoading === course.id}
                    style={{ alignSelf: "start" }}
                  >
                    Download
                  </Button>
                </Group>
              </Card>
            ))
          ) : (
            !loading && <Text color="dimmed" align="center">No courses to display.</Text>
          )}
        </Stack>
      </Stack>
    </Card>
  );
}
