import React, { useState, useEffect } from "react";
import {
  MantineProvider,
  Table,
  Flex,
  Container,
  Button,
  Text,
  Grid,
  TextInput,
  ScrollArea,
  ActionIcon,
  Tooltip,
  Modal,
  Group,
  Stack,
  Alert,
  Card,
  ThemeIcon,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { PencilSimple, Trash, Warning } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { useMediaQuery } from "@mantine/hooks";
import { fetchAllProgrammes } from "../api/api";
import axios from "axios";
import { host } from "../../../routes/globalRoutes";

function AdminViewProgrammes() {
  const [activeSection, setActiveSection] = useState("ug");
  const [ugData, setUgData] = useState([]);
  const [pgData, setPgData] = useState([]);
  const [phdData, setPhdData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchFilter, setSearchFilter] = useState("");
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingProgrammeId, setDeletingProgrammeId] = useState(null);
  
  const isMobile = useMediaQuery("(max-width: 768px)");

  const refreshProgrammeData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Authorization token not found");
      
      localStorage.removeItem("AdminProgrammesCache");
      localStorage.removeItem("AdminProgrammesTimestamp");
      localStorage.setItem("AdminProgrammesCachechange", "true");
      
      const data = await fetchAllProgrammes(token);
      setUgData(data.ug_programmes || []);
      setPgData(data.pg_programmes || []);
      setPhdData(data.phd_programmes || []);
      
      localStorage.setItem("AdminProgrammesCache", JSON.stringify(data));
      localStorage.setItem("AdminProgrammesTimestamp", Date.now().toString());
      localStorage.setItem("AdminProgrammesCachechange", "false");
    } catch (err) {
      notifications.show({
        title: "Error",
        message: "Failed to refresh programme data. Please try again.",
        color: "red",
        autoClose: 4000,
      });
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const cachedData = localStorage.getItem("AdminProgrammesCache");
        const timestamp = localStorage.getItem("AdminProgrammesTimestamp");
        const isCacheValid =
          timestamp && Date.now() - parseInt(timestamp, 10) < 10 * 60 * 1000;
        const cachedDatachange = localStorage.getItem(
          "AdminProgrammesCachechange",
        );
        if (cachedData && isCacheValid && cachedDatachange === "false") {
          const data = JSON.parse(cachedData);
          setUgData(data.ug_programmes || []);
          setPgData(data.pg_programmes || []);
          setPhdData(data.phd_programmes || []);
        } else {
          const token = localStorage.getItem("authToken");
          if (!token) throw new Error("Authorization token not found");
          const data = await fetchAllProgrammes(token);
          setUgData(data.ug_programmes || []);
          setPgData(data.pg_programmes || []);
          setPhdData(data.phd_programmes || []);
          localStorage.setItem("AdminProgrammesCachechange", "false");

          localStorage.setItem("AdminProgrammesCache", JSON.stringify(data));
          localStorage.setItem(
            "AdminProgrammesTimestamp",
            Date.now().toString(),
          );
        }
      } catch (err) {
        notifications.show({
          title: "Error",
          message: "Failed to load programme data. Please refresh the page.",
          color: "red",
          autoClose: 4000,
        });
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const applyFilters = (data) => {
    return data.filter(
      (item) =>
        (item.name ? item.name.toLowerCase() : "").includes(
          searchFilter.toLowerCase(),
        ) ||
        (item.discipline__name
          ? item.discipline__name.toLowerCase()
          : ""
        ).includes(searchFilter.toLowerCase()),
    );
  };
  
  const renderTable = (data) => {
    const filteredData = applyFilters(data);
    return filteredData.map((element, index) => (
      <tr
        key={
          element.id ||
          `${element.programme}-${element.discipline__name}-${index}`
        }
        style={{
          backgroundColor: index % 2 !== 0 ? "#E6F7FF" : "#ffffff",
        }}
      >
        <td
          style={{
            padding: "15px 20px",
            textAlign: "center",
            color: "#3498db",
            width: "25%",
            borderRight: "1px solid #d3d3d3",
          }}
        >
          <Link
            to={`/programme_curriculum/acad_view?programme=${encodeURIComponent(
              element.id,
            )}`}
            style={{ color: "#3498db", textDecoration: "none" }}
          >
            {element.name}
          </Link>
        </td>
        <td
          style={{
            padding: "15px 20px",
            textAlign: "center",
            color: "black",
            width: "50%",
            borderRight: "1px solid #d3d3d3",
          }}
        >
          {element.discipline__name}
        </td>
        <td
          style={{
            padding: "15px 20px",
            textAlign: "center",
            color: "#3498db",
            width: "25%",
            borderRight: "1px solid #d3d3d3",
          }}
        >
          <Flex
            direction="row"
            justify="center"
            align="center"
            gap="md"
          >
            <Tooltip
              label="Edit Programme"
              position="top"
              withArrow
            >
              <ActionIcon
                color="blue"
                size="lg"
                variant="light"
                component={Link}
                to={`/programme_curriculum/admin_edit_programme_form/${element.id}`}
                title="Edit this programme"
              >
                <PencilSimple size={20} />
              </ActionIcon>
            </Tooltip>

            <Tooltip
              label="Delete Programme"
              position="top"
              withArrow
            >
              <ActionIcon
                color="red"
                size="lg"
                variant="light"
                onClick={(e) => {
                  e.stopPropagation();
                  confirmDeleteProgramme(element.id);
                }}
                title="Delete this programme"
              >
                <Trash size={20} />
              </ActionIcon>
            </Tooltip>
          </Flex>
        </td>
      </tr>
    ));
  };

  const confirmDeleteProgramme = (programmeId) => {
    setDeletingProgrammeId(programmeId);
    setShowDeleteConfirm(true);
  };

  const handleDeleteProgramme = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("Authorization token is required");
      }

      const response = await axios.delete(
        `${host}/programme_curriculum/api/admin_delete_programme/${deletingProgrammeId}/`,
        {
          headers: {
            Authorization: `Token ${token}`,
          },
        }
      );

      if (response.data.success) {
        notifications.show({
          title: "✅ Programme Deleted Successfully",
          message: (
            <div>
              <Text size="sm" mb={8}>
                <strong>Programme "{response.data.deleted_programme?.name || 'Programme'}" has been removed.</strong>
              </Text>
              {response.data.deleted_programme && (
                <Text size="xs" color="gray.7">
                  Category: {response.data.deleted_programme.category || 'N/A'} | Discipline: {response.data.deleted_programme.discipline || 'N/A'}
                </Text>
              )}
            </div>
          ),
          color: "green",
          autoClose: 6000,
          style: {
            backgroundColor: '#d4edda',
            borderColor: '#c3e6cb',
            color: '#155724',
          },
        });

        await refreshProgrammeData();
        setShowDeleteConfirm(false);
        setDeletingProgrammeId(null);
      } else {
        throw new Error(response.data.message || "Failed to delete programme");
      }
    } catch (error) {
      let errorMessage = "Failed to delete programme";
      let errorTitle = "❌ Delete Failed";

      if (error.response) {
        const errorData = error.response.data;
        
        if (error.response.status === 400) {
          if (errorData?.validation_error === "programme_has_batches") {
            errorTitle = "👥 Cannot Delete - Batches Exist";
            
            notifications.show({
              title: errorTitle,
              message: (
                <div>
                  <Text size="sm" mb={8}>
                    <strong>{errorData.message || "This programme has batches associated with it. Please remove all batches first."}</strong>
                  </Text>
                  <Text size="xs" color="gray.7">
                    Batch count: {errorData.batch_count || "Unknown"}<br/>
                    You must remove all batches before deleting this programme.
                  </Text>
                </div>
              ),
              color: "orange",
              autoClose: 10000,
              style: {
                backgroundColor: '#fff3cd',
                borderColor: '#ffeaa7',
                color: '#856404',
              },
            });
            setShowDeleteConfirm(false);
            setDeletingProgrammeId(null);
            return;
            
          } else if (errorData?.validation_error === "programme_has_students") {
            errorTitle = "🚫 Cannot Delete - Students Enrolled";
            
            notifications.show({
              title: errorTitle,
              message: (
                <div>
                  <Text size="sm" mb={8}>
                    <strong>{errorData.message || "This programme has students enrolled."}</strong>
                  </Text>
                  <Text size="xs" color="gray.7">
                    Student count: {errorData.student_count || "Unknown"}<br/>
                    All students must be transferred or graduated before deleting this programme.
                  </Text>
                </div>
              ),
              color: "red",
              autoClose: 12000,
              style: {
                backgroundColor: '#f8d7da',
                borderColor: '#f5c6cb',
                color: '#721c24',
              },
            });
            setShowDeleteConfirm(false);
            setDeletingProgrammeId(null);
            return;
            
          } else {
            errorMessage =
              errorData?.message ||
              errorData?.error ||
              "Cannot delete programme - it may have associated data";
          }
        } else if (error.response.status === 404) {
          errorMessage = "Programme not found";
        } else if (error.response.status === 403) {
          errorMessage = "You don't have permission to delete this programme";
        } else {
          errorMessage = `Server error: ${error.response.status}`;
        }
      } else if (error.request) {
        errorMessage = "Network error - please check your connection";
      } else {
        errorMessage = error.message || "Unknown error occurred";
      }

      notifications.show({
        title: errorTitle,
        message: errorMessage,
        color: "red",
        autoClose: 6000,
      });
      
      setShowDeleteConfirm(false);
      setDeletingProgrammeId(null);
    }
  };

  if (loading) {
    return (
      <Container>
        <Text>Loading programmes...</Text>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Text color="red">{error}</Text>
      </Container>
    );
  }

  return (
    <MantineProvider
      theme={{ colorScheme: "light" }}
      withGlobalStyles
      withNormalizeCSS
    >
      <Container style={{ padding: "20px", maxWidth: "100%" }}>
        <Flex justify="space-between" align="center" wrap="wrap" gap="sm" mb={10}>
          <Flex gap="sm" wrap="wrap">
            <Button
              variant={activeSection === "ug" ? "filled" : "outline"}
              onClick={() => setActiveSection("ug")}
            >
              UG: Undergraduate
            </Button>
            <Button
              variant={activeSection === "pg" ? "filled" : "outline"}
              onClick={() => setActiveSection("pg")}
            >
              PG: Post Graduate
            </Button>
            <Button
              variant={activeSection === "phd" ? "filled" : "outline"}
              onClick={() => setActiveSection("phd")}
            >
              PhD: Doctor of Philosophy
            </Button>
          </Flex>
          
          <Flex gap="sm" align="center">
            <TextInput
              placeholder="Search by Programme or Discipline"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              style={{ minWidth: "250px" }}
            />
            <Link to="/programme_curriculum/acad_admin_add_programme_form">
              <Button
                variant="filled"
                color="blue"
                radius="sm"
                style={{ height: "35px" }}
              >
                Add Programme
              </Button>
            </Link>
          </Flex>
        </Flex>
        <hr />

        <Grid>
          {isMobile && (
            <Grid.Col span={12}>
              <ScrollArea>
              </ScrollArea>
            </Grid.Col>
          )}
          <Grid.Col span={12}>
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
              {activeSection === "ug" && (
                <Table
                  style={{
                    backgroundColor: "white",
                    padding: "20px",
                    flexGrow: 1,
                  }}
                >
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
                        Programme
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
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>{renderTable(ugData)}</tbody>
                </Table>
              )}
              {activeSection === "pg" && (
                <Table
                  style={{
                    backgroundColor: "white",
                    padding: "20px",
                    flexGrow: 1,
                  }}
                >
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
                        Programme
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
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>{renderTable(pgData)}</tbody>
                </Table>
              )}
              {activeSection === "phd" && (
                <Table
                  style={{
                    backgroundColor: "white",
                    padding: "20px",
                    flexGrow: 1,
                  }}
                >
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
                        Programme
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
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>{renderTable(phdData)}</tbody>
                </Table>
              )}
            </div>
          </Grid.Col>
        </Grid>

        <Modal
          opened={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          title={
            <Flex align="center" gap="sm">
              <ThemeIcon color="red" size="lg">
                <Trash size={20} />
              </ThemeIcon>
              <Text size="lg" weight={600}>
                Confirm Delete Programme
              </Text>
            </Flex>
          }
          size="md"
          centered
        >
          <Stack spacing="md">
            {(() => {
              const programmeToDelete = [...ugData, ...pgData, ...phdData]
                .find(programme => programme.id === deletingProgrammeId);
              
              return (
                <>
                  <Text>
                    Are you sure you want to delete this programme? This action cannot be undone.
                  </Text>
                  
                  {programmeToDelete && (
                    <Card withBorder p="md" bg="gray.1">
                      <Text size="sm" weight={500} mb={8}>
                        Programme Details:
                      </Text>
                      <Text size="sm">
                        <strong>Name:</strong> {programmeToDelete.name}
                      </Text>
                      <Text size="sm">
                        <strong>Discipline:</strong> {programmeToDelete.discipline__name}
                      </Text>
                      <Text size="sm">
                        <strong>Type:</strong> {programmeToDelete.programme || activeSection.toUpperCase()}
                      </Text>
                    </Card>
                  )}

                  <Alert icon={<Warning size={16} />} title="Deletion Restrictions" color="orange">
                    <Text size="sm">
                      • Cannot delete if this programme has associated batches<br/>
                      • Cannot delete if students are enrolled in this programme<br/>
                      • All related data must be removed before deletion
                    </Text>
                  </Alert>
                </>
              );
            })()}

            <Group justify="flex-end" mt="md">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button 
                color="red" 
                onClick={handleDeleteProgramme}
                leftSection={<Trash size={16} />}
              >
                Delete Programme
              </Button>
            </Group>
          </Stack>
        </Modal>

      </Container>
    </MantineProvider>
  );
}

export default AdminViewProgrammes;
