import React, { useState, useEffect } from "react";
import {
  Select,
  Input,
  NumberInput,
  Button,
  Group,
  Text,
  Container,
  Stack,
  Checkbox,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useMediaQuery } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { fetchAllProgrammes } from "../api/api";
import { host } from "../../../routes/globalRoutes";

function AdminAddCurriculumForm() {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const form = useForm({
    initialValues: {
      curriculumName: "",
      programme: "",
      workingCurriculum: false,
      versionNo: 1.0,
      numSemesters: 1,
      numCredits: 0,
    },
  });

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [ugData, setUgData] = useState([]);
  const [pgData, setPgData] = useState([]);
  const [phdData, setPhdData] = useState([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("Authorization token not found");

        const response = await fetchAllProgrammes(token);

        setUgData(response.ug_programmes || []);
        setPgData(response.pg_programmes || []);
        setPhdData(response.phd_programmes || []);
      } catch (err) {
        setError("Failed to load programs. Please try again.");
        notifications.show({
          title: "Error",
          message: "Failed to load programs. Please refresh the page.",
          color: "red",
          autoClose: 4000,
        });
      } finally {
        setLoadingPrograms(false);
      }
    };

    fetchPrograms();
  }, []);

  const programOptions = [
    ...ugData.map((prog) => ({
      value: `${prog.id}`,
      label: `UG - ${prog.name}`,
    })),
    ...pgData.map((prog) => ({
      value: `${prog.id}`,
      label: `PG - ${prog.name}`,
    })),
    ...phdData.map((prog) => ({
      value: `${prog.id}`,
      label: `PhD - ${prog.name}`,
    })),
  ];

  const handleSubmit = async (values) => {
    localStorage.setItem("AdminCurriculumsCachechange", "true");
    const payload = {
      curriculum_name: values.curriculumName,
      programme: values.programme,
      working_curriculum: values.workingCurriculum,
      version_no: values.versionNo,
      no_of_semester: values.numSemesters,
      num_credits: values.numCredits,
    };

    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("Authorization token is required");
      }

      const response = await axios.post(
        `${host}/programme_curriculum/api/admin_add_curriculum/`,
        payload,
        {
          headers: {
            Authorization: `Token ${token}`,
          },
        },
      );
      if (response.status === 201) {
        notifications.show({
          title: "🎉 Success!",
          message: "Curriculum added successfully! You will be redirected to the curriculum list.",
          color: "green",
          autoClose: 4000,
          style: {
            backgroundColor: "#f0fdf4",
            borderLeft: "4px solid #10b981",
          },
          styles: {
            title: { 
              color: "#065f46", 
              fontWeight: 600,
              fontSize: "16px"
            },
            description: { 
              color: "#047857",
              fontSize: "14px"
            },
          },
        });
        
        setTimeout(() => {
          navigate("/programme_curriculum/acad_view_all_working_curriculums");
        }, 1500);
      }
    } catch (err) {
      notifications.show({
        title: "❌ Error!",
        message: "Failed to add curriculum. Please check your input and try again.",
        color: "red",
        autoClose: 5000,
        style: {
          backgroundColor: "#fef2f2",
          borderLeft: "4px solid #ef4444",
        },
        styles: {
          title: { 
            color: "#7f1d1d", 
            fontWeight: 600,
            fontSize: "16px"
          },
          description: { 
            color: "#991b1b",
            fontSize: "14px"
          },
        },
      });
    } finally {
      setLoading(false);
    }
  };
  const handleCancel = () => {
    navigate("/programme_curriculum/acad_view_all_working_curriculums");
  };

  return (
    <Container
      fluid
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        padding: "2rem",
      }}
    >
      {isMobile && (
        <Group spacing="md" position="center" mb="lg">
          <Link to="/programme_curriculum/acad_admin_add_programme_form">
            <Button
              className="right-btn-programme"
              style={{ minWidth: "143px" }}
            >
              Add Programme
            </Button>
          </Link>
          <Link to="/programme_curriculum/acad_admin_add_discipline_form">
            <Button
              className="right-btn-programme"
              style={{ minWidth: "143px" }}
            >
              Add Discipline
            </Button>
          </Link>
        </Group>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: "2rem",
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
              <Text size="xl" weight={700} align="center">
                Add Curriculum Form
              </Text>

              <Input
                label="Curriculum Name"
                placeholder="Enter Curriculum Name"
                value={form.values.curriculumName}
                onChange={(event) =>
                  form.setFieldValue("curriculumName", event.target.value)
                }
                required
              />

              <Select
                label="Programme"
                placeholder="-- Select Programme --"
                data={loadingPrograms ? [] : programOptions}
                value={form.values.programme}
                onChange={(value) => form.setFieldValue("programme", value)}
                required
                disabled={loadingPrograms}
                error={error}
              />

              <Checkbox
                label="Working Curriculum"
                checked={form.values.workingCurriculum}
                onChange={(event) =>
                  form.setFieldValue("workingCurriculum", event.target.checked)
                }
              />

              <NumberInput
                label="Curriculum Version"
                value={form.values.versionNo}
                onChange={(value) => form.setFieldValue("versionNo", value)}
                required
                min={0.1}
                precision={1}
              />

              <NumberInput
                label="Number of Semesters"
                value={form.values.numSemesters}
                onChange={(value) => form.setFieldValue("numSemesters", value)}
                required
                min={1}
              />

              <NumberInput
                label="Number of Credits"
                value={form.values.numCredits}
                onChange={(value) => form.setFieldValue("numCredits", value)}
                required
                min={0}
              />
            </Stack>

            <Group position="right" mt="lg">
              <Button
                                                                     variant="outline"
                                                                     className="cancel-btn"
                                                                     onClick={handleCancel}
                                                                   >
                                                                     Cancel
                                                                   </Button>
              <Button type="submit" className="submit-btn" loading={loading}>
                Submit
              </Button>
            </Group>
          </form>
        </div>

        {!isMobile && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start",
            }}
          >
            <Group spacing="md" direction="column" style={{ width: "100%" }}>
              <Link to="/programme_curriculum/acad_admin_add_programme_form">
                <Button
                  className="right-btn-programme"
                  style={{ minWidth: "143px" }}
                >
                  Add Programme
                </Button>
              </Link>
              <Link to="/programme_curriculum/acad_admin_add_discipline_form">
                <Button
                  className="right-btn-programme"
                  style={{ minWidth: "143px" }}
                >
                  Add Discipline
                </Button>
              </Link>
            </Group>
          </div>
        )}
      </div>

      <style>{`
        .right-btn-programme {
          width: 15vw;
        }
      `}</style>
    </Container>
  );
}

export default AdminAddCurriculumForm;
