import React, { useEffect, useState } from "react";
import InboxTable from "../../components/tables/InboxTable";
import { get_cpda_claim_inbox } from "../../../../routes/hr/index"; // Ensure this is the correct import path
import LoadingComponent from "../../components/Loading"; // Ensure this is the correct import path
import { fetchHrCollection } from "../../services/hrService";

function CPDA_ClaimInbox() {
  const [inboxData, setInboxData] = useState([]); // Correct useState syntax
  const [loading, setLoading] = useState(true); // Add loading state

  useEffect(() => {
    const fetchCPDAClaimInbox = async () => {
      try {
        const data = await fetchHrCollection(
          get_cpda_claim_inbox,
          "cpda_claim_inbox",
        );
        setInboxData(data); // Set fetched data
        setLoading(false); // Set loading to false once data is fetched
      } catch (error) {
        setLoading(false); // Set loading to false if there’s an error
      }
    };
    fetchCPDAClaimInbox(); // Ensure function is called
  }, []); // Adding empty dependency array to run only once

  if (loading) {
    return <LoadingComponent />;
  }

  return (
    <InboxTable
      title="CPDA Claim Inbox"
      data={inboxData}
      formType="cpda_claim"
    />
  );
}

export default CPDA_ClaimInbox;
