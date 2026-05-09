import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, Title, Tabs, Table, Textarea, Button } from '@mantine/core';
import * as URLS from "../../routes/academicRoutes";

export function Faculty_TA_Dashboard() {
  const [assignments, setAssignments] = useState([]);
  const [pending,     setPending]     = useState([]);
  const [approved,    setApproved]    = useState([]);
  const [remarks,     setRemarks]     = useState({});

  useEffect(() => loadAll(), []);

  function loadAll() {
    const token = localStorage.getItem('authToken');
    axios.get(URLS.FAC_ASSIGNMENTS_URL, { headers: { Authorization: `Token ${token}` } })
      .then(r => setAssignments(r.data.assignments));
    axios.get(URLS.FAC_PENDING_URL, { headers: { Authorization: `Token ${token}` } })
      .then(r => setPending(r.data.stipends));
    axios.get(URLS.FAC_APPROVED_URL, { headers: { Authorization: `Token ${token}` } })
      .then(r => setApproved(r.data.stipends));
  }

  async function handleApprove(id) {
    const token = localStorage.getItem('authToken');
    await axios.post(URLS.FAC_APPROVE_URL(id), {
      role: 'faculty',
      remark: remarks[id] || '',
    }, { headers: { Authorization: `Token ${token}` } });
    loadAll();
  }

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Title order={2}>Faculty Dashboard</Title>

      <Tabs defaultValue="assignments" mt="md">
        <Tabs.List>
          <Tabs.Tab value="assignments">Assignments</Tabs.Tab>
          <Tabs.Tab value="pending">Pending</Tabs.Tab>
          <Tabs.Tab value="approved">Approved</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="assignments" pt="xs">
          <Table>
            <thead>
              <tr><th>TA</th><th>Period</th></tr>
            </thead>
            <tbody>
              {assignments.map(a => (
                <tr key={a.id}>
                  <td>{a.ta_username}</td>
                  <td>
                    {a.start_month}/{a.start_year} - {a.end_month}/{a.end_year}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Tabs.Panel>

        <Tabs.Panel value="pending" pt="xs">
          <Table striped>
            <thead>
              <tr><th>TA</th><th>MM/YYYY</th><th>Remark</th><th>Action</th></tr>
            </thead>
            <tbody>
              {pending.map(s => (
                <tr key={s.id}>
                  <td>{s.ta}</td>
                  <td>{s.month}/{s.year}</td>
                  <td>
                    <Textarea
                      minRows={1}
                      value={remarks[s.id] || ''}
                      onChange={e => setRemarks({ ...remarks, [s.id]: e.target.value })}
                    />
                  </td>
                  <td>
                    <Button size="xs" onClick={() => handleApprove(s.id)}>Approve</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Tabs.Panel>

        <Tabs.Panel value="approved" pt="xs">
          <Table striped>
            <thead>
              <tr><th>TA</th><th>MM/YYYY</th></tr>
            </thead>
            <tbody>
              {approved.map(s => (
                <tr key={s.id}>
                  <td>{s.ta}</td>
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
