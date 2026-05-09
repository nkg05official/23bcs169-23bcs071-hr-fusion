import React, { useState, useEffect } from "react";
import { Modal, Button, ScrollArea, Loader } from "@mantine/core";
import { ListChecks } from "@phosphor-icons/react";
import { get_leave_balance } from "../../../../routes/hr";

const LeaveBalanceButton = () => {
  const [opened, setOpened] = useState(false);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchLeaveBalance = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setError("Authentication token is missing.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(get_leave_balance, {
        headers: { Authorization: `Token ${token}` },
      });

      if (!response.ok) {
        throw new Error(`Error fetching leave balance: ${response.statusText}`);
      }

      const data = await response.json();
      const payload = data?.data ?? data;
      setLeaveBalance(payload?.leave_balance || null);
    } catch (err) {
      setError("Failed to fetch leave balance.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (opened) {
      fetchLeaveBalance();
    }
  }, [opened]);

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginTop: "-50px",
          position: "relative",
          top: "50px",
        }}
      >
        <Button
          onClick={() => setOpened(true)}
          leftSection={<ListChecks size={20} />}
        >
          Show Leave Balance
        </Button>
      </div>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={
          <span style={{ fontWeight: "bold", fontSize: "20px" }}>
            Leave Balance
          </span>
        }
        centered
        size="lg"
        styles={{
          modal: { height: "500px", padding: "20px" },
        }}
      >
        {loading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
            }}
          >
            <Loader size="lg" />
          </div>
        ) : error ? (
          <div
            style={{ color: "red", textAlign: "center", fontWeight: "bold" }}
          >
            {error}
          </div>
        ) : leaveBalance ? (
          <ScrollArea>
            <div
              className="form-table-container"
              style={{ margin: " 0 auto " }}
            >
              <table className="form-table">
                <thead>
                  <tr>
                    <th className="table-header">Leave Type</th>
                    <th className="table-header">Allotted</th>
                    <th className="table-header">Taken</th>
                    <th className="table-header">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(leaveBalance).map(([key, value], index) => (
                    <tr
                      className="table-row"
                      key={key}
                      style={{ cursor: "pointer" }}
                    >
                      <td style={{ textTransform: "capitalize" }}>
                        {key.replace(/_/g, " ")}
                      </td>
                      <td>{value.allotted}</td>
                      <td>{value.taken}</td>
                      <td
                        style={{
                          fontWeight: "bold",
                          color: value.balance <= 0 ? "red" : "green",
                        }}
                      >
                        {value.balance}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        ) : (
          <div style={{ textAlign: "center", fontWeight: "bold" }}>
            No leave balance data available.
          </div>
        )}
      </Modal>
    </>
  );
};

export default LeaveBalanceButton;
