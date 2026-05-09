import React, { useState, useEffect, useMemo } from "react";
import {
  Title,
  Select,
  TextInput,
  Alert,
  Divider,
  Pagination,
} from "@mantine/core";
import { useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { Eye } from "@phosphor-icons/react";
import LoadingComponent from "../../components/Loading";
import { EmptyTable } from "../../components/tables/EmptyTable";
import SearchEmployee from "../../components/SearchEmployee";
import HrBreadcrumbs from "../../components/HrBreadcrumbs";
import "../../components/tables/Table.css";
import { admin_get_leave_requests } from "../../../../routes/hr";
import { fetchJsonWithAuth } from "../../services/hrService";
import { selectHrNormalizedRole } from "../../selectors";

function AdminLeaveRequests() {
  const normalizedRole = useSelector(selectHrNormalizedRole);
  const isHRAdmin = ["sectionhead_hr", "hr", "hradmin", "admin"].includes(normalizedRole);
  const isHOD = normalizedRole.includes("hod") || normalizedRole.includes("head of department");
  const isSanctioningAuthority = ["dean", "registrar", "director", "principal"].some((item) =>
    normalizedRole.includes(item),
  );
  const useReviewerQueue = (isHOD || isSanctioningAuthority) && !isHRAdmin;

  const [selectedUser, setSelectedUser] = useState(null);
  const [requestData, setRequestData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedDate, setSelectedDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [searchParams] = useSearchParams();
  const [accessError, setAccessError] = useState(null);
  const [autoSearchCompleted, setAutoSearchCompleted] = useState(false);

  useEffect(() => {
    if (useReviewerQueue && !selectedUser) {
      setSelectedUser({ id: "me", username: "My Pending Queue" });
      setAccessError(null);
      setAutoSearchCompleted(true);
    }
  }, [useReviewerQueue, selectedUser]);

  const exampleItems = [
    { title: "Home", path: "/dashboard" },
    { title: "Human Resources", path: "/hr" },
    { title: "Admin Leave Management", path: "/hr/admin_leave" },
    { title: "Leave Requests", path: "/hr/admin_leave/review_leave_requests" },
  ];

  // Check for emp query parameter on initial load
  useEffect(() => {
    const empUsername = searchParams.get("emp");
    if (empUsername && !autoSearchCompleted) {
      setAccessError(null); // Reset any previous errors
    }
  }, [searchParams, autoSearchCompleted]);

  // Fetch leave requests for the selected user
  useEffect(() => {
    if (!selectedUser) return;

    const fetchLeaveRequests = async () => {
      setLoading(true);
      setAccessError(null);

      try {
        const queryParams = new URLSearchParams();
        if (selectedDate) {
          queryParams.append("date", selectedDate);
        }
        queryParams.append("limit", String(pageSize));
        queryParams.append("offset", String((page - 1) * pageSize));

        const endpoint =
          selectedUser.id === "me"
            ? `${admin_get_leave_requests}/me?${queryParams.toString()}`
            : `${admin_get_leave_requests}/${selectedUser.id}?${queryParams.toString()}`;

        const data = await fetchJsonWithAuth(
          endpoint,
          "Failed to fetch leave requests",
        );

        const sortedData =
          data.leave_requests?.sort((a, b) => {
            return new Date(b.submissionDate) - new Date(a.submissionDate);
          }) || [];

        setTotalCount(data?.meta?.total_count || sortedData.length);

        setRequestData(sortedData);
      } catch (error) {
        if (error?.status === 403) {
          setAccessError(
            "You do not have access to this employee's leave requests",
          );
        } else {
          setAccessError(error?.message || "Failed to fetch leave requests");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchLeaveRequests();
  }, [selectedUser, selectedDate, page, pageSize]);

  const handleViewClick = (view) => {
    const targetPath = useReviewerQueue
      ? `/hr/leave/file_handler/${view}?admin=true`
      : `/hr/leave/view/${view}?admin=true`;
    window.open(targetPath, "_blank");
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Pending":
        return "#FFD700";
      case "Accepted":
        return "#32CD32";
      case "Rejected":
        return "#FF0000";
      default:
        return "#333";
    }
  };

  const handleStatusFilterChange = (value) => {
    setSelectedStatus(value);
  };

  const handleDateFilterChange = (event) => {
    setPage(1);
    setSelectedDate(event.target.value);
  };

  const handleSearchError = (error) => {
    if (error.includes("403") || error.includes("access")) {
      setAccessError("You do not have access to this page");
    } else {
      setAccessError(error);
    }
    setAutoSearchCompleted(true);
  };

  const handleEmployeeSelect = (employee) => {
    setSelectedUser(employee);
    setPage(1);
    setAccessError(null);
    setAutoSearchCompleted(true);
  };

  const filteredData = useMemo(() => {
    if (selectedStatus === "All") return requestData;
    return requestData.filter((item) => item.status === selectedStatus);
  }, [requestData, selectedStatus]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const headers = [
    "ID",
    "Submission Date",
    "Status",
    "Leave Start Date",
    "Leave End Date",
    "View",
  ];

  return (
    <div className="app-container">
      <HrBreadcrumbs items={exampleItems} />
      <Title
        order={2}
        className="hr-table-title"
      >
        Admin Leave Requests
      </Title>

      {accessError && (
        <Alert title="Access Error" color="red" style={{ margin: "20px 15px" }}>
          {accessError}
        </Alert>
      )}

      <div className="hr-toolbar">
        {/* Left Side: Search Component */}
        {!useReviewerQueue && (
          <SearchEmployee
            onEmployeeSelect={handleEmployeeSelect}
            initialSearch={searchParams.get("emp") || ""}
            onSearchError={handleSearchError}
            disabled={loading}
          />
        )}

        {/* Right Side: Selected Employee */}
        {selectedUser && !accessError && (
          <Title order={4} className="hr-toolbar-right">
            {useReviewerQueue ? "Showing" : "Selected Employee:"}{" "}
            <span style={{ fontWeight: 500, color: "#15a9fff1" }}>
              {useReviewerQueue ? "Requests assigned to your role" : selectedUser.username}
            </span>
          </Title>
        )}
      </div>
      <Divider my="sm" />

      {selectedUser && !accessError && (
        <div className="hr-toolbar">
          {/* Left Side: Filters */}
          <div className="hr-toolbar-left">
            <TextInput
              label="Filter by Date"
              placeholder="Select or enter a date"
              type="date"
              value={selectedDate}
              onChange={handleDateFilterChange}
              style={{ maxWidth: "350px" }}
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
      )}

      {selectedUser &&
        !accessError &&
        (loading ? (
          <LoadingComponent loadingMsg="Fetching Leave Requests..." />
        ) : filteredData.length === 0 ? (
          <EmptyTable
            title="No Leave Requests Found"
            message="There are no leave requests available for the selected user."
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
              <Pagination value={page} onChange={setPage} total={totalPages} />
            </div>
          </div>
        ))}
    </div>
  );
}

export default AdminLeaveRequests;
