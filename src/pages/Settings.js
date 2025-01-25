import React, { useEffect, useState } from "react";
import { Form, InputNumber, Button, Typography, Divider, Row, Col } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { firestore } from "../helpers/firebaseConfig";
import { useTranslation } from "react-i18next";
import { useHideMenu } from "../hooks/useHideMenu";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

const { Title, Text } = Typography;

export const Settings = () => {
  // eslint-disable-next-line
  const [t, i18n] = useTranslation("global");

  const [stations, setStations] = useState([]);
  const [form] = Form.useForm();

  // Fetch all stations from the `stats` collection
  useEffect(() => {
    const fetchStations = async () => {
      try {
        const statsRef = collection(firestore, "stats"); // Reference the "stats" collection
        const snapshot = await getDocs(statsRef); // Fetch all documents in the collection
        const stationData = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: t(doc.id),
          max_waiting_time: doc.data().max_waiting_time || 0, // Default to 0 if the field doesn't exist
          ...doc.data(),
        }));
        setStations(stationData); // Update state with the fetched data

        // Preload form fields with max_waiting_time values
        const initialValues = {};
        stationData.forEach((station) => {
          initialValues[station.id] = station.max_waiting_time;
        });
        form.setFieldsValue(initialValues); // Set initial values in the form
      } catch (error) {
        console.error("Error fetching stations:", error);
      }
    };

    fetchStations();
  }, [form]);
  const onFinish = async (values) => {
    try {
      const updates = [];
      Object.entries(values).forEach(([stationId, maxTime]) => {
        if (maxTime !== undefined) {
          // Create a reference to the specific station document
          const stationDocRef = doc(firestore, "stats", stationId);

          // Add the update promise to the array
          const updatePromise = updateDoc(stationDocRef, {
            max_waiting_time: maxTime,
          });
          updates.push(updatePromise);
        }
      });

      // Wait for all updates to complete
      await Promise.all(updates);
      console.log("Max waiting times updated successfully!");
    } catch (error) {
      console.error("Error updating max waiting times:", error);
    }
  };
  // Hide the menu (if applicable)
  useHideMenu(false);

  return (
    <div style={{ padding: "20px" }}>
      <Divider orientation="left">
        <div style={{ textAlign: "left" }}>
          <Title level={2}>{t("MAX_WAIT_TIMES")}</Title>
          <Text>{t("ENTER_WAITING_TIMES")}</Text>
        </div>
      </Divider>

      <Form
        form={form}
        onFinish={onFinish}
        layout="vertical"
        style={{ maxWidth: "600px", margin: "0 auto" }}
      >
        {stations.map((station) => (
          <Row
            key={station.id}
            align="middle"
            gutter={16}
            style={{ marginBottom: "16px" }}
          >
            {/* Label Column */}
            <Col span={12}>
              <Text style={{ fontSize: "16px" }}>{station.name}</Text>
            </Col>

            {/* Input Column */}
            <Col span={12}>
              <Form.Item
                name={station.id}
                rules={[
                  {
                    type: "number",
                    min: 0,
                    message: t("POSITIVE_NUMBER"),
                  },
                ]}
                style={{ marginBottom: 0 }}
              >
                <InputNumber
                  style={{
                    width: "50%",
                    textAlign: "right", // Align numbers to the right
                  }}
                />
              </Form.Item>
            </Col>
          </Row>
        ))}

        <Row justify="center">
          <Col>
            <Button type="primary" htmlType="submit" shape="round">
              <SaveOutlined /> Save Settings
            </Button>
          </Col>
        </Row>
      </Form>
    </div>
  );
};
