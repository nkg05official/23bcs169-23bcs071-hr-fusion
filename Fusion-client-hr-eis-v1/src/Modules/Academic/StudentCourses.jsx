import React, { useState, useEffect } from "react";
import {
  Card,
  Text,
  Button,
  TextInput,
  Alert,
  Modal,
  Group,
  Select,
  Loader,
  Stack,
} from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import axios from "axios";
import FusionTable from "../../components/FusionTable";
import {
  addStudentCourseRoute,
  dropStudentCourseRoute,
  getStudentCourseRoute,
  getCourseSlotsRoute,
  getCoursesRoute,
} from "../../routes/academicRoutes";

const semesterOptions = [
  { value: JSON.stringify({ no: 1, type: "Odd Semester" }), label: "Semester 1 (Odd)" },
  { value: JSON.stringify({ no: 2, type: "Even Semester" }), label: "Semester 2 (Even)" },
  { value: JSON.stringify({ no: 2, type: "Summer Semester" }), label: "Summer Term 1" },
  { value: JSON.stringify({ no: 3, type: "Odd Semester" }), label: "Semester 3 (Odd)" },
  { value: JSON.stringify({ no: 4, type: "Even Semester" }), label: "Semester 4 (Even)" },
  { value: JSON.stringify({ no: 4, type: "Summer Semester" }), label: "Summer Term 2" },
  { value: JSON.stringify({ no: 5, type: "Odd Semester" }), label: "Semester 5 (Odd)" },
  { value: JSON.stringify({ no: 6, type: "Even Semester" }), label: "Semester 6 (Even)" },
  { value: JSON.stringify({ no: 6, type: "Summer Semester" }), label: "Summer Term 3" },
  { value: JSON.stringify({ no: 7, type: "Odd Semester" }), label: "Semester 7 (Odd)" },
  { value: JSON.stringify({ no: 8, type: "Even Semester" }), label: "Semester 8 (Even)" },
  { value: JSON.stringify({ no: 8, type: "Summer Semester" }), label: "Summer Term 4" },
  { value: JSON.stringify({ no: 9, type: "Odd Semester" }), label: "Semester 9 (Odd)" },
  { value: JSON.stringify({ no: 10, type: "Even Semester" }), label: "Semester 10 (Even)" },
  { value: JSON.stringify({ no: 10, type: "Summer Semester" }), label: "Summer Term 5" },
  { value: JSON.stringify({ no: 11, type: "Odd Semester" }), label: "Semester 11 (Odd)" },
  { value: JSON.stringify({ no: 12, type: "Even Semester" }), label: "Semester 12 (Even)" },
  { value: JSON.stringify({ no: 12, type: "Summer Semester" }), label: "Summer Term 6" },
];

