import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Card,
  Text,
  Select,
  Loader,
  Center,
  Alert,
  Table,
  Button,
  Modal,
  Group,
  TextInput,
} from "@mantine/core";
import {
  listBatchesRoute,
  listStudentsRoute,
  applyBatchRoute,
} from "../../routes/academicRoutes";

export default function AdminBatchChange() {
  const [batches, setBatches] = useState([]);
  const [sourceBatch, setSourceBatch] = useState("");
  const [students, setStudents] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [error, setError] = useState("");
  const [changes, setChanges] = useState({});
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    setLoadingBatches(true);
    const token = localStorage.getItem("authToken");
    axios
      .get(listBatchesRoute, { headers: { Authorization: `Token ${token}` } })
      .then((res) => setBatches(res.data))
      .catch(() => setError("Failed to load batches."))
      .finally(() => setLoadingBatches(false));
  }, []);

  const fetchStudents = useCallback(() => {
    if (!sourceBatch) return;
    setLoadingStudents(true);
    const token = localStorage.getItem("authToken");
    axios
      .get(listStudentsRoute, {
        params: { batch_id: sourceBatch },
        headers: { Authorization: `Token ${token}` },
      })
      .then((res) => {
        setStudents(res.data);
        const init = {};
        res.data.forEach((st) => {
          init[st.id] = {
            new_batch_id: st.current_batch_id,
            new_batch_year: st.current_batch_year,
          };
        });
        setChanges(init);
      })
      .catch(() => setError("Failed to load students."))
      .finally(() => setLoadingStudents(false));
  }, [sourceBatch]);

  const handleBatchSelect = (studentId, newBatchId) => {
    setChanges((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], new_batch_id: newBatchId },
    }));
  };

  const handleYearChange = (studentId, newYear) => {
    setChanges((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], new_batch_year: newYear },
    }));
  };

  const toConfirm = students.filter((st) => {
    const change = changes[st.id];
    return (
      change.new_batch_id.toString() !== st.current_batch_id.toString() ||
      change.new_batch_year.toString() !== st.current_batch_year.toString()
    );
  });

  const submitChanges = () => setModalOpen(true);

  const confirmApply = () => {
    const payload = toConfirm.map((st) => ({
      student_id: st.id,
      new_batch_id: changes[st.id].new_batch_id,
      new_batch_year: changes[st.id].new_batch_year,
    }));
    const token = localStorage.getItem("authToken");
    axios
      .post(applyBatchRoute, payload, {
        headers: { Authorization: `Token ${token}` },
      })
      .then(() => {
        setModalOpen(false);
        fetchStudents();
      })
      .catch(() => setError("Failed to apply batch changes."));
  };

  return (
      <Card>
        <Select
          label="Select Source Batch"
          placeholder="Choose batch"
          data={batches.map((b) => ({ value: String(b.id), label: b.label }))}
          value={sourceBatch}
          onChange={setSourceBatch}
          searchable
          clearable
          disabled={loadingBatches}
          mb={"md"}
        />

        <Button
          onClick={fetchStudents}
          disabled={!sourceBatch || loadingStudents}
          mb="md"
        >
          Fetch Students
        </Button>

        {loadingStudents && (
          <Center mb="md">
            <Loader />
          </Center>
        )}

        {error && (
          <Alert color="red" mb="md">
            {error}
          </Alert>
        )}

        {students.length > 0 && !loadingStudents && (
          <>
            <Table striped highlightOnHover withTableBorder>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Current Batch</th>
                  <th>New Batch</th>
                  <th>New Year</th>
                </tr>
              </thead>
              <tbody>
                {students.map((st) => (
                  <tr key={st.id}>
                    <td>{st.username}</td>
                    <td>{st.current_batch}</td>
                    <td>
                      <select
                        value={changes[st.id]?.new_batch_id || ""}
                        onChange={(e) =>
                          handleBatchSelect(st.id, e.target.value)
                        }
                      >
                        <option value="">-- Select --</option>
                        {batches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <TextInput
                        value={changes[st.id]?.new_batch_year || ""}
                        onChange={(e) =>
                          handleYearChange(st.id, e.currentTarget.value)
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>

            <Group position="right" mt="md">
              <Button onClick={submitChanges} disabled={toConfirm.length === 0}>
                Submit Changes
              </Button>
            </Group>
          </>
        )}

        <Modal
          opened={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Confirm Batch Change"
        >
          <Text mb="sm">You are changing the batch for these students:</Text>
          <Table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Old Batch</th>
                <th>New Batch / Year</th>
              </tr>
            </thead>
            <tbody>
              {toConfirm.map((st) => {
                const change = changes[st.id];
                const newBObj = batches.find(
                  (b) => String(b.id) === String(change.new_batch_id)
                );
                const newLabel = newBObj
                  ? `${newBObj.label} / ${change.new_batch_year}`
                  : "-";
                return (
                  <tr key={st.id}>
                    <td>{st.username}</td>
                    <td>{st.current_batch}</td>
                    <td>{newLabel}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          <Group position="right" mt="md">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button color="red" onClick={confirmApply}>
              Confirm
            </Button>
          </Group>
        </Modal>
      </Card>
  );
}
