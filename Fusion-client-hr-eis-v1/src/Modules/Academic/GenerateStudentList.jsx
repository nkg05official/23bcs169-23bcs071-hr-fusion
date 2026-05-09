import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  Text,
  Button,
  Group,
  Select,
  Tabs,
  Box,
  Loader,
  Alert,
  TextInput,
  Checkbox,
  Modal,
  Paper,
  Stack,
  Table,
  ScrollArea,
  Title,
} from "@mantine/core";
import axios from "axios";
import { showNotification } from "@mantine/notifications";

import {
  availableCoursesRoute,   // NEW endpoint: GET /aims/api/available-courses/
  generatexlsheet,         // POST /aims/api/generate-xlsheet/
  listBatchesRoute,        // Academic procedures API for prereg tab
  generateprereport,       // unchanged: for prereg tab
} from "../../routes/academicRoutes";

const ACADEMIC_YEARS = [
  "2021-22",
  "2022-23",
  "2023-24",
  "2024-25",
  "2025-26",
  "2026-27",
];

const SEMESTER_CHOICES = [
  { value: "Odd Semester", label: "Odd Semester" },
  { value: "Even Semester", label: "Even Semester" },
  { value: "Summer Semester", label: "Summer Semester" },
];

const PROGRAMME_TYPE_CHOICES = [
  { value: "UG", label: "Undergraduate (UG)" },
  { value: "PG", label: "Postgraduate (PG)" },
  { value: "All", label: "All Programmes" },
];

const LIST_TYPE_CHOICES = [
  { value: "Regular", label: "Regular" },
  { value: "Backlog", label: "Backlog" },
  { value: "Improvement", label: "Improvement" },
  { value: "Audit", label: "Audit" },
  { value: "Extra Credits", label: "Extra Credits" },
  { value: "Replacement", label: "Replacement" },
];

