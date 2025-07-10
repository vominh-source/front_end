import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { User } from "../types";
import { userService } from "../services/api";
import {
  Container,
  Card,
  Button,
  Input,
  FormGroup,
  LoadingSpinner,
  Table,
  Th,
  Td,
  Tr,
  Pagination,
  PageButton,
  ErrorMessage,
} from "../components/StyledComponents";

const UserList: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState(searchParams.get("name") || "");
  const [isSearching, setIsSearching] = useState(false);

  // Inline editing states
  const [editingUsers, setEditingUsers] = useState<{
    [key: number]: Partial<User>;
  }>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState("");

  const currentPage = parseInt(searchParams.get("page") || "1");
  const limit = 10;

  // Client-side pagination - ensure allUsers is an array
  const usersArray = Array.isArray(allUsers) ? allUsers : [];
  const totalUsers = usersArray.length;
  const totalPages = Math.ceil(totalUsers / limit);
  const startIndex = (currentPage - 1) * limit;
  const endIndex = startIndex + limit;
  const currentUsers = usersArray.slice(startIndex, endIndex);

  useEffect(() => {
    const fetchUsersData = async () => {
      try {
        setLoading(true);
        setError("");
        const searchName = searchParams.get("name") || undefined;
        const data = await userService.searchUsers(searchName);

        // Ensure data is always an array
        if (Array.isArray(data)) {
          setAllUsers(data);
        } else if (
          data &&
          typeof data === "object" &&
          "data" in data &&
          Array.isArray((data as any).data)
        ) {
          setAllUsers((data as any).data); // Handle case where response is {data: [...]}
        } else {
          setAllUsers([]);
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch users");
        setAllUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsersData();
  }, [searchParams]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);

    const newParams = new URLSearchParams();
    newParams.set("page", "1"); // Reset to first page when searching

    if (searchTerm.trim()) {
      newParams.set("name", searchTerm.trim());
    }

    setSearchParams(newParams);
    setIsSearching(false);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setSearchParams({ page: "1" });
  };

  const handlePageChange = (page: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", page.toString());
    setSearchParams(newParams);
  };

  const generatePageNumbers = () => {
    const pages: number[] = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  // Inline editing functions
  const handleCellEdit = (
    userId: number,
    field: keyof User,
    value: string | number
  ) => {
    // Find the original user to compare values
    const originalUser = allUsers.find((u) => u.id === userId);
    if (!originalUser) return;

    // Get the original value for comparison
    let originalValue = originalUser[field];

    // Format original birthdate for comparison with input value
    if (field === "birthdate" && originalValue) {
      const date = new Date(originalValue as string);
      if (!isNaN(date.getTime())) {
        originalValue = date.toISOString().split("T")[0];
      }
    }

    // Only update if the value is actually different from original
    if (String(value) === String(originalValue)) {
      // Value is same as original, remove from editing state
      setEditingUsers((prev) => {
        const newState = { ...prev };
        if (newState[userId]) {
          delete newState[userId][field];
          // If no more fields are being edited for this user, remove the user entirely
          if (Object.keys(newState[userId]).length <= 1) {
            // only 'id' remains
            delete newState[userId];
          }
        }
        return newState;
      });
    } else {
      // Value is different, add to editing state
      setEditingUsers((prev) => ({
        ...prev,
        [userId]: {
          ...prev[userId],
          id: userId,
          [field]: value,
        },
      }));
    }

    // Check if there are any actual changes
    setEditingUsers((prev) => {
      const hasActualChanges =
        Object.keys(prev).length > 0 &&
        Object.values(prev).some((editedUser) => {
          const originalUser = allUsers.find((u) => u.id === editedUser.id);
          if (!originalUser) return false;

          return Object.entries(editedUser).some(([key, val]) => {
            if (key === "id") return false;

            let origVal = originalUser[key as keyof User];
            // Format birthdate for comparison
            if (key === "birthdate" && origVal) {
              const date = new Date(origVal as string);
              if (!isNaN(date.getTime())) {
                origVal = date.toISOString().split("T")[0];
              }
            }

            return String(val) !== String(origVal);
          });
        });

      setHasChanges(hasActualChanges);
      return prev;
    });

    setError("");
    setUpdateSuccess("");
  };

  const getEditedValue = (user: User, field: keyof User) => {
    const value = editingUsers[user.id]?.[field] ?? user[field];

    // Format birthdate for display in date input
    if (field === "birthdate" && value) {
      const date = new Date(value as string);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split("T")[0]; // Format as YYYY-MM-DD
      }
    }

    return value;
  };

  // Helper function to format error messages
  const formatErrorMessage = (errorMessage: string): string => {
    // Replace array index patterns like "[0].username" with just "username"
    let formatted = errorMessage.replace(/\[\d+\]\./g, "");

    // Replace field names with more user-friendly terms
    formatted = formatted.replace(/\busername\b/g, "Username");
    formatted = formatted.replace(/\bemail\b/g, "Email");
    formatted = formatted.replace(/\bbirthdate\b/g, "Birthdate");

    return formatted;
  };

  const handleUpdateUsers = async () => {
    const usersToUpdate = Object.values(editingUsers).map((editedUser) => {
      // Find the original user to merge with edited fields
      const originalUser = allUsers.find((u) => u.id === editedUser.id);
      if (!originalUser) return editedUser;

      // Merge original user with edited fields to ensure all required fields are present
      return {
        id: originalUser.id,
        username: editedUser.username ?? originalUser.username,
        email: editedUser.email ?? originalUser.email,
        birthdate: editedUser.birthdate ?? originalUser.birthdate,
      };
    });

    if (usersToUpdate.length === 0) return;

    setIsUpdating(true);
    setError("");
    setUpdateSuccess("");

    try {
      // Send all updated users in one batch request
      await userService.updateUsers(usersToUpdate);

      setUpdateSuccess(
        `Successfully updated ${usersToUpdate.length} user${
          usersToUpdate.length > 1 ? "s" : ""
        }!`
      );

      // Clear editing state
      setEditingUsers({});
      setHasChanges(false);

      // Refresh data from backend (callback)
      setTimeout(async () => {
        try {
          const searchName = searchParams.get("name") || undefined;
          const data = await userService.searchUsers(searchName);

          if (Array.isArray(data)) {
            setAllUsers(data);
          } else if (
            data &&
            typeof data === "object" &&
            "data" in data &&
            Array.isArray((data as any).data)
          ) {
            setAllUsers((data as any).data);
          } else {
            setAllUsers([]);
          }
        } catch (err: any) {
          console.error("Error refreshing data:", err);
        }
      }, 1000);
    } catch (err: any) {
      const errorMessage = err.message || "Failed to update users";
      setError(formatErrorMessage(errorMessage));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDiscardChanges = () => {
    setEditingUsers({});
    setHasChanges(false);
    setError("");
    setUpdateSuccess("");
  };

  // Inline editable cell component
  const EditableCell: React.FC<{
    value: string | number;
    type: "text" | "email" | "date";
    onChange: (value: string) => void;
    isEdited: boolean;
  }> = ({ value, type, onChange, isEdited }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(String(value));

    useEffect(() => {
      setTempValue(String(value));
    }, [value]);

    const handleClick = () => {
      setIsEditing(true);
    };

    const handleBlur = () => {
      setIsEditing(false);
      // Only call onChange if the value actually changed
      if (tempValue !== String(value)) {
        onChange(tempValue);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        setIsEditing(false);
        // Only call onChange if the value actually changed
        if (tempValue !== String(value)) {
          onChange(tempValue);
        }
      } else if (e.key === "Escape") {
        setIsEditing(false);
        setTempValue(String(value));
      }
    };

    if (isEditing) {
      return (
        <Input
          type={type}
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoFocus
          style={{
            minWidth: "120px",
            fontSize: "14px",
            padding: "4px 8px",
            margin: 0,
          }}
        />
      );
    }

    return (
      <div
        onClick={handleClick}
        style={{
          cursor: "pointer",
          padding: "4px 8px",
          borderRadius: "4px",
          minHeight: "24px",
          display: "flex",
          alignItems: "center",
          backgroundColor: isEdited ? "#fff3cd" : "transparent",
          border: isEdited ? "1px solid #ffeaa7" : "1px solid transparent",
          transition: "all 0.2s ease",
        }}
        title="Click to edit"
      >
        {String(value)}
      </div>
    );
  };

  if (loading) {
    return (
      <Container>
        <LoadingSpinner />
      </Container>
    );
  }

  if (error && usersArray.length === 0) {
    return (
      <Container>
        <Card>
          <ErrorMessage>{error}</ErrorMessage>
          <Button
            onClick={() => window.location.reload()}
            style={{ marginTop: "1rem" }}
          >
            Try Again
          </Button>
        </Card>
      </Container>
    );
  }

  return (
    <Container>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
        }}
      >
        <h1 style={{ color: "#333", margin: 0 }}>Users</h1>
      </div>

      {/* Search Form */}
      <Card style={{ marginBottom: "2rem" }}>
        <form
          onSubmit={handleSearch}
          style={{ display: "flex", gap: "1rem", alignItems: "end" }}
        >
          <FormGroup style={{ flex: 1, marginBottom: 0 }}>
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search users by username..."
              disabled={isSearching}
            />
          </FormGroup>
          <Button
            type="submit"
            disabled={isSearching}
            style={{ whiteSpace: "nowrap" }}
          >
            {isSearching ? "Searching..." : "Search"}
          </Button>
          {(searchTerm || searchParams.get("name")) && (
            <Button
              type="button"
              variant="outline"
              onClick={handleClearSearch}
              style={{ whiteSpace: "nowrap" }}
            >
              Clear
            </Button>
          )}
        </form>
      </Card>

      {error && (
        <ErrorMessage style={{ marginBottom: "1rem" }}>{error}</ErrorMessage>
      )}

      {/* Inline editing instructions */}
      <div
        style={{
          marginBottom: "1rem",
          padding: "0.75rem",
          background: "#e7f3ff",
          borderRadius: "8px",
          color: "#0066cc",
          border: "1px solid #b3d9ff",
        }}
      >
        <strong>Tip:</strong> Click on any cell in the table below to edit
        values inline. Changes will be highlighted and you can update multiple
        users at once.
      </div>

      {/* Show search results info */}
      {searchParams.get("name") && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.75rem",
            background: "#f8f9fa",
            borderRadius: "8px",
            color: "#555",
          }}
        >
          Search results for: <strong>"{searchParams.get("name")}"</strong>
          <span>
            {" "}
            - Found {totalUsers} user{totalUsers !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      <Card>
        {currentUsers && currentUsers.length > 0 ? (
          <>
            <Table>
              <thead>
                <Tr>
                  <Th>Username</Th>
                  <Th>Email</Th>
                  <Th>Birthdate</Th>
                  <Th>Actions</Th>
                </Tr>
              </thead>
              <tbody>
                {currentUsers.map((user) => (
                  <Tr key={user.id}>
                    <Td>
                      <EditableCell
                        value={getEditedValue(user, "username")}
                        type="text"
                        onChange={(value) =>
                          handleCellEdit(user.id, "username", value)
                        }
                        isEdited={!!editingUsers[user.id]?.username}
                      />
                    </Td>
                    <Td>
                      <EditableCell
                        value={getEditedValue(user, "email")}
                        type="email"
                        onChange={(value) =>
                          handleCellEdit(user.id, "email", value)
                        }
                        isEdited={!!editingUsers[user.id]?.email}
                      />
                    </Td>
                    <Td>
                      <EditableCell
                        value={getEditedValue(user, "birthdate")}
                        type="date"
                        onChange={(value) =>
                          handleCellEdit(user.id, "birthdate", value)
                        }
                        isEdited={!!editingUsers[user.id]?.birthdate}
                      />
                    </Td>
                    <Td>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <Button
                          as={Link}
                          to={`/users/${user.id}/edit`}
                          size="sm"
                          variant="outline"
                        >
                          Edit
                        </Button>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>

            {/* Update Users Button */}
            {hasChanges && (
              <div
                style={{
                  marginTop: "1rem",
                  padding: "1rem",
                  backgroundColor: "#f8f9fa",
                  borderRadius: "8px",
                  borderTop: "1px solid #dee2e6",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ color: "#495057" }}>
                    <strong>{Object.keys(editingUsers).length}</strong> user
                    {Object.keys(editingUsers).length > 1 ? "s" : ""} modified
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <Button
                      variant="outline"
                      onClick={handleDiscardChanges}
                      disabled={isUpdating}
                      size="sm"
                    >
                      Discard Changes
                    </Button>
                    <Button
                      onClick={handleUpdateUsers}
                      disabled={isUpdating}
                      style={{
                        backgroundColor: hasChanges ? "#28a745" : "#6c757d",
                        borderColor: hasChanges ? "#28a745" : "#6c757d",
                        boxShadow: hasChanges
                          ? "0 0 0 0.2rem rgba(40, 167, 69, 0.25)"
                          : "none",
                      }}
                    >
                      {isUpdating ? "Updating..." : "Update Users"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {updateSuccess && (
              <div style={{ marginTop: "1rem" }}>
                <div
                  style={{
                    padding: "0.75rem",
                    backgroundColor: "#d4edda",
                    color: "#155724",
                    border: "1px solid #c3e6cb",
                    borderRadius: "8px",
                  }}
                >
                  {updateSuccess}
                </div>
              </div>
            )}

            {totalPages > 1 && (
              <Pagination>
                <PageButton
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  Previous
                </PageButton>

                {generatePageNumbers().map((page) => (
                  <PageButton
                    key={page}
                    active={page === currentPage}
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </PageButton>
                ))}

                <PageButton
                  disabled={currentPage === totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  Next
                </PageButton>
              </Pagination>
            )}

            <div
              style={{ textAlign: "center", marginTop: "1rem", color: "#666" }}
            >
              Showing {currentUsers.length} of {totalUsers} users (Page{" "}
              {currentPage} of {totalPages})
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "2rem", color: "#666" }}>
            <h3>No users found</h3>
            <p>There are no users to display.</p>
          </div>
        )}
      </Card>
    </Container>
  );
};

export default UserList;
