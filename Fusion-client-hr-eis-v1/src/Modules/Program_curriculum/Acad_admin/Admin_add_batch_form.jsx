import React, { useEffect, useState } from "react";
import {
  Select,
  MultiSelect,
  NumberInput,
  Checkbox,
  Button,
  Group,
  Text,
  Container,
  Stack,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import axios from "axios";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMediaQuery } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  fetchDisciplines,
  fetchBatchName,
  fetchGetUnlinkedCurriculum,
} from "../api/api";
import { host } from "../../../routes/globalRoutes";

function Admin_add_batch_form() {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [batchNames, setBatchNames] = useState([]); // State for batch names
  const [disciplines, setDisciplines] = useState([]); // State for disciplines
  const [unlinkedCurriculums, setUnlinkedCurriculums] = useState([]); // State for unlinked curriculums

  const navigate = useNavigate();

  const [loading, setLoading] = useState(true); // State for loading
  const [error, setError] = useState(null); // State for error handling

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);

  // Check if the curriculum_id query parameter exists in the URL
  const hasCurriculumId = queryParams.has("curriculum_id");

  // Extract curriculum_id only if it exists in the URL
  const curriculumId = hasCurriculumId
    ? queryParams.get("curriculum_id")
    : null;

  const form = useForm({
    initialValues: {
      batchName: "",
      discipline: "",
      batchYear: 2024,
      disciplineBatch: curriculumId || "",
      runningBatch: false,
      totalSeats: 0,
    },
    validate: {
      batchName: (value) => (!value ? "Batch name is required" : null),
      discipline: (value) => (!value ? "Discipline is required" : null),
      totalSeats: (value) => (value < 0 ? "Total seats cannot be negative" : null),
      disciplineBatch: (value) => (!value ? "Curriculum is required" : null),
    },
  });

  // Fetch batch names and disciplines on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch batch names
        const batchData = await fetchBatchName();
        setBatchNames(batchData.choices);

        // Fetch disciplines
        const disciplineData = await fetchDisciplines();
        setDisciplines(disciplineData);

        const unlinkedCurriculumData = await fetchGetUnlinkedCurriculum();
        setUnlinkedCurriculums(unlinkedCurriculumData);
      } catch (err) {
        setError("Failed to load data.");
      } finally {
        setLoading(false);
      }
    };

    loadData(); // Fetch data on component mount
  }, []);

  const handleBatchNameChange = (value) => {
    form.setFieldValue("batchName", value);
    
    form.setFieldValue("disciplineBatch", "");
  };

  const handleCancel = () => {
    form.reset();
    navigate("/programme_curriculum/admin_batches/");
  };

  const handleSubmit = async () => {
    try {
      // Validate form data
      if (!form.values.batchName) {
        throw new Error("Batch name is required");
      }
      if (!form.values.discipline) {
        throw new Error("Discipline is required");
      }
      if (form.values.totalSeats < 0) {
        throw new Error("Total seats cannot be negative");
      }

      localStorage.setItem("AdminBatchesCachechange", "true");
      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("Authorization token is required");
      }

      const curriculumData = form.values.disciplineBatch || "";
      
      const payload = {
        batch_name: form.values.batchName,
        discipline: parseInt(form.values.discipline, 10),
        batchYear: parseInt(form.values.batchYear, 10),
        runningBatch: form.values.runningBatch,
        total_seats: parseInt(form.values.totalSeats, 10) || 0,
        curriculum: curriculumData ? parseInt(curriculumData, 10) : null, 
        disciplineBatch: curriculumData ? parseInt(curriculumData, 10) : null
      };
      
      const response = await axios.post(
        `${host}/programme_curriculum/api/admin_add_batch/`,
        payload,
        {
          headers: {
            Authorization: `Token ${token}`,
          },
        },
      );
      
      if (response.data.message) {
        notifications.show({
          title: "✅ Batch Added Successfully!",
          message: `Batch "${form.values.batchName}" has been created.`,
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
          navigate("/programme_curriculum/admin_batches/");
        }, 1500);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add batch");
      }
    } catch (err) {
      notifications.show({
        title: "❌ Failed to Add Batch",
        message: (
          <div>
            <Text size="sm" mb={8}>
              <strong>{err.message || "Unable to create batch. Please try again."}</strong>
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
      setError(err.message);
    }
  };

  if (loading) {
    return <Text>Loading...</Text>;
  }

  if (error) {
    return <Text color="red">{error}</Text>;
  }

  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <Container
        fluid
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row", // Stack on small screens
          alignItems: isMobile ? "center" : "flex-start",
          width: "100%",
          margin: "0 0 0 -3.2vw",
        }}
      >
        {/* Buttons Section for Mobile Layout */}
        {isMobile && (
          <Group
            spacing="md"
            direction="column"
            style={{ width: "100%", marginTop: "1rem", paddingLeft: "2rem" }}
          >
            <Link
              to="/programme_curriculum/acad_admin_add_curriculum_form"
              style={{ textDecoration: "none" }}
            >
              <Button className="right-btn-batch" style={{ minWidth: "143px" }}>
                Add Curriculum
              </Button>
            </Link>
            <Link
              to="/programme_curriculum/acad_admin_add_discipline_form"
              style={{ textDecoration: "none" }}
            >
              <Button className="right-btn-batch" style={{ minWidth: "143px" }}>
                Add Discipline
              </Button>
            </Link>
          </Group>
        )}

        <div
          style={{
            maxWidth: "290vw",
            width: "100%",
            display: "flex",
            gap: "2rem",
            padding: "2rem",
            flex: 4,
            flexDirection: isMobile ? "column" : "row",
          }}
        >
          {/* Form Section */}
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
                  Batch Form
                </Text>

                <Select
                  label="Batch Name"
                  placeholder="-- Select Batch Name --"
                  data={batchNames}
                  value={form.values.batchName}
                  onChange={handleBatchNameChange}
                  required
                />

                <Select
                  label="Select Discipline"
                  placeholder="-- Select Discipline --"
                  data={disciplines.map((discipline) => ({
                    value: discipline.id.toString(),
                    label: discipline.name,
                  }))}
                  value={form.values.discipline}
                  onChange={(value) => form.setFieldValue("discipline", value)}
                  required
                />

                <NumberInput
                  label="Batch Year"
                  defaultValue={2024}
                  value={form.values.batchYear}
                  onChange={(value) => form.setFieldValue("batchYear", value)}
                  required
                />

                <Select
                  label="Select Curriculum for Batch"
                  placeholder="-- Select Curriculum for Batch Students --"
                  data={unlinkedCurriculums.map((curriculum) => ({
                    value: curriculum.id.toString(),
                    label: `${curriculum.name} - v${curriculum.version}`,
                  }))}
                  value={form.values.disciplineBatch}
                  onChange={(value) =>
                    form.setFieldValue("disciplineBatch", value)
                  }
                  required
                  searchable
                  clearable
                />

                <Checkbox
                  label="Running Batch"
                  checked={form.values.runningBatch}
                  onChange={(event) =>
                    form.setFieldValue(
                      "runningBatch",
                      event.currentTarget.checked,
                    )
                  }
                />

                <NumberInput
                  label="Total Seats"
                  placeholder="Enter total number of seats"
                  value={form.values.totalSeats}
                  onChange={(value) => form.setFieldValue("totalSeats", value)}
                  min={0}
                  required
                  error={form.errors.totalSeats}
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
                <Button type="submit" className="submit-btn">
                  Submit
                </Button>
              </Group>
            </form>
          </div>

          {/* Right Panel Buttons for Desktop Layout */}
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
                <Link
                  to="/programme_curriculum/acad_admin_add_curriculum_form"
                  style={{ textDecoration: "none" }}
                >
                  <Button className="right-btn-batch">Add Curriculum</Button>
                </Link>
                <Link
                  to="/programme_curriculum/acad_admin_add_discipline_form"
                  style={{ textDecoration: "none" }}
                >
                  <Button className="right-btn-batch">Add Discipline</Button>
                </Link>
              </Group>
            </div>
          )}
        </div>
      </Container>

      <style>{`
        .right-btn-batch{
          width:15vw;
        }
      `}</style>
    </div>
  );
}

export default Admin_add_batch_form;
