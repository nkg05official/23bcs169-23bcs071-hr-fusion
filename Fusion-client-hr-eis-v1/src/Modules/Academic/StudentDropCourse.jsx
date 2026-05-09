import React, { useEffect, useState, useCallback } from 'react';
import {
  Card, Title, Table, Button, Group,
  Modal, Text, Loader, Alert
} from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import axios from 'axios';

import {
  studentDropRegistrationsRoute,
  studentDropCourseRoute,
} from '../../routes/academicRoutes';

export default function StudentDropCourse() {
  const [regs, setRegs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [dropping, setDropping] = useState(false);

  // Fetch current registrations
  const fetchRegistrations = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setError('Authentication required');
      setLoading(false);
      return;
    }

    try {
      const { data } = await axios.get(studentDropRegistrationsRoute, {
        headers: { Authorization: `Token ${token}` }
      });
      setRegs(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message;
      setError(errorMsg || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  const openModal = useCallback((reg) => setSelected(reg), []);
  const closeModal = useCallback(() => setSelected(null), []);

  const handleDrop = useCallback(async () => {
    if (!selected) return;

    const token = localStorage.getItem('authToken');
    if (!token) {
      showNotification({
        title: 'Authentication Error',
        message: 'Please login again',
        color: 'red'
      });
      return;
    }

    setDropping(true);
    try {
      const response = await axios.post(
        studentDropCourseRoute,
        { registration_id: selected.id },
        { headers: { Authorization: `Token ${token}` } }
      );

      showNotification({
        title: 'Drop Request Submitted',
        message: response.data.message || 'Your drop request is pending Academic approval.',
        color: 'blue'
      });

      // Remove from list optimistically
      setRegs(prev => prev.filter(r => r.id !== selected.id));
      closeModal();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message;
      showNotification({
        title: 'Drop Request Failed',
        message: errorMsg || 'Failed to submit drop request',
        color: 'red'
      });
    } finally {
      setDropping(false);
    }
  }, [selected, closeModal]);

  if (loading) return <Loader size="lg" />;
  if (error) return <Alert color="red" title="Error">{error}</Alert>;
  if (!regs.length) {
    return (
      <Card withBorder p="md">
        <Alert color="gray">No courses available to drop.</Alert>
      </Card>
    );
  }

  return (
    <Card withBorder p="md">
      <Title order={3} mb="md">Drop Registered Course</Title>
      <Table highlightOnHover withTableBorder>
        <thead>
          <tr>
            <th>Slot</th>
            <th>Course</th>
            <th>Academic Year</th>
            <th>Semester</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {regs.map(r => (
            <tr key={r.id}>
              <td>{r.slot}</td>
              <td>
                <Text size="sm">{r.course}</Text>
                {r.course_name && (
                  <Text size="xs" color="dimmed">{r.course_name}</Text>
                )}
              </td>
              <td>{r.academic_year}</td>
              <td>{r.semester_type}</td>
              <td>
                <Button
                  color="red"
                  size="xs"
                  onClick={() => openModal(r)}
                  disabled={dropping}
                >
                  Request Drop
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal
        opened={!!selected}
        onClose={closeModal}
        title="Confirm Drop Request"
        closeOnClickOutside={!dropping}
        closeOnEscape={!dropping}
      >
        <Text mb="md">
          Submit a drop request for <strong>{selected?.course}</strong>
          {selected?.course_name && (
            <Text size="sm" color="dimmed">({selected.course_name})</Text>
          )}?
        </Text>
        <Group position="right" spacing="sm">
          <Button variant="outline" onClick={closeModal} disabled={dropping}>
            Cancel
          </Button>
          <Button color="red" onClick={handleDrop} loading={dropping}>
            Submit Request
          </Button>
        </Group>
      </Modal>
    </Card>
  );
}
