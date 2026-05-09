import React, { useState, useEffect } from "react";
import {
  Button,
  TextInput,
  Flex,
  MantineProvider,
  Container,
  Table,
  ActionIcon,
  Tooltip,
  Modal,
  Text,
  Group,
  Stack,
  Alert,
  Card,
  ThemeIcon,
  Loader,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { showApiErrorNotification, showDeleteSuccessNotification } from "../../../utils/notifications";
import { PencilSimple, Trash, Warning } from "@phosphor-icons/react";
import axios from "axios";
import { Link } from "react-router-dom";
import { host } from "../../../routes/globalRoutes";

function AdminViewAllBatches() {
  const [activeTab, setActiveTab] = useState("Batches");
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState({
    name: "",
    discipline: "",
    year: "",
    curriculum: "",
  });
  const [batches, setBatches] = useState([]);
  const [finishedBatches, setFinishedBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingBatchId, setDeletingBatchId] = useState(null);

  const fetchBatches = async (forceRefresh = false) => {
    try {
      setLoading(true);
      const cachedData = localStorage.getItem("AdminBatchesCache");
      const timestamp = localStorage.getItem("AdminBatchesTimestamp");
      const isCacheValid =
        timestamp && Date.now() - parseInt(timestamp, 10) < 10 * 60 * 1000;
      const cachedDatachange = localStorage.getItem(
        "AdminBatchesCachechange",
      );
      if (!forceRefresh && cachedData && isCacheValid && cachedDatachange === "false") {
        const data = JSON.parse(cachedData);
        setBatches(data.batches || []);
        setFinishedBatches(data.finished_batches || []);
      } else {
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("Authorization token not found");

        const response = await axios.get(
          `${host}/programme_curriculum/api/batches/sync/`,
          {
            headers: { Authorization: `Token ${token}` },
          },
        );


        const mappedBatches = response.data.batches?.map(batch => ({
          id: batch.batch_id,
          name: batch.name,
          programme: batch.name,
          discipline: batch.discipline,
          displayBranch: batch.discipline,
          year: batch.year,
          totalSeats: batch.total_seats,
          total_seats: batch.total_seats,
          filledSeats: batch.filled_seats,
          filled_seats: batch.filled_seats,
          student_count: batch.filled_seats,
          availableSeats: batch.available_seats,
          available_seats: batch.available_seats,
          curriculum: batch.curriculum,
          curriculum_name: batch.curriculum,
          curriculum_display: batch.curriculum_display,
          curriculumId: batch.curriculum_id,
          curriculum_id: batch.curriculum_id,
          status: batch.status
        })) || [];

        setBatches(mappedBatches);
        setFinishedBatches([]);

        localStorage.setItem("AdminBatchesCachechange", "false");
        localStorage.setItem(
          "AdminBatchesCache",
          JSON.stringify({ batches: mappedBatches, finished_batches: [] }),
        );
        localStorage.setItem("AdminBatchesTimestamp", Date.now().toString());
      }
    } catch (error) {
      console.error("Error fetching batches:", error);
      notifications.show({
        title: "Error",
        message: "Failed to load batch data. Please refresh the page.",
        color: "red",
        autoClose: 4000,
      });
      setBatches([]);
      setFinishedBatches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const applyFilters = (data) => {
    return data.filter((batch) => {
      const searchLower = searchQuery.toLowerCase();
      return (
        searchQuery === "" ||
        batch.name.toLowerCase().includes(searchLower) ||
        batch.discipline.toLowerCase().includes(searchLower) ||
        batch.year.toString().includes(searchLower) ||
        (batch.curriculum && batch.curriculum.toLowerCase().includes(searchLower))
      );
    });
  }; 

  const filteredBatches = applyFilters(batches);
  const filteredFinishedBatches = applyFilters(finishedBatches);

  const confirmDeleteBatch = (batchId) => {
    setDeletingBatchId(batchId);
    setShowDeleteConfirm(true);
  };

  const handleDeleteBatch = async () => {
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

      const response = await axios.delete(
        `${host}/programme_curriculum/api/batches/${deletingBatchId}/delete/`,
        {
          headers: {
            Authorization: `Token ${token}`,
          },
        }
      );

      if (response.data.success) {
        const batchName = response.data.deleted_batch?.name || 'Batch';
        const batchDetails = response.data.deleted_batch 
          ? `Discipline: ${response.data.deleted_batch.discipline_acronym || response.data.deleted_batch.discipline} | Year: ${response.data.deleted_batch.year}`
          : '';
          
        showDeleteSuccessNotification("Batch", batchName, batchDetails);

        await fetchBatches(true);
        setShowDeleteConfirm(false);
        setDeletingBatchId(null);
      } else {
        throw new Error(response.data.message || "Failed to delete batch");
      }
    } catch (error) {
      showApiErrorNotification(error, "Batch", fetchBatches);
      
      setShowDeleteConfirm(false);
      setDeletingBatchId(null);
    }
  };

  return (
    <MantineProvider
      theme={{ colorScheme: "light" }}
      withGlobalStyles
      withNormalizeCSS
    >
      <Container style={{ padding: "20px", maxWidth: "100%" }}>
        <Flex justify="space-between" align="center" mb={10}>
          <Flex justify="flex-start" align="center">
            <Button
              variant={activeTab === "Batches" ? "filled" : "outline"}
              style={{ marginRight: "10px" }}
              onClick={() => setActiveTab("Batches")}
            >
              Batches
            </Button>
            <Button
              variant={activeTab === "Finished Batches" ? "filled" : "outline"}
              style={{ marginRight: "10px" }}
              onClick={() => setActiveTab("Finished Batches")}
            >
              Finished Batches
            </Button>
          </Flex>
          <Flex align="center" gap="md">
            <TextInput
              placeholder="Search batches..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: "300px" }}
            />
            <Link
              to="/programme_curriculum/acad_admin_add_batch_form"
              style={{ textDecoration: "none" }}
            >
              <Button variant="filled" color="blue">
                Add Batch
              </Button>
            </Link>
          </Flex>
        </Flex>
        <hr />
        <div
          style={{
            maxHeight: "70vh",
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
          {activeTab === "Batches" && (
            <Table
              style={{
                backgroundColor: "white",
                padding: "20px",
                flexGrow: 1,
              }}
            >
              <thead
                className="courses-table-header"
                style={{ backgroundColor: "#b0e0ff" }}
              >
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
                        Name
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
                        Year
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
                        Curriculum
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
                        Total Seats
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
                        Filled Seats
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
                        Available Seats
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
                  <tbody>
                    {Array.isArray(filteredBatches) &&
                    filteredBatches.length > 0 ? (
                      filteredBatches.map((batch, index) => (
                        <tr
                          key={index}
                          className="courses-table-row"
                          style={{
                            backgroundColor:
                              index % 2 === 0 ? "#fff" : "#15ABFF1C",
                          }}
                        >
                          <td
                            style={{
                              padding: "15px 20px",
                              textAlign: "center",
                              color: "black",
                              width: "15%",
                              borderRight: "1px solid #d3d3d3",
                            }}
                          >
                            {batch.name}
                          </td>
                          <td
                            style={{
                              padding: "15px 20px",
                              textAlign: "center",
                              color: "black",
                              width: "15%",
                              borderRight: "1px solid #d3d3d3",
                            }}
                          >
                            {batch.discipline}
                          </td>
                          <td
                            style={{
                              padding: "15px 20px",
                              textAlign: "center",
                              color: "black",
                              width: "15%",
                              borderRight: "1px solid #d3d3d3",
                            }}
                          >
                            {batch.year}
                          </td>
                          <td
                            style={{
                              padding: "15px 20px",
                              textAlign: "center",
                              color: "black",
                              width: "35%",
                              borderRight: "1px solid #d3d3d3",
                            }}
                          >
                            {batch.curriculum_display || batch.curriculum ? (
                              <Link
                                to={`/programme_curriculum/view_curriculum?curriculum=${batch.curriculumId || batch.curriculum_id}`}
                                className="course-link"
                                style={{
                                  color: "#3498db",
                                  textDecoration: "none",
                                  fontSize: "14px",
                                }}
                              >
                                {batch.curriculum_display || 
                                  (batch.curriculum
                                    ? `${batch.curriculum}${batch.curriculumVersion || batch.curriculum_version ? ` v${batch.curriculumVersion || batch.curriculum_version}` : ''}`
                                    : "")
                                }
                              </Link>
                            ) : (
                              <span style={{ color: "#666", fontSize: "14px" }}>
                                No curriculum assigned
                              </span>
                            )}
                          </td>
                          <td
                            style={{
                              padding: "15px 20px",
                              textAlign: "center",
                              color: "black",
                              width: "10%",
                              borderRight: "1px solid #d3d3d3",
                            }}
                          >
                            {batch.totalSeats || 0}
                          </td>
                          <td
                            style={{
                              padding: "15px 20px",
                              textAlign: "center",
                              color: "black",
                              width: "10%",
                              borderRight: "1px solid #d3d3d3",
                            }}
                          >
                            {batch.filledSeats || 0}
                          </td>
                          <td
                            style={{
                              padding: "15px 20px",
                              textAlign: "center",
                              color: "black",
                              width: "10%",
                              borderRight: "1px solid #d3d3d3",
                            }}
                          >
                            {(batch.totalSeats || 0) - (batch.filledSeats || 0)}
                          </td>
                          <td
                            style={{
                              padding: "15px 20px",
                              textAlign: "center",
                              color: "black",
                              width: "15%",
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
                                label="Edit Batch"
                                position="top"
                                withArrow
                              >
                                <ActionIcon
                                  color="blue"
                                  size="lg"
                                  variant="light"
                                  component={Link}
                                  to={`/programme_curriculum/admin_edit_batch_form?batch=${batch.id}`}
                                  title="Edit this batch"
                                >
                                  <PencilSimple size={20} />
                                </ActionIcon>
                              </Tooltip>

                              <Tooltip
                                label="Delete Batch"
                                position="top"
                                withArrow
                              >
                                <ActionIcon
                                  color="red"
                                  size="lg"
                                  variant="light"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    confirmDeleteBatch(batch.id);
                                  }}
                                  title="Delete this batch"
                                >
                                  <Trash size={20} />
                                </ActionIcon>
                              </Tooltip>
                            </Flex>
                          </td>
                        </tr>
                      ))
                    ) : loading ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: "center", padding: "20px" }}>
                          <Loader size="sm" />
                        </td>
                      </tr>
                    ) : (
                      <tr>
                        <td colSpan="8" style={{ textAlign: "center", padding: "20px" }}>
                          No batches found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              )}

              {activeTab === "Finished Batches" && (
                <Table
                  style={{
                    backgroundColor: "white",
                    padding: "20px",
                    flexGrow: 1,
                  }}
                >
                  <thead
                    className="courses-table-header"
                    style={{ backgroundColor: "#b0e0ff" }}
                  >
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
                        Name
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
                        Year
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
                        Curriculum
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
                        Total Seats
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
                        Filled Seats
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
                        Available Seats
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
                  <tbody>
                    {Array.isArray(filteredFinishedBatches) &&
                    filteredFinishedBatches.length > 0 ? (
                      filteredFinishedBatches.map((batch, index) => (
                        <tr
                          key={index}
                          className="courses-table-row"
                          style={{
                            backgroundColor:
                              index % 2 === 0 ? "#fff" : "#15ABFF1C",
                          }}
                        >
                          <td
                            style={{
                              padding: "15px 20px",
                              textAlign: "center",
                              color: "black",
                              width: "15%",
                              borderRight: "1px solid #d3d3d3",
                            }}
                          >
                            {batch.name}
                          </td>
                          <td
                            style={{
                              padding: "15px 20px",
                              textAlign: "center",
                              color: "black",
                              width: "15%",
                              borderRight: "1px solid #d3d3d3",
                            }}
                          >
                            {batch.discipline}
                          </td>
                          <td
                            style={{
                              padding: "15px 20px",
                              textAlign: "center",
                              color: "black",
                              width: "15%",
                              borderRight: "1px solid #d3d3d3",
                            }}
                          >
                            {batch.year}
                          </td>
                          <td
                            style={{
                              padding: "15px 20px",
                              textAlign: "center",
                              color: "black",
                              width: "35%",
                              borderRight: "1px solid #d3d3d3",
                            }}
                          >
                            {batch.curriculum_display || batch.curriculum ? (
                              <Link
                                to={`/programme_curriculum/view_curriculum?curriculum=${batch.curriculumId || batch.curriculum_id}`}
                                className="course-link"
                                style={{ textDecoration: "none" }}
                              >
                                {batch.curriculum_display || 
                                  (batch.curriculum
                                    ? `${batch.curriculum}${batch.curriculumVersion || batch.curriculum_version ? ` v${batch.curriculumVersion || batch.curriculum_version}` : ''}`
                                    : "")
                                }
                              </Link>
                            ) : (
                              <span style={{ color: "#666", fontSize: "14px" }}>
                                No curriculum assigned
                              </span>
                            )}
                          </td>
                          <td
                            style={{
                              padding: "15px 20px",
                              textAlign: "center",
                              color: "black",
                              width: "10%",
                              borderRight: "1px solid #d3d3d3",
                            }}
                          >
                            {batch.totalSeats || 0}
                          </td>
                          <td
                            style={{
                              padding: "15px 20px",
                              textAlign: "center",
                              color: "black",
                              width: "10%",
                              borderRight: "1px solid #d3d3d3",
                            }}
                          >
                            {batch.filledSeats || 0}
                          </td>
                          <td
                            style={{
                              padding: "15px 20px",
                              textAlign: "center",
                              color: "black",
                              width: "10%",
                              borderRight: "1px solid #d3d3d3",
                            }}
                          >
                            {(batch.totalSeats || 0) - (batch.filledSeats || 0)}
                          </td>
                          <td
                            style={{
                              padding: "15px 20px",
                              textAlign: "center",
                              color: "black",
                              width: "15%",
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
                                label="Edit Batch"
                                position="top"
                                withArrow
                              >
                                <ActionIcon
                                  color="blue"
                                  size="lg"
                                  variant="light"
                                  component={Link}
                                  to={`/programme_curriculum/admin_edit_batch_form?batch=${batch.id}`}
                                  title="Edit this batch"
                                >
                                  <PencilSimple size={20} />
                                </ActionIcon>
                              </Tooltip>

                              <Tooltip
                                label="Delete Batch"
                                position="top"
                                withArrow
                              >
                                <ActionIcon
                                  color="red"
                                  size="lg"
                                  variant="light"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    confirmDeleteBatch(batch.id);
                                  }}
                                  title="Delete this batch"
                                >
                                  <Trash size={20} />
                                </ActionIcon>
                              </Tooltip>
                            </Flex>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="8">No batches found</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              )}
            </div>

        {/* Delete Confirmation Modal */}
        <Modal
          opened={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          title={
            <Flex align="center" gap="sm">
              <ThemeIcon color="red" size="lg">
                <Trash size={20} />
              </ThemeIcon>
              <Text size="lg" weight={600}>
                Confirm Delete Batch
              </Text>
            </Flex>
          }
          size="md"
          centered
        >
          <Stack spacing="md">
            {(() => {
              const batchToDelete = [...batches, ...finishedBatches]
                .find(batch => batch.id === deletingBatchId);
              
              return (
                <>
                  <Text>
                    Are you sure you want to delete this batch? This action cannot be undone.
                  </Text>
                  
                  {batchToDelete && (
                    <Card withBorder p="md" bg="gray.1">
                      <Text size="sm" weight={500} mb={8}>
                        Batch Details:
                      </Text>
                      <Text size="sm">
                        <strong>Name:</strong> {batchToDelete.name}
                      </Text>
                      <Text size="sm">
                        <strong>Discipline:</strong> {batchToDelete.discipline}
                      </Text>
                      <Text size="sm">
                        <strong>Year:</strong> {batchToDelete.year}
                      </Text>
                      <Text size="sm">
                        <strong>Total Seats:</strong> {batchToDelete.totalSeats || 0}
                      </Text>
                      <Text size="sm">
                        <strong>Filled Seats:</strong> {batchToDelete.filledSeats || 0}
                      </Text>
                    </Card>
                  )}

                  <Alert icon={<Warning size={16} />} title="Deletion Restrictions" color="orange">
                    <Text size="sm">
                      • Cannot delete if this batch has enrolled students<br/>
                      • Cannot delete if ANY students exist in this discipline across ALL batches<br/>
                      • The entire discipline must be empty before deletion
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
                onClick={handleDeleteBatch}
                leftSection={<Trash size={16} />}
              >
                Delete Batch
              </Button>
            </Group>
          </Stack>
        </Modal>

      </Container>
    </MantineProvider>
  );
}

export default AdminViewAllBatches;
