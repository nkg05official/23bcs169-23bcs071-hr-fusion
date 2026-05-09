import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Title, Select, Group, Button,
  Table, Text, Loader, Alert,
  Card, Stack, Checkbox, Badge, Tabs, Modal, ActionIcon
} from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { IconTrash } from '@tabler/icons-react';
import axios from 'axios';

import {
  adminListAddRequestsRoute,
  approveAddRequestsRoute,
  deleteAddRequestsRoute,
} from '../../routes/academicRoutes';

const SEMESTER_CHOICES = [
  { value: 'Odd Semester', label: 'Odd Semester' },
  { value: 'Even Semester', label: 'Even Semester' },
  { value: 'Summer Semester', label: 'Summer Semester' },
];

const generateAcademicYears = () => {
  const currentYear = new Date().getFullYear();
  const yearsToShow = 5; 
  return Array.from({ length: yearsToShow }, (_, i) => {
    const year = currentYear - i;
    const value = `${year}-${(year + 1).toString().slice(-2)}`;
    return { value, label: value };
  });
};

export default function AdminAddDashboard() {
  const [year, setYear] = useState('');
  const [semester, setSemester] = useState('');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [processing, setProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteModal, setDeleteModal] = useState({ open: false, ids: [] });
  const [deleting, setDeleting] = useState(false);

  const academicYears = useMemo(() => generateAcademicYears(), []);

  const fetchRequests = useCallback(async () => {
    if (!year || !semester) return;

    const token = localStorage.getItem('authToken');
    if (!token) {
      setError('Authentication required');
      return;
    }

    setLoading(true);
    setError(null);
    setSelectedIds(new Set());

    try {
      const { data } = await axios.get(adminListAddRequestsRoute, {
        params: { academic_year: year, semester_type: semester },
        headers: { Authorization: `Token ${token}` },
      });
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || err.message;
      setError(errorMsg || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [year, semester]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const toggleSelection = useCallback((id) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return newSet;
    });
  }, []);

  const pendingRequests = useMemo(
    () => requests.filter(r => r.status === 'Pending'),
    [requests]
  );

  const processedRequests = useMemo(
    () => requests.filter(r => r.status !== 'Pending'),
    [requests]
  );

  const filteredProcessedRequests = useMemo(
    () => statusFilter ? processedRequests.filter(r => r.status === statusFilter) : processedRequests,
    [processedRequests, statusFilter]
  );

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === pendingRequests.length && pendingRequests.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingRequests.map(r => r.id)));
    }
  }, [selectedIds.size, pendingRequests]);

  const handleAction = useCallback(async (action) => {
    if (selectedIds.size === 0) {
      showNotification({
        title: 'No Selection',
        message: `Please select at least one request to ${action}.`,
        color: 'yellow',
      });
      return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
      showNotification({
        title: 'Authentication Error',
        message: 'Please login again',
        color: 'red'
      });
      return;
    }

    setProcessing(true);
    try {
      const response = await axios.post(
        approveAddRequestsRoute,
        {
          request_ids: Array.from(selectedIds),
          action
        },
        { headers: { Authorization: `Token ${token}` } }
      );

      const summary = response.data?.summary;
      const results = response.data?.results || [];
      
      // Check for errors in results
      const errors = results.filter(r => r.status === 'error' || r.status === 'already_processed');
      
      if (summary && summary.success > 0) {
        showNotification({
          title: 'Success',
          message: `Processed ${summary.success} request(s) successfully${errors.length > 0 ? `. ${errors.length} failed.` : ''}`,
          color: 'green'
        });
      } else if (errors.length > 0) {
        const errorMessages = errors.map(e => `ID ${e.id}: ${e.detail || e.current_status || e.status}`).join(', ');
        showNotification({
          title: 'Processing Failed',
          message: errorMessages.length > 100 ? 'Some requests failed. Check console for details.' : errorMessages,
          color: 'red',
          autoClose: 8000
        });
      } else {
        showNotification({
          title: 'Warning',
          message: 'No requests were processed successfully',
          color: 'yellow'
        });
      }

      setSelectedIds(new Set());
      await fetchRequests();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message;
      showNotification({
        title: `${action === 'approve' ? 'Approval' : 'Rejection'} Error`,
        message: errorMsg || `Failed to ${action} requests`,
        color: 'red',
      });
    } finally {
      setProcessing(false);
    }
  }, [selectedIds, fetchRequests]);

  const handleApprove = useCallback(() => handleAction('approve'), [handleAction]);
  const handleReject = useCallback(() => handleAction('reject'), [handleAction]);

  const openDeleteModal = useCallback((ids) => {
    setDeleteModal({ open: true, ids: Array.isArray(ids) ? ids : [ids] });
  }, []);

  const closeDeleteModal = useCallback(() => {
    setDeleteModal({ open: false, ids: [] });
  }, []);

  const handleDelete = useCallback(async () => {
    const { ids } = deleteModal;
    if (ids.length === 0) return;

    const token = localStorage.getItem('authToken');
    if (!token) {
      showNotification({
        title: 'Authentication Error',
        message: 'Please login again',
        color: 'red'
      });
      return;
    }

    setDeleting(true);
    try {
      const response = await axios.post(
        deleteAddRequestsRoute,
        { request_ids: ids },
        { headers: { Authorization: `Token ${token}` } }
      );

      showNotification({
        title: 'Success',
        message: `Deleted ${response.data.deleted} request(s)`,
        color: 'green'
      });

      setSelectedIds(prev => {
        const newSet = new Set(prev);
        ids.forEach(id => newSet.delete(id));
        return newSet;
      });
      
      closeDeleteModal();
      await fetchRequests();
    } catch (err) {
      showNotification({
        title: 'Delete Failed',
        message: err.response?.data?.error || err.message,
        color: 'red',
      });
    } finally {
      setDeleting(false);
    }
  }, [deleteModal, fetchRequests, closeDeleteModal]);

  const handleBulkDelete = useCallback(() => {
    if (selectedIds.size === 0) {
      showNotification({
        title: 'No Selection',
        message: 'Please select at least one request to delete',
        color: 'yellow',
      });
      return;
    }
    openDeleteModal(Array.from(selectedIds));
  }, [selectedIds, openDeleteModal]);

  const exportToExcel = useCallback((data, filename) => {
    if (data.length === 0) {
      showNotification({
        title: 'No Data',
        message: 'No data available to export',
        color: 'yellow',
      });
      return;
    }

    const headers = ['Student ID', 'Student Name', 'Slot', 'Course Code', 'Course Name', 'Status', 'Requested At', 'Processed At'];
    const csvRows = [headers.join(',')];

    data.forEach(r => {
      const row = [
        r.student || '',
        r.student_name || '',
        r.slot || '',
        r.course || '',
        r.course_name || '',
        r.status || '',
        r.created_at ? new Date(r.created_at).toLocaleString() : '',
        r.processed_at ? new Date(r.processed_at).toLocaleString() : ''
      ];
      csvRows.push(row.map(val => `"${val}"`).join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${year}_${semester}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showNotification({
      title: 'Success',
      message: 'Data exported successfully',
      color: 'green',
    });
  }, [year, semester]);

  return (
    <>
      <Card>
        <Stack spacing="md">
          <Group grow align="flex-start">
            <Select
              label="Academic Year"
              placeholder="e.g. 2025-26"
              data={academicYears}
              value={year}
              onChange={setYear}
              searchable
            />
            <Select
              label="Semester Type"
              placeholder="Select semester"
              data={SEMESTER_CHOICES}
              value={semester}
              onChange={setSemester}
            />
          </Group>

          <Group position="left" spacing="xs">
            <Button
              size="sm"
              onClick={fetchRequests}
              loading={loading}
              disabled={!year || !semester}
            >
              Refresh
            </Button>
            <Button
              size="sm"
              color="green"
              onClick={handleApprove}
              loading={processing}
              disabled={selectedIds.size === 0}
            >
              Approve ({selectedIds.size})
            </Button>
            <Button
              size="sm"
              color="red"
              onClick={handleReject}
              loading={processing}
              disabled={selectedIds.size === 0}
            >
              Reject ({selectedIds.size})
            </Button>
          </Group>
        </Stack>
      </Card>

      {loading ? (
        <Card mt="md">
          <Loader size="lg" />
        </Card>
      ) : error ? (
        <Alert title="Error" color="red" mt="md">{error}</Alert>
      ) : (!year || !semester) ? (
        <Alert color="gray" mt="md">
          Select academic year and semester to view add course requests.
        </Alert>
      ) : (
        <Tabs defaultValue="pending" mt="md">
          <Tabs.List>
            <Tabs.Tab value="pending">
              Pending Requests ({pendingRequests.length})
            </Tabs.Tab>
            <Tabs.Tab value="processed">
              Processed Requests ({processedRequests.length})
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="pending" pt="md">
            {pendingRequests.length > 0 ? (
              <Card>
                <Group position="apart" mb="md">
                  <Title order={4}>Pending Requests</Title>
                  <Group spacing="xs">
                    <Button
                      size="sm"
                      color="red"
                      variant="outline"
                      onClick={handleBulkDelete}
                      disabled={selectedIds.size === 0}
                    >
                      Delete ({selectedIds.size})
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => exportToExcel(pendingRequests, 'pending_add_requests')}
                    >
                      Export to Excel
                    </Button>
                  </Group>
                </Group>
                <Table highlightOnHover withTableBorder>
                  <thead>
                    <tr>
                      <th style={{ width: 50 }}>
                        <Checkbox
                          checked={selectedIds.size === pendingRequests.length && pendingRequests.length > 0}
                          onChange={toggleSelectAll}
                          indeterminate={selectedIds.size > 0 && selectedIds.size < pendingRequests.length}
                        />
                      </th>
                      <th>Student</th>
                      <th>Slot</th>
                      <th>Course</th>
                      <th>Status</th>
                      <th>Requested At</th>
                      <th style={{ width: 80 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingRequests.map(r => (
                      <tr key={r.id}>
                        <td>
                          <Checkbox
                            checked={selectedIds.has(r.id)}
                            onChange={() => toggleSelection(r.id)}
                          />
                        </td>
                        <td>
                          <Text size="sm">{r.student}</Text>
                          {r.student_name && (
                            <Text size="xs" color="dimmed">{r.student_name}</Text>
                          )}
                        </td>
                        <td>{r.slot}</td>
                        <td>
                          <Text size="sm">{r.course}</Text>
                          {r.course_name && (
                            <Text size="xs" color="dimmed">{r.course_name}</Text>
                          )}
                        </td>
                        <td>
                          <Badge color="yellow">{r.status}</Badge>
                        </td>
                        <td>{new Date(r.created_at).toLocaleString()}</td>
                        <td>
                          <ActionIcon
                            color="red"
                            variant="subtle"
                            onClick={() => openDeleteModal(r.id)}
                            title="Delete request"
                          >
                            <IconTrash size={18} />
                          </ActionIcon>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card>
            ) : (
              <Alert color="gray">
                No pending requests found for the selected period.
              </Alert>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="processed" pt="md">
            {processedRequests.length > 0 ? (
              <Card>
                <Group position="apart" mb="md">
                  <Title order={4}>Processed Requests</Title>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportToExcel(filteredProcessedRequests, 'processed_add_requests')}
                  >
                    Export to Excel
                  </Button>
                </Group>
                <Table highlightOnHover withTableBorder>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Slot</th>
                      <th>Course</th>
                      <th>
                        <Group spacing="xs" position="apart">
                          <span>Status</span>
                          <Select
                            placeholder="All"
                            value={statusFilter}
                            onChange={setStatusFilter}
                            data={[
                              { value: '', label: 'All' },
                              { value: 'Approved', label: 'Approved' },
                              { value: 'Rejected', label: 'Rejected' },
                            ]}
                            size="xs"
                            style={{ width: 100 }}
                            clearable
                          />
                        </Group>
                      </th>
                      <th>Requested At</th>
                      <th>Processed At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProcessedRequests.map(r => (
                      <tr key={r.id}>
                        <td>
                          <Text size="sm">{r.student}</Text>
                          {r.student_name && (
                            <Text size="xs" color="dimmed">{r.student_name}</Text>
                          )}
                        </td>
                        <td>{r.slot}</td>
                        <td>
                          <Text size="sm">{r.course}</Text>
                          {r.course_name && (
                            <Text size="xs" color="dimmed">{r.course_name}</Text>
                          )}
                        </td>
                        <td>
                          <Badge color={r.status === 'Approved' ? 'green' : 'red'}>
                            {r.status}
                          </Badge>
                        </td>
                        <td>{new Date(r.created_at).toLocaleString()}</td>
                        <td>
                          {r.processed_at
                            ? new Date(r.processed_at).toLocaleString()
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card>
            ) : (
              <Alert color="gray">
                No processed requests found for the selected period.
              </Alert>
            )}
          </Tabs.Panel>
        </Tabs>
      )}

      <Modal
        opened={deleteModal.open}
        onClose={closeDeleteModal}
        title="Confirm Deletion"
        centered
        closeOnClickOutside={!deleting}
        closeOnEscape={!deleting}
      >
        <Text size="sm" mb="md" weight={500}>
          Are you sure you want to permanently delete {deleteModal.ids.length} course add request{deleteModal.ids.length > 1 ? 's' : ''}?
        </Text>
        <Text size="sm" color="dimmed" mb="md">
          This action cannot be undone.
        </Text>
        <Group position="right" spacing="sm">
          <Button variant="outline" onClick={closeDeleteModal} disabled={deleting}>
            Cancel
          </Button>
          <Button color="red" onClick={handleDelete} loading={deleting}>
            Delete
          </Button>
        </Group>
      </Modal>
    </>
  );
}
