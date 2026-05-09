import React, { useEffect, useState } from "react";
import {
  Select,
  Button,
  Group,
  Text,
  Container,
  Stack,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useNavigate, useParams } from "react-router-dom";
import { notifications } from "@mantine/notifications";
import {
  fetchAllCourses,
  fetchFacultiesData,
  adminFetchCourseInstructorData,
} from "../api/api";
import { host } from "../../../routes/globalRoutes";

function Admin_edit_course_instructor() {
  const [courses, setCourses] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { id } = useParams();

  const form = useForm({
    initialValues: {
      courseName: "",
      instructor: "",
      academicYear: "",
      semesterType: "",
    },
  });

  const generateAcademicYears = () => {
    const years = [];
    const currentYear = new Date().getFullYear();
    for (let i = currentYear + 1; i >= currentYear - 5; i--) {
      years.push({
        label: `${i - 1}-${String(i).slice(2)}`,
        value: `${i - 1}-${String(i).slice(2)}`,
      });
    }
    return years;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("Authentication not found");

        const coursesResponse = await fetchAllCourses();
        const facultiesResponse = await fetchFacultiesData();
        const courseList = coursesResponse.map((course) => ({
          id: course.id,
          name: `${course.name} (${course.code})`,
        }));
        setCourses(courseList);

        const facultyList = facultiesResponse.map((faculty) => ({
          id: faculty.id,
          name: `${faculty.faculty_first_name} ${faculty.faculty_last_name}`,
        }));
        setFaculties(facultyList);

        const courseInstructors = await adminFetchCourseInstructorData();
        const courseInstructor = courseInstructors.find(
          (ci) => ci.id === parseInt(id, 10),
        );

        if (courseInstructor) {
          const formattedYear = courseInstructor.academic_year;
          form.setValues({
            courseName: String(courseInstructor.course_id),
            instructor: String(courseInstructor.instructor_id),
            academicYear: formattedYear,
            semesterType: courseInstructor.semester_type,
          });
        } else {
          notifications.show({
            title: "⚠️ Course Instructor Not Found",
            message: "The requested course instructor could not be found.",
            color: "orange",
            autoClose: 4000,
          });
          navigate("/programme_curriculum/admin_course_instructor");
        }

        setLoading(false);
      } catch (error) {
        notifications.show({
          title: "Error",
          message: "Failed to load data. Please refresh the page.",
          color: "red",
          autoClose: 4000,
        });
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleSubmit = async (values) => {
    localStorage.setItem("AdminInstructorsCacheChange", "true");
    try {
      const [startYear] = values.academicYear.split("-");
      const semesterYear =
        values.semesterType === "Even Semester"
          ? parseInt(startYear) + 1
          : parseInt(startYear);

      const response = await fetch(
        `${host}/programme_curriculum/api/admin_update_course_instructor/${id}/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            course_id: values.courseName,
            instructor_id: values.instructor,
            year: semesterYear,
            semester_type: values.semesterType,
          }),
        }
      );

      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

      const result = await response.json();
      
      notifications.show({
        title: "✅ Course Instructor Updated Successfully!",
        message: (
          <div>
            <Text size="sm" mb={8}>
              <strong>{result.message || "Course instructor has been updated."}</strong>
            </Text>
            <Text size="xs" color="gray.7">
              The instructor assignment has been updated.
            </Text>
          </div>
        ),
        color: "green",
        autoClose: 5000,
        style: {
          backgroundColor: '#d4edda',
          borderColor: '#c3e6cb',
          color: '#155724',
        },
      });
      
      setTimeout(() => {
        navigate("/programme_curriculum/admin_course_instructor");
      }, 1500);
    } catch (error) {
      notifications.show({
        title: "❌ Failed to Update Course Instructor",
        message: (
          <div>
            <Text size="sm" mb={8}>
              <strong>Unable to update course instructor. Please try again.</strong>
            </Text>
            <Text size="xs" color="gray.7">
              Please check your inputs and try again.
            </Text>
          </div>
        ),
        color: "red",
        autoClose: 7000,
        style: {
          backgroundColor: '#f8d7da',
          borderColor: '#f5c6cb',
          color: '#721c24',
        },
      });
    }
  };

  const handleCancel = () => {
    navigate("/programme_curriculum/admin_course_instructor");
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Container fluid style={{ margin: "0 0 0 -3.2vw" }}>
        <div style={{ maxWidth: "290vw", padding: "2rem", display: "flex", gap: "2rem" }}>
          <div style={{ width: "100%" }}>
            <form
              onSubmit={form.onSubmit(handleSubmit)}
              style={{
                backgroundColor: "#fff",
                padding: "2rem",
                borderRadius: "8px",
                boxShadow: "0 0 10px rgba(0,0,0,0.1)",
              }}
            >
              <Text size="xl" weight={700} align="center">
                Edit Course Instructor Form
              </Text>

              <Stack spacing="lg">
                <Select
                  label="Select Course"
                  placeholder="-- Select Course Name --"
                  data={courses.map((course) => ({
                    label: `${course.name}`,
                    value: String(course.id),
                  }))}
                  value={form.values.courseName}
                  onChange={(value) => form.setFieldValue("courseName", value)}
                  searchable
                  required
                />

                <Select
                  label="Select Instructor"
                  placeholder="-- Select Instructor --"
                  data={faculties.map((faculty) => ({
                    label: `${faculty.name} (${faculty.id})`,
                    value: String(faculty.id),
                  }))}
                  value={form.values.instructor}
                  onChange={(value) => form.setFieldValue("instructor", value)}
                  searchable
                  required
                />

                <Select
                  label="Select Academic Year"
                  placeholder="-- Select Academic Year --"
                  data={generateAcademicYears()}
                  value={form.values.academicYear}
                  onChange={(value) => form.setFieldValue("academicYear", value)}
                  required
                />

                <Select
                  label="Select Semester Type"
                  placeholder="-- Select Semester Type --"
                  data={[
                    { value: "Odd Semester", label: "Odd Semester" },
                    { value: "Even Semester", label: "Even Semester" },
                    { value: "Summer Semester", label: "Summer Semester" },
                  ]}
                  value={form.values.semesterType}
                  onChange={(value) => form.setFieldValue("semesterType", value)}
                  required
                />

                <Group position="right" mt="lg">
                  <Button variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button type="submit">Update</Button>
                </Group>
              </Stack>
            </form>
          </div>
        </div>
      </Container>
    </div>
  );
}

export default Admin_edit_course_instructor;
