import { notifications } from "@mantine/notifications";
import { Text, Badge } from "@mantine/core";

/**
 * Utility functions for consistent notification styling across the application
 */

export const showSuccessNotification = ({
  title = "✅ Success!",
  message,
  autoClose = 5000,
}) => {
  notifications.show({
    title,
    message: (
      <div>
        <Text size="sm" mb={8}>
          <strong>{message}</strong>
        </Text>
      </div>
    ),
    color: "green",
    autoClose,
    style: {
      backgroundColor: '#d4edda',
      borderColor: '#c3e6cb',
      color: '#155724',
    },
  });
};

export const showErrorNotification = ({
  title = "❌ Error!",
  message,
  autoClose = 7000,
}) => {
  notifications.show({
    title,
    message: (
      <div>
        <Text size="sm" mb={8}>
          <strong>{message}</strong>
        </Text>
      </div>
    ),
    color: "red",
    autoClose,
    style: {
      backgroundColor: '#f8d7da',
      borderColor: '#f5c6cb',
      color: '#721c24',
    },
  });
};

export const showWarningNotification = ({
  title = "⚠️ Warning!",
  message,
  autoClose = 5000,
}) => {
  notifications.show({
    title,
    message: (
      <div>
        <Text size="sm" mb={8}>
          <strong>{message}</strong>
        </Text>
      </div>
    ),
    color: "orange",
    autoClose,
    style: {
      backgroundColor: '#fff3cd',
      borderColor: '#ffeaa7',
      color: '#856404',
    },
  });
};

export const showNetworkErrorNotification = (customMessage = "") => {
  showErrorNotification({
    title: "🚨 Network Error",
    message: customMessage || "Connection error occurred.",
  });
};

// Specific notification types for common actions
export const showAddSuccessNotification = (itemType, itemName) => {
  showSuccessNotification({
    title: `✅ ${itemType} Added Successfully!`,
    message: `${itemType} "${itemName}" has been created successfully.`,
  });
};

export const showUpdateSuccessNotification = (itemType, itemName) => {
  showSuccessNotification({
    title: `✅ ${itemType} Updated Successfully!`,
    message: `${itemType} "${itemName}" has been updated successfully.`,
  });
};

export const showDeleteSuccessNotification = (itemType, itemName) => {
  showSuccessNotification({
    title: `✅ ${itemType} Deleted Successfully!`,
    message: `${itemType} "${itemName}" has been deleted successfully.`,
  });
};

export const showAddFailureNotification = (itemType) => {
  showErrorNotification({
    title: `❌ Failed to Add ${itemType}`,
    message: `Unable to create ${itemType.toLowerCase()}. Please try again.`,
  });
};

export const showUpdateFailureNotification = (itemType) => {
  showErrorNotification({
    title: `❌ Failed to Update ${itemType}`,
    message: `Unable to update ${itemType.toLowerCase()}. Please try again.`,
  });
};

export const showDeleteFailureNotification = (itemType) => {
  showErrorNotification({
    title: `❌ Failed to Delete ${itemType}`,
    message: `Unable to delete ${itemType.toLowerCase()}. Please try again.`,
  });
};

// API Error handling with specific actions
export const showApiErrorNotification = (error, itemType = "item", refreshCallback = null) => {
  let title, message, color, autoClose;

  if (error.response) {
    const status = error.response.status;
    const errorData = error.response.data;

    switch (status) {
      case 404:
        title = `🔍 ${itemType} Not Found`;
        message = errorData?.message || `The ${itemType.toLowerCase()} you're trying to access doesn't exist.`;
        color = "orange";
        autoClose = 8000;
        
        // Auto-refresh if callback provided
        if (refreshCallback) {
          setTimeout(refreshCallback, 1000);
        }
        break;
        
      case 400:
        title = `❌ Invalid ${itemType} Operation`;
        message = errorData?.message || `The ${itemType.toLowerCase()} operation is not valid.`;
        color = "red";
        autoClose = 7000;
        break;
        
      case 403:
        title = `🚫 Permission Denied`;
        message = `You don't have permission to perform this ${itemType.toLowerCase()} operation.`;
        color = "red";
        autoClose = 6000;
        break;
        
      case 500:
        title = `🛠️ Server Error`;
        message = `Server error occurred while processing ${itemType.toLowerCase()}.`;
        color = "red";
        autoClose = 8000;
        break;
        
      default:
        title = `❌ ${itemType} Operation Failed`;
        message = errorData?.message || `Failed to process ${itemType.toLowerCase()}.`;
        color = "red";
        autoClose = 6000;
    }
  } else if (error.request) {
    title = "🚨 Network Error";
    message = "Unable to connect to server.";
    color = "red";
    autoClose = 8000;
  } else {
    title = `❌ ${itemType} Error`;
    message = error.message || "An unexpected error occurred.";
    color = "red";
    autoClose = 6000;
  }

  notifications.show({
    title,
    message: (
      <div>
        <Text size="sm" mb={8}>
          <strong>{message}</strong>
        </Text>
      </div>
    ),
    color,
    autoClose,
    style: {
      backgroundColor: color === "orange" ? '#fff3cd' : '#f8d7da',
      borderColor: color === "orange" ? '#ffeaa7' : '#f5c6cb',
      color: color === "orange" ? '#856404' : '#721c24',
    },
  });
};

/**
 * Show notification with intelligent versioning information
 */
export const showVersioningNotification = ({
  entityName,
  entityCode,
  oldVersion,
  newVersion,
  versionBumpType,
  reason,
  changedFields = [],
  autoClose = 7000,
}) => {
  const versionMessage = oldVersion && newVersion && oldVersion !== newVersion
    ? `Version ${oldVersion} → ${newVersion}`
    : "Updated successfully";

  notifications.show({
    title: "✅ Course Updated Successfully!",
    message: (
      <div>
        <Text size="sm" mb={8}>
          <strong>Course "{entityName}" ({entityCode}) has been updated.</strong>
        </Text>
      </div>
    ),
    color: "green",
    autoClose,
    style: {
      backgroundColor: '#d4edda',
      borderColor: '#c3e6cb',
      color: '#155724',
    },
  });
};
