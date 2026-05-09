import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Select,
  Loader,
  Center,
  Card,
  Text,
  Table,
  Modal,
  Title,
  Button,
  Space,
  Alert,
  Grid,
  Paper,
} from "@mantine/core";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  adminCoursesRoute,
  adminAllStatsRoute,
} from "../../../routes/academicRoutes";

export default function AdminFeedbackView() {
  const [session, setSession] = useState("2024-25");
  const [semesterType, setSemesterType] = useState("Odd Semester");
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalOpened, setModalOpened] = useState(false);

  const fetchCourses = () => {
    setCoursesLoading(true);
    setCourses([]);
    const token = localStorage.getItem("authToken");
    axios
      .get(adminCoursesRoute, {
        params: { session, semester_type: semesterType },
        headers: { Authorization: `Token ${token}` },
      })
      .then((res) => setCourses(res.data))
      .catch(() => setCourses([]))
      .finally(() => setCoursesLoading(false));
  };

  useEffect(() => {
    if (!selectedCourse) return;
    setLoading(true);
    setData(null);
    const token = localStorage.getItem("authToken");
    axios
      .get(adminAllStatsRoute, {
        params: { session, semester_type: semesterType, course_id: selectedCourse },
        headers: { Authorization: `Token ${token}` },
      })
      .then((res) => setData(res.data))
      .catch(() => setData({ detail: "No responses found till now." }))
      .finally(() => setLoading(false));
  }, [selectedCourse, session, semesterType]);

  return (
    <>
      <Card mb="md">
        <Select
          label="Session"
          data={["2023-24", "2024-25", "2025-26"].map((s) => ({ value: s, label: s }))}
          value={session}
          onChange={setSession}
          mb="md"
        />

        <Select
          label="Semester"
          data={["Odd Semester", "Even Semester", "Summer Semester"].map((s) => ({ value: s, label: s }))}
          value={semesterType}
          onChange={setSemesterType}
          mb="md"
        />

        <Button mb="md" onClick={fetchCourses} disabled={coursesLoading} size="sm">
          {coursesLoading ? <Loader size="xs" /> : "Load Courses"}
        </Button>

        <Table verticalSpacing="md" highlightOnHover>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => (
              <tr key={c.course_id}>
                <td>{c.code}</td>
                <td>{c.name}</td>
                <td>
                  <Button
                    size="xs"
                    onClick={() => {
                      setSelectedCourse(c.course_id);
                      setModalOpened(true);
                    }}
                  >
                    View Analysis
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        size="80%"
        title={
          <Title order={3} weight={700}>
            Feedback Analysis
          </Title>
        }
      >
        {loading ? (
          <Center style={{ height: 200 }}>
            <Loader />
          </Center>
        ) : data ? (
          data.detail ? (
            <Alert color="yellow">{data.detail}</Alert>
          ) : (
            data.sections?.map((sec) => (
              <Card key={sec.section} withBorder mb="lg">
                <Title order={4} weight={700} mb="sm" transform="capitalize">
                  {sec.section.replace(/_/g, " ")}
                </Title>
                <Grid gutter="lg">
                  {sec.questions.map((q) => {
                    const chartData = Object.entries(q.counts).map(([name, val]) => ({ name, val }));
                    return (
                      <Grid.Col key={q.question_id} span={6}>
                        <Paper p="md" shadow="xs">
                          <Text weight={500}>{q.text}</Text>
                          {chartData.length > 0 ? (
                            <BarChart
                              width={400}
                              height={350}
                              data={chartData}
                              margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis
                                dataKey="name"
                                interval={0}
                                angle={-45}
                                textAnchor="end"
                                height={80}
                              />
                              <YAxis allowDecimals={false} />
                              <Tooltip />
                              <Bar dataKey="val" fill="#4C6EF5" />
                            </BarChart>
                          ) : (
                            <Paper p="sm" mt="md" withBorder>
                              {q.comments.length > 0 ? (
                                q.comments.map((cmt, i) => (
                                  <Text key={i} size="sm" mb="xs">– {cmt}</Text>
                                ))
                              ) : (
                                <Text color="dimmed" size="sm">No comments</Text>
                              )}
                            </Paper>
                          )}
                        </Paper>
                      </Grid.Col>
                    );
                  })}
                </Grid>
              </Card>
            ))
          )
        ) : (
          <Text color="dimmed">Select a course to view feedback.</Text>
        )}
      </Modal>
    </>
  );
}
