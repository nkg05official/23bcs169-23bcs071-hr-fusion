import React, { useState, useEffect } from "react";
import {
  MantineProvider,
  Table,
  Anchor,
  Container,
  Flex,
  Button,
  TextInput,
  ActionIcon,
  Modal,
  Text,
} from "@mantine/core";
import { IconEdit, IconTrash } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { Link, useNavigate } from "react-router-dom";
import { fetchDisciplinesData } from "../api/api";
import { host } from "../../../routes/globalRoutes";

function DisciplineAcad() {
  const [disciplines, setDisciplines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [disciplineToDelete, setDisciplineToDelete] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const cachedData = localStorage.getItem("DisciplineAcad");
        const timestamp = localStorage.getItem("DisciplineAcadTimestamp");
        const isCacheValid =
          timestamp && Date.now() - parseInt(timestamp, 10) < 10 * 60 * 1000;
        const cachedDatachange = localStorage.getItem(
          "AdminDisciplineCachechange",
        );
        if (cachedData && isCacheValid && cachedDatachange === "false") {
          setDisciplines(JSON.parse(cachedData));
        } else {
          const token = localStorage.getItem("authToken");
          if (!token) throw new Error("Authorization token not found");

          const data = await fetchDisciplinesData(token);
          setDisciplines(data);
          localStorage.setItem("AdminDisciplineCachechange", "false");
          localStorage.setItem("DisciplineAcad", JSON.stringify(data));
          localStorage.setItem(
            "DisciplineAcadTimestamp",
            Date.now().toString(),
          );
        }
      } catch (error) {
        notifications.show({
          title: "Load Error",
          message: "Failed to load disciplines. Please refresh the page.",
          color: "red",
          autoClose: 3000,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredDisciplines = disciplines.filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.name.toLowerCase().includes(searchLower) ||
      item.acronym.toLowerCase().includes(searchLower) ||
      item.programmes.some((program) =>
        program.name.toLowerCase().includes(searchLower)
      )
    );
  });

  const handleDeleteClick = (discipline) => {
    setDisciplineToDelete(discipline);
    setDeleteModalOpened(true);
  };

  const handleConfirmDelete = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        notifications.show({
          title: "Authentication Error",
          message: "Please log in again to continue",
          color: "red",
          autoClose: 3000,
        });
        return;
      }

      const response = await fetch(
        `${host}/programme_curriculum/api/admin_delete_discipline/${disciplineToDelete.id}/`,
        {
          method: "DELETE",
          headers: {
            "Authorization": `Token ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Handle non-JSON responses
      let data = {};
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      }

      if (response.ok && (data.success !== false)) {
        // Remove from local state
        setDisciplines(prev => prev.filter(disc => disc.id !== disciplineToDelete.id));
        
        // Update cache
        localStorage.setItem("AdminDisciplineCachechange", "true");
        
        notifications.show({
          title: "Successfully Deleted",
          message: data.message || `Discipline '${disciplineToDelete.name}' has been deleted`,
          color: "green",
          autoClose: 3000,
        });
      } else {
        // Handle different error cases
        if (response.status === 404) {
          notifications.show({
            title: "Not Found",
            message: "This discipline may have already been deleted or the delete endpoint is not available",
            color: "orange",
            autoClose: 4000,
          });
        } else if (response.status === 400 && data.dependencies) {
          // Handle dependency errors
          const dependencyMessage = data.dependencies
            .map(dep => `${dep.count} ${dep.type}`)
            .join(', ');
          
          notifications.show({
            title: "Cannot Delete",
            message: `${data.message || 'This discipline has dependencies'}: ${dependencyMessage}`,
            color: "orange",
            autoClose: 5000,
          });
        } else if (response.status === 403) {
          notifications.show({
            title: "Access Denied",
            message: "You don't have permission to delete disciplines",
            color: "red",
            autoClose: 3000,
          });
        } else {
          notifications.show({
            title: "Delete Failed",
            message: data.error || "Failed to delete discipline. The backend delete API may not be implemented yet.",
            color: "red",
            autoClose: 4000,
          });
        }
      }
    } catch (error) {
      notifications.show({
        title: "Network Error",
        message: "Failed to connect to server. Please check your connection and try again.",
        color: "red",
        autoClose: 3000,
      });
    } finally {
      setDeleteModalOpened(false);
      setDisciplineToDelete(null);
    }
  };

  return (
    <MantineProvider
      theme={{ colorScheme: "light" }}
      withGlobalStyles
      withNormalizeCSS
    >
      <Container style={{ padding: "20px", maxWidth: "100%" }}>
        <Flex justify="space-between" align="center" mb={20}>
          <Button variant="filled" style={{ marginRight: "10px" }}>
            Disciplines
          </Button>
          <Flex align="center" gap="md">
            <TextInput
              placeholder="Search by discipline name, acronym, or programmes..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.currentTarget.value)}
              style={{ width: "400px" }}
            />
            <Button
              variant="filled"
              color="blue"
              radius="sm"
              onClick={() =>
                navigate("/programme_curriculum/acad_admin_add_discipline_form")
              }
            >
              Add Discipline
            </Button>
          </Flex>
        </Flex>
        <hr />

        <div
          style={{
            maxHeight: "61vh",
            overflowY: "auto",
            border: "1px solid #d3d3d3",
            borderRadius: "10px",
            scrollbarWidth: "none",
          }}
        >
          <style>
            {`
              div::-webkit-scrollbar {
                display: none;
              }
            `}
          </style>
          <Table style={{ backgroundColor: "white", padding: "20px" }}>
            <thead>
              <tr>
                <th
                  style={{
                    padding: "15px 20px",
                    backgroundColor: "#C5E2F6",
                    color: "#3498db",
                    fontSize: "16px",
                    textAlign: "center",
                    borderRight: "1px solid #d3d3d3",
                  }}
                >
                  Discipline
                </th>
                <th
                  style={{
                    padding: "15px 20px",
                    backgroundColor: "#C5E2F6",
                    color: "#3498db",
                    fontSize: "16px",
                    textAlign: "center",
                    borderRight: "1px solid #d3d3d3",
                  }}
                >
                  Programmes
                </th>
                <th
                  style={{
                    padding: "15px 20px",
                    backgroundColor: "#C5E2F6",
                    color: "#3498db",
                    fontSize: "16px",
                    textAlign: "center",
                  }}
                >
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="3" style={{ textAlign: "center" }}>
                    Loading...
                  </td>
                </tr>
              ) : filteredDisciplines.length > 0 ? (
                filteredDisciplines.map((item, index) => (
                  <tr
                    key={item.name}
                    style={{
                      backgroundColor:
                        index % 2 === 0 ? "#fff" : "#15ABFF1C",
                    }}
                  >
                    <td
                      style={{
                        width: "40%",
                        padding: "15px 20px",
                        textAlign: "center",
                        color: "black",
                        borderRight: "1px solid #d3d3d3",
                      }}
                    >
                      {item.name} ({item.acronym})
                    </td>
                    <td
                      style={{
                        width: "40%",
                        padding: "15px 20px",
                        textAlign: "center",
                        color: "black",
                        borderRight: "1px solid #d3d3d3",
                      }}
                    >
                      {item.programmes.map((program, i, array) => (
                        <React.Fragment key={i}>
                          <Anchor
                            component={Link}
                            to={`/programme_curriculum/acad_view?programme=${program.id}`}
                            style={{
                              color: "#3498db",
                              textDecoration: "none",
                              fontSize: "14px",
                            }}
                          >
                            {program.name}
                          </Anchor>
                          {i < array.length - 1 && (
                            <span style={{ margin: "0 10px" }}>|</span>
                          )}
                        </React.Fragment>
                      ))}
                    </td>
                    <td
                      style={{
                        padding: "15px 20px",
                        textAlign: "center",
                        color: "black",
                      }}
                    >
                      <Flex gap="xs" justify="center">
                        <Link
                          to={`/programme_curriculum/acad_admin_edit_discipline_form/${item.id}`}
                        >
                          <ActionIcon variant="light" color="blue" size="sm">
                            <IconEdit size="1rem" />
                          </ActionIcon>
                        </Link>
                        <ActionIcon 
                          variant="light" 
                          color="red" 
                          size="sm"
                          onClick={() => handleDeleteClick(item)}
                        >
                          <IconTrash size="1rem" />
                        </ActionIcon>
                      </Flex>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" style={{ textAlign: "center" }}>
                    No disciplines found
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>

        <Modal
          opened={deleteModalOpened}
          onClose={() => setDeleteModalOpened(false)}
          title="Confirm Discipline Deletion"
          centered
          size="md"
        >
          <Text size="sm" mb="md">
            Are you sure you want to delete the discipline <strong>"{disciplineToDelete?.name}"</strong> 
            ({disciplineToDelete?.acronym})?
          </Text>
          
          <Text size="xs" color="orange" mb="sm">
            ⚠️ <strong>Warning:</strong> This action cannot be undone.
          </Text>
          
          <Text size="xs" color="blue" mb="md">
            ℹ️ <strong>Note:</strong> If the backend delete API is not yet implemented, 
            you'll receive a notification about the current status.
          </Text>
          
          <Flex justify="flex-end" mt="md" gap="sm">
            <Button 
              variant="outline" 
              onClick={() => setDeleteModalOpened(false)}
            >
              Cancel
            </Button>
            <Button 
              color="red" 
              onClick={handleConfirmDelete}
            >
              Delete Discipline
            </Button>
          </Flex>
        </Modal>
      </Container>
    </MantineProvider>
  );
}

export default DisciplineAcad;
