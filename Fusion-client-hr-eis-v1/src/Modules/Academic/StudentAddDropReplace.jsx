import React, { useState } from 'react';
import { Tabs, Card, Title } from '@mantine/core';
import ReplacementRequestStudent from './ReplacementRequestStudent';
import StudentCourseReplacement from './StudentCourseReplacement';
import StudentDropCourse from './StudentDropCourse';
import StudentAddCourse from './StudentAddCourse';

export default function StudentAddDropReplace() {
  const [activeTab, setActiveTab] = useState('form');

  return (
    <Card withBorder p="md">

      <Tabs
        value={activeTab}
        onChange={setActiveTab}
        variant="default"
        color="blue"
      >
        <Tabs.List grow>
          <Tabs.Tab value="form">Replacement Form</Tabs.Tab>
          <Tabs.Tab value="add">Add Course</Tabs.Tab>
          <Tabs.Tab value="drop">Drop Course</Tabs.Tab>
          <Tabs.Tab value="requests">Your Requests</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="form" pt="md" key={`panel-form-${activeTab}`}>
          {activeTab === 'form' && <StudentCourseReplacement />}
        </Tabs.Panel>

        <Tabs.Panel value="requests" pt="md" key={`panel-requests-${activeTab}`}>
          {activeTab === 'requests' && <ReplacementRequestStudent />}
        </Tabs.Panel>

        <Tabs.Panel value="add" pt="md" key={`panel-add-${activeTab}`}>
          {activeTab === 'add' && <StudentAddCourse />}
        </Tabs.Panel>

        <Tabs.Panel value="drop" pt="md" key={`panel-drop-${activeTab}`}>
          {activeTab === 'drop' && <StudentDropCourse />}
        </Tabs.Panel>
      </Tabs>
    </Card>
  );
}
