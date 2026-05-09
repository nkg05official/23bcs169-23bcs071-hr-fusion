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
import { notifications } from "@mantine/notifications";
import { useForm } from "@mantine/form";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  fetchDisciplines,
  fetchBatchName,
  fetchGetUnlinkedCurriculum,
  fetchBatchData,
} from "../api/api";
import { host } from "../../../routes/globalRoutes";

function Admin_edit_batch_form() {
  const [searchParams] = useSearchParams();
  const batchId = searchParams.get("batch");
  const curriculumId = searchParams.get("curriculum_id");
  const navigate = useNavigate();
  const [batchNames, setBatchNames] = useState([]);
  const [disciplines, setDisciplines] = useState([]);
  const [unlinkedCurriculums, setUnlinkedCurriculums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const form = useForm({
    initialValues: {
      batchName: "",
      discipline: "",
      batchYear: 2024,
      disciplineBatch: "",
      runningBatch: false,
      totalSeats: 0,
    },
    validate: {
      batchName: (value) => (!value ? "Batch name is required" : null),
      discipline: (value) => (!value ? "Discipline is required" : null),
      disciplineBatch: (value) => (!value ? "Curriculum is required" : null),
    },
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const batchData = await fetchBatchName();
        setBatchNames(batchData.choices);

        const disciplineData = await fetchDisciplines();
        setDisciplines(disciplineData);

        const unlinkedCurriculumData = await fetchGetUnlinkedCurriculum();
        setUnlinkedCurriculums(unlinkedCurriculumData);
        
        const existingBatchData = await fetchBatchData(batchId);
        
        if (existingBatchData.curriculum) {
          setUnlinkedCurriculums((prevUnlinkedCurriculums) => [
            ...prevUnlinkedCurriculums,
            ...existingBatchData.curriculum.map((curriculum) => curriculum),
          ]);
        }
        
        // Extract curriculum IDs from the batch data
        const curriculumIds = [];
        if (existingBatchData.curriculum && Array.isArray(existingBatchData.curriculum)) {
          // If batch has multiple curricula, take the first one for single selection
          curriculumIds.push(existingBatchData.curriculum[0].id.toString());
        } else if (existingBatchData.batch.curriculum_id) {
          // If batch has single curriculum
          curriculumIds.push(existingBatchData.batch.curriculum_id.toString());
        } else if (curriculumId) {
          // Fallback to URL parameter
          curriculumIds.push(curriculumId);
        }
        
        form.setValues({
          batchName: existingBatchData.batch.name || "",
          discipline: existingBatchData.batch.discipline.toString(),
          batchYear: existingBatchData.batch.year,
          disciplineBatch: curriculumIds.length > 0 ? curriculumIds[0] : "",
          runningBatch: existingBatchData.batch.running_batch,
          totalSeats: existingBatchData.batch.total_seats || 0,
        });
      } catch (err) {
        setError("Failed to load data.");
        notifications.show({
          title: "Error",
          message: "Failed to load batch data. Please refresh the page.",
          color: "red",
          autoClose: 4000,
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [batchId]);

  // Handler for batch name change
  const handleBatchNameChange = (value) => {
    form.setFieldValue("batchName", value);
    
    // Clear curriculum selection when batch name changes
    form.setFieldValue("disciplineBatch", "");
  };

  const handleSubmit = async () => {
    try {
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
        total_seats: parseInt(form.values.totalSeats, 10),
        curriculum: curriculumData ? parseInt(curriculumData, 10) : null, 
        disciplineBatch: curriculumData ? parseInt(curriculumData, 10) : null
      };
      
      const response = await axios.put(
        `${host}/programme_curriculum/api/admin_edit_batch/${batchId}/`,
        payload,
        {
          headers: {
            Authorization: `Token ${token}`,
          },
        },
      );
      
      if (response.data.message) {
        notifications.show({
          title: '✅ Success',
          message: 'Batch updated successfully!',
          color: 'green',
          autoClose: 4000,
          style: {
            backgroundColor: '#d4edda',
            borderColor: '#c3e6cb',
            color: '#155724',
          },
        });
        
        // Clear curriculum cache to force refresh of curriculum-batch relationships
        localStorage.removeItem("AdminCurriculumsCache");
        localStorage.removeItem("AdminCurriculumsTimestamp");
        localStorage.setItem("AdminCurriculumsCachechange", "true");
        
        navigate("/programme_curriculum/admin_batches/");
      } else {
        throw new Error(response.data.message || "Failed to update batch");
      }
    } catch (err) {
      
      let errorMessage = 'Failed to update batch';
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      notifications.show({
        title: '❌ Error',
        message: errorMessage,
        color: 'red',
        autoClose: 5000,
        style: {
          backgroundColor: '#f8d7da',
          borderColor: '#f5c6cb',
          color: '#721c24',
        },
      });
      setError(errorMessage);
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
                  Edit Batch Form
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
                />
              </Stack>

              <Group position="right" mt="lg">
                <Button
                  variant="outline"
                  className="cancel-btn"
                  onClick={() =>
                    navigate("/programme_curriculum/admin_batches/")
                  }
                >
                  Cancel
                </Button>
                <Button type="submit" className="submit-btn">
                  Update
                </Button>
              </Group>
            </form>
          </div>
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

export default Admin_edit_batch_form;
