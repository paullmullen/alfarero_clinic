/* eslint-disable */
import React, { useEffect, useState, Suspense, Component } from "react";
import {
  Input,
  InputNumber,
  Typography,
  Divider,
  Row,
  Col,
  Select,
  Button,
  Switch,
  Table,
  Form,
  message,
} from "antd";
import { HexColorPicker } from "react-colorful";
import { firestore } from "../helpers/firebaseConfig";
import { useTranslation } from "react-i18next";
import { useHideMenu } from "../hooks/useHideMenu";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  onSnapshot,
  addDoc,
  Timestamp,
  query,
  orderBy,
  getDoc,
} from "firebase/firestore";
import axios from "axios";

// Import the LocationPicker component
import LocationPicker from "../components/LocationPicker";

// Error Boundary to catch rendering issues
class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <div>Error loading component. Please try again.</div>;
    }
    return this.props.children;
  }
}

const { Title, Text } = Typography;

const Settings = () => {
  const [t] = useTranslation("global");
  const [form] = Form.useForm();
  const [stations, setStations] = useState([]);
  const [locations, setLocations] = useState([]);
  const [users, setUsers] = useState([]);
  const [permissionKeys, setPermissionKeys] = useState({});
  const [loading, setLoading] = useState(false);

  const sendEmail = async (values) => {
    setLoading(true);
    try {
      const messageDocRef = doc(firestore, "signupMessage", "email_message");
      const messageDoc = await getDoc(messageDocRef);

      if (!messageDoc.exists()) {
        message.error(t("EMAIL_MESSAGE_NOT_FOUND"));
        setLoading(false);
        return;
      }

      const { text, subjectLine } = messageDoc.data();

      const response = await axios.post(
        "https://sendemail-479287307088.us-central1.run.app",
        {
          to: values.email,
          subject: subjectLine,
          html: text,
        },
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.status === 200) {
        message.success(t("EMAIL_SENT_SUCCESS"));
        form.resetFields();
      } else {
        message.error(t("EMAIL_SEND_ERROR"));
      }
    } catch (error) {
      message.error(`${t("EMAIL_SEND_ERROR")}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchStations = async () => {
      try {
        const statsRef = collection(firestore, "stats");
        const snapshot = await getDocs(statsRef);
        const stationData = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: t(doc.id),
          max_waiting_time: doc.data().max_waiting_time || 0,
          ...doc.data(),
        }));
        setStations(stationData);
      } catch (error) {
        console.error("Error fetching stations:", error);
      }
    };

    const fetchLocations = async () => {
      try {
        const locationsRef = collection(firestore, "locations");
        const snapshot = await getDocs(locationsRef);
        const locationData = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          stations: doc.data().stations || [],
          background_color: doc.data().background_color || "#ffffff",
          latitude: doc.data().latitude || 0,
          longitude: doc.data().longitude || 0,
        }));
        setLocations(locationData);
      } catch (error) {
        console.error("Error fetching locations:", error);
      }
    };

    fetchStations();
    fetchLocations();
  }, [t]);

  useEffect(() => {
    const usersRef = collection(firestore, "users");
    const usersQuery = query(usersRef, orderBy("name", "asc"));

    const unsubscribe = onSnapshot(
      usersQuery,
      (snapshot) => {
        const userData = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || "Unknown",
          email: doc.data().email || "Unknown",
          permissions:
            doc.data().permissions && typeof doc.data().permissions === "object"
              ? doc.data().permissions
              : {},
        }));
        setUsers(userData);
      },
      (error) => {
        console.error("Error fetching users:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const extractPermissionKeys = (usersData) => {
      const allKeys = new Set();
      usersData.forEach((user) => {
        Object.keys(user.permissions).forEach((key) => allKeys.add(key));
      });
      setPermissionKeys(Array.from(allKeys).sort());
    };
    extractPermissionKeys(users);
  }, [users]);

  const handlePermissionChange = async (userId, permissionKey, newValue) => {
    try {
      const userRef = doc(firestore, "users", userId);
      const updatedTimestamp = Timestamp.now();

      await updateDoc(userRef, {
        [`permissions.${permissionKey}`]: newValue,
        updated: updatedTimestamp,
      });

      console.log(
        `Updated ${permissionKey} to ${newValue} for user ${userId} at ${updatedTimestamp}.`
      );
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userId
            ? {
                ...user,
                permissions: {
                  ...user.permissions,
                  [permissionKey]: newValue,
                },
                updated: updatedTimestamp,
              }
            : user
        )
      );
    } catch (error) {
      console.error("Error updating permissions:", error);
    }
  };

  const handleLocationUpdate = async (locationId, key, value) => {
    try {
      const locationDocRef = doc(firestore, "locations", locationId);
      await updateDoc(locationDocRef, { [key]: value });
      setLocations((prevLocations) =>
        prevLocations.map((loc) =>
          loc.id === locationId ? { ...loc, [key]: value } : loc
        )
      );
      console.log(`Updated ${key} for location:`, locationId);
    } catch (error) {
      console.error(`Error updating ${key} for location:`, error);
    }
  };

  const handleMaxTimeUpdate = async (stationId, value) => {
    try {
      const maxTimeDocReference = doc(firestore, "stats", stationId);
      await updateDoc(maxTimeDocReference, { max_waiting_time: value });
      console.log(`Updated waiting time for:`, stationId);
    } catch (error) {
      console.error(`Error updating waiting_time:`, error);
    }
  };

  const handleAddLocation = async () => {
    try {
      const newLocation = {
        name: "New Location",
        background_color: "#ffffff",
        stations: [],
        latitude: 14.6232421,
        longitude: -90.5304184,
      };
      const docRef = await addDoc(
        collection(firestore, "locations"),
        newLocation
      );
      setLocations([...locations, { id: docRef.id, ...newLocation }]);
      console.log("Added new location");
    } catch (error) {
      console.error("Error adding new location:", error);
    }
  };

  useHideMenu(false);

  return (
    <div style={{ padding: "20px" }}>
      <Divider orientation="left">
        <div style={{ textAlign: "left" }}>
          <Title level={2}>{t("MAX_WAIT_TIMES")}</Title>
          <Text>{t("ENTER_WAITING_TIMES")}</Text>
        </div>
      </Divider>

      {stations.map((station) => (
        <Row key={station.id} align="middle" style={{ marginBottom: "16px" }}>
          <Col span={6}></Col>
          <Col span={3}>
            <Text style={{ fontSize: "16px" }}>{station.name}</Text>
          </Col>
          <Col span={4}>
            <InputNumber
              style={{ width: "50%", textAlign: "right" }}
              value={station.max_waiting_time}
              onChange={(value) => handleMaxTimeUpdate(station.id, value)}
              min={0}
            />
          </Col>
          <Col span={8}>{(station.max_waiting_time / 60).toFixed(1)} min</Col>
        </Row>
      ))}

      <Divider orientation="left">
        <div style={{ textAlign: "left" }}>
          <Title level={2}>{t("LOCATIONS")}</Title>
          <Text>{t("MANAGE_LOCATIONS")}</Text>
        </div>
      </Divider>

      {locations.map((location) => (
        <Row
          key={location.id}
          align="top"
          gutter={16}
          style={{
            marginBottom: "16px",
            backgroundColor: location.background_color,
            padding: "8px",
            borderRadius: "5px",
          }}
        >
          <Col span={4}>
            <Input
              value={location.name}
              onChange={(e) =>
                handleLocationUpdate(location.id, "name", e.target.value)
              }
            />
          </Col>
          <Col span={6}>
            <HexColorPicker
              color={location.background_color}
              onChange={(color) =>
                handleLocationUpdate(location.id, "background_color", color)
              }
            />
          </Col>
          <Col span={12}>
            <ErrorBoundary>
              <Suspense fallback={<div>Loading Location Picker...</div>}>
                <LocationPicker
                  currentLocation={{
                    lat: location.latitude,
                    lng: location.longitude,
                  }}
                  onLocationSelect={(lat, lng) => {
                    handleLocationUpdate(location.id, "latitude", lat);
                    handleLocationUpdate(location.id, "longitude", lng);
                  }}
                />
              </Suspense>
            </ErrorBoundary>
          </Col>
          <Col span={24}>
            <div>
              <br />
            </div>
            <Select
              mode="multiple"
              value={location.stations}
              onChange={(stations) =>
                handleLocationUpdate(location.id, "stations", stations)
              }
              style={{ width: "100%" }}
              placeholder={t("ADD_STATIONS")}
              options={stations.map((s) => ({ label: s.name, value: s.id }))}
            />
          </Col>
        </Row>
      ))}
      <Button
        type="primary"
        onClick={handleAddLocation}
        style={{ marginTop: "16px" }}
      >
        {t("ADD_LOCATION")}
      </Button>
      <Divider orientation="left">
        <Title level={2}>{t("USER_PERMISSIONS")}</Title>
      </Divider>
      <Table
        dataSource={users}
        rowKey="id"
        columns={[
          {
            title: t("NAME"),
            dataIndex: "name",
            key: "name",
          },
          {
            title: t("EMAIL"),
            dataIndex: "email",
            key: "email",
          },
          ...(Array.isArray(permissionKeys) ? permissionKeys : []).map(
            (key) => ({
              title: key,
              dataIndex: "permissions",
              key: key,
              render: (_, record) => {
                try {
                  const permissionsMap =
                    typeof record.permissions === "object" &&
                    record.permissions !== null
                      ? { ...record.permissions }
                      : {};
                  return (
                    <Switch
                      checked={permissionsMap[key] || false}
                      onChange={(checked) =>
                        handlePermissionChange(record.id, key, checked)
                      }
                    />
                  );
                } catch (innerError) {
                  console.error("Error inside render function:", innerError);
                  return <span>Error</span>;
                }
              },
            })
          ),
        ]}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={sendEmail}
        style={{ maxWidth: 400 }}
      >
        <Form.Item
          name="email"
          label={t("SEND_INVITE_EMAIL")}
          rules={[
            { required: true, message: t("PLEASE_ENTER_EMAIL") },
            { type: "email", message: t("PLEASE_ENTER_VALID_EMAIL") },
          ]}
        >
          <Input placeholder={"eMail"} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            {t("SEND")}
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default Settings;
