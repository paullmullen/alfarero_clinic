import React, { useState, useEffect, useRef } from "react";
import {
  Form,
  Input,
  Row,
  Col,
  Space,
  Radio,
  Button,
  Divider,
  Image,
} from "antd";
import { useTranslation } from "react-i18next";
import CryptoJS, { enc } from "crypto-js";
import QRCode from "qrcode.react";
import { firestore } from "./../helpers/firebaseConfig"; // Import your Firestore configuration
import "../print.css"; // Import the print stylesheet
import ReactToPrint from "react-to-print";
import { CardPrint } from "../helpers/CardPrint";

export const Member = () => {
  const [form] = Form.useForm();
  const [qrCodeData, setQrCodeData] = useState("Clinica");
  const [membershipTypes, setMembershipTypes] = useState([]);
  const [selectedMembership, setSelectedMembership] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientTel, setPatientTel] = useState("");
  const [membershipColor, setMembershipColor] = useState("#000000");
  const [membershipFontColor, setMembershipFontColor] = useState("#FFFFFF");
  const [membershipText, setMembershipText] = useState("");
  const [t] = useTranslation("global");

  const secretPass = "XkhZG4fW2t2W";

  const cardPrintRef = useRef();

  const encryptData = (text) => {
    const data = CryptoJS.AES.encrypt(
      JSON.stringify(text),
      secretPass
    ).toString();
    return data;
  };


  const fetchMembershipTypes = async () => {
    try {
      const membershipTypesRef = firestore.collection("membership_types");
      const membershipTypesSnapshot = await membershipTypesRef
        .orderBy("order")
        .get();
      const types = membershipTypesSnapshot.docs.map((doc) => doc.data());
      setMembershipTypes(types);
    } catch (error) {
      console.error("Error fetching membership types:", error);
    }
  };

  const handleMembershipChange = (e) => {
    setSelectedMembership(e.target.value);
    setMembershipFontColor(membershipTypes[e.target.value].forecolor);
    setMembershipColor(membershipTypes[e.target.value].backcolor);
    setMembershipText(membershipTypes[e.target.value].text);
  };

  useEffect(() => {
    fetchMembershipTypes();
  }, []);

  const onFieldsChange = (allFields) => {
    if (allFields[0].name == "paciente") {
      setPatientName(allFields[0]?.value);
    } else {
      setPatientTel(allFields[0].value);
    }
    const patientData = { n: patientName, t: patientTel };
    const encryptedData = encryptData(patientData);
    setQrCodeData(encryptedData);
  };

  return (
    <Row>
      <Col>
        <Row gutter={24}>
          <Col xs={24} sm={24}>
            <h2>{t("MEMBERSHIPCARD")}</h2>
            <Form form={form} onFieldsChange={onFieldsChange}>
              <Form.Item label={t("patientName")} name="paciente">
                <Input />
              </Form.Item>
              <Form.Item
                label={t("tel")}
                name="tel"
                rules={[
                  {
                    validator: (_, value) => {
                      if (value === undefined || value === "") {
                        return Promise.resolve();
                      }
                      if (
                        /^(\+\d{1,3}[-  *])?\(?([0-9]{3,4})\)?[-.●  *]?([0-9]{3,4})[-.●  *]?([0-9]{3,4})?$/.test(
                          value
                        )
                      ) {
                        return Promise.resolve();
                      }
                      return Promise.reject(
                        new Error(t("enterValidPhoneNumber"))
                      );
                    },
                  },
                ]}
              >
                <Input type="tel" />
              </Form.Item>
              <Form.Item label={t("MEMBERSHIPLEVEL")}>
                <Radio.Group
                  optionType="button"
                  value={selectedMembership}
                  onChange={handleMembershipChange}
                >
                  {membershipTypes.map((type, index) => (
                    <Radio key={t(type.text)} value={index}>
                      {t(type.text)}
                    </Radio>
                  ))}
                </Radio.Group>
              </Form.Item>
            </Form>
          </Col>
        </Row>
        <Divider />
        <div style={{ border: "1px solid #000", padding: "10px" }}>
          <Row gutter={24}>
            <Col xs={12} sm={12}>
              <div style={{ verticalAlign: "center" }}>
                <QRCode value={qrCodeData || ";"} />
              </div>
            </Col>
            <Col xs={12} sm={12}>
              <div align="center" width="100%">
                <h2>{patientName}</h2>
                <h1
                  style={{
                    backgroundColor: membershipColor,
                    color: membershipFontColor,
                  }}
                >
                  {t(membershipText)}
                </h1>
                <Image
                  src={require("../img/full_logo.png")}
                  style={{ margin: 0, flex: 0, justifyContent: "flex-start" }}
                  preview={false}
                  height={75}
                  width={139}
                />
              </div>
            </Col>
          </Row>
        </div>
        <Divider />
        {/* <Row>
          <Col>
            <ReactToPrint
              trigger={() => <Button type="primary">Print</Button>}
              content={() => cardPrintRef.current}
            />
            <CardPrint
              ref={cardPrintRef}
              qrCodeData={qrCodeData}
              patientName={patientName}
              membershipText={membershipText}
              membershipColor={membershipColor}
              membershipFontColor={membershipFontColor}
              imageUrl={"./../img/full_logo.png"}
            />
          </Col>
        </Row>*/}
      </Col>
    </Row> 
  );
};

