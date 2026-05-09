import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, Title, Table } from '@mantine/core';
import * as URLS from "../../routes/academicRoutes";

export function TADashboard() {
  const [stipends, setStipends] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    axios.get(URLS.TA_STIPENDS_URL, { headers: { Authorization: `Token ${token}` } })
      .then(r => setStipends(r.data.stipends));
  }, []);

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Title order={2}>My Stipend Status</Title>
      <Table striped>
        <thead>
          <tr><th>MM/YYYY</th><th>Status</th><th>Remark</th></tr>
        </thead>
        <tbody>
          {stipends.map((s, i) => {
            let statusLabel = 'Pending Faculty';
            if (s.status === 'approved_by_faculty') statusLabel = 'Pending HOD';
            if (s.status === 'approved_by_hod')     statusLabel = 'Approved';
            return (
              <tr key={i}>
                <td>{s.month}/{s.year}</td>
                <td>{statusLabel}</td>
                <td>{s.faculty_remark || '-'}</td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </Card>
  );
}
