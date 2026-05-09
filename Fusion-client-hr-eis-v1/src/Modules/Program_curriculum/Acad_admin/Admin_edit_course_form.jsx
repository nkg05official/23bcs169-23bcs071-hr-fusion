import React, { useState, useEffect } from "react";
import {
  NumberInput,
  Textarea,
  Button,
  Group,
  Text,
  Container,
  Stack,
  TextInput,
  Table,
  MultiSelect,
  Badge,
  Alert,
  Modal,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useNavigate, useParams } from "react-router-dom";
import { notifications } from "@mantine/notifications";
import { showVersioningNotification } from "../../../utils/notifications";
import {
  fetchDisciplinesData,
  fetchAllCourses,
  fetchCourseDetails,
} from "../api/api";
import { host } from "../../../routes/globalRoutes";

function Admin_edit_course_form() {
  const form = useForm({
    initialValues: {
      courseName: "",
      courseCode: "",
      courseCredit: 4,
      courseVersion: "1.0",
      lectureHours: 3,
      tutorialHours: 1,
      practicalHours: 2,
      discussionHours: 0,
      projectHours: 0,
      discipline: "",
      preRequisites: "",
      preRequisiteCourse: "",
      syllabus: "",
      references: "",
      quiz1: 10,
      midsem: 20,
      quiz2: 10,
      endsem: 30,
      project: 10,
      labEvaluation: 15,
      attendance: 5,
    },
    validate: {
      courseName: (value) => (value ? null : "Course name is required"),
      courseCode: (value) => (value ? null : "Course code is required"),
      discipline: (value) => (value ? null : "Discipline is required"),
      syllabus: (value) => (value ? null : "Syllabus is required"),
      references: (value) => (value ? null : "References is required"),
    },
  });

  const navigate = useNavigate();
  const { id } = useParams();
  const [disciplines, setDisciplines] = useState([]);
  const [courses, setCourses] = useState([]);
  const [course, setCourse] = useState([]);
  
  // New state for intelligent versioning
  const [versionInfo, setVersionInfo] = useState(null);
  const [showVersionPreview, setShowVersionPreview] = useState(false);
  const [previewInfo, setPreviewInfo] = useState(null);
  const [originalFormData, setOriginalFormData] = useState(null);

  useEffect(() => {
    const fetchDisciplines = async () => {
      try {
        const response = await fetchDisciplinesData();
        const disciplineList = response.map((discipline) => ({
          name: `${discipline.name} (${discipline.acronym})`,
          id: discipline.id,
        }));
        setDisciplines(disciplineList);
      } catch (fetchError) {
        notifications.show({
          title: "Error",
          message: "Failed to load disciplines. Please refresh the page.",
          color: "red",
          autoClose: 4000,
        });
      }
    };

    const fetchCourses = async () => {
      try {
        const response = await fetchAllCourses();

        const courseList = response.map((c) => ({
          name: `${c.name} (${c.code})`,
          id: c.id,
        }));
        setCourses(courseList);
      } catch (error) {
        notifications.show({
          title: "Error",
          message: "Failed to load courses. Please refresh the page.",
          color: "red",
          autoClose: 4000,
        });
      }
    };

    const loadCourseDetails = async () => {
      try {
        const data = await fetchCourseDetails(id);
        setCourse(data);
        
        // Store original form data for version comparison
        const formData = {
          courseName: data.name,
          courseCode: data.code,
          courseCredit: data.credit,
          courseVersion: data.version,
          lectureHours: data.lecture_hours,
          tutorialHours: data.tutorial_hours,
          practicalHours: data.pratical_hours,
          discussionHours: data.discussion_hours,
          projectHours: data.project_hours,
          discipline: data.disciplines.length>0?data.disciplines.map((d) => JSON.stringify(d)):[],
          preRequisites: data.pre_requisits,
          preRequisiteCourse: data.pre_requisit_courses.length>0?data.pre_requisit_courses.map((c) => JSON.stringify(c)):[],
          syllabus: data.syllabus,
          references: data.ref_books,
          quiz1: data.percent_quiz_1,
          midsem: data.percent_midsem,
          quiz2: data.percent_quiz_2,
          endsem: data.percent_endsem,
          project: data.percent_project,
          labEvaluation: data.percent_lab_evaluation,
          attendance: data.percent_course_attendance,
          maxSeats: data.max_seats,
        };
        
        form.setValues(formData);
        setOriginalFormData(formData);
      } catch (err) {
        notifications.show({
          title: "Error",
          message: "Failed to load course details. Please refresh the page.",
          color: "red",
          autoClose: 4000,
        });
      }
    };

    fetchDisciplines();
    fetchCourses();
    loadCourseDetails();
  }, [id]);
  
  // Preview version changes before submitting
  const previewVersionChanges = async () => {
    if (!originalFormData) return;
    
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${host}/programme_curriculum/api/test_intelligent_versioning/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({
          old_course_data: {
            name: originalFormData.courseName,
            code: originalFormData.courseCode,
            credit: originalFormData.courseCredit,
            lecture_hours: originalFormData.lectureHours,
            tutorial_hours: originalFormData.tutorialHours,
            pratical_hours: originalFormData.practicalHours,
            discussion_hours: originalFormData.discussionHours,
            project_hours: originalFormData.projectHours,
            syllabus: originalFormData.syllabus,
            ref_books: originalFormData.references,
            percent_quiz_1: originalFormData.quiz1,
            percent_midsem: originalFormData.midsem,
            percent_quiz_2: originalFormData.quiz2,
            percent_endsem: originalFormData.endsem,
            percent_project: originalFormData.project,
            percent_lab_evaluation: originalFormData.labEvaluation,
            percent_course_attendance: originalFormData.attendance,
          },
          new_course_data: {
            name: form.values.courseName,
            code: form.values.courseCode,
            credit: form.values.courseCredit,
            lecture_hours: form.values.lectureHours,
            tutorial_hours: form.values.tutorialHours,
            pratical_hours: form.values.practicalHours,
            discussion_hours: form.values.discussionHours,
            project_hours: form.values.projectHours,
            syllabus: form.values.syllabus,
            ref_books: form.values.references,
            percent_quiz_1: form.values.quiz1,
            percent_midsem: form.values.midsem,
            percent_quiz_2: form.values.quiz2,
            percent_endsem: form.values.endsem,
            percent_project: form.values.project,
            percent_lab_evaluation: form.values.labEvaluation,
            percent_course_attendance: form.values.attendance,
          }
        }),
      });
      
      if (response.ok) {
        const preview = await response.json();
        setPreviewInfo(preview);
        setShowVersionPreview(true);
      }
    } catch (error) {
      console.error("Error previewing version changes:", error);
    }
  };
  
  const handleSubmit = async (values) => {
    const apiUrl = `${host}/programme_curriculum/api/admin_update_course/${id}/`;
    const token = localStorage.getItem("authToken");
    localStorage.setItem("AdminCoursesCachechange", "true");
    
    const payload = {
      name: values.courseName,
      code: values.courseCode,
      credit: values.courseCredit,
      lecture_hours: values.lectureHours,
      tutorial_hours: values.tutorialHours,
      pratical_hours: values.practicalHours,
      project_hours: values.projectHours,
      discussion_hours: values.discussionHours,
      syllabus: values.syllabus,
      percent_quiz_1: values.quiz1,
      percent_midsem: values.midsem,
      percent_quiz_2: values.quiz2,
      percent_endsem: values.endsem,
      percent_project: values.project,
      percent_lab_evaluation: values.labEvaluation,
      percent_course_attendance: values.attendance,
      ref_books: values.references,
      disciplines: values.discipline,
      pre_requisit_courses: values.preRequisiteCourse,
      pre_requisits: values.preRequisites,
    };

    try {
      const response = await fetch(apiUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Store version information for display
        if (data.old_version && data.new_version) {
          setVersionInfo({
            oldVersion: data.old_version,
            newVersion: data.new_version,
            bumpType: data.version_bump_type,
            changedFields: data.changed_academic_fields || [],
            reason: data.reason || "Course updated successfully",
          });
        }
        
        // Enhanced notification with version information using utility function
        showVersioningNotification({
          entityName: values.courseName,
          entityCode: values.courseCode,
          oldVersion: data.old_version,
          newVersion: data.new_version,
          versionBumpType: data.version_bump_type,
          reason: data.reason,
          changedFields: data.changed_academic_fields || [],
        });
        
        setTimeout(() => {
          navigate(`/programme_curriculum/admin_course/${data.course_id}`);
        }, 1500);
      } else {
        const errorData = await response.json();
        
        notifications.show({
          title: "❌ Failed to Update Course",
          message: (
            <div>
              <Text size="sm" mb={8}>
                <strong>Failed to update course: {errorData.error || response.statusText}</strong>
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
    } catch (error) {
      notifications.show({
        title: "🚨 Network Error",
        message: (
          <div>
            <Text size="sm" mb={8}>
              <strong>Connection error occurred while updating course.</strong>
            </Text>
            <Text size="xs" color="gray.7">
              Please check your internet connection and try again.
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
  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <Container
        fluid
        style={{
          display: "flex",
          justifyContent: "left",
          alignItems: "left",
          width: "100%",
          margin: "0 0 0 -3.2vw",
        }}
      >
        <div
          style={{
            maxWidth: "90vw",
            width: "100%",
            display: "flex",
            gap: "2rem",
            padding: "2rem",
            flex: 4,
          }}
        >
          <div style={{ flex: 4 }}>
            <form
              onSubmit={form.onSubmit(handleSubmit)}
              style={{
                backgroundColor: "#fff",
                padding: "2rem",
                borderRadius: "8px",
                boxShadow: "0 0 10px rgba(0,0,0,0.1)",
              }}
            >
              <Stack spacing="lg">
                <Text
                  size="xl"
                  weight={700}
                  align="center"
                  style={{ padding: "10px", borderRadius: "5px" }}
                >
                  Course Form
                </Text>

                <Table
                  striped
                  highlightOnHover
                  style={{ borderCollapse: "collapse", width: "100%" }}
                >
                  <tbody>
                    <tr>
                      <td
                        style={{
                          border: "2px solid #1976d2",
                          padding: "10px",
                          fontWeight: "bold",
                          color: "#1976d2",
                        }}
                      >
                        Course Name:
                      </td>
                      <td
                        style={{ border: "2px solid #1976d2", padding: "10px" }}
                      >
                        <TextInput
                          placeholder="Discrete Mathematics"
                          value={form.values.courseName}
                          onChange={(event) =>
                            form.setFieldValue(
                              "courseName",
                              event.currentTarget.value,
                            )
                          }
                          required
                          styles={{
                            input: {
                              borderRadius: "4px",
                              height: "30px",
                              fontSize: "14px",
                              border: "none",
                            },
                          }}
                        />
                      </td>
                    </tr>
                    <tr>
                      <td
                        style={{
                          border: "2px solid #1976d2",
                          padding: "10px",
                          fontWeight: "bold",
                          color: "#1976d2",
                        }}
                      >
                        Course Code:
                      </td>
                      <td
                        style={{ border: "2px solid #1976d2", padding: "10px" }}
                      >
                        <TextInput
                          placeholder="NS205c"
                          value={form.values.courseCode}
                          onChange={(event) =>
                            form.setFieldValue(
                              "courseCode",
                              event.currentTarget.value,
                            )
                          }
                          required
                          styles={{
                            input: {
                              borderRadius: "4px",
                              height: "30px",
                              fontSize: "14px",
                              border: "none",
                            },
                          }}
                        />
                      </td>
                    </tr>
                    <tr>
                      <td
                        style={{
                          border: "2px solid #1976d2",
                          padding: "10px",
                          fontWeight: "bold",
                          color: "#1976d2",
                        }}
                      >
                        Credit:
                      </td>
                      <td
                        style={{ border: "2px solid #1976d2", padding: "10px" }}
                      >
                        <NumberInput
                          placeholder="4"
                          value={form.values.courseCredit}
                          onChange={(value) =>
                            form.setFieldValue("courseCredit", value)
                          }
                          required
                          readOnly
                          styles={{
                            input: {
                              borderRadius: "4px",
                              height: "30px",
                              fontSize: "14px",
                              border: "none",
                              backgroundColor: "#f5f5f5",
                              color: "#666",
                            },
                          }}
                        />
                      </td>
                    </tr>
                    <tr>
                      <td
                        style={{
                          border: "2px solid #1976d2",
                          padding: "10px",
                          fontWeight: "bold",
                          color: "#1976d2",
                        }}
                      >
                        Version:
                      </td>
                      <td
                        style={{ border: "2px solid #1976d2", padding: "10px" }}
                      >
                        <TextInput
                          placeholder="1.0"
                          value={form.values.courseVersion}
                          onChange={(event) =>
                            form.setFieldValue(
                              "courseVersion",
                              event.currentTarget.value,
                            )
                          }
                          required
                          styles={{
                            input: {
                              borderRadius: "4px",
                              height: "30px",
                              fontSize: "14px",
                              border: "none",
                            },
                          }}
                        />
                      </td>
                    </tr>
                  </tbody>
                </Table>

                <Group
                  grow
                  style={{
                    borderBottom: "2px solid lightblue",
                    paddingBottom: "10px",
                  }}
                >
                  <NumberInput
                    label="Lecture (L)"
                    placeholder="3"
                    value={form.values.lectureHours}
                    onChange={(value) =>
                      form.setFieldValue("lectureHours", value)
                    }
                    required
                    styles={{
                      input: {
                        borderRadius: "8px",
                        height: "40px",
                        fontSize: "16px",
                      },
                      control: { width: "15px" },
                      label: { fontSize: "14px", fontWeight: 600 },
                    }}
                    step={1}
                  />
                  <NumberInput
                    label="Tutorial (T)"
                    placeholder="1"
                    value={form.values.tutorialHours}
                    onChange={(value) =>
                      form.setFieldValue("tutorialHours", value)
                    }
                    required
                    styles={{
                      input: {
                        borderRadius: "8px",
                        height: "40px",
                        fontSize: "16px",
                      },
                      control: { width: "15px" },
                      label: { fontSize: "14px", fontWeight: 600 },
                    }}
                    step={1}
                  />
                  <NumberInput
                    label="Practical (P)"
                    placeholder="2"
                    value={form.values.practicalHours}
                    onChange={(value) =>
                      form.setFieldValue("practicalHours", value)
                    }
                    required
                    styles={{
                      input: {
                        borderRadius: "8px",
                        height: "40px",
                        fontSize: "16px",
                      },
                      control: { width: "15px" },
                      label: { fontSize: "14px", fontWeight: 600 },
                    }}
                    step={1}
                  />

                  <NumberInput
                    label="Discussion Hours"
                    placeholder="0"
                    value={form.values.discussionHours}
                    onChange={(value) =>
                      form.setFieldValue("discussionHours", value)
                    }
                    required
                    styles={{
                      input: {
                        borderRadius: "8px",
                        height: "40px",
                        fontSize: "16px",
                      },
                      control: { width: "15px" },
                      label: { fontSize: "14px", fontWeight: 600 },
                    }}
                    step={1}
                  />
                  <NumberInput
                    label="Practical Hours"
                    placeholder="0"
                    value={form.values.projectHours}
                    onChange={(value) =>
                      form.setFieldValue("projectHours", value)
                    }
                    required
                    styles={{
                      input: {
                        borderRadius: "8px",
                        height: "40px",
                        fontSize: "16px",
                      },
                      control: { width: "15px" },
                      label: { fontSize: "14px", fontWeight: 600 },
                    }}
                    step={1}
                  />
                  <NumberInput
                    label="Max. Seats"
                    placeholder="0"
                    value={form.values.maxSeats}
                    onChange={(value) => form.setFieldValue("maxSeats", value)}
                    required
                    styles={{
                      input: {
                        borderRadius: "8px",
                        height: "40px",
                        fontSize: "16px",
                      },
                      control: { width: "15px" },
                      label: { fontSize: "14px", fontWeight: 600 },
                    }}
                    step={1}
                  />
                </Group>
                <MultiSelect
                  label="From Discipline"
                  placeholder="Select Discipline"
                  data={disciplines.map((discipline) => ({
                    label: discipline.name,
                    value: discipline.id.toString(),
                    ...discipline,
                  }))}
                  value={
                    Array.isArray(form.values.discipline)
                      ? form.values.discipline.map(String)
                      : []
                  }
                  onChange={(value) => {
                    const integerValues = value ? value.map(Number) : [];
                    form.setFieldValue("discipline", integerValues);
                  }}
                  required
                  searchable
                />
                <Textarea
                  label="Pre-requisites"
                  placeholder="None"
                  value={form.values.preRequisites}
                  onChange={(event) =>
                    form.setFieldValue(
                      "preRequisites",
                      event.currentTarget.value,
                    )
                  }
                />
                <MultiSelect
                  label="Pre-requisite Course"
                  placeholder="Select Course"
                  data={courses.map((c) => ({
                    label: c.name,
                    value: c.id.toString(),
                    ...c,
                  }))}
                  value={
                    Array.isArray(form.values.preRequisiteCourse)
                      ? form.values.preRequisiteCourse
                      : []
                  }
                  onChange={(value) =>
                    form.setFieldValue("preRequisiteCourse", value || [])
                  }
                  searchable
                />
                <Textarea
                  label="Syllabus"
                  placeholder="Enter syllabus"
                  value={form.values.syllabus}
                  onChange={(event) =>
                    form.setFieldValue("syllabus", event.currentTarget.value)
                  }
                  required
                  error={form.errors.syllabus}
                />
                <Textarea
                  label="References"
                  placeholder="Enter references"
                  value={form.values.references}
                  onChange={(event) =>
                    form.setFieldValue("references", event.currentTarget.value)
                  }
                  required
                  error={form.errors.references}
                />
                <Group
                  grow
                  style={{
                    borderBottom: "2px solid lightblue",
                    paddingBottom: "10px",
                  }}
                >
                  <NumberInput
                    label="Quiz 1"
                    placeholder="3"
                    value={form.values.quiz1}
                    onChange={(value) => form.setFieldValue("quiz1", value)}
                    required
                    styles={{
                      input: {
                        borderRadius: "8px",
                        height: "40px",
                        fontSize: "16px",
                      },
                      control: { width: "15px" },
                      label: { fontSize: "14px", fontWeight: 600 },
                    }}
                    step={1}
                  />
                  <NumberInput
                    label="Midsem"
                    placeholder="1"
                    value={form.values.midsem}
                    onChange={(value) => form.setFieldValue("midsem", value)}
                    required
                    styles={{
                      input: {
                        borderRadius: "8px",
                        height: "40px",
                        fontSize: "16px",
                      },
                      control: { width: "15px" },
                      label: { fontSize: "14px", fontWeight: 600 },
                    }}
                    step={1}
                  />
                  <NumberInput
                    label="Quiz 2"
                    placeholder="2"
                    value={form.values.quiz2}
                    onChange={(value) => form.setFieldValue("quiz2", value)}
                    required
                    styles={{
                      input: {
                        borderRadius: "8px",
                        height: "40px",
                        fontSize: "16px",
                      },
                      control: { width: "15px" },
                      label: { fontSize: "14px", fontWeight: 600 },
                    }}
                    step={1}
                  />
                  <NumberInput
                    label="Endsem"
                    placeholder="0"
                    value={form.values.endsem}
                    onChange={(value) => form.setFieldValue("endsem", value)}
                    required
                    styles={{
                      input: {
                        borderRadius: "8px",
                        height: "40px",
                        fontSize: "16px",
                      },
                      control: { width: "15px" },
                      label: { fontSize: "14px", fontWeight: 600 },
                    }}
                    step={1}
                  />
                  <NumberInput
                    label="Project"
                    placeholder="0"
                    value={form.values.project}
                    onChange={(value) => form.setFieldValue("project", value)}
                    required
                    styles={{
                      input: {
                        borderRadius: "8px",
                        height: "40px",
                        fontSize: "16px",
                      },
                      control: { width: "15px" },
                      label: { fontSize: "14px", fontWeight: 600 },
                    }}
                    step={1}
                  />
                  <NumberInput
                    label="Lab"
                    placeholder="0"
                    value={form.values.labEvaluation}
                    onChange={(value) =>
                      form.setFieldValue("labEvaluation", value)
                    }
                    required
                    styles={{
                      input: {
                        borderRadius: "8px",
                        height: "40px",
                        fontSize: "16px",
                      },
                      control: { width: "15px" },
                      label: { fontSize: "14px", fontWeight: 600 },
                    }}
                    step={1}
                  />
                  <NumberInput
                    label="Attendance"
                    placeholder="0"
                    value={form.values.attendance}
                    onChange={(value) =>
                      form.setFieldValue("attendance", value)
                    }
                    required
                    styles={{
                      input: {
                        borderRadius: "8px",
                        height: "40px",
                        fontSize: "16px",
                      },
                      control: { width: "15px" },
                      label: { fontSize: "14px", fontWeight: 600 },
                    }}
                    step={1}
                  />
                </Group>

                <Group position="apart">
                  <Button 
                    variant="outline" 
                    onClick={() => navigate(-1)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" mt="md">
                    Save Changes
                  </Button>
                </Group>
              </Stack>
            </form>
          </div>
        </div>
      </Container>
      
      {/* Version Preview Modal */}
      <Modal
        opened={showVersionPreview}
        onClose={() => setShowVersionPreview(false)}
        title="📋 Version Change Preview"
        size="lg"
      >
        {previewInfo && (
          <Stack spacing="md">
            <Alert 
              color={previewInfo.version_bump_type === 'MAJOR' ? 'red' : 
                     previewInfo.version_bump_type === 'MINOR' ? 'orange' : 
                     previewInfo.version_bump_type === 'PATCH' ? 'green' : 'gray'}
              variant="light"
            >
              <Text weight={600}>
                {previewInfo.version_bump_type === 'NONE' ? 
                  '✏️ No version bump required' : 
                  `🔄 ${previewInfo.version_bump_type} version bump detected`
                }
              </Text>
              <Text size="sm" mt={4}>
                {previewInfo.reason}
              </Text>
            </Alert>
            
            {previewInfo.changed_academic_fields && previewInfo.changed_academic_fields.length > 0 && (
              <div>
                <Text size="sm" weight={500}>Changed Academic Fields:</Text>
                <Group spacing="xs" mt={4}>
                  {previewInfo.changed_academic_fields.map((field, index) => (
                    <Badge key={index} variant="outline" size="sm">
                      {field}
                    </Badge>
                  ))}
                </Group>
              </div>
            )}
            
            {previewInfo.old_version && previewInfo.new_version && (
              <Text size="sm">
                <strong>Version Change:</strong> {previewInfo.old_version} → {previewInfo.new_version}
              </Text>
            )}
            
            <Group position="right" mt="lg">
              <Button variant="outline" onClick={() => setShowVersionPreview(false)}>
                Close
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </div>
  );
}

export default Admin_edit_course_form;
