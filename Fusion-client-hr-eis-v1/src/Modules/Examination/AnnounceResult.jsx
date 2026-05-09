import React, { useEffect, useState } from "react";
import {
  Card,
  Paper,
  Table,
  Text,
  Group,
  Button,
  Loader,
  Alert,
  Title,
  Select,
  SimpleGrid,
  Stack,
  TextInput,
} from "@mantine/core";
import { IconSearch, IconX } from "@tabler/icons-react";
import { showNotification } from "@mantine/notifications";
import axios from "axios";
import { useSelector } from "react-redux";
import {
  announce_result,
  update_result_announcement,
  create_announcemet,
} from "./routes/examinationRoutes.jsx";

export default function AnnounceResult() {
  const userRole = useSelector((state) => state.user.role);
  const [announcements, setAnnouncements] = useState([]);
  const [batchOptions, setBatchOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({ batch: "", semester: "" });
  const [searchQuery, setSearchQuery] = useState("");

  const semesterOptions = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: `Semester ${i + 1}`,
  }));

  // Fetch existing announcements & batches
  useEffect(() => {
    setLoading(true);
    const token = localStorage.getItem("authToken");
    axios
      .get(announce_result, {
        params: { role: userRole },
        headers: { Authorization: `Token ${token}` },
      })
      .then(({ data }) => {
        setAnnouncements(Array.isArray(data.announcements) ? data.announcements : []);
        setBatchOptions(
          Array.isArray(data.batches)
            ? data.batches.map((b) => ({ value: String(b.id), label: b.label }))
            : []
        );
      })
      .catch((err) => {
        setError("Error fetching data: " + err.message);
        showNotification({ title: "Error", message: err.message, color: "red" });
      })
      .finally(() => setLoading(false));
  }, [userRole]);

  const handleChange = (field) => (value) => {
    setFormData((f) => ({ ...f, [field]: value }));
  };

  const isDuplicate = announcements.some(
    (a) =>
      String(a.batch?.id) === formData.batch &&
      String(a.semester) === formData.semester
  );

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!formData.batch || !formData.semester) {
      setError("Both Batch and Semester are required.");
      showNotification({ title: "Error", message: error, color: "red" });
      return;
    }

    setLoading(true);
    setError(null);
    const token = localStorage.getItem("authToken");

    try {
      const response = await axios.post(
        create_announcemet,
        {
          Role: userRole,
          batch: formData.batch,
          semester: parseInt(formData.semester, 10),
        },
        { headers: { Authorization: `Token ${token}` } }
      );

      const ann = response.data;
      if (response.status === 201) {
        setAnnouncements((prev) => [ann, ...prev]);
        showNotification({ title: "Success", message: "Announcement created.", color: "green" });
      } else {
        setAnnouncements((prev) =>
          prev.map((a) => (a.id === ann.id ? ann : a))
        );
        showNotification({ title: "Notice", message: "Announcement already exists.", color: "blue" });
      }
      setFormData({ batch: "", semester: "" });
    } catch (err) {
      setError("Error creating announcement: " + err.message);
      showNotification({ title: "Error", message: err.message, color: "red" });
    } finally {
      setLoading(false);
    }
  };

  const toggleAnnouncement = async (id, currentStatus) => {
    const token = localStorage.getItem("authToken");
    try {
      await axios.post(
        update_result_announcement,
        { id, announced: !currentStatus, Role: userRole },
        { headers: { Authorization: `Token ${token}` } }
      );
      setAnnouncements((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, announced: !currentStatus } : item
        )
      );
      showNotification({
        title: "Success",
        message: `Announcement ${currentStatus ? "reverted" : "published"}.`,
        color: "green",
      });
    } catch (err) {
      setError("Error updating announcement: " + err.message);
      showNotification({ title: "Error", message: err.message, color: "red" });
    }
  };

  const filteredAnnouncements = announcements.filter((item) =>
    item.batch?.label?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading)
    return (
      <Card p="lg" radius="md" withBorder>
        <Group position="center">
          <Loader size="lg" />
          <Text>Loading...</Text>
        </Group>
      </Card>
    );

  if (error)
    return (
      <Card p="lg" radius="md" withBorder>
        <Alert icon={<IconX size={16} />} title="Error" color="red">
          {error}
        </Alert>
      </Card>
    );

  return (
    <Card p="lg" radius="md" withBorder>
      <Title order={2} mb="md">
        Announce Result
      </Title>

      <Paper shadow="sm" p="md" withBorder mb="md">
        <form onSubmit={handleCreateAnnouncement}>
          <Stack spacing="md">
            <SimpleGrid cols={2} spacing="md">
              <Select
                label="Batch"
                placeholder="Select Batch"
                data={batchOptions}
                value={formData.batch}
                onChange={handleChange("batch")}
                required
              />
              <Select
                label="Semester"
                placeholder="Select Semester"
                data={semesterOptions}
                value={formData.semester}
                onChange={handleChange("semester")}
                required
              />
            </SimpleGrid>

            <Group position="right">
              <Button type="submit" variant="outline" disabled={loading || isDuplicate}>
                {isDuplicate ? "Already Exists" : "Create Announcement"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Paper>

      <Paper shadow="sm" p="md" withBorder>
        <TextInput
          placeholder="Search by batch..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
          icon={<IconSearch size={16} />}
          mb="md"
        />
        <Table highlightOnHover striped>
          <thead>
            <tr>
              <th>Batch</th>
              <th>Semester</th>
              <th>Announced</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredAnnouncements.map((item) => (
              <tr key={item.id}>
                <td>{item.batch?.label || "N/A"}</td>
                <td>{item.semester}</td>
                <td>{item.announced ? "Yes" : "No"}</td>
                <td>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => toggleAnnouncement(item.id, item.announced)}
                  >
                    {item.announced ? "Revert" : "Publish"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Paper>
    </Card>
  );
}
