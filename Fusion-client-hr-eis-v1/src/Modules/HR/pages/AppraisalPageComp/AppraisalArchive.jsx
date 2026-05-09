import React, { useEffect, useState } from "react";
import ArchiveTable from "../../components/tables/ArchiveTable"; // Ensure the import path is correct
import { get_appraisal_archive } from "../../../../routes/hr/index"; // Ensure the import path is correct
import LoadingComponent from "../../components/Loading"; // Ensure the import path is correct
import { fetchHrCollection } from "../../services/hrService";

function AppraisalArchive() {
  const [archiveData, setArchiveData] = useState([]); // Correct useState syntax
  const [loading, setLoading] = useState(true); // Add loading state

  useEffect(() => {
    const fetchAppraisalArchive = async () => {
      try {
        const data = await fetchHrCollection(
          get_appraisal_archive,
          "appraisal_archive",
        );
        setArchiveData(data); // Set fetched data
        setLoading(false); // Set loading to false once data is fetched
      } catch (error) {
        setLoading(false); // Set loading to false if there’s an error
      }
    };
    fetchAppraisalArchive(); // Ensure function is called
  }, []); // Add dependency array to run only once

  if (loading) {
    return <LoadingComponent />;
  }

  return (
    <ArchiveTable
      title="Appraisal Archive"
      data={archiveData}
      formType="appraisal"
    />
  );
}

export default AppraisalArchive;
