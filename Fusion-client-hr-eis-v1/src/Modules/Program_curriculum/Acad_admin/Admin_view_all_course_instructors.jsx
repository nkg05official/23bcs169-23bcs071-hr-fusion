import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  MantineProvider,
  Table,
  Flex,
  Container,
  Button,
  TextInput,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useSelector } from "react-redux";
import { adminFetchCourseInstructorData } from "../api/api";
import { MagnifyingGlass, PencilSimple, Trash } from "@phosphor-icons/react";
import { notifications } from "@mantine/notifications";
import { host } from "../../../routes/globalRoutes";

function Admin_view_all_course_instructors() {
  const [searchQuery, setSearchQuery] = useState("");
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useMediaQuery("(max-width: 768px)");

  const reduxRole = useSelector((state) => state.user.role);

  // Get role from sessionStorage (fallback)
  const sessionData = JSON.parse(sessionStorage.getItem("sessionData"));
  const sessionRole = sessionData?.last_selected_role;

  // Determine which role to use (Redux takes precedence)
  const role = reduxRole || sessionRole;

  // Check if user is acadadmin
  const isAcadAdmin = role === "acadadmin";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) {
          throw new Error("Authorization token not found");
        }

        const cachedData = localStorage.getItem("AdminInstructorsCache");
        const timestamp = localStorage.getItem("AdminInstructorsTimestamp");
        const isCacheValid =
          timestamp && Date.now() - parseInt(timestamp, 10) < 10 * 60 * 1000;
        const cachedDataChange = localStorage.getItem(
          "AdminInstructorsCacheChange",
        );

        if (cachedData && isCacheValid && cachedDataChange === "false") {
          setInstructors(JSON.parse(cachedData));
        } else {
          const data = await adminFetchCourseInstructorData();
          setInstructors(data);
          localStorage.setItem("AdminInstructorsCacheChange", "false");
          localStorage.setItem("AdminInstructorsCache", JSON.stringify(data));
          localStorage.setItem(
            "AdminInstructorsTimestamp",
            Date.now().toString(),
          );
        }
      } catch (error) {
        notifications.show({
          title: "Error",
          message: "Failed to load course instructors. Please refresh the page.",
          color: "red",
          autoClose: 4000,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredData = instructors.filter((item) => {
    const instructorFirst = item.faculty_first_name || "";
    const instructorLast = item.faculty_last_name || "";
    const year = item.academic_year || "";
    const courseName = item.course_name || "";
    const courseCode = item.course_code || "";
    const semesterType = item.semester_type || "";
    
    const searchText = `${courseCode} ${courseName} ${instructorFirst} ${instructorLast} ${year} ${semesterType}`.toLowerCase();
    
    return searchText.includes(searchQuery.toLowerCase());
  });

  const handleDelete = async (instructorId) => {
    if (!window.confirm("Are you sure you want to delete this course instructor?")) {
      return;
    }

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `${host}/programme_curriculum/api/admin_delete_course_instructor/${instructorId}/`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      let data = {};
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      }

      if (response.ok && (data.success !== false)) {
        const deletedInstructor = instructors.find(instructor => instructor.id === instructorId);
        
        setInstructors(instructors.filter(instructor => instructor.id !== instructorId));
        
        localStorage.setItem("AdminInstructorsCacheChange", "true");
        
        notifications.show({
          title: "Successfully Deleted",
          message: data.message || `Course instructor '${deletedInstructor?.name || 'Unknown'}' has been deleted`,
          color: "green",
          autoClose: 3000,
        });
      } else {
        if (response.status === 404) {
          notifications.show({
            title: "Not Found",
            message: "This course instructor may have already been deleted or the delete endpoint is not available",
            color: "orange",
            autoClose: 4000,
          });
        } else if (response.status === 400 && data.dependencies) {
          notifications.show({
            title: "Cannot Delete",
            message: data.message || "Cannot delete course instructor due to existing dependencies",
            color: "red",
            autoClose: 5000,
          });
        } else {
          let errorMessage = data.message || "Failed to delete course instructor";
          notifications.show({
            title: "Error",
            message: `${errorMessage} (Status: ${response.status})`,
            color: "red",
            autoClose: 4000,
          });
        }
        
        throw new Error(`HTTP ${response.status}: ${data.message || 'Failed to delete course instructor'}`);
      }
    } catch (error) {
      if (!error.message.includes('HTTP')) {
        notifications.show({
          title: "Network Error",
          message: "Unable to connect to the server. Please check your internet connection.",
          color: "red",
          autoClose: 4000,
        });
      }
    }
  };
  
  const cellStyle = {
    padding: "15px 20px",
    textAlign: "center",
    borderRight: "1px solid #d3d3d3",
  };

  const baseColumns = [
    { key: "course_code", label: "Code" },
    { key: "course_name", label: "Course Name" },
    { key: "course_version", label: "Version" },
    { key: "faculty", label: "Instructor" },
    { key: "academic_year", label: "Academic Year" },
    { key: "semester_type", label: "Semester Type" },
  ];

  const tableColumns = isAcadAdmin
    ? [...baseColumns, { key: "actions", label: "Actions" }]
    : baseColumns;
  const rows = filteredData.map((element, index) => {
    const baseCells = (
      <>
        <td style={cellStyle}>{element.course_code}</td>
        <td style={cellStyle}>{element.course_name}</td>
        <td style={cellStyle}>{element.course_version}</td>
        <td style={cellStyle}>
          {element.faculty_first_name} {element.faculty_last_name}
        </td>
        <td style={cellStyle}>{element.academic_year}</td>
        <td style={cellStyle}>{element.semester_type}</td>
      </>
    );
    const actionCell = isAcadAdmin ? (
      <td style={{ padding: "15px 20px", textAlign: "center" }}>
        <Flex justify="center" gap="md">
          <Tooltip label="Edit Course Instructor">
            <ActionIcon
              variant="light"
              color="blue"
              size="md"
              component={Link}
              to={`/programme_curriculum/admin_edit_course_instructor/${element.id}`}
            >
              <PencilSimple size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Delete Course Instructor">
            <ActionIcon
              variant="light"
              color="red"
              size="md"
              onClick={() => handleDelete(element.id)}
            >
              <Trash size={16} />
            </ActionIcon>
          </Tooltip>
        </Flex>
      </td>
    ) : null;

    return (
      <tr
        key={element.id}
        style={{ backgroundColor: index % 2 === 0 ? "#FFFFFF" : "#E6F7FF" }}
      >
        {baseCells}
        {actionCell}
      </tr>
    );
  });

  return (
    <MantineProvider
      theme={{ colorScheme: "light" }}
      withGlobalStyles
      withNormalizeCSS
    >
      <Container
        style={{ padding: "20px", minHeight: "100vh", maxWidth: "100%" }}
      >
        <Flex justify="space-between" align="center" mb={10} wrap="wrap" gap="md">
          <Button variant="filled" style={{ marginRight: "10px" }}>
            Instructors
          </Button>
          
          <Flex align="center" gap="md" style={{ flex: 1, justifyContent: "flex-end" }}>
            <TextInput
              placeholder="Search by course name, code, instructor, year, or semester..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftSection={<MagnifyingGlass size={16} />}
              style={{ minWidth: "300px", maxWidth: "400px" }}
              size="sm"
            />
            {isAcadAdmin && (
              <Button
                variant="filled"
                color="blue"
                radius="sm"
                size="sm"
                component={Link}
                to="/programme_curriculum/acad_admin_add_course_instructor"
              >
                Add Course Instructor
              </Button>
            )}
          </Flex>
        </Flex>
        <hr />

        <div
          style={{
            maxHeight: "70vh",
            overflowY: "auto",
            border: "1px solid #d3d3d3",
            borderRadius: "10px",
            scrollbarWidth: "none",
          }}
        >
          <style>
            {`
              div::-webkit-scrollbar {
                display: none;
              }
            `}
          </style>
              <Table style={{ backgroundColor: "white", padding: "20px" }}>
                <thead>
                  <tr>
                    {tableColumns.map((column) => (
                      <th
                        key={column.key}
                        style={{
                          padding: "15px 20px",
                          backgroundColor: "#C5E2F6",
                          color: "#3498db",
                          fontSize: "16px",
                          textAlign: "center",
                          borderRight: "1px solid #d3d3d3",
                        }}
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={tableColumns.length}
                        style={{ textAlign: "center" }}
                      >
                        Loading...
                      </td>
                    </tr>
                  ) : rows.length > 0 ? (
                    rows
                  ) : (
                    <tr>
                      <td
                        colSpan={tableColumns.length}
                        style={{ textAlign: "center" }}
                      >
                        No instructors found
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          </Container>
        </MantineProvider>
      );
    }

    export default Admin_view_all_course_instructors;
