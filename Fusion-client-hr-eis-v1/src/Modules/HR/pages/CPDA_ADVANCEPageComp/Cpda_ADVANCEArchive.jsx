import React, { useEffect, useState } from "react";
import ArchiveTable from "../../components/tables/ArchiveTable"; // Ensure the import path is correct
import { get_cpda_adv_archive } from "../../../../routes/hr/index"; // Ensure the import path is correct
import LoadingComponent from "../../components/Loading"; // Ensure the import path is correct
import { fetchHrCollection } from "../../services/hrService";

function Cpda_ADVANCEArchive() {
  const [archiveData, setArchiveData] = useState([]); // Correct useState syntax
  const [loading, setLoading] = useState(true); // Add loading state

  useEffect(() => {
    const fetchCPDAArchive = async () => {
      try {
        const data = await fetchHrCollection(
          get_cpda_adv_archive,
          "cpda_adv_archive",
        );
        setArchiveData(data); // Set fetched data
        setLoading(false); // Set loading to false once data is fetched
      } catch (error) {
        setLoading(false); // Set loading to false if there’s an error
      }
    };
    fetchCPDAArchive(); // Ensure function is called
  }, []); // Add dependency array to run only once

  if (loading) {
    return <LoadingComponent />;
  }

  return (
    <ArchiveTable
      title="CPDA Adv Archive"
      data={archiveData}
      formType="cpda_adv"
    />
  );
}

export default Cpda_ADVANCEArchive;