export default function StudentCourses() {
  const [rollNo, setRollNo] = useState("");
  const [studentData, setStudentData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [dropModalOpen, setDropModalOpen] = useState(false);
  const [courseToDrop, setCourseToDrop] = useState(null);
  const [courseToDropName, setCourseToDropName] = useState("");
  const [semSlots, setSemSlots] = useState([]);
  const [slotCourses, setSlotCourses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState(
    JSON.parse(semesterOptions[0].value)
  );
  const [newCourse, setNewCourse] = useState({
    semester_id: null,
    semester_no: null,
    semester_type: null,
    courseslot_id: null,
    course_id: null,
    academic_year: null,
    registration_type: null,
    old_course: null,
  });

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const start = now.getMonth() >= 6 ? year : year - 1;
    const yrs = [];
    for (let i = 0; i < 5; i++) {
      const y1 = start - i,
        y2 = y1 + 1;
      yrs.push(`${y1}-${String(y2).slice(-2)}`);
    }
    setAcademicYears(yrs);
  }, []);

  const clearError = () => setError("");

  const handleGetCourses = async () => {
    clearError();
    setStudentData(null);
    if (!rollNo) return setError("Enter a roll number");
    const token = localStorage.getItem("authToken");
    if (!token) return setError("Auth token missing");

    setLoading(true);
    try {
      const { data } = await axios.post(
        getStudentCourseRoute,
        { rollno: rollNo },
        { headers: { Authorization: `Token ${token}` } }
      );
      setStudentData(data);

      if (data.current_semester) {
        setSelectedSemester({
          no: data.current_semester.semester_no,
          type: data.current_semester.semester_type
        });
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Fetch failed");
    } finally {
      setLoading(false);
    }
  };

  const confirmDrop = (rid, name) => {
    setCourseToDrop(rid);
    setCourseToDropName(name);
    setDropModalOpen(true);
  };

  const handleDrop = async () => {
    clearError();
    const token = localStorage.getItem("authToken");
    if (!token || courseToDrop == null || !rollNo)
      return setError("Missing data to drop");

    setLoading(true);
    try {
      await axios.post(
        dropStudentCourseRoute,
        { id: courseToDrop, roll_no: rollNo },
        { headers: { Authorization: `Token ${token}` } }
      );
      showNotification({
        title: "Course Dropped",
        message: "Course has been dropped successfully",
        color: "green",
      });
      await handleGetCourses();
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Drop failed");
    } finally {
      setLoading(false);
      setDropModalOpen(false);
    }
  };

  const handleAddCourse = async () => {
    clearError();
    const {
      semester_id,
      semester_type,
      courseslot_id,
      course_id,
      academic_year,
      registration_type,
      old_course,
    } = newCourse;
    if (
      !semester_id ||
      !semester_type ||
      !courseslot_id ||
      !course_id ||
      !academic_year ||
      !registration_type
    ) {
      return setError("Fill all required fields");
    }
    const token = localStorage.getItem("authToken");
    if (!token) return setError("Auth token missing");

    const form = new FormData();
    form.append("roll_no", rollNo);
    form.append("semester_id", semester_id);
    form.append("semester_type", semester_type);
    form.append("courseslot_id", courseslot_id);
    form.append("course_id", course_id);
    form.append("academic_year", academic_year);
    form.append("registration_type", registration_type);
    if (old_course) form.append("old_course", old_course);

    setLoading(true);
    try {
      const res = await axios.post(addStudentCourseRoute, form, {
        headers: { Authorization: `Token ${token}` },
      });
      if (res.status === 200) {
        setNewCourse({
          semester_id: null,
          semester_type: null,
          semester_no: null,
          courseslot_id: null,
          course_id: null,
          academic_year: null,
          registration_type: null,
          old_course: null,
        });
        showNotification({
          title: "Course Added",
          message: "Course has been added successfully",
          color: "green",
        });
        setAddModalOpen(false);
        await handleGetCourses();
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Add failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSemesterSelect = async (val) => {
    clearError();
    if (!val) return;
    const semObj = JSON.parse(val);
    
  let semesterId = semObj.no;
  if (studentData && studentData.semester_list) {
    const found = studentData.semester_list.find(
      (s) => s.semester_no == semObj.no
    );
    if (found) {
      semesterId = found.id;
    }
  }
    setNewCourse((p) => ({
    ...p,
    semester_id: semesterId,
    semester_no: semObj.no, 
    semester_type: semObj.type,
    courseslot_id: null,
    course_id: null,
  }));
    setSlotCourses([]);
    setSemSlots([]);
    const token = localStorage.getItem("authToken");
    try {
      const { data } = await axios.get(
        `${getCourseSlotsRoute}?semester_id=${semesterId}`,
        { headers: { Authorization: `Token ${token}` } }
      );
      setSemSlots(data);
    } catch {
      setError("Failed to load slots");
    }
  };

  const handleSlotChange = async (slotId) => {
    setNewCourse((p) => ({ ...p, courseslot_id: slotId, course_id: null }));
    const token = localStorage.getItem("authToken");
    try {
      const { data } = await axios.get(
        `${getCoursesRoute}?courseslot_id=${slotId}`,
        { headers: { Authorization: `Token ${token}` } }
      );
      setSlotCourses(data);
    } catch {
      setError("Failed to load courses");
    }
  };

  const filteredDetails =
    studentData?.details.filter(
      (c) =>
        c.sem === selectedSemester.no &&
        c.semester_type === selectedSemester.type
    ) || [];
  const totalCredits = filteredDetails.reduce((sum, c) => sum + c.credits, 0);

  const columns = [
    "Reg ID",
    "Course Code",
    "Course Name",
    "Credits",
    "Semester",
    "Type",
    "Replaced By",
    "Actions",
  ];
  const rows = filteredDetails.map((c) => ({
    id: c.id,
    "Reg ID": c.rid,
    "Course Code": c.course_id,
    "Course Name": c.course_name,
    Credits: c.credits,
    Semester: c.sem,
    Type: c.registration_type,
    "Replaced By":
      c.replaced_by && c.replaced_by.length > 0
        ? c.replaced_by
            .map((r) => `${r.course_id.code} - ${r.course_id.name} (Sem ${r.semester_id.semester_no})`)
            .join(", ")
        : "NA",
    Actions: (
      <Button
        size="xs"
        variant="outline"
        color="red"
        onClick={() => confirmDrop(c.id, c.course_name)}
      >
        Drop
      </Button>
    ),
  }));

  return (
    <Card shadow="sm" p="lg" radius="md" withBorder>
      <TextInput
        label="Roll Number"
        value={rollNo}
        onChange={(e) => setRollNo(e.target.value)}
        mb="md"
      />
      <Button fullWidth onClick={handleGetCourses} mb="md" disabled={loading}>
        {loading ? <Loader size="xs" /> : "Fetch Courses"}
      </Button>

      {error && (
        <Alert title="Error" color="red" mb="md">
          {error}
        </Alert>
      )}

      {studentData && (
        <>
          <Select
            label="Choose Semester to View"
            placeholder="Select semester"
            data={semesterOptions}
            value={JSON.stringify(selectedSemester)}
            onChange={(val) =>
              setSelectedSemester(val ? JSON.parse(val) : null)
            }
            mb="md"
          />

          <Text size="lg" weight={700} mb="sm" align="center" color="blue">
            Registered Courses
          </Text>
          <Text weight={500}>
            Name: {studentData.dict2.firstname} {studentData.dict2.lastname}
          </Text>
          <Text weight={500} mb="md">
            Roll No: {studentData.dict2.roll_no}
          </Text>

          <div style={{ overflowX: "auto" }}>
            <FusionTable columnNames={columns} elements={rows} width="100%" />
          </div>
          {rows.length === 0 && (
            <Text align="center" color="dimmed" mt="sm">
              No courses found for Semester
            </Text>
          )}

          <Group position="apart" mt="lg">
            <Button
              color="green"
              onClick={() => setAddModalOpen(true)}
              disabled={loading}
            >
              Add Course
            </Button>
            <Text weight={700}>Total Credits: {totalCredits}</Text>
          </Group>
        </>
      )}

      {/* Add Course Modal */}
      <Modal
        opened={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add Course"
      >
        <Select
          label="Semester"
          placeholder="Select semester"
          data={semesterOptions}
          value={
          newCourse.semester_no && newCourse.semester_type
          ? JSON.stringify({ no: newCourse.semester_no, type: newCourse.semester_type })
          : ""
        }
          onChange={handleSemesterSelect}
          mb="sm"
        />
        <Select
          label="Course Slot"
          placeholder="Select slot"
          data={semSlots.map((s) => ({
            value: String(s.id),
            label: s.name,
          }))}
          value={newCourse.courseslot_id}
          onChange={(v) => handleSlotChange(v)}
          mb="sm"
          disabled={!newCourse.semester_id}
        />
        <Select
          label="Course"
          placeholder="Select course"
          data={slotCourses.map((c) => ({
            value: String(c.id),
            label: `${c.code} - ${c.name} (${c.credit}cr)`,
          }))}
          value={newCourse.course_id}
          onChange={(v) => setNewCourse((p) => ({ ...p, course_id: v }))}
          mb="sm"
          disabled={!newCourse.courseslot_id}
        />
        <Select
          label="Academic Year"
          placeholder="Select academic year"
          data={academicYears.map((y) => ({ value: y, label: y }))}
          value={newCourse.academic_year}
          onChange={(v) => setNewCourse((p) => ({ ...p, academic_year: v }))}
          mb="sm"
        />
        <Select
          label="Registration Type"
          placeholder="Select type"
          data={["Regular", "Improvement", "Backlog", "Audit"]}
          value={newCourse.registration_type}
          onChange={(v) =>
            setNewCourse((p) => ({ ...p, registration_type: v }))
          }
          mb="md"
        />
        <Select
          label="Replace Course"
          placeholder="Select the course to replace"
          data={
            studentData
              ? studentData.details.map((course) => ({
                  value: course.reg_id.toString(),
                  label: `${course.course_id} - sem ${course.sem}`,
                }))
              : []
          }
          value={newCourse.old_course}
          onChange={(value) =>
            setNewCourse((p) => ({ ...p, old_course: value }))
          }
          searchable
          mb="sm"
        />
        <Group position="right">
          <Button onClick={handleAddCourse} loading={loading}>
            Add
          </Button>
        </Group>
      </Modal>

      {/* Confirm Drop Modal */}
      <Modal
        opened={dropModalOpen}
        onClose={() => setDropModalOpen(false)}
        title="Confirm Drop"
      >
        <Text>Are you sure you want to drop {courseToDropName}?</Text>
        <Group position="right" mt="md">
          <Button variant="outline" onClick={() => setDropModalOpen(false)}>
            Cancel
          </Button>
          <Button color="red" onClick={handleDrop} loading={loading}>
            Confirm
          </Button>
        </Group>
      </Modal>
    </Card>
  );
}
