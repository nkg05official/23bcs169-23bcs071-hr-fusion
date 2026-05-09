import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Title, Select, Group, Button,
  Table, Text, Loader, Alert,
  Card, Box, Stack, Tabs, Badge, Modal, Checkbox, ActionIcon
} from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { IconFileDownload, IconTrash, IconArrowBackUp } from '@tabler/icons-react';
import axios from 'axios';
import * as XLSX from 'xlsx';

import {
  adminListRequestsRoute,
  allotReplacementCoursesRoute,
  revertReplacementRequestsRoute,
  deleteReplacementRequestsRoute,
} from '../../routes/academicRoutes';

const SEMESTER_CHOICES = [
  { value: 'Odd Semester', label: 'Odd Semester' },
  { value: 'Even Semester', label: 'Even Semester' },
  { value: 'Summer Semester', label: 'Summer Semester' },
];

const generateAcademicYears = () => {
  const currentYear = new Date().getFullYear();
  const years = [];

  years.push(`${currentYear}-${String(currentYear + 1).slice(-2)}`);
  years.push(`${currentYear - 1}-${String(currentYear).slice(-2)}`);

  for (let i = 2; i <= 6; i++) {
    const startYear = currentYear - i;
    const endYear = startYear + 1;
    years.push(`${startYear}-${String(endYear).slice(-2)}`);
  }
  
  return years;
};

