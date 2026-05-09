/* eslint-disable */
import React, { useState } from "react";
import PropTypes from "prop-types";
import {
  Modal,
  Table,
  Text,
  Button,
  Group,
  Badge,
  Alert,
  Tabs,
  Stack,
} from "@mantine/core";
import { Check, X, Info } from "@phosphor-icons/react";

// Field comparison data
const FIELD_COMPARISON = {
  synchronized: [
    {
      field: "jeeAppNo",
      label: "JEE App. No.",
      status: "both",
      required: true,
    },
    { field: "name", label: "Full Name", status: "both", required: true },
    { field: "fname", label: "Father Name", status: "both", required: true },
    { field: "mname", label: "Mother Name", status: "both", required: true },
    { field: "gender", label: "Gender", status: "both", required: true },
    { field: "category", label: "Category", status: "both", required: true },
    { field: "pwd", label: "PWD Status", status: "both", required: true },
    { field: "branch", label: "Branch", status: "both", required: true },
    { field: "address", label: "Address", status: "both", required: true },
    {
      field: "phoneNumber",
      label: "Phone Number",
      status: "both",
      required: false,
    },
    {
      field: "email",
      label: "Personal Email",
      status: "both",
      required: false,
    },
    { field: "dob", label: "Date of Birth", status: "both", required: false },
    {
      field: "aadharNumber",
      label: "Aadhar Number",
      status: "both",
      required: false,
    },
    {
      field: "tenthMarks",
      label: "10th Marks (%)",
      status: "both",
      required: false,
    },
    {
      field: "twelfthMarks",
      label: "12th Marks (%)",
      status: "both",
      required: false,
    },
    { field: "jeeRank", label: "JEE Rank", status: "both", required: false },
  ],
  beforeSync: [
    {
      field: "jeeAppNo",
      label: "JEE App. No.",
      status: "both",
      required: true,
    },
    { field: "name", label: "Name", status: "both", required: true },
    { field: "fname", label: "Father Name", status: "both", required: true },
    { field: "mname", label: "Mother Name", status: "both", required: true },
    { field: "gender", label: "Gender", status: "both", required: true },
    { field: "category", label: "Category", status: "both", required: true },
    { field: "pwd", label: "PWD", status: "both", required: true },
    { field: "branch", label: "Branch", status: "both", required: true },
    { field: "address", label: "Address", status: "both", required: true },
    {
      field: "phoneNumber",
      label: "Phone Number",
      status: "excel-only",
      required: false,
    },
    {
      field: "email",
      label: "Personal Email",
      status: "excel-only",
      required: false,
    },
    {
      field: "dob",
      label: "Date of Birth",
      status: "excel-only",
      required: false,
    },
    {
      field: "aadharNumber",
      label: "Aadhar Number",
      status: "excel-only",
      required: false,
    },
    {
      field: "tenthMarks",
      label: "10th Marks",
      status: "excel-only",
      required: false,
    },
    {
      field: "twelfthMarks",
      label: "12th Marks",
      status: "excel-only",
      required: false,
    },
    {
      field: "jeeRank",
      label: "JEE Rank",
      status: "excel-only",
      required: false,
    },
  ],
};

const getStatusBadge = (status, required) => {
  switch (status) {
    case "both":
      return (
        <Badge color="green" variant="light" size="sm">
          <Check size={12} style={{ marginRight: 4 }} />
          Both Methods
        </Badge>
      );
    case "excel-only":
      return (
        <Badge color="orange" variant="light" size="sm">
          <X size={12} style={{ marginRight: 4 }} />
          Excel Only
        </Badge>
      );
    case "manual-only":
      return (
        <Badge color="blue" variant="light" size="sm">
          Manual Only
        </Badge>
      );
    default:
      return null;
  }
};

const FieldComparisonModal = ({ opened, onClose }) => {
  const [activeTab, setActiveTab] = useState("after");

  const currentData =
    activeTab === "after"
      ? FIELD_COMPARISON.synchronized
      : FIELD_COMPARISON.beforeSync;
  const bothCount = currentData.filter(
    (field) => field.status === "both",
  ).length;
  const excelOnlyCount = currentData.filter(
    (field) => field.status === "excel-only",
  ).length;
  const manualOnlyCount = currentData.filter(
    (field) => field.status === "manual-only",
  ).length;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Field Synchronization Comparison"
      size="lg"
      centered
    >
      <Stack spacing="md">
        <Alert color="blue" icon={<Info size={16} />}>
          <Text size="sm" weight={600}>
            Field Synchronization Status
          </Text>
          <Text size="xs" mt={4}>
            This comparison shows how student data fields are now synchronized
            between Excel import and manual entry methods.
          </Text>
        </Alert>

        <Tabs value={activeTab} onTabChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="before">Before Sync</Tabs.Tab>
            <Tabs.Tab value="after">After Sync ✅</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="before" pt="md">
            <Stack spacing="sm">
              <Group>
                <Text size="sm" weight={600}>
                  Status Summary:
                </Text>
                <Badge color="green" size="sm">
                  {bothCount} Both Methods
                </Badge>
                <Badge color="orange" size="sm">
                  {excelOnlyCount} Excel Only
                </Badge>
                {manualOnlyCount > 0 && (
                  <Badge color="blue" size="sm">
                    {manualOnlyCount} Manual Only
                  </Badge>
                )}
              </Group>

              <Alert color="orange" icon={<X size={16} />}>
                <Text size="sm">
                  <strong>Problem:</strong> {excelOnlyCount} fields were only
                  available in Excel import, causing data loss when switching
                  between entry methods.
                </Text>
              </Alert>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="after" pt="md">
            <Stack spacing="sm">
              <Group>
                <Text size="sm" weight={600}>
                  Status Summary:
                </Text>
                <Badge color="green" size="sm">
                  {bothCount} Both Methods
                </Badge>
                {excelOnlyCount > 0 && (
                  <Badge color="orange" size="sm">
                    {excelOnlyCount} Excel Only
                  </Badge>
                )}
                {manualOnlyCount > 0 && (
                  <Badge color="blue" size="sm">
                    {manualOnlyCount} Manual Only
                  </Badge>
                )}
              </Group>

              <Alert color="green" icon={<Check size={16} />}>
                <Text size="sm">
                  <strong>Solution:</strong> All {bothCount} fields are now
                  available in both Excel import and manual entry, ensuring
                  complete data synchronization.
                </Text>
              </Alert>
            </Stack>
          </Tabs.Panel>
        </Tabs>

        <Table highlightOnHover>
          <thead>
            <tr>
              <th>Field Name</th>
              <th>Type</th>
              <th>Availability</th>
            </tr>
          </thead>
          <tbody>
            {currentData.map((field) => (
              <tr key={field.field}>
                <td>
                  <Text size="sm" weight={500}>
                    {field.label}
                    {field.required && (
                      <span style={{ color: "red", marginLeft: 4 }}>*</span>
                    )}
                  </Text>
                </td>
                <td>
                  <Badge
                    color={field.required ? "red" : "gray"}
                    variant="outline"
                    size="xs"
                  >
                    {field.required ? "Required" : "Optional"}
                  </Badge>
                </td>
                <td>{getStatusBadge(field.status, field.required)}</td>
              </tr>
            ))}
          </tbody>
        </Table>

        <Group position="right" mt="md">
          <Button variant="light" onClick={onClose}>
            Close
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

FieldComparisonModal.propTypes = {
  opened: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default FieldComparisonModal;
