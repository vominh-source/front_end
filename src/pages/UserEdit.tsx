import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { userService } from "../services/api";
import {
  Container,
  Card,
  Button,
  Input,
  Label,
  FormGroup,
  ErrorMessage,
  SuccessMessage,
  LoadingSpinner,
} from "../components/StyledComponents";

const UserEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === "new";

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    birthdate: "",
  });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load user data if editing existing user
  useEffect(() => {
    const loadUserData = async () => {
      if (isNew) return;

      try {
        setLoading(true);
        setError("");

        // Get all users and find the one with matching ID
        const response = await userService.searchUsers();

        // Handle different response formats
        let users: any[] = [];
        if (Array.isArray(response)) {
          users = response;
        } else if (
          response &&
          typeof response === "object" &&
          "data" in response &&
          Array.isArray((response as any).data)
        ) {
          users = (response as any).data;
        } else {
          throw new Error("Invalid response format from server");
        }

        const user = users.find((u) => u.id === parseInt(id!));

        if (user) {
          // Format birthdate for date input (YYYY-MM-DD)
          const formattedBirthdate = user.birthdate
            ? new Date(user.birthdate).toISOString().split("T")[0]
            : "";

          setFormData({
            username: user.username || "",
            email: user.email || "",
            birthdate: formattedBirthdate,
          });
        } else {
          setError("User not found");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load user data");
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [id, isNew]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear messages when user starts typing
    if (error) setError("");
    if (success) setSuccess("");
  };

  const validateForm = () => {
    if (!formData.username.trim()) {
      return "Username is required";
    }
    if (!formData.email.trim()) {
      return "Email is required";
    }
    if (!formData.email.includes("@")) {
      return "Please enter a valid email address";
    }
    if (!formData.birthdate.trim()) {
      return "Birthdate is required";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setSaving(false);
      return;
    }

    try {
      if (isNew) {
        // For new users, we use updateUser without id
        await userService.updateUser(formData);
        setSuccess("User created successfully!");
      } else {
        // For existing users, include the id
        await userService.updateUser({ id: parseInt(id!), ...formData });
        setSuccess("User updated successfully!");
      }

      // Redirect after a short delay
      setTimeout(() => {
        navigate("/users");
      }, 1500);
    } catch (err: any) {
      setError(err.message || `Failed to ${isNew ? "create" : "update"} user`);
    } finally {
      setSaving(false);
    }
  };

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
        <h1 style={{ color: "#333", margin: 0 }}>
          {isNew ? "Add New User" : "Edit User"}
        </h1>
        <Button as={Link} to="/users" variant="outline">
          Back to Users
        </Button>
      </div>

      {loading && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "200px",
          }}
        >
          <LoadingSpinner />
        </div>
      )}

      {!loading && (
        <>
          {error && (
            <ErrorMessage style={{ marginBottom: "1rem" }}>
              {error}
            </ErrorMessage>
          )}
          {success && (
            <SuccessMessage style={{ marginBottom: "1rem" }}>
              {success}
            </SuccessMessage>
          )}

          <Card>
            <form onSubmit={handleSubmit}>
              <FormGroup>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="Enter username"
                  required
                  disabled={saving}
                />
              </FormGroup>

              <FormGroup>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter email address"
                  required
                  disabled={saving}
                />
              </FormGroup>

              <FormGroup>
                <Label htmlFor="birthdate">Birthdate</Label>
                <Input
                  id="birthdate"
                  name="birthdate"
                  type="date"
                  value={formData.birthdate}
                  onChange={handleInputChange}
                  required
                  disabled={saving}
                />
              </FormGroup>

              <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : isNew ? "Create User" : "Update User"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/users")}
                  disabled={saving}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </>
      )}
    </Container>
  );
};

export default UserEdit;
