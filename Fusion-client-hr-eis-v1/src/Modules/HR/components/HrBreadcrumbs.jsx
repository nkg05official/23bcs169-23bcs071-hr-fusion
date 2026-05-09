import React from "react";
import { useNavigate } from "react-router-dom";
import { Breadcrumbs as MantineBreadcrumbs, Anchor } from "@mantine/core";
import { CaretRight } from "@phosphor-icons/react";
import classes from "./HrBreadcrumbs.module.css";

const HrBreadcrumbs = ({ items }) => {
  const navigate = useNavigate();

  const handleClick = (path) => {
    navigate(path);
  };

  return (
    <MantineBreadcrumbs
      className={classes.MantineBreadcrumbs}
      separator={<CaretRight size={16} />}
    >
      {items.map((item, index) => (
        <Anchor
          key={index}
          onClick={() => handleClick(item.path)}
          className={classes.breadcrumbItem}
        >
          {item.title}
        </Anchor>
      ))}
    </MantineBreadcrumbs>
  );
};

export default HrBreadcrumbs;
