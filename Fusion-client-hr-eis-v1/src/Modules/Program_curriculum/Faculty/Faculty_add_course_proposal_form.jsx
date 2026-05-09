import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
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
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useNavigate, useParams } from "react-router-dom";
import { notifications } from "@mantine/notifications";
import {
  fetchAllCourses,
} from "../api/api";
import { host } from "../../../routes/globalRoutes";

function Faculty_add_course_proposal_form() {
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
      uploader: "",
      uploader_name: "",
      Designation: "",
      Title: "",
      Description: "",
    },
    validate: {
      courseName: (value) => value?.trim().length === 0 ? "Course name is required" : null,
      courseCode: (value) => value?.trim().length === 0 ? "Course code is required" : null,
      discipline: (value) => value?.trim().length === 0 ? "Discipline is required" : null,
      syllabus: (value) => value?.trim().length === 0 ? "Syllabus is required" : null,
      references: (value) => value?.trim().length === 0 ? "References are required" : null,
    },
  });
  const role = useSelector((state) => state.user.role);
  const uploader_fullname = useSelector((state) => state.user.username);
  const uploader_username = useSelector((state) => state.user.roll_no);
  const navigate = useNavigate();
  const { id } = useParams();
  const [courses, setCourses] = useState([]);

  useEffect(() => {
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
          message: "Failed to fetch courses",
          color: "red",
        });
      }
    };
    fetchCourses();
  }, [id]);
  useEffect(() => {
    if (role && uploader_fullname) {
      try {
        form.setValues({
          Designation: role,
          uploader: uploader_username,
          uploader_name: uploader_fullname,
        });
      } catch (err) {
        notifications.show({
          title: "Error",
          message: "Failed to set form values",
          color: "red",
        });
      }
    }
  }, [role, uploader_fullname]);

  const handleSubmit = async (values) => {
    const apiUrl = `${host}/programme_curriculum/api/new_course_proposal_file/`;

    const payload = {
      name: values.courseName,
      code: values.courseCode,
      credit: values.courseCredit,
      version: values.courseVersion,
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
      maxSeats: values.maxSeats,
      Title: values.Title,
      Description: values.Description,
      uploader: values.uploader,
      Designation: values.Designation,
    };
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        
        notifications.show({
          title: "✅ Course Proposal Added Successfully!",
          message: (
            <div>
              <Text size="sm" mb={8}>
                <strong>Course proposal "{values.courseName}" ({values.courseCode}) has been submitted.</strong>
              </Text>
              <Text size="xs" color="gray.7">
                Credits: {values.courseCredit} | Version: {values.courseVersion}
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
        
        form.reset();
        setTimeout(() => {
          navigate("/programme_curriculum/faculty_view_course_proposal");
        }, 1500);
      } else {
        const errorText = await response.text();
        
        notifications.show({
          title: "❌ Failed to Add Course Proposal",
          message: (
            <div>
              <Text size="sm" mb={8}>
                <strong>Unable to submit course proposal. Please try again.</strong>
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
              <strong>Connection error occurred while submitting proposal.</strong>
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
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ flex: 1, marginRight: "8px" }}>
                    <Textarea
                      label="Uploader"
                      placeholder=""
                      value={form.values.uploader_name}
                      onChange={(event) =>
                        form.setFieldValue(
                          "uploader",
                          event.currentTarget.value,
                        )
                      }
                    />
                  </div>
                  <div style={{ flex: 1, marginLeft: "8px" }}>
                    <Textarea
                      label="Designation"
                      placeholder=""
                      value={form.values.Designation}
                      onChange={(event) =>
                        form.setFieldValue(
                          "Designation",
                          event.currentTarget.value,
                        )
                      }
                    />
                  </div>
                </div>
                <Textarea
                  label="Title"
                  placeholder="Enter Title"
                  value={form.values.Title}
                  onChange={(event) =>
                    form.setFieldValue("Title", event.currentTarget.value)
                  }
                />
                <Textarea
                  label="Description"
                  placeholder="Enter Description"
                  value={form.values.Description}
                  onChange={(event) =>
                    form.setFieldValue("Description", event.currentTarget.value)
                  }
                />
                <Table
                  striped
                  highlightOnHover
                  style={{ borderCollapse: "collapse", width: "100%" }}
                >
                  <tbody>
                    <tr>
                      <td
                        style={{
                          border: "1px solid #1976d2",
                          padding: "10px",
                          fontWeight: "bold",
                          color: "#1976d2",
                        }}
                      >
                        Course Name:
                      </td>
                      <td
                        style={{ border: "1px solid #1976d2", padding: "10px" }}
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
                          border: "1px solid #1976d2",
                          padding: "10px",
                          fontWeight: "bold",
                          color: "#1976d2",
                        }}
                      >
                        Course Code:
                      </td>
                      <td
                        style={{ border: "1px solid #1976d2", padding: "10px" }}
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
                          border: "1px solid #1976d2",
                          padding: "10px",
                          fontWeight: "bold",
                          color: "#1976d2",
                        }}
                      >
                        Credit:
                      </td>
                      <td
                        style={{ border: "1px solid #1976d2", padding: "10px" }}
                      >
                        <NumberInput
                          placeholder="4"
                          value={form.values.courseCredit}
                          onChange={(value) =>
                            form.setFieldValue("courseCredit", value)
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
                          border: "1px solid #1976d2",
                          padding: "10px",
                          fontWeight: "bold",
                          color: "#1976d2",
                        }}
                      >
                        Version:
                      </td>
                      <td
                        style={{ border: "1px solid #1976d2", padding: "10px" }}
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

                {/* Contact Hours */}
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
                {/* Discipline and Others */}
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
                  error={form.errors.syllabus}
                  required
                />
                <Textarea
                  label="References"
                  placeholder="Enter references"
                  value={form.values.references}
                  onChange={(event) =>
                    form.setFieldValue("references", event.currentTarget.value)
                  }
                  error={form.errors.references}
                  required
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

                <Button type="submit" mt="md">
                  Submit
                </Button>
              </Stack>
            </form>
          </div>
        </div>
      </Container>
    </div>
  );
}

export default Faculty_add_course_proposal_form;
