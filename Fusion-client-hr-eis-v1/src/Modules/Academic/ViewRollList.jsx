import { useState, useEffect } from "react";
import axios from "axios";
import {
  Card,
  Text,
  Button,
  Alert,
  Loader,
  Center,
  Group,
  Select,
} from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import FusionTable from "../../components/FusionTable";
import {
  generatexlsheet,
  academicProceduresFaculty,
  availableCoursesRoute,
} from "../../routes/academicRoutes";

const PROGRAMME_TYPE_CHOICES = [
  { value: "UG", label: "Undergraduate (UG)" },
  { value: "PG", label: "Postgraduate (PG)" },
  { value: "All", label: "All Programmes" },
];

function ViewRollList() {
  const [allCourses, setAllCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [fetchError, setFetchError] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloadingCourseId, setDownloadingCourseId] = useState(null);
  const [programmeType, setProgrammeType] = useState("All");
  const [filteringCourses, setFilteringCourses] = useState(false);

  useEffect(() => {
    const fetchCourses = async () => {
      const token = localStorage.getItem("authToken");
      if (!token) {
        setFetchError("No authentication token found.");
        return;
      }

      try {
        const response = await axios.get(academicProceduresFaculty, {
          headers: { Authorization: `Token ${token}` },
        });
        const assignedCourses = response.data.assigned_courses || [];
        setAllCourses(assignedCourses);
        setFilteredCourses(assignedCourses);
      } catch (error) {
        setFetchError(
          error.response?.data?.error || "Failed to fetch courses."
        );
      }
    };

    fetchCourses();
  }, []);

  // Function to check if courses have students of selected programme type
  const filterCoursesByProgrammeType = async (progType) => {
    if (progType === 'All') {
      setFilteredCourses(allCourses);
      return;
    }

    setFilteringCourses(true);
    const token = localStorage.getItem("authToken");
    const coursesWithStudents = [];

    for (const course of allCourses) {
      try {
        // Check if course has students of selected programme type
        const response = await axios.post(
          generatexlsheet,
          {
            course: course.course_id,
            semester_type: course.semester_type,
            academic_year: course.academic_year,
            programme_type: progType,
            preview_only: true,
          },
          {
            headers: {
              Authorization: `Token ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const students = response.data.students || response.data || [];
        if (students.length > 0) {
          coursesWithStudents.push(course);
        }
      } catch (error) {
        console.error(`Error checking students for course ${course.course_code}:`, error);
        // If error, include the course to be safe
        coursesWithStudents.push(course);
      }
    }

    setFilteredCourses(coursesWithStudents);
    setFilteringCourses(false);
  };

  // Handle programme type change
  const handleProgrammeTypeChange = async (newProgType) => {
    setProgrammeType(newProgType);
    await filterCoursesByProgrammeType(newProgType);
  };

  // Filter courses when allCourses changes
  useEffect(() => {
    if (allCourses.length > 0) {
      filterCoursesByProgrammeType(programmeType);
    }
  }, [allCourses]);

  const handleDownloadRollList = async (
    courseId,
    courseCode,
    semesterType,
    academicYear
  ) => {
    const token = localStorage.getItem("authToken");

    if (!token) {
      setFetchError("No authentication token found.");
      return;
    }

    try {
      setDownloadingCourseId(courseId);
      setLoading(true);

      const payload = {
        course: courseId,
        semester_type: semesterType,
        academic_year: academicYear,
      };
      
      if (programmeType && programmeType !== 'All') {
        payload.programme_type = programmeType;
      }

      const response = await axios.post(
        generatexlsheet,
        payload,
        {
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
          },
          responseType: "blob",
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      const fileProgTypeName = programmeType && programmeType !== 'All' ? `_${programmeType}` : '';
      link.setAttribute("download", `${courseCode}${fileProgTypeName}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      const msgProgTypeName = programmeType && programmeType !== 'All' ? ` (${programmeType})` : '';
      showNotification({
        title: "Success",
        message: `Roll list${msgProgTypeName} downloaded successfully`,
        color: "green",
      });
    } catch (error) {
      showNotification({
        title: "Download Failed",
        message: error.response?.data?.error || "Failed to download roll list.",
        color: "red",
      });
    } finally {
      setLoading(false);
      setDownloadingCourseId(null);
    }
  };

  const columnNames = [
    "Course Name",
    "Course Code",
    "Version",
    "Academic Year",
    "Semester Type",
    "Action",
  ];

  const elements = filteredCourses.map((course) => ({
    "Course Name": course.course_name,
    "Course Code": course.course_code,
    Version: course.version,
    "Academic Year": course.academic_year,
    "Semester Type": course.semester_type,
    Action: (
      <Button
        onClick={() =>
          handleDownloadRollList(
            course.course_id,
            course.course_code,
            course.semester_type,
            course.academic_year
          )
        }
        variant="outline"
        color="blue"
        size="xs"
        disabled={loading && downloadingCourseId === course.course_id}
        rightSection={
          loading && downloadingCourseId === course.course_id ? (
            <Loader size="xs" color="blue" />
          ) : null
        }
      >
        {loading && downloadingCourseId === course.course_id
          ? "Downloading..."
          : `Download ${programmeType !== 'All' ? programmeType + ' ' : ''}Roll List`}
      </Button>
    ),
  }));

  return (
    <Card shadow="sm" p="lg" radius="md" withBorder>
      <Text
        size="lg"
        weight={700}
        mb="md"
        style={{ textAlign: "center", color: "#3B82F6" }}
      >
        Assigned Courses
      </Text>
      
      <Group position="center" mb="md">
        <Select
          label="Programme Type"
          placeholder="All Programmes"
          data={PROGRAMME_TYPE_CHOICES}
          value={programmeType}
          onChange={handleProgrammeTypeChange}
          style={{ width: 200 }}
          disabled={filteringCourses}
        />
        {filteringCourses && (
          <Text size="sm" color="dimmed">
            Filtering courses...
          </Text>
        )}
      </Group>
      
      {fetchError && (
        <Alert title="Error" color="red" mb="md">
          {fetchError}
        </Alert>
      )}
      {loading && allCourses.length === 0 ? (
        <Center>
          <Loader size="lg" />
        </Center>
      ) : (
        <>
          {filteredCourses.length === 0 && allCourses.length > 0 && !filteringCourses ? (
            <Alert color="blue" mb="md">
              No courses found with {programmeType} students enrolled.
            </Alert>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <FusionTable
                columnNames={columnNames}
                elements={elements}
                width="100%"
              />
            </div>
          )}
        </>
      )}
    </Card>
  );
}

export default ViewRollList;
