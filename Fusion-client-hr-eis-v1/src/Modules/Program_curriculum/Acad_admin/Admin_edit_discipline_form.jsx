import React, { useState, useEffect } from "react";
import {
  MultiSelect,
  Button,
  Group,
  Text,
  Container,
  Stack,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useNavigate, useParams } from "react-router-dom";
import { notifications } from "@mantine/notifications";
import { fetchDisciplinesData, fetchAllProgrammes } from "../api/api";
import { host } from "../../../routes/globalRoutes";

function Admin_edit_discipline_form() {
  const form = useForm({
    initialValues: {
      disciplineName: "",
      acronym: "",
      linkedProgrammes: [],
    },
  });

  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [discipline, setDiscipline] = useState(null);
  const [programmes, setProgrammes] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) {
          throw new Error("Authorization token not found");
        }

        const response = await fetchAllProgrammes(token);
        const programmeData = [
          ...response.ug_programmes,
          ...response.pg_programmes,
          ...response.phd_programmes,
        ];

        const filteredProgrammes = programmeData.filter(
          (programme) => !programme.discipline__name,
        );

        const programmeList = filteredProgrammes.map((programme) => ({
          name: `${programme.name} ${programme.programme_begin_year}`,
          id: `${programme.id}`,
        }));

        const disciplines = await fetchDisciplinesData(token);
        const dis = disciplines.find((d) => d.id === Number(id));
        setDiscipline(dis);

        if (dis) {
          const mergedProgrammes = [
            ...programmeList,
            ...dis.programmes.map((p) => ({ name: p.name, id: `${p.id}` })),
          ];

          const uniqueProgrammes = Array.from(
            new Set(mergedProgrammes.map((p) => p.id)),
          ).map((programmeId) =>
            mergedProgrammes.find((p) => p.id === programmeId),
          );

          setProgrammes(uniqueProgrammes);

          form.setValues({
            disciplineName: dis.name,
            acronym: dis.acronym,
            linkedProgrammes: dis.programmes.map((p) => `${p.id}`),
          });
        }
      } catch (error) {
        notifications.show({
          title: "Error",
          message: "Failed to load discipline data. Please refresh the page.",
          color: "red",
          autoClose: 4000,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleSubmit = async (values) => {
    const apiUrl = `${host}/programme_curriculum/api/admin_edit_discipline/${id}/`;

    const payload = {
      name: values.disciplineName,
      acronym: values.acronym,
      programmes: values.linkedProgrammes,
    };

    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("Authorization token not found");
      }

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        localStorage.setItem("AdminDisciplineCachechange", "true");
        const data = await response.json();
        
        notifications.show({
          title: "✅ Discipline Updated Successfully!",
          message: (
            <div>
              <Text size="sm" mb={8}>
                <strong>Discipline "{values.disciplineName}" has been updated.</strong>
              </Text>
              <Text size="xs" color="gray.7">
                Acronym: {values.acronym} | Linked Programmes: {values.linkedProgrammes?.length || 0}
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
          navigate("/programme_curriculum/acad_discipline_view");
        }, 1500);
      } else {
        const errorText = await response.text();
        
        notifications.show({
          title: "❌ Failed to Update Discipline",
          message: (
            <div>
              <Text size="sm" mb={8}>
                <strong>Unable to update discipline. Please try again.</strong>
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
      }
    } catch (error) {
      notifications.show({
        title: "🚨 Network Error",
        message: (
          <div>
            <Text size="sm" mb={8}>
              <strong>Connection error occurred while updating discipline.</strong>
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
  const handleCancel = () => {
    navigate("/programme_curriculum/acad_discipline_view");
  };

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
                  Edit Discipline Form
                </Text>

                <TextInput
                  label="Discipline Name"
                  placeholder="Enter new discipline name"
                  value={form.values.disciplineName}
                  onChange={(event) =>
                    form.setFieldValue(
                      "disciplineName",
                      event.currentTarget.value,
                    )
                  }
                  required
                />

                <TextInput
                  label="Enter Acronym"
                  placeholder="Enter acronym"
                  value={form.values.acronym}
                  onChange={(event) =>
                    form.setFieldValue("acronym", event.currentTarget.value)
                  }
                  required
                />

                <div>
                  {programmes.length > 0 ? (
                    <MultiSelect
                      id="linkedProgrammes"
                      value={form.values.linkedProgrammes}
                      onChange={(value) =>
                        form.setFieldValue("linkedProgrammes", value)
                      }
                      withAsterisk
                      label="Link Programmes to this Discipline" // Add aria-label
                      data={programmes.map((programme) => ({
                        value: programme.id.toString(),
                        label: programme.name,
                      }))}
                      searchable
                    />
                  ) : (
                    <p style={{ color: "gray", fontStyle: "italic" }}>
                      No programmes available to be attached.
                    </p>
                  )}
                </div>
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
        </div>
      </Container>
      <style>{`
        .right-btn-discipline {
          width: 15vw;
        }
      `}</style>
    </div>
  );
}

export default Admin_edit_discipline_form;
