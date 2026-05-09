import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Card,
  Text,
  Table,
  Radio,
  Textarea,
  Button,
  Loader,
  Center,
  Group,
  Progress,
} from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import {
  studentQuestionsRoute,
  studentSubmitRoute,
} from "../../../routes/academicRoutes";

export default function StudentFeedback() {
  const sections = [
    { key: "attendance", label: "Attendance", required: true },
    { key: "contents", label: "Course Contents", required: true },
    { key: "instructor", label: "Course Instructor", required: true },
    { key: "tutorial", label: "Tutorials", required: false },
    { key: "lab", label: "Lab Instructor", required: false },
  ];

  const [loading, setLoading] = useState(true);
  const [filled, setFilled] = useState(false);
  const [courses, setCourses] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [secIdx, setSecIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("authToken");
        const res = await axios.get(studentQuestionsRoute, {
          headers: { Authorization: `Token ${token}` },
        });
        if (res.data.filled) {
          setFilled(true);
          return;
        }
        setCourses(res.data.courses);
        setQuestions(res.data.questions);

        const initAnswers = {};
        res.data.questions.forEach((q) => {
          initAnswers[q.id] = {};
          res.data.courses.forEach((c) => {
            initAnswers[q.id][c.course_id] = { option_id: null, text_answer: "" };
          });
        });
        setAnswers(initAnswers);
      } catch (error) {
        showNotification({
          title: "Load Error",
          message: "Failed to load feedback form.",
          color: "red",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, []);

  if (loading)
    return (
      <Center>
        <Loader />
      </Center>
    );

  if (filled)
    return (
      <Card>
        <Text size="lg" align="center" color="green">
          You've already submitted feedback.
        </Text>
      </Card>
    );

  const sec = sections[secIdx];
  const qs = questions.filter((q) => q.section === sec.key);
  const progress = Math.round(((secIdx + 1) / sections.length) * 100);

  const allAnswered = () => {
    if (!sec.required) return true;
    return qs.every((q) => {
      if (q.options.length === 0) return true;
      return courses.every((c) => {
        const a = answers[q.id][c.course_id];
        return a.option_id !== null;
      });
    });
  };

  const setOption = (qid, cid, oid) =>
    setAnswers((prev) => ({
      ...prev,
      [qid]: {
        ...prev[qid],
        [cid]: { ...prev[qid][cid], option_id: oid },
      },
    }));

  const setText = (qid, cid, txt) =>
    setAnswers((prev) => ({
      ...prev,
      [qid]: {
        ...prev[qid],
        [cid]: { ...prev[qid][cid], text_answer: txt },
      },
    }));

  const next = () => {
    if (!allAnswered()) {
      showNotification({
        title: "Incomplete",
        message: "Please complete all required questions in this section.",
        color: "red",
      });
      return;
    }
    if (secIdx < sections.length - 1) {
      setSecIdx((i) => i + 1);
    } else {
      handleSubmit();
    }
  };

  const prev = () => secIdx > 0 && setSecIdx((i) => i - 1);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem("authToken");
      const responses = [];
      questions.forEach((q) =>
        courses.forEach((c) => {
          const a = answers[q.id][c.course_id];
          if (a.option_id !== null || a.text_answer.trim() !== "") {
            responses.push({
              question_id: q.id,
              option_id: a.option_id,
              text_answer: a.text_answer,
              course_id: c.course_id,
              section: q.section,
            });
          }
        })
      );
      await axios.post(
        studentSubmitRoute,
        { responses },
        { headers: { Authorization: `Token ${token}` } }
      );
      showNotification({
        title: "Success",
        message: "Thank you for your feedback!",
        color: "green",
      });
      setFilled(true);
    } catch (error) {
      showNotification({
        title: "Submit Error",
        message: "Failed to submit. Please try again.",
        color: "red",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <Text size="xl" weight={600}>
        {sec.label} {sec.required && <Text component="span" color="red">*</Text>}
      </Text>
      <Progress value={progress} mt="md" mb="lg" />

      {qs.map((q) => (
        <div key={q.id} style={{ marginBottom: 24 }}>
          <Text weight={500}>
            {q.text}{" "}
            {sec.required && q.options.length > 0 && (
              <Text component="span" color="red">
                *
              </Text>
            )}
          </Text>
          <Table striped withColumnBorders mt="sm">
            <thead>
              <tr>
                <th>Course / Instructor</th>
                {q.options.length > 0
                  ? q.options.map((o) => <th key={o.id}>{o.text}</th>)
                  : <th>Your Feedback</th>}
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => {
                const label = `${c.code} - ${c.name}` + (c.instructor_name ? ` (${c.instructor_name})` : "");
                return (
                  <tr key={c.course_id}>
                    <td>{label}</td>
                    {q.options.length > 0 ? (
                      q.options.map((o) => (
                        <td key={o.id}>
                          <Radio
                            checked={answers[q.id][c.course_id].option_id === o.id}
                            onChange={() => setOption(q.id, c.course_id, o.id)}
                          />
                        </td>
                      ))
                    ) : (
                      <td>
                        <Textarea
                          value={answers[q.id][c.course_id].text_answer}
                          onChange={(e) =>
                            setText(q.id, c.course_id, e.currentTarget.value)
                          }
                          placeholder="Optional feedback..."
                        />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      ))}

      <Group position="apart" mt="xl">
        <Button disabled={secIdx === 0} onClick={prev}>
          Previous
        </Button>
        <Button loading={submitting} onClick={next}>
          {secIdx === sections.length - 1 ? "Submit" : "Next"}
        </Button>
      </Group>
    </Card>
  );
}
