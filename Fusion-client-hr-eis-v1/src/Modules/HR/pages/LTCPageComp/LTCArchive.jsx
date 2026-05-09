import React, { useEffect, useState } from "react";
import { get_ltc_archive } from "../../../../routes/hr"; // Ensure the import path is correct
import ArchiveTable from "../../components/tables/ArchiveTable"; // Ensure the import path is correct
import LoadingComponent from "../../components/Loading"; // Ensure the import path is correct

function LTCArchive() {
  const [archiveData, setArchiveData] = useState([]); // Correct useState syntax
  const [loading, setLoading] = useState(true); // Add loading state

  useEffect(() => {
    const fetchLTCArchive = async () => {
      const token = localStorage.getItem("authToken");
      if (!token) {
        setLoading(false); // Set loading to false if no token
        return;
      }
      try {
        const response = await fetch(get_ltc_archive, {
          headers: { Authorization: `Token ${token}` },
        });
        const data = await response.json();
        setArchiveData(data.ltc_archive); // Set fetched data
        setLoading(false); // Set loading to false once data is fetched
      } catch (error) {
        setLoading(false); // Set loading to false if there’s an error
      }
    };
    fetchLTCArchive(); // Ensure function is called
  }, []); // Add dependency array to run only once

  if (loading) {
    return <LoadingComponent />;
  }

  return <ArchiveTable title="LTC Archive" data={archiveData} formType="ltc" />;
}

export default LTCArchive;
