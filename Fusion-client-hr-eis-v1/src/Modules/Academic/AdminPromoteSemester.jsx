import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Card,
  Text,
  Select,
  Loader,
  Center,
  Alert,
  ScrollArea,
  Table,
  Button,
  Modal,
  Group,
  Checkbox,
  LoadingOverlay,
} from "@mantine/core";
import {
  listBatchesRoute,
  listStudentsPromoteRoute,
  applyPromoteRoute,
} from "../../routes/academicRoutes";

export default function AdminPromoteSemester() {
  const [batches, setBatches] = useState([]);
  const [sourceBatch, setSourceBatch] = useState("");
  const [students, setStudents] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingApply, setLoadingApply] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selected, setSelected] = useState({});
  const [modalOpen, setModalOpen] = useState(false);

  // Load batch list
  useEffect(() => {
    setLoadingBatches(true);
    const token = localStorage.getItem("authToken");
    axios
      .get(listBatchesRoute, { headers: { Authorization: `Token ${token}` } })
      .then((res) => setBatches(res.data))
      .catch(() => setError("Failed to load batches."))
      .finally(() => setLoadingBatches(false));
  }, []);

  // Fetch students for promotion
  const fetchStudents = useCallback(
    (batchId) => {
      setLoadingStudents(true);
      const token = localStorage.getItem("authToken");
      axios
        .get(listStudentsPromoteRoute, {
          params: { batch_id: batchId },
          headers: { Authorization: `Token ${token}` },
        })
        .then((res) => {
          setStudents(res.data);
          const init = {};
          res.data.forEach((st) => {
            init[st.id] = false;
          });
          setSelected(init);
        })
        .catch(() => setError("Failed to load students."))
        .finally(() => setLoadingStudents(false));
    },
    [setStudents, setSelected]
  );

  // Reload students when batch changes
  useEffect(() => {
    setError("");
    setSuccessMessage("");
    if (!sourceBatch) {
      setStudents([]);
      setSelected({});
      return;
    }
    fetchStudents(sourceBatch);
  }, [sourceBatch, fetchStudents]);

  const toggleSelect = (sid) => {
    setSelected((prev) => ({ ...prev, [sid]: !prev[sid] }));
  };

  const selectAll = () => {
    const all = {};
    students.forEach((st) => {
      all[st.id] = true;
    });
    setSelected(all);
  };

  const deselectAll = () => {
    const none = {};
    students.forEach((st) => {
      none[st.id] = false;
    });
    setSelected(none);
  };

  const toConfirm = students.filter((st) => selected[st.id]);

  const submitChanges = () => setModalOpen(true);

  const confirmApply = () => {
    setLoadingApply(true);
    const payload = toConfirm.map((st) => st.id);
    const token = localStorage.getItem("authToken");
    axios
      .post(applyPromoteRoute, payload, {
        headers: { Authorization: `Token ${token}` },
      })
      .then(() => {
        setModalOpen(false);
        setSuccessMessage("Selected students have been successfully promoted.");
        setError("");
        fetchStudents(sourceBatch);
      })
      .catch(() => setError("Failed to promote students."))
      .finally(() => setLoadingApply(false));
  };

  const batchOptions = batches.map((b) => ({
    value: String(b.id),
    label: b.label,
  }));

  return (
    <Card style={{ position: 'relative' }}>
      <LoadingOverlay visible={loadingBatches || loadingStudents || loadingApply} />

      <Select
        label="Select Batch"
        placeholder="Choose batch"
        data={batchOptions}
        value={sourceBatch}
        onChange={setSourceBatch}
        searchable
        nothingFoundMessage="No batches"
        mb="md"
        disabled={loadingBatches}
      />

      {error && (
        <Alert color="red" mb="md">
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert color="green" mb="md">
          {successMessage}
        </Alert>
      )}

      {students.length > 0 && (
        <>          
          <Group mb="sm">
            <Button onClick={selectAll} disabled={loadingStudents || loadingApply}>
              Select All
            </Button>
            <Button onClick={deselectAll} disabled={loadingStudents || loadingApply}>
              Deselect All
            </Button>
          </Group>
          <ScrollArea h={500} type="auto" scrollbarSize={10}>
            <Table striped highlightOnHover>
              <thead>
                <tr>
                  <th>Select</th>
                  <th>Username</th>
                  <th>Current Semester</th>
                </tr>
              </thead>
              <tbody>
                {students.map((st) => (
                  <tr key={st.id}>
                    <td>
                      <Checkbox
                        checked={selected[st.id]}
                        onChange={() => toggleSelect(st.id)}
                        disabled={loadingApply}
                      />
                    </td>
                    <td>{st.username}</td>
                    <td>{st.current_semester_no}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </ScrollArea>
          <Group position="right" mt="md">
            <Button onClick={submitChanges} disabled={toConfirm.length === 0 || loadingApply}>
              Promote Selected
            </Button>
          </Group>
        </>
      )}

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Confirm Promotion"
      >
        <Text mb="sm">You are promoting these students:</Text>
        <ScrollArea>
          <Table verticalSpacing="xs">
            <thead>
              <tr>
                <th>Username</th>
                <th>Old Semester</th>
                <th>New Semester</th>
              </tr>
            </thead>
            <tbody>
              {toConfirm.map((st) => (
                <tr key={st.id}>
                  <td>{st.username}</td>
                  <td>{st.current_semester_no}</td>
                  <td>{st.current_semester_no + 1}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </ScrollArea>
        <Group position="right" mt="md">
          <Button variant="outline" onClick={() => setModalOpen(false)} disabled={loadingApply}>
            Cancel
          </Button>
          <Button color="red" onClick={confirmApply} loading={loadingApply}>
            Confirm
          </Button>
        </Group>
      </Modal>
    </Card>
  );
}
