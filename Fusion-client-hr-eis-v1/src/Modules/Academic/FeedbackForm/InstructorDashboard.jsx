import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Select,
  Loader,
  Center,
  Card,
  Text,
  Grid,
  Button,
  Paper,
  Space,
  Alert,
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
  instCoursesRoute,
  instAllStatsRoute,
} from "../../../routes/academicRoutes";

export default function InstructorDashboard() {
  const [session, setSession] = useState("2024-25");
  const [semesterType, setSemesterType] = useState("Odd Semester");
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [stats, setStats] = useState([]);
  const [noResponses, setNoResponses] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    axios
      .get(instCoursesRoute, {
        params: { session, semester_type: semesterType },
        headers: { Authorization: `Token ${token}` },
      })
      .then((res) => setCourses(res.data))
      .catch(() => setCourses([]));
  }, [session, semesterType]);

  useEffect(() => {
    if (!selectedCourse) return;
    setLoading(true);
    setNoResponses(false);
    const token = localStorage.getItem("authToken");
    axios
      .get(instAllStatsRoute, {
        params: {
          session,
          semester_type: semesterType,
          course_id: selectedCourse,
        },
        headers: { Authorization: `Token ${token}` },
      })
      .then((res) => {
        if (res.data.detail) {
          setNoResponses(true);
          setStats([]);
        } else {
          setStats(res.data);
        }
      })
      .catch(() => {
        setNoResponses(true);
        setStats([]);
      })
      .finally(() => setLoading(false));
  }, [selectedCourse, session, semesterType]);

  if (loading)
    return (
      <Center style={{ height: 300 }}>
        <Loader />
      </Center>
    );

  return (
    <Card>
      <Select
        label="Session"
        data={["2023-24", "2024-25", "2025-26"].map((s) => ({
          value: s,
          label: s,
        }))}
        value={session}
        onChange={setSession}
        mb="md"
      />
      <Select
        label="Semester"
        data={["Odd Semester", "Even Semester", "Summer Semester"].map(
          (s) => ({ value: s, label: s })
        )}
        value={semesterType}
        onChange={setSemesterType}
        mb="md"
      />

      <Space h="md" />
      <Text weight={500}>Your Courses:</Text>
      <Grid>
        {courses.map((c) => (
          <Grid.Col key={c.course_id} span={4}>
            <Card shadow="xs" p="sm">
              <Text weight={600}>{c.code}</Text>
              <Text size="sm" color="dimmed">
                {c.name}
              </Text>
              <Button
                size="xs"
                mt="sm"
                fullWidth
                onClick={() => setSelectedCourse(c.course_id)}
              >
                View Analysis
              </Button>
            </Card>
          </Grid.Col>
        ))}
      </Grid>

      {selectedCourse && (
        <>
          <Space h="lg" />
          {noResponses ? (
            <Alert color="yellow">No responses found till now.</Alert>
          ) : (
            <Grid gutter="lg">
              {stats.map((q) => {
                const chartData = Object.entries(q.counts).map(
                  ([name, val]) => ({ name, val })
                );
                return (
                  <Grid.Col key={q.question_id} span={6}>
                    <Paper p="md" shadow="xs">
                      <Text weight={500}>{q.text}</Text>

                      {chartData.length > 0 ? (
                        <BarChart
                          width={300}
                          height={250}
                          data={chartData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" interval={0} angle={-90} textAnchor="end" height={60} />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="val" fill="#4C6EF5" />
                        </BarChart>
                      ) : (
                        <Paper p="sm" mt="md" withBorder>
                          <Text size="sm" weight={500}>
                            Comments
                          </Text>
                          {q.comments.length > 0 ? (
                            q.comments.map((cmt, i) => (
                              <Text key={i} size="sm" mb="xs">
                                - {cmt}
                              </Text>
                            ))
                          ) : (
                            <Text color="dimmed" size="sm">
                              No comments
                            </Text>
                          )}
                        </Paper>
                      )}
                    </Paper>
                  </Grid.Col>
                );
              })}
            </Grid>
          )}
        </>
      )}
    </Card>
  );
}
