import React, { useEffect, useState } from "react";
import { Title, Select, TextInput, Badge, Text } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { Eye } from "@phosphor-icons/react";
import LoadingComponent from "../../components/Loading";
import { EmptyTable } from "../../components/tables/EmptyTable";
import { get_leave_inbox } from "../../../../routes/hr/index";
import { useAPIErrorHandling } from "../../../../hooks/useCustom";
import "../../components/tables/Table.css";

function LeaveInbox() {
  const [inboxData, setInboxData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false); // New state for filter loading
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedType, setSelectedType] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const navigate = useNavigate();
  const { error, handleError, clearError } = useAPIErrorHandling();

  const applyFilters = (status, type, date, data = inboxData) => {
    setFiltering(true);
    let filtered = data;

    if (status !== "All") {
      filtered = filtered.filter((item) => item.status === status);
    }

    if (type !== "All") {
      filtered = filtered.filter((item) => item.type === type);
    }

    // Filter by date if fromDate is set
    if (date) {
      const selectedDate = new Date(date);
      filtered = filtered.filter((item) => {
        const itemDate = new Date(item.date);
        return itemDate >= selectedDate;
      });
    }

    setFilteredData(filtered);
    setFiltering(false);
  };

  useEffect(() => {
    const fetchInboxData = async () => {
      setLoading(true);
      clearError();
      const token = localStorage.getItem("authToken");
      if (!token) {
        handleError({ message: "No authentication token found!" });
        setLoading(false);
        return;
      }

      try {
        const queryParams = new URLSearchParams();
        if (fromDate) queryParams.append("date", fromDate);

        const response = await fetch(
          `${get_leave_inbox}?${queryParams.toString()}`,
          {
            headers: { Authorization: `Token ${token}` },
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          handleError(errorData.error || { message: `HTTP ${response.status}` });
          setLoading(false);
          return;
        }

        const data = await response.json();
        const combinedData = [
          ...data.leave_inbox.map((item) => ({
            ...item,
            type: "Leave Request",
            date: item.upload_date.split("T")[0],
          })),
          ...data.academic_res_inbox.map((item) => ({
            ...item,
            type: "Academic Responsibility",
            date: item.submissionDate,
          })),
          ...data.administrative_res_inbox.map((item) => ({
            ...item,
            type: "Administrative Responsibility",
            date: item.submissionDate,
          })),
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        setInboxData(combinedData);
        applyFilters(selectedStatus, selectedType, fromDate, combinedData); // <== call filters after fetch
      } catch (err) {
        handleError({ message: err.message || "Failed to fetch leave inbox" });
      } finally {
        setLoading(false);
      }
    };

    fetchInboxData();
  }, [fromDate]);

  const handle_leave_academic_responsibility_click = (id) => {
    navigate(`./handle_responsibility/${id}?query=academic`);
  };

  const handle_leave_administrative_responsibility_click = (id) => {
    navigate(`./handle_responsibility/${id}?query=administrative`);
  };

  const handle_leave_request_click = (id) => {
    navigate(`./file_handler/${id}`);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Pending":
        return <Badge color="yellow">Pending</Badge>;
      case "Accepted":
        return <Badge color="green">Accepted</Badge>;
      case "Rejected":
        return <Badge color="red">Rejected</Badge>;
      default:
        return <Badge color="gray">Unknown</Badge>;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case "Leave Request":
        return " #9ACD32";
      case "Academic Responsibility":
        return "#0d98ba";
      case "Administrative Responsibility":
        return "#2ecc71";
      default:
        return "#333";
    }
  };

  const handleStatusFilterChange = (value) => {
    setSelectedStatus(value);
    applyFilters(value, selectedType, fromDate);
  };

  const handleTypeFilterChange = (value) => {
    setSelectedType(value);
    applyFilters(selectedStatus, value, fromDate);
  };

  const handleDateFilterChange = (event) => {
    setFromDate(event.target.value);
    applyFilters(selectedStatus, selectedType, event.target.value);
  };

  const headers = [
    "Type",
    "ID",
    "Submission Date",
    "Name",
    "Designation",
    "Status",
    "View",
  ];

  return (
    <div className="app-container">
      <Title
        order={2}
        className="hr-table-title"
      >
        Leave Inbox
      </Title>

      {error && (
        <Text
          c="red"
          style={{
            margin: "15px",
            padding: "10px",
            backgroundColor: "#ffe0e0",
            borderRadius: "4px",
          }}
        >
          {error.message || "An error occurred"}
        </Text>
      )}

      <div className="hr-toolbar">
        {/* Filters section */}
        <div className="hr-toolbar-left">
          <TextInput
            label="Filter from Date"
            type="date"
            value={fromDate}
            onChange={handleDateFilterChange}
            style={{ maxWidth: "300px" }}
          />
          <Select
            label="Filter by Status"
            placeholder="Select a status"
            value={selectedStatus}
            onChange={handleStatusFilterChange}
            data={[
              { value: "All", label: "All" },
              { value: "Pending", label: "Pending" },
              { value: "Accepted", label: "Accepted" },
              { value: "Rejected", label: "Rejected" },
            ]}
          />
          <Select
            label="Filter by Type"
            placeholder="Select a type"
            value={selectedType}
            onChange={handleTypeFilterChange}
            data={[
              { value: "All", label: "All" },
              { value: "Leave Request", label: "Leave Request" },
              {
                value: "Academic Responsibility",
                label: "Academic Responsibility",
              },
              {
                value: "Administrative Responsibility",
                label: "Administrative Responsibility",
              },
            ]}
          />
        </div>

        {/* Filtered results text section */}
        <Title order={4} className="hr-toolbar-right">
          {fromDate
            ? `Filtered results as of ${new Date(fromDate).toLocaleDateString(
                "en-US",
                {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                },
              )}`
            : `Filtered results as of ${new Date(
                Date.now() - 365 * 24 * 60 * 60 * 1000,
              ).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}`}
        </Title>
      </div>

      {(loading || filtering) && (
        <LoadingComponent
          loadingMsg={
            loading ? "Fetching Leave Inbox..." : "Applying filters..."
          }
        />
      )}

      {!loading && !filtering && filteredData.length === 0 && (
        <EmptyTable
          title="No Records Found"
          message="There are no records available."
        />
      )}

      {!loading && !filtering && filteredData.length > 0 && (
        <div className="form-table-container">
          <table className="form-table">
            <thead>
              <tr>
                {headers.map((header, index) => (
                  <th key={index} className="table-header">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item, index) => (
                <tr
                  className="table-row"
                  key={index}
                  onClick={() => {
                    switch (item.type) {
                      case "Academic Responsibility":
                        handle_leave_academic_responsibility_click(item.id);
                        break;
                      case "Administrative Responsibility":
                        handle_leave_administrative_responsibility_click(
                          item.id,
                        );
                        break;
                      default:
                        handle_leave_request_click(item.src_object_id);
                    }
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <td
                    style={{
                      color: getTypeColor(item.type),
                      fontWeight: "bold",
                    }}
                  >
                    {item.type}
                  </td>
                  <td>{item.id}</td>
                  <td>{item.date}</td>
                  <td>{item.name || item.sent_by_user}</td>
                  <td>{item.designation || item.sent_by_designation}</td>
                  <td>{getStatusBadge(item.status)}</td>
                  <td className="text-link">
                    <Eye size={20} /> View
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default LeaveInbox;
