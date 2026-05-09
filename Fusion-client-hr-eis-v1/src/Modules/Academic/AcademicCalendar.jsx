import { useState, useEffect } from "react";
import {
  Card,
  Text,
  Button,
  Alert,
  Modal,
  Group,
  TextInput,
  Loader,
  FileInput,
  Table,
} from "@mantine/core";
import axios from "axios";
import { IconUpload } from "@tabler/icons-react";
import {
  calendarRoute,
  addCalendarRoute,
  editCalendarRoute,
  deleteCalendarRoute,
  clearCalendarRoute,
  exportCalendarRoute,
  importCalendarRoute,
} from "../../routes/academicRoutes";

function AcademicCalendar() {
  const [events, setEvents] = useState([]);
  const [newEvent, setNewEvent] = useState({
    description: "",
    from_date: null,
    to_date: null,
  });
  const [editingEvent, setEditingEvent] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [file, setFile] = useState(null);

  // Fetch events
  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) {
        setError("Authentication required");
        setLoading(false);
        return;
      }
      try {
        const { data } = await axios.get(calendarRoute, {
          headers: { Authorization: `Token ${token}` },
        });
        if (!mounted) return;
        setEvents(
          Array.isArray(data)
            ? data.map((e) => ({
                ...e,
                from_date: e.from_date ? new Date(e.from_date) : null,
                to_date: e.to_date ? new Date(e.to_date) : null,
              }))
            : []
        );
      } catch (err) {
        if (mounted) setError("Failed to load events");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchData();
    return () => {
      mounted = false;
    };
  }, [refreshTrigger]);

  // Format dates for display
  const formatDate = (d) =>
    d
      ? d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "";

  // Open modals
  const handleAdd = () => {
    setError("");
    setNewEvent({ description: "", from_date: null, to_date: null });
    setAddModalOpen(true);
  };
  const handleEdit = (ev) => {
    setError("");
    setEditingEvent(ev);
  };

  // Save edited event
  const handleSaveEdit = async () => {
    if (
      !editingEvent?.description ||
      !editingEvent?.from_date ||
      !editingEvent?.to_date
    ) {
      return setError("Please fill all fields");
    }
    setProcessing(true);
    try {
      const token = localStorage.getItem("authToken");
      await axios.put(
        editCalendarRoute,
        {
          ...editingEvent,
          from_date: editingEvent.from_date.toISOString().slice(0, 10),
          to_date: editingEvent.to_date.toISOString().slice(0, 10),
        },
        { headers: { Authorization: `Token ${token}` } }
      );
      setEditingEvent(null);
      setRefreshTrigger((t) => t + 1);
    } catch {
      setError("Failed to update event");
    } finally {
      setProcessing(false);
    }
  };

  // Create new event
  const handleAddEvent = async () => {
    if (
      !newEvent.description ||
      !newEvent.from_date ||
      !newEvent.to_date
    ) {
      return setError("Please fill all fields");
    }
    setProcessing(true);
    try {
      const token = localStorage.getItem("authToken");
      await axios.post(
        addCalendarRoute,
        {
          ...newEvent,
          from_date: newEvent.from_date.toISOString().slice(0, 10),
          to_date: newEvent.to_date.toISOString().slice(0, 10),
        },
        { headers: { Authorization: `Token ${token}` } }
      );
      setAddModalOpen(false);
      setRefreshTrigger((t) => t + 1);
    } catch {
      setError("Failed to create event");
    } finally {
      setProcessing(false);
    }
  };

  // Delete one event
  const handleDelete = async (ev) => {
    setProcessing(true);
    try {
      const token = localStorage.getItem("authToken");
      await axios.delete(deleteCalendarRoute, {
        headers: { Authorization: `Token ${token}` },
        data: { id: ev.id },
      });
      setRefreshTrigger((t) => t + 1);
    } catch {
      setError("Failed to delete event");
    } finally {
      setProcessing(false);
    }
  };

  // Clear all
  const handleClear = async () => {
    setProcessing(true);
    try {
      const token = localStorage.getItem("authToken");
      await axios.delete(clearCalendarRoute, {
        headers: { Authorization: `Token ${token}` },
      });
      setRefreshTrigger((t) => t + 1);
    } catch {
      setError("Failed to clear calendar");
    } finally {
      setProcessing(false);
    }
  };

  // Export Excel
  const handleExport = async () => {
    setProcessing(true);
    try {
      const token = localStorage.getItem("authToken");
      const res = await axios.get(exportCalendarRoute, {
        headers: { Authorization: `Token ${token}` },
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "calendar.xlsx";
      a.click();
    } catch {
      setError("Failed to export excel");
    } finally {
      setProcessing(false);
    }
  };

  // Import Excel
  const handleFileUpload = async (f) => {
    if (!f) return;
    setProcessing(true);
    try {
      const token = localStorage.getItem("authToken");
      const form = new FormData();
      form.append("file", f);
      await axios.post(importCalendarRoute, form, {
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      setFile(null);
      setRefreshTrigger((t) => t + 1);
    } catch {
      setError("Failed to import excel");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card shadow="sm" p="lg" radius="md" withBorder>
      <Text size="lg" weight={700} mb="md" align="center" color="#3B82F6">
        Academic Calendar Management
      </Text>

      {/* Initial loader or error */}
      {loading ? (
        <Group position="center" py="xl">
          <Loader />
        </Group>
      ) : (
        <>
          {error && (
            <Alert
              color="red"
              mb="md"
              withCloseButton
              onClose={() => setError("")}
            >
              {error}
            </Alert>
          )}

          {/* Events table */}
          <Table striped highlightOnHover>
            <thead>
              <tr>
                <th>Description</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(events) && events.length ? (
                events.map((ev) => (
                  <tr key={ev.id}>
                    <td>{ev.description}</td>
                    <td>{formatDate(ev.from_date)}</td>
                    <td>{formatDate(ev.to_date)}</td>
                    <td>
                      <Group spacing="xs">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleEdit(ev)}
                          disabled={processing}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          color="red"
                          size="xs"
                          onClick={() => handleDelete(ev)}
                          disabled={processing}
                        >
                          Delete
                        </Button>
                      </Group>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} align="center">
                    No events found
                  </td>
                </tr>
              )}
            </tbody>
          </Table>

          {/* Action buttons */}
          <Group mt="md">
            <Button onClick={handleAdd} disabled={processing}>
              Add New Event
            </Button>
            <Button
              variant="outline"
              color="red"
              onClick={handleClear}
              disabled={processing}
            >
              Clear Calendar
            </Button>
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={processing}
            >
              Export Excel
            </Button>
            <FileInput
              placeholder="Import Excel"
              accept=".xlsx,.xls"
              value={file}
              onChange={(f) => {
                setFile(f);
                handleFileUpload(f);
              }}
              icon={<IconUpload size={16} />}
              disabled={processing}
            />
          </Group>
        </>
      )}

      {/* Edit Modal */}
      <Modal
        opened={!!editingEvent}
        onClose={() => setEditingEvent(null)}
        title="Edit Event"
        size="lg"
      >
        <TextInput
          label="Description"
          value={editingEvent?.description || ""}
          onChange={(e) =>
            setEditingEvent({
              ...editingEvent,
              description: e.target.value,
            })
          }
          mb="md"
          required
          disabled={processing}
        />
        <TextInput
          label="Start Date"
          type="date"
          value={
            editingEvent?.from_date
              ? editingEvent.from_date.toISOString().slice(0, 10)
              : ""
          }
          onChange={(e) =>
            setEditingEvent({
              ...editingEvent,
              from_date: e.target.value ? new Date(e.target.value) : null,
            })
          }
          mb="md"
          required
          disabled={processing}
        />
        <TextInput
          label="End Date"
          type="date"
          value={
            editingEvent?.to_date
              ? editingEvent.to_date.toISOString().slice(0, 10)
              : ""
          }
          onChange={(e) =>
            setEditingEvent({
              ...editingEvent,
              to_date: e.target.value ? new Date(e.target.value) : null,
            })
          }
          mb="md"
          required
          disabled={processing}
        />
        <Group position="right" mt="lg">
          <Button onClick={handleSaveEdit} disabled={processing}>
            {processing ? "Saving…" : "Save Changes"}
          </Button>
        </Group>
      </Modal>

      {/* Add Modal */}
      <Modal
        opened={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add New Event"
        size="lg"
        overlayOpacity={0.3}
      >
        <TextInput
          label="Description"
          value={newEvent.description}
          onChange={(e) =>
            setNewEvent({ ...newEvent, description: e.target.value })
          }
          mb="md"
          required
          disabled={processing}
        />
        <TextInput
          label="Start Date"
          type="date"
          value={newEvent.from_date?.toISOString().slice(0, 10) || ""}
          onChange={(e) =>
            setNewEvent({
              ...newEvent,
              from_date: e.target.value ? new Date(e.target.value) : null,
            })
          }
          mb="md"
          required
          disabled={processing}
        />
        <TextInput
          label="End Date"
          type="date"
          value={newEvent.to_date?.toISOString().slice(0, 10) || ""}
          onChange={(e) =>
            setNewEvent({
              ...newEvent,
              to_date: e.target.value ? new Date(e.target.value) : null,
            })
          }
          mb="md"
          required
          disabled={processing}
        />
        <Group position="right" mt="lg">
          <Button onClick={handleAddEvent} disabled={processing}>
            {processing ? "Adding…" : "Add Event"}
          </Button>
        </Group>
      </Modal>
    </Card>
  );
}

export default AcademicCalendar;
