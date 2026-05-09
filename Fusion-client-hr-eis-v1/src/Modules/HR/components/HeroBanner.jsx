import React from "react";
import { Container, Title, Text, Button } from "@mantine/core";
import { Dots } from "./Dots";
import classes from "./HeroBanner.module.css";

export function HeroBanner() {
  return (
    <Container className={classes.wrapper} size={1400}>
      <Dots className={classes.dots} style={{ left: 0, top: 0 }} />
      <Dots className={classes.dots} style={{ left: 60, top: 0 }} />
      <Dots className={classes.dots} style={{ left: 0, top: 80 }} />
      <Dots className={classes.dots} style={{ right: 0, top: 60 }} />
      <div className={classes.inner}>
        <Title className={classes.title}>
          IIITDMJ's {"  "}
          <Text component="span" className={classes.highlight} inherit>
            HR Department
          </Text>{" "}
          Dashboard
        </Title>
        <Container p={0} size={600}>
          <Text size="lg" c="dimmed" className={classes.description}>
            Efficiently manage all your HR activities from one place. Click on
            the sections below to get started.
          </Text>
        </Container>
        {/* <div className={classes.controls}>
          <Button className={classes.control} size="lg" variant="default" color="gray">
            Book a demo
          </Button>
          <Button className={classes.control} size="lg">
            Get Started
          </Button>
        </div> */}
      </div>
    </Container>
  );
}
