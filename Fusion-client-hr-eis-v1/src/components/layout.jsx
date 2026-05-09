import { AppShell, Divider } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useState } from "react";
import PropTypes from "prop-types";
import SidebarContent from "./sidebarContent";
import Header from "./header";

export function Layout({ children }) {
  const [opened, { close, open }] = useDisclosure(false);
  const [isCollapsed, setIsCollapsed] = useState(true);

  const toggleSidebar = () => {
    if (isCollapsed) {
      open();
    } else {
      close();
    }
    setIsCollapsed(!isCollapsed);
  };

  return (
    <AppShell
      layout="alt"
      header={{ height: 64 }}
      navbar={{
        width: isCollapsed ? 60 : 240,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Header opened={opened} toggleSidebar={toggleSidebar} />
        <Divider />
      </AppShell.Header>

      <AppShell.Navbar
        pl="xs"
        style={{
          transition: "width 0.5s ease-in-out",
          overflow: "hidden",
        }}
      >
        <SidebarContent
          isCollapsed={isCollapsed}
          toggleSidebar={toggleSidebar}
        />
      </AppShell.Navbar>

      <AppShell.Main bg="#F5F7F8">{children}</AppShell.Main>
    </AppShell>
  );
}

Layout.propTypes = {
  children: PropTypes.node.isRequired,
};
