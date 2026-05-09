import React, { useEffect, useState } from "react";
import { Title, Select, TextInput, Text, Pagination } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { Eye } from "@phosphor-icons/react";
import LoadingComponent from "../../components/Loading";
import { EmptyTable } from "../../components/tables/EmptyTable";
import { get_leave_requests } from "../../../../routes/hr/index";
import { useAPIErrorHandling, usePagination } from "../../../../hooks/useCustom";
import "../../components/tables/Table.css";

function LeaveRequests() {
  const [requestData, setRequestData] = useState([]); // State for leave requests
  const [filteredData, setFilteredData] = useState([]); // State for filtered leave requests
  const [loading, setLoading] = useState(true); // Loading state
  const [selectedStatus, setSelectedStatus] = useState("All"); // State for status filter
  const [selectedDate, setSelectedDate] = useState(""); // State for date filter (as string)
  const { error, handleError, clearError } = useAPIErrorHandling();
  const pagination = usePagination(20);
  const navigate = useNavigate();

  // Fetch leave requests from the backend
  useEffect(() => {
    const fetchLeaveRequests = async () => {

      const token = localStorage.getItem("authToken");
      if (!token) {
        return;
      }
      try {
        const queryParams = new URLSearchParams();
        if (selectedDate) {
          queryParams.append("date", selectedDate);
        }
        queryParams.append("page", String(pagination.currentPage));
        queryParams.append("page_size", String(pagination.pageSize));
        queryParams.append("limit", String(pagination.pageSize));
        queryParams.append("offset", String((pagination.currentPage - 1) * pagination.pageSize));

        clearError();
        const response = await fetch(
          `${get_leave_requests}?${queryParams.toString()}`,
          {
            headers: { Authorization: `Token ${token}` },
          },
        );
        if (!response.ok) {
          const errPayload = await response.json().catch(() => ({}));
          throw { response: { status: response.status, data: errPayload } };
        }
        const data = await response.json();

        // Sort the data by submissionDate in descending order (latest first)
        const leaveRequests = data.data?.leave_requests || data.leave_requests || [];
        const sortedData = leaveRequests.sort((a, b) => {
          return new Date(b.submissionDate) - new Date(a.submissionDate);
        });

        const meta = data.data?.meta || data.meta || {};
        if (typeof meta.total_count === "number") {
          pagination.updateTotalCount(meta.total_count);
        }

        setRequestData(sortedData); // Set fetched and sorted data
        setFilteredData(sortedData); // Initialize filtered data
        setLoading(false); // Set loading to false once data is fetched

      } catch (error) {
        handleError(error);
        setLoading(false); // Set loading to false if there’s an error
      }
    };
    fetchLeaveRequests(); // Call the function to fetch data
  }, [selectedDate, pagination.currentPage, pagination.pageSize]); // Re-fetch data when filters/pagination change

  // Handle "View" button click
  const handleViewClick = (view) => {
    navigate(`/hr/leave/view/${view}`);
  };

  // Function to determine status color
  const getStatusColor = (status) => {
    switch (status) {
      case "Pending":
        return "#FFD700"; // Yellow
      case "Accepted":
        return "#32CD32"; // Green
      case "Rejected":
        return "#FF0000"; // Red
      default:
        return "#333"; // Default color
    }
  };

  // Handle status filter change
  const handleStatusFilterChange = (value) => {
    setSelectedStatus(value);
    if (value === "All") {
      setFilteredData(requestData); // Show all data
    } else {
      const filtered = requestData.filter((item) => item.status === value);
      setFilteredData(filtered); // Filter by status
    }
  };

  // Handle date filter change
  const handleDateFilterChange = (event) => {
    setSelectedDate(event.target.value); // Update selectedDate state
  };

  // Table headers
  const headers = [
    "ID",
    "Submission Date",
    "Status",
    "Leave Start Date",
    "Leave End Date",
    "Assigned To",
    "View",
  ];

  // Render loading component if data is still being fetched
  if (loading) {
    return <LoadingComponent loadingMsg="Fetching Leave Requests..." />;
  }

  return (
    <div className="app-container">
      <Title
        order={2}
        className="hr-table-title"
      >
        Leave Requests
      </Title>

      {error && (
        <Text c="red" style={{ margin: "0 15px 10px 15px" }}>
          {error.message}
        </Text>
      )}

      {/* Filter Section */}
      <div className="hr-toolbar">
        {/* Left Side: Filters */}
        <div className="hr-toolbar-left">
          <TextInput
            label="Filter by Date"
            placeholder="Select or enter a date"
            type="date"
            value={selectedDate}
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
        </div>

        {/* Right Side: Showing Results */}
        <Title order={4} className="hr-toolbar-right">
          {selectedDate
            ? `Filtered results as of ${new Date(
                selectedDate,
              ).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}`
            : `Filtered results as of ${new Date(
                Date.now() - 365 * 24 * 60 * 60 * 1000, // One year in milliseconds
              ).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}`}
        </Title>
      </div>

      {/* Display EmptyTable if no data is found */}
      {filteredData.length === 0 ? (
        <EmptyTable
          title="No Leave Requests Found"
          message="There are no leave requests available. Please check back later."
        />
      ) : (
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
                  style={{ cursor: "pointer" }}
                  onClick={() => handleViewClick(item.id)}
                >
                  <td>{item.id}</td>
                  <td>{item.submissionDate}</td>
                  <td>
                    <span
                      className="hr-status-pill"
                      style={{ color: getStatusColor(item.status) }}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td>{item.leaveStartDate}</td>
                  <td>{item.leaveEndDate}</td>
                  <td>
                    {item.assignedTo
                      ? `${item.assignedTo}${item.assignedToDesignation ? ` (${item.assignedToDesignation})` : ""}`
                      : "Auto routing in progress"}
                  </td>
                  <td>
                    <span className="text-link">
                      <Eye size={20} />
                      View
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="hr-pagination-wrap">
            <Pagination
              value={pagination.currentPage}
              onChange={pagination.handlePageChange}
              total={Math.max(pagination.totalPages, 1)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default LeaveRequests;
