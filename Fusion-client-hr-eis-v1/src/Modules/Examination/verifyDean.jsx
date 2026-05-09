import React, { useState, useEffect } from "react";
import {
  Card,
  LoadingOverlay,
  Alert,
  Select,
  Button,
  ScrollArea,
  Table,
  TextInput,
  Group,
  Title,
  Text,
  Switch,
  Modal,
  Box,
  Stack,
} from "@mantine/core";
import axios from "axios";
import { useSelector } from "react-redux";
import {
  get_student_grades_academic_years,
  verify_grades_dean,
  update_enter_grades_dean,
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

// Grade options & colors
const GRADE_OPTIONS = ["O","A+","A","B+","B","C+","C","D+","D","F"]
  .map((g) => ({ value: g, label: g }));
const GRADE_COLORS = {
  O: "#2e7d32","A+": "#388e3c",A: "#4caf50",
  "B+": "#03a9f4",B: "#2196f3","C+": "#ff9800",
  C: "#fb8c00","D+": "#f57c00",D: "#f44336",
  F: "#9e9e9e",
};

export default function VerifyDean() {
  const userRole = useSelector((s) => s.user.role);
  const semesterOptions = [
    { value: "Odd Semester",   label: "Odd Semester"   },
    { value: "Even Semester",  label: "Even Semester"  },
    { value: "Summer Semester",label: "Summer Semester"},
  ];

  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingSearch,  setLoadingSearch]  = useState(false);
  const [error,           setError]          = useState(null);
  const [success,         setSuccess]        = useState(null);

  const [yearOptions,     setYearOptions]    = useState([]);
  const [selectedYear,    setSelectedYear]   = useState(null);
  const [selectedSemester,setSelectedSemester]= useState(null);

  const [courses,         setCourses]        = useState([]);
  const [selectedCourse,  setSelectedCourse] = useState(null);
  const [selectedCourseName,setSelectedCourseName] = useState("");

  const [registrations,   setRegistrations]  = useState([]);
  const [initialRegs,     setInitialRegs]    = useState([]);
  const [gradesStats,     setGradesStats]    = useState([]);
  const [isVerified,      setIsVerified]     = useState(false);
  const [allowResub,      setAllowResub]     = useState(false);
  const [showTable,       setShowTable]      = useState(false);
  const [confirmOpen,     setConfirmOpen]    = useState(false);

  // 1) Fetch academic years
  useEffect(() => {
    async function fetchYears() {
      setLoadingCourses(true);
      setError(null);
      try {
        const token = localStorage.getItem("authToken");
        const { data } = await axios.get(get_student_grades_academic_years, {
          headers: { Authorization: `Token ${token}` },
        });
        setYearOptions(
          data.academic_years.map((y) => ({ value: String(y), label: String(y) }))
        );
      } catch {
        setError("Failed to load academic years.");
      } finally {
        setLoadingCourses(false);
      }
    }
    fetchYears();
  }, []);

  // 2) When year or semester changes, clear everything and fetch courses
  useEffect(() => {
    // CLEAR dependent state immediately
    setCourses([]);
    setSelectedCourse(null);
    setSelectedCourseName("");
    setRegistrations([]);
    setInitialRegs([]);
    setGradesStats([]);
    setIsVerified(false);
    setSuccess(null);
    setShowTable(false);

    if (!selectedYear || !selectedSemester) return;

    setError(null);
    setLoadingCourses(true);

    axios
      .post(
        verify_grades_dean,
        {
          Role: userRole,
          academic_year: selectedYear,
          semester_type: selectedSemester,
        },
        { headers: { Authorization: `Token ${localStorage.getItem("authToken")}` } }
      )
      .then(({ data }) => {
        const mapped = (data.courses_info || []).map((c) => ({
          value: c.id.toString(),
          label: `${c.code} — ${c.name}`,
        }));
        setCourses(mapped);
      })
      .catch((e) => {
        setError(e.response?.data?.error || "Failed to fetch courses");
      })
      .finally(() => setLoadingCourses(false));
  }, [selectedYear, selectedSemester, userRole]);

  // 3) Load registrations on Search
  const handleSearch = () => {
    setError(null);
    setSuccess(null);
    setLoadingSearch(true);
    setIsVerified(false);
    setAllowResub(false);
    setShowTable(false);

    axios
      .post(
        update_enter_grades_dean,
        {
          Role: userRole,
          course: selectedCourse,
          year: selectedYear,
          semester_type: selectedSemester,
        },
        { headers: { Authorization: `Token ${localStorage.getItem("authToken")}` } }
      )
      .then(({ data }) => {
        if (data.message === "This course is already verified.") {
          setIsVerified(true);
          setSuccess("Course already verified.");
          setRegistrations([]);
          return;
        }
        if (data.message) {
          setError(data.message);
          setRegistrations([]);
          return;
        }
        const regs = data.registrations.map((r) => ({
          ...r,
          remarks: r.remarks || "",
        }));
        setInitialRegs(regs.map((r) => ({ ...r })));
        setRegistrations(regs);

        const counts = {};
        regs.forEach((r) => (counts[r.grade] = (counts[r.grade] || 0) + 1));
        setGradesStats(
          Object.entries(counts).map(([name, value]) => ({
            name,
            value,
            color: GRADE_COLORS[name] || "#9e9e9e",
          }))
        );
        setSelectedCourseName(
          courses.find((c) => c.value === selectedCourse)?.label || ""
        );
        setShowTable(true);
      })
      .catch((e) => {
        setError(e.response?.data?.error || "Fetch failed");
        setRegistrations([]);
      })
      .finally(() => setLoadingSearch(false));
  };

  // 4) Local grade/remark edits
  const updateGrade = (id, grade) => {
    const regs = registrations.map((r) => (r.id === id ? { ...r, grade } : r));
    setRegistrations(regs);
    // update stats
    const counts = {};
    regs.forEach((r) => (counts[r.grade] = (counts[r.grade] || 0) + 1));
    setGradesStats(
      Object.entries(counts).map(([name, value]) => ({
        name,
        value,
        color: GRADE_COLORS[name] || "#9e9e9e",
      }))
    );
  };
  const updateRemarks = (id, remarks) =>
    setRegistrations(
      registrations.map((r) => (r.id === id ? { ...r, remarks } : r))
    );

  // 5) Verify & download CSV
  const handleVerify = () => {
    setConfirmOpen(false);
    setError(null);
    setLoadingSearch(true);

    const payload = {
      Role: userRole,
      student_ids: registrations.map((r) => r.roll_no),
      semester_ids: registrations.map((r) => r.semester),
      course_ids: registrations.map((r) => r.course_id_id),
      grades: registrations.map((r) => r.grade),
      remarks: registrations.map((r) => r.remarks),
      allow_resubmission: allowResub ? "YES" : "NO",
    };

    axios
      .post(moderate_student_grades, payload, {
        headers: { Authorization: `Token ${localStorage.getItem("authToken")}` },
        responseType: "blob",
      })
      .then((resp) => {
        const url = URL.createObjectURL(new Blob([resp.data]));
        const a = document.createElement("a");
        a.href = url;
        a.download = `${selectedCourseName.replace(/ /g, "_")}_${selectedYear}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setSuccess("Verified & downloaded!");
        setIsVerified(true);
        setShowTable(false);
      })
      .catch((e) => setError(e.response?.data?.error || "Verification failed"))
      .finally(() => setLoadingSearch(false));
  };

  const changedRows = registrations.filter((r) => {
    const orig = initialRegs.find((o) => o.id === r.id);
    return orig && (orig.grade !== r.grade || orig.remarks !== r.remarks);
  });

  const rows = registrations.map((r) => (
    <tr key={r.id}>
      <td>{r.roll_no}</td>
      <td>{r.batch}</td>
      <td>{r.semester}</td>
      <td>
        <Select
          data={GRADE_OPTIONS}
          value={r.grade}
          onChange={(v) => updateGrade(r.id, v)}
          disabled={isVerified}
          size="xs"
        />
      </td>
      <td>
        <TextInput
          value={r.remarks}
          onChange={(e) => updateRemarks(r.id, e.target.value)}
          disabled={isVerified}
          size="xs"
        />
      </td>
    </tr>
  ));

  return (
    <Card p="lg" radius="md" style={{ width: "100%", position: "relative" }}>
      <LoadingOverlay visible={loadingCourses || loadingSearch} />

      <Title order={2} mb="md">Verify Grades</Title>
      {error   && <Alert color="red"  mb="md">{error}</Alert>}
      {success && <Alert color="green" mb="md">{success}</Alert>}

      <Stack spacing="md">
        <Select
          label="Academic Year"
          placeholder="e.g. 2023-24"
          data={yearOptions}
          value={selectedYear}
          onChange={setSelectedYear}
          disabled={loadingCourses}
          required
        />

        <Select
          label="Semester Type"
          data={semesterOptions}
          value={selectedSemester}
          onChange={setSelectedSemester}
          disabled={loadingCourses}
          required
        />

        <Select
          label="Course"
          placeholder={courses.length 
            ? "Select course" 
            : "Select year & semester first"}
          data={courses}
          value={selectedCourse}
          onChange={setSelectedCourse}
          searchable
          clearable
          disabled={!courses.length || loadingCourses}
          required
        />

        <Button
          onClick={handleSearch}
          disabled={!selectedYear || !selectedSemester || !selectedCourse || loadingSearch}
        >
          {loadingSearch ? "Loading…" : "Search"}
        </Button>
      </Stack>

      {showTable && registrations.length > 0 && (
        <>
          <ScrollArea mt="lg">
            <Table striped highlightOnHover>
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Batch</th>
                  <th>Sem</th>
                  <th>Grade</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>{rows}</tbody>
            </Table>
          </ScrollArea>

          <Box my="lg">
            <Text weight={500}>Grade Distribution</Text>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={gradesStats}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={60}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {gradesStats.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend layout="vertical" align="right" />
              </PieChart>
            </ResponsiveContainer>
          </Box>

          <Group position="apart" mb="md">
            <Switch
              label="Allow Resubmission"
              checked={allowResub}
              onChange={(e) => setAllowResub(e.currentTarget.checked)}
              disabled={isVerified}
            />
            <Button
              color="blue"
              onClick={() => setConfirmOpen(true)}
              disabled={isVerified}
            >
              Verify & Download
            </Button>
          </Group>
        </>
      )}

      <Modal
        opened={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm Verification"
      >
        <Text>This action is not reversible. The following changes will be submitted:</Text>
        <ScrollArea style={{ maxHeight: 200 }} mt="sm">
          <Table striped>
            <thead>
              <tr>
                <th>Roll No</th>
                <th>Field</th>
                <th>Original</th>
                <th>New</th>
              </tr>
            </thead>
            <tbody>
              {changedRows.map((r) => {
                const orig = initialRegs.find((o) => o.id === r.id);
                return [
                  orig.grade !== r.grade && (
                    <tr key={`grade-${r.id}`}>
                      <td>{r.roll_no}</td>
                      <td>Grade</td>
                      <td>{orig.grade}</td>
                      <td>{r.grade}</td>
                    </tr>
                  ),
                  orig.remarks !== r.remarks && (
                    <tr key={`remarks-${r.id}`}>
                      <td>{r.roll_no}</td>
                      <td>Remarks</td>
                      <td>{orig.remarks}</td>
                      <td>{r.remarks}</td>
                    </tr>
                  ),
                ];
              })}
            </tbody>
          </Table>
        </ScrollArea>
        <Group position="right" mt="md">
          <Button variant="default" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button color="red" onClick={handleVerify}>
            Yes, Verify
          </Button>
        </Group>
      </Modal>
    </Card>
  );
}
