import React, { useEffect, useState } from "react";
import InboxTable from "../../components/tables/InboxTable";
import { get_cpda_adv_inbox } from "../../../../routes/hr/index"; // Ensure this is the correct import path
import LoadingComponent from "../../components/Loading"; // Ensure this is the correct import path
import { fetchHrCollection } from "../../services/hrService";

function Cpda_ADVANCEInbox() {
  const [inboxData, setInboxData] = useState([]); // Correct useState syntax
  const [loading, setLoading] = useState(true); // Add loading state

  useEffect(() => {
    const fetchCPDAInbox = async () => {
      try {
        const data = await fetchHrCollection(
          get_cpda_adv_inbox,
          "cpda_adv_inbox",
        );
        setInboxData(data); // Set fetched data
        setLoading(false); // Set loading to false once data is fetched
      } catch (error) {
        setLoading(false); // Set loading to false if there’s an error
      }
    };
    fetchCPDAInbox(); // Ensure function is called
  }, []); // Adding empty dependency array to run only once

  if (loading) {
    return <LoadingComponent />;
  }

  return (
    <InboxTable title="CPDA Adv Inbox" data={inboxData} formType="cpda_adv" />
  );
}

export default Cpda_ADVANCEInbox;