export default function AdminReplacementDashboard() {
  const [year, setYear] = useState('');
  const [semester, setSemester] = useState('');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [allocating, setAllocating] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedPendingIds, setSelectedPendingIds] = useState(new Set());
  const [selectedProcessedIds, setSelectedProcessedIds] = useState(new Set());
  const [deleteModal, setDeleteModal] = useState({ open: false, ids: [] });
  const [deleting, setDeleting] = useState(false);
  const [revertModal, setRevertModal] = useState({ open: false, ids: [] });
  const [reverting, setReverting] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const academicYears = generateAcademicYears();

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

  const rejectedRequests = useMemo(
    () => filteredProcessedRequests.filter(r => r.status === 'Rejected'),
    [filteredProcessedRequests]
  );

  const fetchRequests = useCallback(() => {
    if (!year || !semester) return;

    const token = localStorage.getItem('authToken');
    if (!token) {
      setError('No auth token found');
      return;
    }

    setLoading(true);
    setError(null);
    setSelectedPendingIds(new Set());
    setSelectedProcessedIds(new Set());

    axios.get(adminListRequestsRoute, {
      params: { academic_year: year, semester_type: semester },
      headers: { Authorization: `Token ${token}` },
    })
    .then(({ data }) => setRequests(Array.isArray(data) ? data : []))
    .catch(err => setError(err.response?.data?.detail || err.message))
    .finally(() => setLoading(false));
  }, [year, semester]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleAllocate = () => {
    if (!year || !semester) {
      showNotification({
        title: 'Missing filters',
        message: 'Please select both year and semester.',
        color: 'yellow',
      });
      return;
    }

    if (pendingRequests.length === 0) {
      showNotification({
        title: 'No Pending Requests',
        message: 'There are no pending requests to allocate.',
        color: 'yellow',
      });
      return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
      showNotification({ title: 'Auth Error', message: 'No token found', color: 'red' });
      return;
    }

    setAllocating(true);
    axios.post(allotReplacementCoursesRoute,
      { academic_year: year, semester_type: semester },
      { headers: { Authorization: `Token ${token}` } }
    )
    .then(() => {
      showNotification({
        title: 'Allocation Complete',
        message: 'All pending requests processed.',
        color: 'green'
      });
      fetchRequests(); // Refresh after allocation
    })
    .catch(err => {
      showNotification({
        title: 'Allocation Error',
        message: err.response?.data?.detail || err.message,
        color: 'red',
      });
    })
    .finally(() => setAllocating(false));
  };

  const togglePendingSelection = useCallback((id) => {
    setSelectedPendingIds(prev => {
      const newSet = new Set(prev);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return newSet;
    });
  }, []);

  const toggleProcessedSelection = useCallback((id) => {
    setSelectedProcessedIds(prev => {
      const newSet = new Set(prev);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return newSet;
    });
  }, []);

  const toggleSelectAllPending = useCallback(() => {
    if (selectedPendingIds.size === pendingRequests.length && pendingRequests.length > 0) {
      setSelectedPendingIds(new Set());
    } else {
      setSelectedPendingIds(new Set(pendingRequests.map(r => r.id)));
    }
  }, [selectedPendingIds.size, pendingRequests]);

  const toggleSelectAllRejected = useCallback(() => {
    if (selectedProcessedIds.size === rejectedRequests.length && rejectedRequests.length > 0) {
      setSelectedProcessedIds(new Set());
    } else {
      setSelectedProcessedIds(new Set(rejectedRequests.map(r => r.id)));
    }
  }, [selectedProcessedIds.size, rejectedRequests]);

  const openDeleteModal = useCallback((ids) => {
    setDeleteModal({ open: true, ids: Array.isArray(ids) ? ids : [ids] });
  }, []);

  const closeDeleteModal = useCallback(() => {
    setDeleteModal({ open: false, ids: [] });
  }, []);

  const openRevertModal = useCallback((ids) => {
    setRevertModal({ open: true, ids: Array.isArray(ids) ? ids : [ids] });
  }, []);

  const closeRevertModal = useCallback(() => {
    setRevertModal({ open: false, ids: [] });
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
        deleteReplacementRequestsRoute,
        { request_ids: ids },
        { headers: { Authorization: `Token ${token}` } }
      );

      showNotification({
        title: 'Success',
        message: `Deleted ${response.data.deleted} request(s)`,
        color: 'green'
      });

      setSelectedPendingIds(prev => {
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
    if (selectedPendingIds.size === 0) {
      showNotification({
        title: 'No Selection',
        message: 'Please select at least one request to delete',
        color: 'yellow',
      });
      return;
    }
    openDeleteModal(Array.from(selectedPendingIds));
  }, [selectedPendingIds, openDeleteModal]);

  const handleRevertToPending = useCallback(async () => {
    const idArray = revertModal.ids;
    const token = localStorage.getItem('authToken');
    if (!token) {
      showNotification({
        title: 'Authentication Error',
        message: 'Please login again',
        color: 'red'
      });
      return;
    }

    setReverting(true);
    try {
      const response = await axios.post(
        revertReplacementRequestsRoute,
        { request_ids: idArray },
        { headers: { Authorization: `Token ${token}` } }
      );

      showNotification({
        title: 'Success',
        message: `Reverted ${response.data.reverted} request(s) to Pending`,
        color: 'green'
      });

      setSelectedProcessedIds(prev => {
        const newSet = new Set(prev);
        idArray.forEach(id => newSet.delete(id));
        return newSet;
      });
      
      closeRevertModal();
      await fetchRequests();
    } catch (err) {
      showNotification({
        title: 'Revert Failed',
        message: err.response?.data?.error || err.message,
        color: 'red',
      });
    } finally {
      setReverting(false);
    }
  }, [revertModal.ids, fetchRequests, closeRevertModal]);

  const handleBulkRevert = useCallback(() => {
    if (selectedProcessedIds.size === 0) {
      showNotification({
        title: 'No Selection',
        message: 'Please select at least one rejected request to revert',
        color: 'yellow',
      });
      return;
    }
    openRevertModal(Array.from(selectedProcessedIds));
  }, [selectedProcessedIds, openRevertModal]);

  const handleExportToExcel = useCallback((data, type) => {
    if (data.length === 0) {
      showNotification({
        title: 'No Data',
        message: 'No data to export',
        color: 'yellow',
      });
      return;
    }

    const exportData = data.map((r, index) => ({
      'S. No.': index + 1,
      'Student': r.student,
      'Student Name': r.student_name || '',
      'Slot': r.slot,
      'Old Course': r.old_course,
      'Old Course Name': r.old_course_name || '',
      'New Course': r.new_course,
      'New Course Name': r.new_course_name || '',
      'Status': r.status,
      'Requested At': new Date(r.created_at).toLocaleString(),
      'Processed At': r.processed_at ? new Date(r.processed_at).toLocaleString() : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Replacements');
    
    const fileName = `Replacement_${type}_${year}_${semester.replace(/\s+/g, '_')}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    showNotification({
      title: 'Export Successful',
      message: `Data exported to ${fileName}`,
      color: 'green',
    });
  }, [year, semester]);

  const renderPendingTable = (data) => (
    <Table highlightOnHover withTableBorder>
      <thead>
        <tr>
          <th style={{ width: 50 }}>
            <Checkbox
              checked={selectedPendingIds.size === data.length && data.length > 0}
              onChange={toggleSelectAllPending}
              indeterminate={selectedPendingIds.size > 0 && selectedPendingIds.size < data.length}
            />
          </th>
          <th>S. No.</th>
          <th>Student</th>
          <th>Slot</th>
          <th>Old</th>
          <th>New</th>
          <th>Status</th>
          <th>Requested At</th>
          <th style={{ width: 80 }}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {data.map((r, index) => (
          <tr key={r.id}>
            <td>
              <Checkbox
                checked={selectedPendingIds.has(r.id)}
                onChange={() => togglePendingSelection(r.id)}
              />
            </td>
            <td>{index + 1}</td>
            <td>
              <Text size="sm" weight={500}>{r.student}</Text>
              <Text size="xs" color="dimmed">{r.student_name}</Text>
            </td>
            <td>{r.slot}</td>
            <td>
              <Text size="sm" weight={500}>{r.old_course}</Text>
              <Text size="xs" color="dimmed">{r.old_course_name}</Text>
            </td>
            <td>
              <Text size="sm" weight={500}>{r.new_course}</Text>
              <Text size="xs" color="dimmed">{r.new_course_name}</Text>
            </td>
            <td>
              <Badge color="yellow" variant="filled">{r.status}</Badge>
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
  );

  const renderProcessedTable = (data, showFilter = false) => (
    <Table highlightOnHover withTableBorder>
      <thead>
        <tr>
          {statusFilter === 'Rejected' && (
            <th style={{ width: 50 }}>
              <Checkbox
                checked={selectedProcessedIds.size === rejectedRequests.length && rejectedRequests.length > 0}
                onChange={toggleSelectAllRejected}
                indeterminate={selectedProcessedIds.size > 0 && selectedProcessedIds.size < rejectedRequests.length}
              />
            </th>
          )}
          <th>S. No.</th>
          <th>Student</th>
          <th>Slot</th>
          <th>Old</th>
          <th>New</th>
          <th>
            <Group spacing="xs" position="apart">
              <span>Status</span>
              {showFilter && (
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
              )}
            </Group>
          </th>
          <th>Requested At</th>
          {data.some(r => r.processed_at) && <th>Processed At</th>}
          {statusFilter === 'Rejected' && <th style={{ width: 80 }}>Actions</th>}
        </tr>
      </thead>
      <tbody>
        {data.map((r, index) => (
          <tr key={r.id}>
            {statusFilter === 'Rejected' && (
              <td>
                <Checkbox
                  checked={selectedProcessedIds.has(r.id)}
                  onChange={() => toggleProcessedSelection(r.id)}
                />
              </td>
            )}
            <td>{index + 1}</td>
            <td>
              <Text size="sm" weight={500}>{r.student}</Text>
              <Text size="xs" color="dimmed">{r.student_name}</Text>
            </td>
            <td>{r.slot}</td>
            <td>
              <Text size="sm" weight={500}>{r.old_course}</Text>
              <Text size="xs" color="dimmed">{r.old_course_name}</Text>
            </td>
            <td>
              <Text size="sm" weight={500}>{r.new_course}</Text>
              <Text size="xs" color="dimmed">{r.new_course_name}</Text>
            </td>
            <td>
              <Badge
                color={r.status === 'Approved' ? 'green' : r.status === 'Rejected' ? 'red' : 'yellow'}
                variant="filled"
              >
                {r.status}
              </Badge>
            </td>
            <td>{new Date(r.created_at).toLocaleString()}</td>
            {data.some(req => req.processed_at) && (
              <td>{r.processed_at ? new Date(r.processed_at).toLocaleString() : '-'}</td>
            )}
            {statusFilter === 'Rejected' && (
              <td>
                <ActionIcon
                  color="blue"
                  variant="subtle"
                  onClick={() => openRevertModal(r.id)}
                  title="Revert to Pending"
                  loading={reverting}
                >
                  <IconArrowBackUp size={18} />
                </ActionIcon>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </Table>
  );

  return (
    <>
      <Card>
        <Stack spacing="md">
          <Group grow align="flex-start">
            <Select
              label="Academic Year"
              placeholder="e.g. 2025-26"
              data={academicYears.map(y => ({ value: y, label: y }))}
              value={year}
              onChange={setYear}
            />
            <Select
              label="Semester Type"
              placeholder="Select one"
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
              onClick={handleAllocate} 
              loading={allocating}
              disabled={!year || !semester || pendingRequests.length === 0}
            >
              Start Allotment
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
          Select academic year and semester to view replacement requests.
        </Alert>
      ) : (
        <Tabs value={activeTab} onChange={setActiveTab} mt="md">
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
                      disabled={selectedPendingIds.size === 0}
                    >
                      Delete ({selectedPendingIds.size})
                    </Button>
                    <Button
                      size="sm"
                      color="blue"
                      onClick={() => handleExportToExcel(pendingRequests, 'Pending')}
                      leftSection={<IconFileDownload size={16} />}
                    >
                      Export to Excel
                    </Button>
                  </Group>
                </Group>
                {renderPendingTable(pendingRequests)}
              </Card>
            ) : (
              <Alert color="blue">No pending replacement requests.</Alert>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="processed" pt="md">
            {processedRequests.length > 0 ? (
              <Card>
                <Group position="apart" mb="md">
                  <Title order={4}>Processed Requests</Title>
                  <Group spacing="xs">
                    {statusFilter === 'Rejected' && (
                      <Button
                        size="sm"
                        color="blue"
                        variant="outline"
                        onClick={handleBulkRevert}
                        disabled={selectedProcessedIds.size === 0}
                        leftSection={<IconArrowBackUp size={16} />}
                        loading={reverting}
                      >
                        Revert to Pending ({selectedProcessedIds.size})
                      </Button>
                    )}
                    <Button
                      size="sm"
                      color="blue"
                      onClick={() => handleExportToExcel(filteredProcessedRequests, 'Processed')}
                      leftSection={<IconFileDownload size={16} />}
                    >
                      Export to Excel
                    </Button>
                  </Group>
                </Group>
                {renderProcessedTable(filteredProcessedRequests, true)}
              </Card>
            ) : (
              <Alert color="blue">No processed replacement requests.</Alert>
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
          Are you sure you want to permanently delete {deleteModal.ids.length} replacement request{deleteModal.ids.length > 1 ? 's' : ''}?
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

      <Modal
        opened={revertModal.open}
        onClose={closeRevertModal}
        title="Confirm Revert to Pending"
        centered
        closeOnClickOutside={!reverting}
        closeOnEscape={!reverting}
      >
        <Text size="sm" mb="md" weight={500}>
          Are you sure you want to revert {revertModal.ids.length} rejected request{revertModal.ids.length > 1 ? 's' : ''} back to Pending status?
        </Text>
        <Text size="sm" color="dimmed" mb="md">
          The request{revertModal.ids.length > 1 ? 's' : ''} will be moved back to the Pending Requests tab.
        </Text>
        <Group position="right" spacing="sm">
          <Button variant="outline" onClick={closeRevertModal} disabled={reverting}>
            Cancel
          </Button>
          <Button color="blue" onClick={handleRevertToPending} loading={reverting}>
            Revert to Pending
          </Button>
        </Group>
      </Modal>
    </>
  );
}
