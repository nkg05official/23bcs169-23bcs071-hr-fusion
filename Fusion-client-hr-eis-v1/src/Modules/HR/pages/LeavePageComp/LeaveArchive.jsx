import React, { useEffect, useState } from "react";
import { get_leave_archive } from "../../../../routes/hr"; // Ensure the import path is correct
import ArchiveTable from "../../components/tables/ArchiveTable"; // Ensure the import path is correct
import LoadingComponent from "../../components/Loading"; // Ensure the import path is correct

function LeaveArchive() {
  const [archiveData, setArchiveData] = useState([]); // Correct useState syntax
  const [loading, setLoading] = useState(true); // Add loading state

  useEffect(() => {
    const fetchLeaveArchive = async () => {
      const token = localStorage.getItem("authToken");
      if (!token) {
        setLoading(false); // Set loading to false if no token
        return;
      }
      try {
        const response = await fetch(get_leave_archive, {
          headers: { Authorization: `Token ${token}` },
        });
        const data = await response.json();
        setArchiveData(data.leave_archive); // Set fetched data
        setLoading(false); // Set loading to false once data is fetched
      } catch (error) {
        setLoading(false); // Set loading to false if there’s an error
      }
    };
    fetchLeaveArchive(); // Ensure function is called
  }, []); // Add dependency array to run only once

  if (loading) {
    return <LoadingComponent loadingMsg="Fetching Leave Archive..." />;
  }

  return (
    <ArchiveTable title="Leave Archive" data={archiveData} formType="leave" />
  );
}

export default LeaveArchive;
