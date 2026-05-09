import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  MantineProvider,
  Table,
  Flex,
  Container,
  Button,
  TextInput,
  ActionIcon,
  Modal,
  Text,
} from "@mantine/core";
import { IconEdit, IconTrash } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { fetchWorkingCurriculumsData } from "../api/api";
import { host } from "../../../routes/globalRoutes";

function Admin_view_all_working_curriculums() {
  const [searchTerm, setSearchTerm] = useState("");
  const [curriculums, setCurriculums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [curriculumToDelete, setCurriculumToDelete] = useState(null);

  const fetchData = async () => {
    try {
      const cachedData = localStorage.getItem("AdminCurriculumsCache");
      const timestamp = localStorage.getItem("AdminCurriculumsTimestamp");
      const isCacheValid =
        timestamp && Date.now() - parseInt(timestamp, 10) < 10 * 60 * 1000;
      const cachedDatachange = localStorage.getItem(
        "AdminCurriculumsCachechange",
      );
      if (cachedData && isCacheValid && cachedDatachange === "false") {
        setCurriculums(JSON.parse(cachedData));
      } else {
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("Authorization token not found");

        const data = await fetchWorkingCurriculumsData(token);
        localStorage.setItem("AdminCurriculumsCachechange", "false");
        setCurriculums(data.curriculums);
        localStorage.setItem(
          "AdminCurriculumsCache",
          JSON.stringify(data.curriculums),
        );
        localStorage.setItem(
          "AdminCurriculumsTimestamp",
          Date.now().toString(),
        );
      }
    } catch (error) {
      notifications.show({
        title: "Load Error",
        message: "Failed to load curriculums. Please refresh the page.",
        color: "red",
        autoClose: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredData = curriculums.filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.name.toLowerCase().includes(searchLower) ||
      item.version.toLowerCase().includes(searchLower) ||
      (item.batch || []).some((b) => b.toLowerCase().includes(searchLower)) ||
      item.semesters.toString().includes(searchLower)
    );
  });

  const handleDeleteClick = (curriculum) => {
    setCurriculumToDelete(curriculum);
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
        `${host}/programme_curriculum/api/admin_delete_curriculum/${curriculumToDelete.id}/`,
        {
          method: "DELETE",
          headers: {
            "Authorization": `Token ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      let data = {};
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      }

      if (response.ok && (data.success !== false)) {
        setCurriculums(prev => prev.filter(curr => curr.id !== curriculumToDelete.id));
        
        localStorage.setItem("AdminCurriculumsCachechange", "true");
        
        notifications.show({
          title: "Successfully Deleted",
          message: data.message || `Curriculum '${curriculumToDelete.name}' has been deleted`,
          color: "green",
          autoClose: 3000,
        });
      } else {
        if (response.status === 404) {
          notifications.show({
            title: "Not Found",
            message: "This curriculum may have already been deleted or the delete endpoint is not available",
            color: "orange",
            autoClose: 4000,
          });
        } else if (response.status === 400 && data.dependencies) {
          const dependencyMessage = data.dependencies
            .map(dep => `${dep.count} ${dep.type}`)
            .join(', ');
          
          notifications.show({
            title: "Cannot Delete",
            message: `${data.message || 'This curriculum has dependencies'}: ${dependencyMessage}`,
            color: "orange",
            autoClose: 5000,
          });
        } else if (response.status === 403) {
          notifications.show({
            title: "Access Denied",
            message: "You don't have permission to delete curriculums",
            color: "red",
            autoClose: 3000,
          });
        } else {
          notifications.show({
            title: "Delete Failed",
            message: data.error || "Failed to delete curriculum. The backend delete API may not be implemented yet.",
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
      setCurriculumToDelete(null);
    }
  };  const cellStyle = {
    padding: "15px 20px",
    textAlign: "center",
    borderRight: "1px solid #d3d3d3",
  };

  const rows = filteredData.map((element, index) => (
    <tr
      key={element.id}
      style={{ backgroundColor: index % 2 === 0 ? "#FFFFFF" : "#E6F7FF" }}
    >
      <td style={cellStyle}>
        <Link
          to={`/programme_curriculum/view_curriculum?curriculum=${element.id}`}
          style={{ color: "#3498db", textDecoration: "none" }}
        >
          {element.name}
        </Link>
      </td>
      <td style={cellStyle}>{element.version}</td>
      <td
        style={{
          padding: "15px 20px",
          borderRight: "1px solid #d3d3d3",
          textAlign: "center",
        }}
      >
        {element.batch && element.batch.length > 0 ? (
          element.batch.map((b, i) => <div key={i}>{b}</div>)
        ) : (
          <div>No batches available</div>
        )}
      </td>
      <td style={cellStyle}>{element.semesters}</td>
      <td
        style={{
          padding: "15px 20px",
          textAlign: "center",
        }}
      >
        <Link
          to={`/programme_curriculum/acad_admin_replicate_curriculum_form?curriculum=${element.id}`}
        >
          <Button variant="filled" color="green" radius="sm" size="xs">
            Replicate
          </Button>
        </Link>
      </td>
      <td
        style={{
          padding: "15px 20px",
          textAlign: "center",
        }}
      >
        <Flex gap="xs" justify="center">
          <Link
            to={`/programme_curriculum/admin_edit_curriculum_form?curriculum=${element.id}`}
          >
            <ActionIcon variant="light" color="blue" size="sm">
              <IconEdit size="1rem" />
            </ActionIcon>
          </Link>
          <ActionIcon 
            variant="light" 
            color="red" 
            size="sm"
            onClick={() => handleDeleteClick(element)}
          >
            <IconTrash size="1rem" />
          </ActionIcon>
        </Flex>
      </td>
    </tr>
  ));

  return (
    <MantineProvider
      theme={{ colorScheme: "light" }}
      withGlobalStyles
      withNormalizeCSS
    >
      <Container style={{ padding: "20px", maxWidth: "100%" }}>
        <Flex justify="space-between" align="center" mb={20}>
          <Button variant="filled" style={{ marginRight: "10px" }}>
            Curriculums
          </Button>
          <Flex align="center" gap="md">
            <TextInput
              placeholder="Search by name, version, batch, or semesters..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.currentTarget.value)}
              style={{ width: "400px" }}
            />
            <Button 
              variant="outline" 
              onClick={() => {
                setLoading(true);
                localStorage.removeItem("AdminCurriculumsCache");
                fetchData();
              }}
            >
              Refresh
            </Button>
            <Link to="/programme_curriculum/acad_admin_add_curriculum_form">
              <Button variant="filled" color="blue" radius="sm">
                Add Curriculum
              </Button>
            </Link>
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
                  Version
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
                  Batch
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
                  No. of Semesters
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
                <th
                  style={{
                    padding: "15px 20px",
                    backgroundColor: "#C5E2F6",
                    color: "#3498db",
                    fontSize: "16px",
                    textAlign: "center",
                  }}
                >
                  Edit
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center" }}>
                    Loading...
                  </td>
                </tr>
              ) : rows.length > 0 ? (
                rows
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center" }}>
                    No curriculums found
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>

        <Modal
          opened={deleteModalOpened}
          onClose={() => setDeleteModalOpened(false)}
          title="Confirm Curriculum Deletion"
          centered
          size="md"
        >
          <Text size="sm" mb="md">
            Are you sure you want to delete the curriculum <strong>"{curriculumToDelete?.name}"</strong> 
            (Version: {curriculumToDelete?.version})?
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
              Delete Curriculum
            </Button>
          </Flex>
        </Modal>
      </Container>
    </MantineProvider>
  );
}

export default Admin_view_all_working_curriculums;
