import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  TextInput,
  Select,
  NumberInput,
  Button,
  Group,
  Text,
  Container,
  Stack,
} from "@mantine/core";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { fetchCurriculumData } from "../api/api";
import { host } from "../../../routes/globalRoutes";

function Admin_edit_programme_form() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [programmeData, setProgrammeData] = useState([]);

  useEffect(() => {
    const fetchProgrammeData = async () => {
      try {
        const response = await fetchCurriculumData(id);
        const data = {
          id: response.program.id,
          name: response.program.name,
          begin_year: response.program.programme_begin_year,
          category: response.program.category,
        };
        setProgrammeData(data);
      } catch (error) {
        notifications.show({
          title: "Error",
          message: "Failed to load programme data. Please refresh the page.",
          color: "red",
          autoClose: 4000,
        });
      }
    };
    fetchProgrammeData();
  }, [id]);

  const form = useForm({
    initialValues: {
      category: programmeData.category,
      programmeName: programmeData.name,
      year: programmeData.begin_year,
    },
  });

  useEffect(() => {
    if (programmeData) {
      form.setValues({
        category: programmeData.category,
        programmeName: programmeData.name,
        year: programmeData.begin_year,
      });
    }
  }, [programmeData]);

  const handleSubmit = async (values) => {
    try {
      const submitData = {
        category: values.category,
        name: values.programmeName,
        programme_begin_year: values.year,
        id: programmeData.id,
      };
      
      const response = await fetch(
        `${host}/programme_curriculum/api/admin_edit_programme/${id}/`,
        {
          method: "POST",
          body: JSON.stringify(submitData),
        },
      );
      const result = await response.json();
      if (response.ok) {
        localStorage.setItem("AdminProgrammesCachechange", "true");
        
        notifications.show({
          title: "✅ Programme Updated Successfully!",
          message: (
            <div>
              <Text size="sm" mb={8}>
                <strong>Programme "{submitData.name}" has been updated.</strong>
              </Text>
              <Text size="xs" color="gray.7">
                Category: {submitData.category} | Begin Year: {submitData.programme_begin_year}
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
          navigate("/programme_curriculum/acad_view_all_programme");
        }, 1500);
      } else {
        throw new Error(result.status);
      }
    } catch (error) {
      notifications.show({
        title: "❌ Failed to Update Programme",
        message: (
          <div>
            <Text size="sm" mb={8}>
              <strong>Unable to update programme. Please try again.</strong>
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
  };
  const handleCancel = () => {
    navigate("/programme_curriculum/acad_view_all_programme");
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
                  Edit Programme Form
                </Text>

                <Select
                  label="Programme Category"
                  placeholder="-- Select Category --"
                  data={["UG", "PG", "PhD"]}
                  value={form.values.category}
                  onChange={(value) => form.setFieldValue("category", value)}
                  required
                />

                <TextInput
                  label="Programme Name"
                  placeholder="Enter Programme Name"
                  value={form.values.programmeName}
                  onChange={(event) =>
                    form.setFieldValue(
                      "programmeName",
                      event.currentTarget.value,
                    )
                  }
                  required
                />

                <NumberInput
                  label="Programme Begin Year"
                  value={form.values.year}
                  onChange={(value) => form.setFieldValue("year", value)}
                  required
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
                  Update
                </Button>
              </Group>
            </form>
          </div>
        </div>
      </Container>

      <style>{`
        .right-btn-programme {
          width: 15vw;
        }
      `}</style>
    </div>
  );
}

Admin_edit_programme_form.propTypes = {
  programmeData: PropTypes.shape({
    category: PropTypes.string,
    programmeName: PropTypes.string,
    year: PropTypes.number,
  }),
};

export default Admin_edit_programme_form;