export default function GenerateStudentList() {
  const [activeTab, setActiveTab]       = useState("rolllist");

  // Roll List states
  const [academicYear, setAcademicYear] = useState("");
  const [semesterType, setSemesterType] = useState("");
  const [programmeType, setProgrammeType] = useState("All");
  const [listType, setListType]         = useState("");
  const [course, setCourse]             = useState("");
  const [courseOptions, setCourseOptions] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Pre-Registration states (unchanged)
  const [batch, setBatch]               = useState("");
  const [semester, setSemester]         = useState("");
  const [batchOptions, setBatchOptions] = useState([]);

  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);

  // 1) Fetch available courses once year+semester are set
  const fetchCourses = useCallback(async () => {
    if (!academicYear || !semesterType) return;
    setLoading(true);
    setError(null);

    const token = localStorage.getItem("authToken");
    if (!token) {
      setError("No auth token");
      setLoading(false);
      return;
    }

    try {
      const res = await axios.get(availableCoursesRoute, {
        params: { academic_year: academicYear, semester_type: semesterType },
        headers: { Authorization: `Token ${token}` },
      });
      // Expect [{ id, code, name, instructor }, ...]
      setCourseOptions(
        res.data.map(c => ({
          value: String(c.id),
          label: `${c.code} - ${c.name}`,
          instructor: c.instructor || 'TBA',
        }))
      );
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  }, [academicYear, semesterType]);

  useEffect(() => {
    if (activeTab === "rolllist") {
      fetchCourses();
    }
  }, [activeTab, fetchCourses]);

  // 2) Handle Preview for All Types
  const handlePreview = async () => {
    if (!academicYear || !semesterType || !course) {
      showNotification({
        title: "Missing fields",
        message: "Select year, semester, and course first",
        color: "yellow",
      });
      return;
    }

    setPreviewLoading(true);
    const token = localStorage.getItem("authToken");
    try {
      const payload = {
        academic_year: academicYear,
        semester_type: semesterType,
        course,
        preview_only: true,
      };
      if (listType && listType.trim() !== '') {
        payload.list_type = listType;
      }
      if (programmeType && programmeType !== 'All') {
        payload.programme_type = programmeType;
      }

      const res = await axios.post(generatexlsheet, payload, {
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
      });
      
      let students = res.data.students || res.data || [];
      
      setPreviewData(students);
      setShowPreview(true);
    } catch (err) {
      if (err.response?.status === 400 || err.response?.data?.detail?.includes("preview_only")) {
        setPreviewData([]);
        setShowPreview(true);
      } else {
        showNotification({ 
          title: "Error", 
          message: "Failed to fetch preview data: " + (err.response?.data?.detail || err.message), 
          color: "red" 
        });
      }
    } finally {
      setPreviewLoading(false);
    }
  };

  // 3) Generate Roll List Excel
  const handleGenerateList = async () => {
    if (!academicYear || !semesterType || !course) {
      showNotification({
        title: "Missing fields",
        message: "Select year, semester, and course",
        color: "yellow",
      });
      return;
    }

    await handlePreview();
  };

  // 4) Confirm and generate after preview
  const handleConfirmGenerate = async () => {
    setLoading(true);
    const token = localStorage.getItem("authToken");
    try {
      const payload = {
        academic_year: academicYear,
        semester_type: semesterType,
        course,
      };

      if (listType && listType.trim() !== '') {
        payload.list_type = listType;
      }
      if (programmeType && programmeType !== 'All') {
        payload.programme_type = programmeType;
      }

      const res = await axios.post(generatexlsheet, payload, {
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
        responseType: "blob",
      });

      // Filename from course code and course name
      const selectedCourse = courseOptions.find(c => c.value === course);
      let courseCode = 'Course';
      let courseName = 'List';
      
      if (selectedCourse) {
        const parts = selectedCourse.label.split(' - ');
        if (parts.length >= 2) {
          courseCode = parts[0].trim();
          courseName = parts[1].trim();
        } else {
          courseName = selectedCourse.label;
        }
      }
      const courseNameClean = courseName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
      const filename = `${courseCode}_${courseNameClean}.xlsx`;

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      setShowPreview(false);
      const listTypeName = listType || "All";
      const progTypeName = programmeType && programmeType !== 'All' ? ` (${programmeType})` : '';
      showNotification({
        title: "Success",
        message: `${listTypeName} student list${progTypeName} generated successfully`,
        color: "green",
      });
    } catch (err) {
      console.error("Generate List Error:", err);
      showNotification({ 
        title: "Error", 
        message: err.response?.data?.detail || err.message, 
        color: "red" 
      });
    } finally {
      setLoading(false);
    }
  };

  // 5) Fetch batches for Pre‐Registration when that tab is active
  useEffect(() => {
    if (activeTab !== "preregistration") return;
    const fetchBatches = async () => {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await axios.get(listBatchesRoute, {
          headers: { Authorization: `Token ${token}` },
        });
        
        setBatchOptions(
          (res.data.batches || res.data).map(b => ({
            value: String(b.batch_id || b.id),
            label: `${b.name || b.label || `Batch ${b.year}`} ${b.discipline || ''}`,
          }))
        );
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchBatches();
  }, [activeTab]);

  // 6) Generate Pre-Registration Report (unchanged)
  const generatePreRegistrationReport = async () => {
    setLoading(true);
    const token = localStorage.getItem("authToken");
    try {
      const res = await axios.post(
        generateprereport,
        { semester_no: semester, batch_branch: batch },
        {
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
          },
          responseType: "blob",
        }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `PreReg_${batch}_${semester}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card shadow="sm" p="lg" radius="md" withBorder>
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List grow>
          <Tabs.Tab value="rolllist">Roll List</Tabs.Tab>
          <Tabs.Tab value="preregistration">Pre-Registration</Tabs.Tab>
        </Tabs.List>

        {/* Roll List Tab */}
        <Tabs.Panel value="rolllist" pt="md">
          <Text size="lg" weight={700} align="center" mb="md" color="blue">
            Generate Student Roll List
          </Text>

          <Group grow mb="md">
            <Select
              label="Academic Year"
              placeholder="2024-25"
              data={ACADEMIC_YEARS.map(y => ({ value: y, label: y }))}
              value={academicYear}
              onChange={setAcademicYear}
            />
            <Select
              label="Semester Type"
              placeholder="Odd Semester"
              data={SEMESTER_CHOICES}
              value={semesterType}
              onChange={setSemesterType}
            />
            <Select
              label="Programme Type"
              placeholder="All Programmes"
              data={PROGRAMME_TYPE_CHOICES}
              value={programmeType}
              onChange={setProgrammeType}
            />
          </Group>
{/* 
          <Select
            label="List Type (Optional)"
            placeholder="Leave empty for all enrolled students"
            data={LIST_TYPE_CHOICES}
            value={listType}
            onChange={setListType}
            clearable
            mb="xs"
          />
          <Text size="xs" color="dimmed" mb="md">
            💡 If no list type is selected, the system will generate a complete roll list of all students enrolled in the course (Regular, Backlog, Improvement, etc.)
          </Text> */}

          {error ? (
            <Alert color="red">{error}</Alert>
          ) : (
            <Select
              label="Course"
              placeholder="Select course"
              data={courseOptions}
              value={course}
              onChange={setCourse}
              searchable
              mb="md"
            />
          )}

          <Button
            fullWidth
            onClick={handleGenerateList}
            loading={loading || previewLoading}
            disabled={!academicYear || !semesterType || !course}
          >
            Preview {programmeType !== 'All' ? `${programmeType} ` : ''}{listType || 'All'} Students
          </Button>
        </Tabs.Panel>

        {/* Pre-Registration Tab (logic unchanged) */}
        <Tabs.Panel value="preregistration" pt="md">
          <Text size="lg" weight={700} align="center" mb="md" color="blue">
            Pre-Registration Report
          </Text>

          <Group grow mb="md">
            <TextInput
              label="Semester"
              placeholder="Select Semester"
              value={semester}
              onChange={e => setSemester(e.target.value)}
            />
            <Select
              label="Batch"
              placeholder="Select Batch"
              data={batchOptions}
              value={batch}
              onChange={setBatch}
              searchable
            />
          </Group>

          <Button
            fullWidth
            onClick={generatePreRegistrationReport}
            loading={loading}
            disabled={!semester || !batch}
          >
            Generate Pre-Registration Report
          </Button>
        </Tabs.Panel>
      </Tabs>

      {/* Preview Modal for All List Types */}
      <Modal
        opened={showPreview}
        onClose={() => setShowPreview(false)}
        title={
          <Text size="lg" weight={700} style={{ color: "#1c7ed6" }}>
            {programmeType !== 'All' ? `${programmeType} ` : ''}{listType || 'All Registration Types'} Student List Preview
          </Text>
        }
        size="xl"
        padding="lg"
        centered
      >
        <Paper withBorder p="md" style={{ backgroundColor: "#f8f9fa" }}>
          <Stack spacing="md">
            {/* Course Header Information */}
            <Box style={{ borderBottom: "1px solid #dee2e6", paddingBottom: "10px" }}>
              <Text align="center" size="lg" weight={700} style={{ color: "#1c7ed6" }}>
                PDPM INDIAN INSTITUTE OF INFORMATION TECHNOLOGY, DESIGN AND MANUFACTURING JABALPUR
              </Text>
              <Text align="center" size="md" weight={600} mt="xs">
                {semesterType.toUpperCase()}, {academicYear}
              </Text>
            </Box>

            {/* Course Details */}
            <Box>
              <Text size="sm" weight={500}>Course No.: <Text span>{courseOptions.find(c => c.value === course)?.label?.split(' - ')[0] || 'N/A'}</Text></Text>
              <Text size="sm" weight={500}>Course Title: <Text span>{courseOptions.find(c => c.value === course)?.label?.split(' - ')[1] || courseOptions.find(c => c.value === course)?.label || 'N/A'}</Text></Text>
              <Text size="sm" weight={500}>Instructor: <Text span>{
                courseOptions.find(c => c.value === course)?.instructor || 'TBA'
              }</Text></Text>
              <Text size="sm" weight={500}>List Type: <Text span color={listType ? "blue" : "green"}>
                {programmeType !== 'All' ? `${programmeType} - ` : ""}{listType || "Complete Roll List (All Registration Types)"}
              </Text></Text>
            </Box>

            {previewLoading ? (
              <Box style={{ textAlign: "center", padding: "2rem" }}>
                <Loader size="lg" />
                <Text mt="md">Loading preview data...</Text>
              </Box>
            ) : previewData.length > 0 ? (
              <ScrollArea style={{ height: "400px" }}>
                <Table striped highlightOnHover style={{ border: "1px solid #dee2e6" }}>
                  <thead style={{ backgroundColor: "#e7f5ff" }}>
                    <tr>
                      <th style={{ padding: "12px 8px", fontSize: "13px", fontWeight: "600" }}>S. No</th>
                      <th style={{ padding: "12px 8px", fontSize: "13px", fontWeight: "600" }}>Roll No</th>
                      <th style={{ padding: "12px 8px", fontSize: "13px", fontWeight: "600" }}>Name</th>
                      <th style={{ padding: "12px 8px", fontSize: "13px", fontWeight: "600" }}>Discipline</th>
                      <th style={{ padding: "12px 8px", fontSize: "13px", fontWeight: "600" }}>Email</th>
                      <th style={{ padding: "12px 8px", fontSize: "13px", fontWeight: "600" }}>Reg. Type</th>
                      <th style={{ padding: "12px 8px", fontSize: "13px", fontWeight: "600" }}>Signature</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((student, index) => (
                      <tr key={student.roll_number || index}>
                        <td style={{ padding: "8px", fontSize: "12px" }}>{index + 1}</td>
                        <td style={{ padding: "8px", fontSize: "12px", fontWeight: "500" }}>
                          {student.roll_number || student.roll_no || student.id || 'N/A'}
                        </td>
                        <td style={{ padding: "8px", fontSize: "12px" }}>
                          {student.name || student.full_name || student.student_name || 'N/A'}
                        </td>
                        <td style={{ padding: "8px", fontSize: "12px" }}>
                          {student.branch || student.discipline || student.department || 'N/A'}
                        </td>
                        <td style={{ padding: "8px", fontSize: "12px" }}>
                          {student.email || 'N/A'}
                        </td>
                        <td style={{ padding: "8px", fontSize: "12px" }}>
                          {student.registration_type || student.status || listType || 'Regular'}
                        </td>
                        <td style={{ padding: "8px", fontSize: "12px" }}>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </ScrollArea>
            ) : (
              <Alert color="blue">
                {programmeType !== 'All' 
                  ? `No ${programmeType} students found${listType ? ` with "${listType}" registration type` : ''} in this course.`
                  : listType 
                    ? `No students found with "${listType}" registration type in this course.`
                    : 'No students enrolled in this course (checked all registration types: Regular, Backlog, Improvement, etc.).'
                }
              </Alert>
            )}

            <Group position="right" mt="lg">
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmGenerate}
                loading={loading}
                disabled={previewData.length === 0}
                style={{ backgroundColor: "#1c7ed6" }}
              >
                Generate Excel File
              </Button>
            </Group>
          </Stack>
        </Paper>
      </Modal>
    </Card>
  );
}
