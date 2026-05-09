import React, { useState } from "react";
import PropTypes from "prop-types";
import { Select, Loader } from "@mantine/core";
import { searchEmployees } from "../services/hrService";

function SearchAndSelectUser({ onUserSelect }) {
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [searchValue, setSearchValue] = useState("");
  const [value, setValue] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  const fetchUsers = async (searchText) => {
    // Trigger search only if at least 4 characters are entered
    if (searchText.length < 3) {
      // Do not clear search results if they just selected something
      // or if they delete text. This prevents Mantine from dropping the selection.
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const employees = await searchEmployees(searchText);

      // Use id, username, and designation to create a unique identifier
      const formattedResults = employees.map((employee) => ({
        value: `${employee.id}-${employee.username}-${employee.designation}`, // Unique identifier
        label: `${employee.username} (${employee.designation})`,
        details: employee,
      }));
      setSearchResults(formattedResults);
    } catch (err) {
      setError("Unable to fetch users.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (val) => {
    setSearchValue(val);
    fetchUsers(val);
  };

  const handleUserSelection = (selectedValue) => {
    setValue(selectedValue);

    if (!selectedValue) {
      setSelectedItem(null);
      return;
    }

    // Try to find the user in current search results, fallback to the already selected item
    const user = searchResults.find((result) => result.value === selectedValue) || selectedItem;

    if (user) {
      setSelectedItem(user);
      setSearchValue(user.label);
      // Pass selected user to the parent via the callback
      if (onUserSelect && user.details) {
        onUserSelect(user.details);
      }
    }
  };

  // Ensure the selected item remains in the data list so Mantine doesn't drop the selection
  const data = [...searchResults];
  if (selectedItem && !data.find((d) => d.value === selectedItem.value)) {
    data.push(selectedItem);
  }

  return (
    <div style={{ maxWidth: "400px", marginBottom: "20px" }}>
      <Select
        label="Search and Select User"
        placeholder="Type to search"
        searchable
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        value={value}
        onChange={handleUserSelection}
        nothingFoundMessage={error || (searchValue.length < 3 ? "Type at least 3 characters" : "No users found")}
        data={data}
        rightSection={loading ? <Loader size="1rem" /> : null}
        filter={({ options }) => options}
        clearable
      />
    </div>
  );
}

SearchAndSelectUser.propTypes = {
  onUserSelect: PropTypes.func.isRequired,
};

export default SearchAndSelectUser;
