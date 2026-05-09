import React, { useEffect, useState } from "react";
import InboxTable from "../../components/tables/InboxTable";
import { get_ltc_inbox } from "../../../../routes/hr/index"; // Ensure this is the correct import path
import LoadingComponent from "../../components/Loading"; // Ensure this is the correct import path

function LTCInbox() {
  const [inboxData, setInboxData] = useState([]); // Correct useState syntax
  const [loading, setLoading] = useState(true); // Add loading state

  useEffect(() => {
    const fetchLTCInbox = async () => {
      const token = localStorage.getItem("authToken");
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(get_ltc_inbox, {
          headers: { Authorization: `Token ${token}` },
        });
        const data = await response.json();
        setInboxData(data.ltc_inbox); // Set fetched data
        setLoading(false); // Set loading to false once data is fetched
      } catch (error) {
        setLoading(false); // Set loading to false if there’s an error
      }
    };
    fetchLTCInbox(); // Ensure function is called
  }, []); // Adding empty dependency array to run only once

  if (loading) {
    return <LoadingComponent />;
  }

  return <InboxTable title="LTC Inbox" data={inboxData} formType="ltc" />;
}

export default LTCInbox;
