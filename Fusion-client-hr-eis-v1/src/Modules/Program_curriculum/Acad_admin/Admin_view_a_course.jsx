import React, { useEffect, useState } from "react";
import { Button, Table, Card, Text, Grid, Stack, Badge, Alert, Modal, Pagination } from "@mantine/core";
import { useParams, useNavigate } from "react-router-dom";
import { useMediaQuery } from "@mantine/hooks";
import { fetchCourseDetails } from "../api/api";
import { host } from "../../../routes/globalRoutes";

function CourseDetail() {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { id } = useParams(); // Extract the course ID from the URL
  const [courseDetails, setCourseDetails] = useState(null); // State to hold the course data
  const [loading, setLoading] = useState(true); // Loading state
  const [error, setError] = useState(null); // Error state
  const navigate = useNavigate();

  const [auditLogs, setAuditLogs] = useState([]);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch course data from the backend
  useEffect(() => {
    const loadCourseDetails = async () => {
      try {
        const data = await fetchCourseDetails(id); // Fetch course details
        setCourseDetails(data); // Update the state with the fetched data
      } catch (err) {
        setError("Failed to load course details."); // Set error message in case of failure
      } finally {
        setLoading(false); // End loading state
      }
    };

    loadCourseDetails(); // Call the fetch function when the component mounts
  }, [id]);
  
  // Fetch course audit logs
  const fetchAuditLogs = async (page = 1) => {
    setAuditLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `${host}/programme_curriculum/api/admin_course_audit_logs/${id}/?page=${page}&page_size=10`,
        {
          headers: {
            Authorization: `Token ${token}`,
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setAuditLogs(data.logs || []);
        setTotalPages(Math.ceil((data.total_count || 0) / 10));
      } else {
        console.error("Failed to fetch audit logs");
      }
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setAuditLoading(false);
    }
  };
  
  const handleShowAuditLogs = () => {
    setShowAuditLogs(true);
    fetchAuditLogs(1);
  };
  
  const handlePageChange = (page) => {
    setCurrentPage(page);
    fetchAuditLogs(page);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  // If no course details are found, return a message
  if (!courseDetails) return <div>No course found!</div>;

  return (
    <div className="course-detail-container">
      <Grid gutter="md">
        {/* Buttons section - shown above table on mobile, beside on desktop */}
        <Grid.Col span={isMobile ? 12 : 3} order={isMobile ? 1 : 2}>
          <div className="button-container">
            <Button
              variant="filled"
              color="blue"
              radius="sm"
              fullWidth
              style={{ width: "100%", maxWidth: "200px" }}
              onClick={() => navigate(`/programme_curriculum/acad_admin_edit_course_form/${id}`)}
            >
              Edit Course
            </Button>
            <Button
              variant="filled"
              color="blue"
              radius="sm"
              fullWidth
              style={{ width: "100%", maxWidth: "200px" }}
              onClick={() =>
                navigate(
                  "/programme_curriculum/acad_admin_add_course_proposal_form",
                )
              }
            >
              Add Course
            </Button>
            <Button
              variant="outline"
              color="orange"
              radius="sm"
              fullWidth
              style={{ width: "100%", maxWidth: "200px" }}
              onClick={handleShowAuditLogs}
            >
              📋 View Change History
            </Button>
          </div>
        </Grid.Col>

        {/* Course Details Card - spans 9 columns on desktop, 12 on mobile */}
        <Grid.Col span={isMobile ? 12 : 9} order={isMobile ? 2 : 1}>
          <Card shadow="sm" padding="lg" className="course-card">
            <Text size="lg" weight={700} className="course-title">
              {courseDetails.code} - {courseDetails.name} - v
              {courseDetails.version}
            </Text>

            <Table className="course-table" striped highlightOnHover>
              <tbody>
                <tr>
                  <td
                    style={{ width: "50%", color: "blue", fontWeight: "bold" }}
                  >
                    Course Code
                  </td>
                  <td style={{ width: "50%" }}>{courseDetails.code}</td>
                </tr>
                <tr>
                  <td style={{ color: "blue", fontWeight: "bold" }}>
                    Course Name
                  </td>
                  <td>{courseDetails.name}</td>
                </tr>
                <tr>
                  <td style={{ color: "blue", fontWeight: "bold" }}>Version</td>
                  <td>{courseDetails.version}</td>
                </tr>

                <tr>
                  <td style={{ padding: "0" }}>
                    <tr>
                      <td
                        rowSpan="5"
                        style={{
                          width: "10%",
                          color: "blue",
                          fontWeight: "bold",
                        }}
                      >
                        contactHours
                      </td>
                      <td
                        style={{
                          width: "10%",
                          color: "blue",
                          fontWeight: "bold",
                        }}
                      >
                        Lecture
                      </td>
                    </tr>
                    <tr>
                      <td
                        style={{
                          width: "15%",
                          color: "blue",
                          fontWeight: "bold",
                        }}
                      >
                        Tutorial
                      </td>
                    </tr>
                    <tr>
                      <td
                        style={{
                          width: "15%",
                          color: "blue",
                          fontWeight: "bold",
                        }}
                      >
                        Lab
                      </td>
                    </tr>
                    <tr>
                      <td
                        style={{
                          width: "15%",
                          color: "blue",
                          fontWeight: "bold",
                        }}
                      >
                        Discussion
                      </td>
                    </tr>
                    <tr>
                      <td
                        style={{
                          width: "15%",
                          color: "blue",
                          fontWeight: "bold",
                        }}
                      >
                        Project
                      </td>
                    </tr>
                  </td>

                  <tr>
                    <td style={{ width: "3%", backgroundColor: "white" }}>
                      {courseDetails.lecture_hours}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ width: "3%", backgroundColor: "white" }}>
                      {courseDetails.tutorial_hours}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ width: "3%", backgroundColor: "white" }}>
                      {courseDetails.pratical_hours}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ width: "3%", backgroundColor: "white" }}>
                      {courseDetails.discussion_hours}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ width: "3%", backgroundColor: "white" }}>
                      {courseDetails.project_hours}
                    </td>
                  </tr>
                </tr>
                <tr>
                  <td style={{ color: "blue", fontWeight: "bold" }}>Credits</td>
                  <td>{courseDetails.credits}</td>
                </tr>

                <tr>
                  <td style={{ padding: "0" }}>
                    <tr>
                      <td
                        rowSpan="2"
                        style={{
                          width: "10%",
                          color: "blue",
                          fontWeight: "bold",
                        }}
                      >
                        Pre-requisites
                      </td>
                      <td
                        style={{
                          width: "10%",
                          color: "blue",
                          fontWeight: "bold",
                        }}
                      >
                        Info
                      </td>
                    </tr>
                    <tr>
                      <td
                        style={{
                          width: "15%",
                          color: "blue",
                          fontWeight: "bold",
                        }}
                      >
                        Courses
                      </td>
                    </tr>
                  </td>
                  <tr>
                    <td style={{ width: "3%", backgroundColor: "white" }}>
                      {courseDetails.pre_requisits}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ width: "3%", backgroundColor: "white" }}>
                      {courseDetails.prerequisites_courses}
                    </td>
                  </tr>
                </tr>

                <tr>
                  <td style={{ color: "blue", fontWeight: "bold" }}>
                    Syllabus
                  </td>
                  <td>{courseDetails.syllabus}</td>
                </tr>

                <tr>
                  <td style={{ padding: "0" }}>
                    <tr>
                      <td
                        rowSpan="7"
                        style={{
                          width: "10%",
                          color: "blue",
                          fontWeight: "bold",
                        }}
                      >
                        Evaluation Schema
                      </td>
                      <td
                        style={{
                          width: "10%",
                          color: "blue",
                          fontWeight: "bold",
                        }}
                      >
                        Quiz-1
                      </td>
                    </tr>
                    <tr>
                      <td
                        style={{
                          width: "15%",
                          color: "blue",
                          fontWeight: "bold",
                        }}
                      >
                        Mid-Sem-Exam
                      </td>
                    </tr>
                    <tr>
                      <td
                        style={{
                          width: "15%",
                          color: "blue",
                          fontWeight: "bold",
                        }}
                      >
                        Quiz-2
                      </td>
                    </tr>
                    <tr>
                      <td
                        style={{
                          width: "15%",
                          color: "blue",
                          fontWeight: "bold",
                        }}
                      >
                        End-Sem-Exam
                      </td>
                    </tr>
                    <tr>
                      <td
                        style={{
                          width: "15%",
                          color: "blue",
                          fontWeight: "bold",
                        }}
                      >
                        Project
                      </td>
                    </tr>
                    <tr>
                      <td
                        style={{
                          width: "15%",
                          color: "blue",
                          fontWeight: "bold",
                        }}
                      >
                        Lab
                      </td>
                    </tr>
                    <tr>
                      <td
                        style={{
                          width: "15%",
                          color: "blue",
                          fontWeight: "bold",
                        }}
                      >
                        Course Attendance
                      </td>
                    </tr>
                  </td>

                  <tr>
                    <td style={{ width: "3%", backgroundColor: "white" }}>
                      {courseDetails.percent_quiz_1}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ width: "3%", backgroundColor: "white" }}>
                      {courseDetails.percent_midsem}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ width: "3%", backgroundColor: "white" }}>
                      {courseDetails.percent_quiz_2}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ width: "3%", backgroundColor: "white" }}>
                      {courseDetails.percent_endsem}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ width: "3%", backgroundColor: "white" }}>
                      {courseDetails.percent_project}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ width: "3%", backgroundColor: "white" }}>
                      {courseDetails.percent_lab_evaluation}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ width: "3%", backgroundColor: "white" }}>
                      {courseDetails.percent_course_attendance}
                    </td>
                  </tr>
                </tr>

                <tr>
                  <td style={{ color: "blue", fontWeight: "bold" }}>
                    References & Books
                  </td>
                  <td>{courseDetails.ref_books}</td>
                </tr>
              </tbody>
            </Table>
          </Card>
        </Grid.Col>
      </Grid>

      <style>{`
        .course-detail-container {
          padding: 20px;
          width: 100%;
        }

        .button-container {
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 100%;
          justify-content: flex-start;
          padding: ${isMobile ? "0" : "0 0 0 20px"};
        }

        @media (max-width: 768px) {
          .button-container {
            margin-bottom: 20px;
          }
          
          .button-container button {
            width: 100% !important;
          }
        }

        .course-card {
          width: 100%;
          background-color: white;
          border-radius: 8px;
          padding: 20px;
        }

        .course-title {
          text-align: center;
          margin-bottom: 20px;
          color: #2c3e50;
        }

        .course-table {
          width: 100%;
          margin-bottom: 20px;
          border-collapse: collapse;
        }

        .course-table td {
          padding: 10px;
          font-size: 14px;
          border: 1px solid #ccc;
        }

        .course-table tr:nth-child(even) {
          background-color: #f2f2f2;
        }
      `}</style>
   
      <Modal
        opened={showAuditLogs}
        onClose={() => setShowAuditLogs(false)}
        title={`📋 Change History - ${courseDetails?.name} (${courseDetails?.code})`}
        size="xl"
      >
        <Stack spacing="md">
          {auditLoading ? (
            <Text>Loading audit logs...</Text>
          ) : auditLogs.length === 0 ? (
            <Alert color="blue" variant="light">
              No change history found for this course.
            </Alert>
          ) : (
            <>
              <Stack spacing="sm">
                {auditLogs.map((log) => (
                  <Card key={log.id} padding="md" withBorder>
                    <Grid>
                      <Grid.Col span={8}>
                        <Text size="sm" weight={500}>
                          {log.action} by {log.user}
                        </Text>
                        <Text size="xs" color="gray.6">
                          {new Date(log.timestamp).toLocaleString()}
                        </Text>
                      </Grid.Col>
                      <Grid.Col span={4}>
                        <Badge
                          color={
                            log.version_bump_type === 'MAJOR' ? 'red' :
                            log.version_bump_type === 'MINOR' ? 'orange' :
                            log.version_bump_type === 'PATCH' ? 'green' : 'gray'
                          }
                          variant="light"
                          size="sm"
                        >
                          {log.version_bump_type || 'UPDATE'}
                        </Badge>
                        {log.admin_override && (
                          <Badge color="purple" variant="outline" size="xs" ml={4}>
                            Admin Override
                          </Badge>
                        )}
                      </Grid.Col>
                    </Grid>
                    
                    {log.reason && (
                      <Text size="sm" mt="xs" color="gray.7">
                        {log.reason}
                      </Text>
                    )}
                    
                    {log.old_version && log.new_version && (
                      <Text size="xs" mt={4} color="blue.6">
                        Version: {log.old_version} → {log.new_version}
                      </Text>
                    )}
                    
                    {log.changed_fields && log.changed_fields.length > 0 && (
                      <div style={{ marginTop: '8px' }}>
                        <Text size="xs" color="gray.6">Changed fields:</Text>
                        <div style={{ marginTop: '4px' }}>
                          {log.changed_fields.map((field, index) => (
                            <Badge key={index} variant="outline" size="xs" mr={4}>
                              {field}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </Stack>
              
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                  <Pagination
                    value={currentPage}
                    onChange={handlePageChange}
                    total={totalPages}
                    size="sm"
                  />
                </div>
              )}
            </>
          )}
        </Stack>
      </Modal>
    </div>
  );
}

export default CourseDetail;
