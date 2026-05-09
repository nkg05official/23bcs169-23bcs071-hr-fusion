import React, { useEffect, useState } from "react";
import { Title } from "@mantine/core";
import FormTable from "./FormTable";
import { fetchData } from "./dataFetcher";

const Form = ({ title, data }) => {
  // Accepting data prop
  const [headers, setHeaders] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      const { headers } = await fetchData(); // Just fetch headers here
      setHeaders(headers);
    };

    loadData();
  }, []);

  return (
    <div className="app-container">
      <Title
        order={2}
        style={{ fontWeight: "500", marginTop: "40px", marginLeft: "15px" }}
      >
        {title}
      </Title>
      {headers.length > 0 && data.length > 0 ? (
        <FormTable headers={headers} data={data} />
      ) : (
        <div className="loading-spinner"></div>
      )}
    </div>
  );
};

export default Form;
