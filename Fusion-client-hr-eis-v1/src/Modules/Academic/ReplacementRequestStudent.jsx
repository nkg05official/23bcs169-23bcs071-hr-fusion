import React, { useEffect, useState } from 'react';
import { Table, Badge, Text, Loader, Alert, Tabs, Title, Card } from '@mantine/core';
import axios from 'axios';

import { studentListRequestsRoute, studentDropRequestsRoute, studentAddRequestsRoute } from '../../routes/academicRoutes';

export default function ReplacementRequestStudent() {
  const [replacementRequests, setReplacementRequests] = useState([]);
  const [dropRequests, setDropRequests] = useState([]);
  const [addRequests, setAddRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setError('No auth token');
      setLoading(false);
      return;
    }

    Promise.all([
      axios.get(studentListRequestsRoute, {
        headers: { Authorization: `Token ${token}` }
      }),
      axios.get(studentDropRequestsRoute, {
        headers: { Authorization: `Token ${token}` }
      }),
      axios.get(studentAddRequestsRoute, {
        headers: { Authorization: `Token ${token}` }
      })
    ])
    .then(([replacementRes, dropRes, addRes]) => {
      setReplacementRequests(replacementRes.data);
      setDropRequests(dropRes.data);
      setAddRequests(addRes.data);
    })
    .catch(err => setError(err.response?.data?.detail || err.message))
    .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;
  if (error) return <Alert title="Error" color="red">{error}</Alert>;

  return (
    <Card>
      <Title order={3} mb="md">Your Requests</Title>
      <Tabs defaultValue="replacement">
        <Tabs.List>
          <Tabs.Tab value="replacement">Replacement Requests</Tabs.Tab>
          <Tabs.Tab value="add">Add Requests</Tabs.Tab>
          <Tabs.Tab value="drop">Drop Requests</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="replacement" pt="md">
          {!replacementRequests.length ? (
            <Alert color='gray'>You have not submitted any replacement requests.</Alert>
          ) : (
            <Table highlightOnHover withTableBorder>
              <thead>
                <tr>
                  <th>Old Course</th>
                  <th>New Course</th>
                  <th>Status</th>
                  <th>Academic Year</th>
                  <th>Semester Type</th>
                  <th>Requested At</th>
                </tr>
              </thead>
              <tbody>
                {replacementRequests.map(r => (
                  <tr key={r.id}>
                    <td>
                      <Text size="sm">{r.old_course}</Text>
                      {r.old_course_name && (
                        <Text size="xs" color="dimmed">{r.old_course_name}</Text>
                      )}
                    </td>
                    <td>
                      <Text size="sm">{r.new_course}</Text>
                      {r.new_course_name && (
                        <Text size="xs" color="dimmed">{r.new_course_name}</Text>
                      )}
                    </td>
                    <td>
                      <Badge color={
                        r.status === 'Approved' ? 'green' :
                        r.status === 'Rejected' ? 'red' : 'yellow'
                      }>
                        {r.status}
                      </Badge>
                    </td>
                    <td>{r.academic_year}</td>
                    <td>{r.semester_type}</td>
                    <td>{new Date(r.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="add" pt="md">
          {!addRequests.length ? (
            <Alert color='gray'>You have not submitted any add course requests.</Alert>
          ) : (
            <Table highlightOnHover withTableBorder>
              <thead>
                <tr>
                  <th>Slot</th>
                  <th>Course</th>
                  <th>Status</th>
                  <th>Academic Year</th>
                  <th>Semester Type</th>
                  <th>Requested At</th>
                </tr>
              </thead>
              <tbody>
                {addRequests.map(r => (
                  <tr key={r.id}>
                    <td>{r.slot}</td>
                    <td>
                      <Text size="sm">{r.course}</Text>
                      {r.course_name && (
                        <Text size="xs" color="dimmed">{r.course_name}</Text>
                      )}
                    </td>
                    <td>
                      <Badge color={
                        r.status === 'Approved' ? 'green' :
                        r.status === 'Rejected' ? 'red' : 'yellow'
                      }>
                        {r.status}
                      </Badge>
                    </td>
                    <td>{r.academic_year}</td>
                    <td>{r.semester_type}</td>
                    <td>{new Date(r.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="drop" pt="md">
          {!dropRequests.length ? (
            <Alert color='gray'>You have not submitted any drop requests.</Alert>
          ) : (
            <Table highlightOnHover withTableBorder>
              <thead>
                <tr>
                  <th>Slot</th>
                  <th>Course</th>
                  <th>Status</th>
                  <th>Academic Year</th>
                  <th>Semester Type</th>
                  <th>Requested At</th>
                </tr>
              </thead>
              <tbody>
                {dropRequests.map(r => (
                  <tr key={r.id}>
                    <td>{r.slot}</td>
                    <td>
                      <Text size="sm">{r.course}</Text>
                      {r.course_name && (
                        <Text size="xs" color="dimmed">{r.course_name}</Text>
                      )}
                    </td>
                    <td>
                      <Badge color={
                        r.status === 'Approved' ? 'green' :
                        r.status === 'Rejected' ? 'red' : 'yellow'
                      }>
                        {r.status}
                      </Badge>
                    </td>
                    <td>{r.academic_year}</td>
                    <td>{r.semester_type}</td>
                    <td>{new Date(r.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Tabs.Panel>
      </Tabs>
    </Card>
  );
}
