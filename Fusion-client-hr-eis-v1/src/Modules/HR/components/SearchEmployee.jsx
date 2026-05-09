import React, { useState, useEffect, useRef } from "react";
import { Select, Loader } from "@mantine/core";
import PropTypes from "prop-types";
import { searchEmployees } from "../services/hrService";

function SearchEmployee({ onEmployeeSelect, initialSearch, onSearchError }) {
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [searchValue, setSearchValue] = useState("");
  const [value, setValue] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  const hasAutoSearched = useRef(false);

  const fetchEmployees = async (text) => {
    if (text.length < 3) {
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const employees = await searchEmployees(text);

      const uniqueEmployees = employees.reduce((acc, employee) => {
        if (!acc[employee.id]) {
          acc[employee.id] = {
            value: `${employee.id}-${employee.username}`,
            label: `${employee.username}`,
            details: employee,
          };
        }
        return acc;
      }, {});

      const formattedResults = Object.values(uniqueEmployees);
      setSearchResults(formattedResults);

      return formattedResults;
    } catch (err) {
      const errorMsg = "Unable to fetch employees.";
      setError(errorMsg);
      onSearchError?.(errorMsg);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (val) => {
    setSearchValue(val);
    fetchEmployees(val);
  };

  const handleEmployeeSelection = (selectedValue) => {
    setValue(selectedValue);

    if (!selectedValue) {
      setSelectedItem(null);
      return;
    }

    const employee = searchResults.find((result) => result.value === selectedValue) || selectedItem;

    if (employee) {
      setSelectedItem(employee);
      setSearchValue(employee.label);
      if (onEmployeeSelect && employee.details) {
        onEmployeeSelect(employee.details);
      }
    }
  };

  useEffect(() => {
    const autoSearch = async () => {
      if (initialSearch && !hasAutoSearched.current) {
        hasAutoSearched.current = true;
        setSearchValue(initialSearch);
        const results = await fetchEmployees(initialSearch);
        if (results.length > 0) {
          const firstEmployee = results[0];
          setValue(firstEmployee.value);
          setSelectedItem(firstEmployee);
          onEmployeeSelect?.(firstEmployee.details);
        }
      }
    };
    autoSearch();
  }, [initialSearch, onEmployeeSelect]);

  const data = [...searchResults];
  if (selectedItem && !data.find((d) => d.value === selectedItem.value)) {
    data.push(selectedItem);
  }

  return (
    <div style={{ maxWidth: "400px", marginBottom: "20px" }}>
      <Select
        label="Search Employee"
        placeholder="Type to search"
        searchable
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        value={value}
        onChange={handleEmployeeSelection}
        nothingFoundMessage={error || (searchValue.length < 3 ? "Type at least 3 characters" : "No employees found")}
        data={data}
        rightSection={loading ? <Loader size="1rem" /> : null}
        filter={({ options }) => options}
        clearable
      />
    </div>
  );
}

// ✅ PropTypes validation
SearchEmployee.propTypes = {
  onEmployeeSelect: PropTypes.func,
  initialSearch: PropTypes.string,
  onSearchError: PropTypes.func,
};

export default SearchEmployee;
