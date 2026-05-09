import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Card, Title, Select, TextInput, Button,
  FileInput, Tabs, Table, Group,
} from '@mantine/core';

import * as URLS from "../../routes/academicRoutes";
  

export function Hod_TA_Dashboard() {
  const [tas, setTAs]           = useState([]);
  const [faculties, setFacs]    = useState([]);
  const [ta, setTA]             = useState(null);
  const [faculty, setFaculty]   = useState(null);
  const [start, setStart]       = useState('');
  const [end, setEnd]           = useState('');
  const [file, setFile]         = useState(null);
  const [pending, setPending]   = useState([]);
  const [approved, setApproved] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    axios.get(URLS.TA_LIST_URL, { headers: { Authorization: `Token ${token}` } })
      .then(r => setTAs(r.data.tas.map(t => ({ value: t.user.username, label: t.user.username }))));
    axios.get(URLS.FACULTY_LIST_URL, { headers: { Authorization: `Token ${token}` } })
      .then(r => setFacs(r.data.faculties.map(f => ({ value: f.user.username, label: f.user.username }))));
    loadStipends();
  }, []);

  function loadStipends() {
    const token = localStorage.getItem('authToken');
    axios.get(URLS.HOD_PENDING_URL,   { headers: { Authorization: `Token ${token}` } })
      .then(r => setPending(r.data.stipends));
    axios.get(URLS.HOD_APPROVED_URL,  { headers: { Authorization: `Token ${token}` } })
      .then(r => setApproved(r.data.stipends));
  }

  async function handleManual() {
    const token = localStorage.getItem('authToken');
    await axios.post(URLS.HOD_ASSIGN_MANUAL_URL, {
      role: 'hod',
      ta_username: ta,
      faculty_username: faculty,
      start_year: +start.split('-')[0],
      start_month: +start.split('-')[1],
      end_year: +end.split('-')[0],
      end_month: +end.split('-')[1],
    }, { headers: { Authorization: `Token ${token}` } });
    loadStipends();
  }

  async function handleUpload() {
    if (!file) return;
    const token = localStorage.getItem('authToken');
    const fd = new FormData();
    fd.append('role', 'hod');
    fd.append('file', file);
    await axios.post(URLS.HOD_UPLOAD_EXCEL_URL, fd, {
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    loadStipends();
  }

  async function handleApprove(id) {
    const token = localStorage.getItem('authToken');
    await axios.post(URLS.HOD_APPROVE_URL(id), { role: 'hod' }, {
      headers: { Authorization: `Token ${token}` },
    });
    loadStipends();
  }

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Title order={2}>HOD Dashboard</Title>

      <Title order={4} mt="md">Manual Assignment</Title>
      <Group>
        <Select data={tas} value={ta} onChange={setTA} placeholder="Select TA" />
        <Select data={faculties} value={faculty} onChange={setFaculty} placeholder="Select Faculty" />
        <TextInput label="Start Month" type="month" value={start} onChange={e => setStart(e.target.value)} />
        <TextInput label="End Month"   type="month" value={end}   onChange={e => setEnd(e.target.value)}   />
        <Button onClick={handleManual}>Assign</Button>
      </Group>

      <Title order={4} mt="lg">Bulk Assignment via Excel</Title>
      <FileInput accept=".xlsx" value={file} onChange={setFile} placeholder="Upload .xlsx" />
      <Button mt="sm" onClick={handleUpload}>Upload Excel</Button>

      <Tabs defaultValue="pending" mt="xl">
        <Tabs.List>
          <Tabs.Tab value="pending">Pending</Tabs.Tab>
          <Tabs.Tab value="approved">Approved</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="pending" pt="xs">
          <Table striped>
            <thead>
              <tr>
                <th>TA</th><th>Faculty</th><th>MM/YYYY</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pending.map(s => (
                <tr key={s.id}>
                  <td>{s.ta}</td>
                  <td>{s.faculty}</td>
                  <td>{s.month}/{s.year}</td>
                  <td>
                    <Button size="xs" onClick={() => handleApprove(s.id)}>
                      Approve
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Tabs.Panel>

        <Tabs.Panel value="approved" pt="xs">
          <Table striped>
            <thead>
              <tr><th>TA</th><th>Faculty</th><th>MM/YYYY</th></tr>
            </thead>
            <tbody>
              {approved.map(s => (
                <tr key={s.id}>
                  <td>{s.ta}</td>
                  <td>{s.faculty}</td>
                  <td>{s.month}/{s.year}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Tabs.Panel>
      </Tabs>
    </Card>
  );
}
