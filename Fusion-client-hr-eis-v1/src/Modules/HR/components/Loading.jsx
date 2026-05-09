import React from "react";
import { Loader, Center, Text } from "@mantine/core";

const LoadingComponent = ({ loadingMsg = "fetching data..." }) => {
  return (
    <Center
      style={{ height: "50vh", flexDirection: "column", textAlign: "center" }}
    >
      <Loader color="#4a72ff" size="lg" variant="dots" />
      <Text
        mt="md"
        size="lg"
        style={{ marginTop: "50px", fontFamily: "monospace" }}
      >
        {loadingMsg}
      </Text>
    </Center>
  );
};

export default LoadingComponent;
