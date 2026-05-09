import React, { useEffect, useState } from "react";
import {
  Select,
  Button,
  Group,
  Text,
  Container,
  Stack,
  Flex,
  FileInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useNavigate } from "react-router-dom";
import { notifications } from "@mantine/notifications";
import * as XLSX from "xlsx";
import { fetchAllCourses, fetchFacultiesData } from "../api/api";
import { host } from "../../../routes/globalRoutes";

export default function Admin_add_course_instructor() {
  const [activeSection, setActiveSection] = useState("manual");
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const navigate = useNavigate();

  // Academic Year options
  const currentYear = new Date().getFullYear();
  const academicYearOptions = Array.from({ length: 6 }, (_, i) => {
    const start = currentYear - 4 + i;
    const end = start + 1;
    const label = `${start}-${String(end).slice(-2)}`;
    return { value: label, label };
  });

  const semesterTypeOptions = [
    { value: "Odd Semester", label: "Odd Semester" },
    { value: "Even Semester", label: "Even Semester" },
    { value: "Summer Semester", label: "Summer Semester" },
  ];

  const form = useForm({
    initialValues: {
      courseId: "",
      instructorId: "",
      academicYear: academicYearOptions[4].value,
      semesterType: "Odd Semester",
    },
  });

  useEffect(() => {
    (async () => {
      try {
        const courseResp = await fetchAllCourses();
        setCourses(
          courseResp.map((c) => ({
            value: String(c.id),
            label: `${c.name} (${c.code})`,
          }))
        );
        const facResp = await fetchFacultiesData();
        setFaculties(
          facResp.map((f) => ({
            value: String(f.id),
            label: `${f.faculty_first_name} ${f.faculty_last_name}`,
          }))
        );
      } catch (err) {
        notifications.show({
          title: "Error",
          message: "Failed to load data. Please refresh the page.",
          color: "red",
          autoClose: 4000,
        });
      }
    })();
  }, []);

  const handleSubmit = async (values) => {
    localStorage.setItem("AdminInstructorsCacheChange", "true");
    const token = localStorage.getItem("authToken");
    const apiUrl = `${host}/programme_curriculum/api/admin_add_course_instructor/`;

    const payload = {
      course_id: values.courseId,
      instructor_id: values.instructorId,
      academic_year: values.academicYear,
      semester_type: values.semesterType,
      form_submit: true,
    };

    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        notifications.show({
          title: "✅ Course Instructor Added Successfully!",
          message: (
            <div>
              <Text size="sm" mb={8}>
                <strong>Course instructor has been added.</strong>
              </Text>
              <Text size="xs" color="gray.7">
                The instructor assignment has been created.
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
      } else {
        const err = await res.json();
        
        notifications.show({
          title: "❌ Failed to Add Course Instructor",
          message: (
            <div>
              <Text size="sm" mb={8}>
                <strong>{err.error || "Unable to add course instructor. Please try again."}</strong>
              </Text>
              <Text size="xs" color="gray.7">
                {JSON.stringify(err.details) || "Please check your inputs and try again."}
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
    } catch (e) {
      notifications.show({
        title: "🚨 Network Error",
        message: (
          <div>
            <Text size="sm" mb={8}>
              <strong>Connection error occurred while adding instructor.</strong>
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

    const handleUpload = async () => {
    if (!file) {
      notifications.show({
        title: "⚠️ File Required",
        message: "Please select an Excel file first.",
        color: "orange",
        autoClose: 4000,
      });
      return;
    }
    
    if (!file.name.match(/\.(xls|xlsx)$/)) {
      notifications.show({
        title: "⚠️ Invalid File Type",
        message: "Only .xls/.xlsx files are allowed.",
        color: "orange",
        autoClose: 4000,
      });
      return;
    }
    setIsUploading(true);
    const token = localStorage.getItem("authToken");
    const apiUrl = `${host}/programme_curriculum/api/admin_add_course_instructor/`;

    try {
      const formData = new FormData();
      formData.append("manual_instructor_xsl", file);
      formData.append("excel_submit", "true");
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { Authorization: `Token ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        notifications.show({
          title: "✅ Excel Upload Successful!",
          message: (
            <div>
              <Text size="sm" mb={8}>
                <strong>{data.success || "Course instructors have been uploaded."}</strong>
              </Text>
              <Text size="xs" color="gray.7">
                Excel file has been processed and instructors have been added.
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
      } else {
        throw new Error(data.error || JSON.stringify(data.details));
      }
    } catch (e) {
      notifications.show({
        title: "❌ Upload Failed",
        message: (
          <div>
            <Text size="sm" mb={8}>
              <strong>Upload error: {e.message}</strong>
            </Text>
            <Text size="xs" color="gray.7">
              Please check your Excel file format and try again.
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
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () =>
    navigate("/programme_curriculum/admin_course_instructor");

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
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
            maxWidth: "290vw",
            width: "100%",
            display: "flex",
            gap: "2rem",
            padding: "2rem",
            flex: 4,
          }}
        >
          <div
            style={{
              flex: 4,
              backgroundColor: "#fff",
              padding: "2rem",
              borderRadius: "8px",
              boxShadow: "0 0 10px rgba(0,0,0,0.1)",
            }}
          >
            <form onSubmit={form.onSubmit(handleSubmit)}>
              <Text size="xl" weight={700} align="center" mb="md">
                Course Instructor Form
              </Text>

              <Flex justify="flex-start" align="center" mb={10}>
                <Button
                  variant={activeSection === "manual" ? "filled" : "outline"}
                  onClick={() => setActiveSection("manual")}
                  style={{ marginRight: "10px" }}
                >
                  Manual
                </Button>
                <Button
                  variant={activeSection === "excel" ? "filled" : "outline"}
                  onClick={() => setActiveSection("excel")}
                >
                  Upload Excel
                </Button>
              </Flex>

              <Stack spacing="lg">
                {activeSection === "manual" ? (
                  <>
                    <Select
                      label="Course"
                      placeholder="Select course"
                      data={courses}
                      {...form.getInputProps("courseId")}
                      searchable
                      required
                    />
                    <Select
                      label="Instructor"
                      placeholder="Select instructor"
                      data={faculties}
                      {...form.getInputProps("instructorId")}
                      searchable
                      required
                    />
                    <Select
                      label="Academic Year"
                      data={academicYearOptions}
                      {...form.getInputProps("academicYear")}
                      required
                    />
                    <Select
                      label="Semester Type"
                      data={semesterTypeOptions}
                      {...form.getInputProps("semesterType")}
                      required
                    />

                    <Group position="right" mt="lg">
                      <Button variant="outline" onClick={handleCancel}>
                        Cancel
                      </Button>
                      <Button type="submit">Submit</Button>
                    </Group>
                  </>
                ) : (
                  <>
                    <Text size="xl" weight={700}>
                      Upload via Excel
                    </Text>
                    <Group spacing="sm" mb="md">
                      <FileInput
                        label="Excel file"
                        placeholder="Select .xls/.xlsx"
                        onChange={setFile}
                        disabled={isUploading}
                        style={{
                          width: "250px",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      />
                      <Button
                        variant="outline"
                        onClick={() => {
                          const sample = [
                            [
                              "Course Code",
                              "Course Version",
                              "Instructor Id",
                              "Academic Year",
                              "Semester Type",
                            ],
                            [
                              "NS205i",
                              "1",
                              "amitv",
                              academicYearOptions[4].value,
                              "Odd Semester",
                            ],
                          ];
                          const ws = XLSX.utils.aoa_to_sheet(sample);
                          const wb = XLSX.utils.book_new();
                          XLSX.utils.book_append_sheet(wb, ws, "Instructors");
                          XLSX.writeFile(wb, "instructors_sample.xlsx");
                        }}
                        style={{ marginTop: "24px" }}
                      >
                        Download Sample
                      </Button>
                    </Group>
                    <Group position="right" mt="lg">
                      <Button variant="outline" onClick={handleCancel}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handleUpload}
                        disabled={isUploading || !file}
                      >
                        {isUploading ? "Uploading…" : "Upload"}
                      </Button>
                    </Group>
                  </>
                )}
              </Stack>
            </form>
          </div>
          <div style={{ flex: 1 }} />
        </div>
      </Container>
    </div>
  );
}
