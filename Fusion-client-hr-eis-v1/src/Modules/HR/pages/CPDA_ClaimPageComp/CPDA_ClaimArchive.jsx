import React, { useEffect, useState } from "react";
import ArchiveTable from "../../components/tables/ArchiveTable"; // Ensure the import path is correct
import { get_cpda_claim_archive } from "../../../../routes/hr/index"; // Ensure the import path is correct
import LoadingComponent from "../../components/Loading"; // Ensure the import path is correct
import { fetchHrCollection } from "../../services/hrService";

function CPDA_ClaimArchive() {
  const [archiveData, setArchiveData] = useState([]); // Correct useState syntax
  const [loading, setLoading] = useState(true); // Add loading state

  useEffect(() => {
    const fetchCPDAClaimArchive = async () => {
      try {
        const data = await fetchHrCollection(
          get_cpda_claim_archive,
          "cpda_claim_archive",
        );
        setArchiveData(data); // Set fetched data
        setLoading(false); // Set loading to false once data is fetched
      } catch (error) {
        setLoading(false); // Set loading to false if there’s an error
      }
    };
    fetchCPDAClaimArchive(); // Ensure function is called
  }, []); // Add dependency array to run only once

  if (loading) {
    return <LoadingComponent />;
  }

  return (
    <ArchiveTable
      title="CPDA Claim Archive"
      data={archiveData}
      formType="cpda_claim"
    />
  );
}

export default CPDA_ClaimArchive;
