import React from "react";
import {
  Select,
  Input,
  NumberInput,
  Button,
  Group,
  Text,
  Container,
  Stack,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useNavigate, Link } from "react-router-dom";
import { useMediaQuery } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { host } from "../../../routes/globalRoutes";
import { fetchAllProgrammes } from "../api/api";

function Admin_add_programme_form() {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const form = useForm({
    initialValues: {
      category: "",
      name: "",
      programme_begin_year: 2024,
    },
  });

  const [loading, setLoading] = React.useState(false);
  const [programmeOptions, setProgrammeOptions] = React.useState([]);
  const [allProgrammesData, setAllProgrammesData] = React.useState(null);
  const [isCustomName, setIsCustomName] = React.useState(false);
  const navigate = useNavigate();

  // Function to update programme options based on selected category
  const updateProgrammeOptions = (category) => {
    if (!allProgrammesData) {
      setProgrammeOptions([{ value: "other", label: "Other" }]);
      return;
    }

    let categoryProgrammes = [];
    
    switch (category?.toLowerCase()) {
      case 'ug':
        categoryProgrammes = allProgrammesData.ug_programmes || [];
        break;
      case 'pg':
        categoryProgrammes = allProgrammesData.pg_programmes || [];
        break;
      case 'phd':
        categoryProgrammes = allProgrammesData.phd_programmes || [];
        break;
      default:
        categoryProgrammes = [];
    }
    
    const uniqueNames = [...new Set(categoryProgrammes.map(prog => prog.name))];
    const options = uniqueNames.map(name => ({ value: name, label: name }));
    options.push({ value: "other", label: "Other" });
    
    setProgrammeOptions(options);
  };

  // Fetch existing programme names
  React.useEffect(() => {
    const fetchProgrammeNames = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (token) {
          const data = await fetchAllProgrammes(token);
          setAllProgrammesData(data);
          
          updateProgrammeOptions(form.values.category);
        }
      } catch (error) {
        setProgrammeOptions([{ value: "other", label: "Other" }]);
        notifications.show({
          title: "Error",
          message: "Failed to load programme names. Please refresh the page.",
          color: "red",
          autoClose: 4000,
        });
      }
    };

    fetchProgrammeNames();
  }, []);

  React.useEffect(() => {
    if (allProgrammesData) {
      updateProgrammeOptions(form.values.category);
      form.setFieldValue("name", "");
      setIsCustomName(false);
    }
  }, [form.values.category, allProgrammesData]);

  const handleProgrammeNameChange = (value) => {
    if (value === "other") {
      setIsCustomName(true);
      form.setFieldValue("name", "");
    } else {
      setIsCustomName(false);
      form.setFieldValue("name", value);
    }
  };

  const handleSubmit = async (values) => {
    const apiUrl = `${host}/programme_curriculum/api/admin_add_programme/`;
    const token = localStorage.getItem("token");
    
    localStorage.removeItem("AdminProgrammesCache");
    localStorage.removeItem("AdminProgrammesTimestamp");
    localStorage.setItem("AdminProgrammesCachechange", "true");
    
    try {
      setLoading(true);
      const response = await fetch(apiUrl, {
        method: "POST",
        body: JSON.stringify(values),
      });

      if (response.ok) {
        notifications.show({
          title: "✅ Programme Added Successfully!",
          message: (
            <div>
              <Text size="sm" mb={8}>
                <strong>Programme "{values.name}" has been created.</strong>
              </Text>
              <Text size="xs" color="gray.7">
                Category: {values.category} | Begin Year: {values.programme_begin_year}
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
        
        form.reset();
        setTimeout(() => {
          navigate("/programme_curriculum/acad_view_all_programme");
        }, 1500);
      } else {
        const errorData = await response.json();
        notifications.show({
          title: "❌ Failed to Add Programme",
          message: (
            <div>
              <Text size="sm" mb={8}>
                <strong>{errorData.message || "Unable to create programme. Please try again."}</strong>
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
              <strong>Connection error occurred while adding programme.</strong>
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
    } finally {
      setLoading(false);
    }
  };
  const handleCancel = () => {
    navigate("/programme_curriculum/acad_view_all_programme");
  };

  return (
    <Container fluid style={{ minHeight: "100vh", padding: "2rem" }}>
      {isMobile && (
        <Group spacing="md" position="center" mb="lg">
          <Link to="/programme_curriculum/acad_admin_add_curriculum_form">
            <Button
              className="right-btn-programme"
              style={{ minWidth: "140px" }}
            >
              Add Curriculum
            </Button>
          </Link>
          <Link to="/programme_curriculum/acad_admin_add_discipline_form">
            <Button
              className="right-btn-programme"
              style={{ minWidth: "140px" }}
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
                Add Programme Form
              </Text>

              <Select
                label="Programme Category"
                placeholder="-- Select Category --"
                data={["UG", "PG", "PHD"]}
                value={form.values.category}
                onChange={(value) => form.setFieldValue("category", value)}
                required
              />

              <Select
                label="Programme Name"
                placeholder="-- Select Programme Name --"
                data={programmeOptions}
                value={isCustomName ? "other" : form.values.name}
                onChange={handleProgrammeNameChange}
                required
              />

              {isCustomName && (
                <Input
                  label="Enter Custom Programme Name"
                  placeholder="Enter Programme Name"
                  value={form.values.name}
                  onChange={(event) =>
                    form.setFieldValue("name", event.target.value)
                  }
                  required
                />
              )}

              <NumberInput
                label="Programme Begin Year"
                value={form.values.programme_begin_year}
                onChange={(value) => form.setFieldValue("programme_begin_year", value)}
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
              <Button type="submit" loading={loading}>
                Submit
              </Button>
            </Group>
          </form>
        </div>

        {!isMobile && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <Group spacing="md" direction="column">
              <Link to="/programme_curriculum/acad_admin_add_curriculum_form">
                <Button
                  className="right-btn-programme"
                  style={{ minWidth: "140px" }}
                >
                  Add Curriculum
                </Button>
              </Link>
              <Link to="/programme_curriculum/acad_admin_add_discipline_form">
                <Button
                  className="right-btn-programme"
                  style={{ minWidth: "140px" }}
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

export default Admin_add_programme_form;