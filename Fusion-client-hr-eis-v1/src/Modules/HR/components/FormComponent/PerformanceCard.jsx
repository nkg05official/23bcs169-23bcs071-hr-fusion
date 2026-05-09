import React from "react";
import { Card, Text, Group, Divider, Button } from "@mantine/core";
import { Link } from "react-router-dom";
import { ArrowRight, CaretRight } from "@phosphor-icons/react";
import PropTypes from "prop-types";
import classes from "./PerformanceCard.module.css";

function PerformanceCard({ IconComponent, title, description, link }) {
  return (
    <Card
      shadow="lg"
      p="lg"
      className={classes.card}
      style={{ height: "100%" }} // Ensure all cards have equal height
    >
      <Group position="apart">
        <IconComponent size={32} color="#4E9EFC" />
      </Group>
      <Text
        size="lg"
        weight={600}
        style={{ marginTop: "10px", marginBottom: "5px", color: "#333" }}
      >
        {title}
      </Text>
      <Divider
        size="md"
        color="#4E9EFC"
        style={{ marginBottom: "10px", width: "60px" }}
      />
      <Text size="sm" color="dimmed" style={{ marginBottom: "15px" }}>
        {description}
      </Text>
      <Button
        variant="outline"
        className={classes.button}
        component={Link}
        to={link}
        rightSection={<ArrowRight size={16} weight="bold" />}
        style={{ marginTop: "auto" }} // Push button to bottom
      >
        Go to {title} <CaretRight size={20} />
      </Button>
    </Card>
  );
}

PerformanceCard.propTypes = {
  IconComponent: PropTypes.elementType.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  link: PropTypes.string.isRequired,
};

export default PerformanceCard;
