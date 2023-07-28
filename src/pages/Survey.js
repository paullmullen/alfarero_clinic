import React, { useEffect, useState } from "react";
import { Table, Image } from "antd";
import { firestore } from "./../helpers/firebaseConfig";
import { useHideMenu } from "../hooks/useHideMenu";
import { AlertInfo } from "../components/AlertInfo";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import {
  Button,
  Checkbox,
  Form,
  Input,
  Select,
  Divider,
  Radio,
  Space,
  Row,
  Col,
  Layout,
} from "antd";
import { Link } from "react-router-dom";
import { ReactComponent as AngryIcon } from "../img/angry.svg";
import { ReactComponent as SadIcon } from "../img/sad.svg";
import { ReactComponent as IndifferentIcon } from "../img/indifferent.svg";
import { ReactComponent as HappyIcon } from "../img/happy.svg";
import { ReactComponent as ThrilledIcon } from "../img/thrilled.svg";

const { TextArea } = Input;
const { Header, Footer, Sider, Content } = Layout;

export const Survey = () => {
  const history = useHistory();
  const [t] = useTranslation("global");
  const [surveyResult, setSurveyResult] = useState({
    source: "",
    first: "",
    suggestion: "",
    satisfaction: "",
  });

  const handleChangeSource = (values) => {
    const newValue = typeof values === "object" ? values.target.value : values;
    setSurveyResult((prevSurveyResult) => ({
      ...prevSurveyResult,
      source: newValue,
    }));
  };

  const handleChangeFirstVisit = (values) => {
    const newValue = typeof values === "object" ? values.target.value : values;
    setSurveyResult((prevSurveyResult) => ({
      ...prevSurveyResult,
      first: newValue,
    }));
  };

  const handleChangeSuggestions = (values) => {
    const newValue = typeof values === "object" ? values.target.value : values;
    setSurveyResult((prevSurveyResult) => ({
      ...prevSurveyResult,
      suggestion: newValue,
    }));
  };

  const handleChangeSatisfaction = (values) => {
    const newValue = typeof values === "object" ? values.target.value : values;
    setSurveyResult((prevSurveyResult) => ({
      ...prevSurveyResult,
      satisfaction: newValue,
    }));
  };

  const onFinish = async (values) => {
    try {
      if (
        surveyResult.first !== "" ||
        surveyResult.source !== "" ||
        surveyResult.suggestion !== "" ||
        surveyResult.satisfaction !== ""
      ) {
        await firestore
          .collection("surveys")
          .add({
            first: surveyResult.first,
            source: surveyResult.source,
            suggestion: surveyResult.suggestion,
            satisfaction: surveyResult.satisfaction,
            date: new Date(),
          });
        // Redirect to "/Registro" after successful Firestore write
        history.push("/Registro");
      } else {
        history.push("/Registro");
      }
    } catch (error) {
      console.error("Error saving to Firestore:", error);
    }
  };

  const onFinishFailed = (errorInfo) => {
    console.log("Failed:", errorInfo);
  };

  const layout = {
    labelCol: { span: 8 },
  };

  useHideMenu(true);

  return (
    <div>
      <h2>{t("departureSurvey")}</h2>

      <Divider></Divider>
      <Row>
        <Col xs={24} sm={24}>
          <Divider />
          <Form
            name="survey"
            initialValues={{ remember: true }}
            onFinish={onFinish}
            onFinishFailed={onFinishFailed}
            autoComplete="off"
            labelCol={{ flex: "310px" }}
            labelWrap
          >
            <Row>
              <Col xs={24} sm={24}>
                <Form.Item label={t("howDidYouLearn")} name="username">
                  <Select
                    options={[
                      { value: "word_of_mouth", label: t("fromAFriend") },
                      { value: "ads", label: t("advertising") },
                      { value: "media", label: t("media") },
                      {
                        value: "chequeos_express",
                        label: t("Chequeos Express"),
                      },
                      { value: "cda", label: t("Casa del Alfarero") },
                      { value: "redes", label: t("Redes Sociales") },
                      { value: "other", label: t("other") },
                    ]}
                    onChange={handleChangeSource}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row>
              <Col xs={24} sm={24}>
                <Form.Item label={t("firstVisit")} name="firstVisit">
                  <Radio.Group onChange={handleChangeFirstVisit}>
                    <Space direction="vertical">
                      <Radio value={1}>{t("yes")}</Radio>
                      <Radio value={0}>{t("no")}</Radio>
                    </Space>
                  </Radio.Group>
                </Form.Item>
              </Col>
            </Row>
            <Row>
              <Col xs={24} sm={24}>
                <Form.Item label={t("suggestions")} name="sugestions">
                  <TextArea rows={4} onChange={handleChangeSuggestions} />
                </Form.Item>
              </Col>
            </Row>
            <Row>
              <Col xs={24} sm={24}>
                <Form.Item label={t("satisfaction")} name="satisfaction">
                  <Radio.Group onChange={handleChangeSatisfaction}>
                    <Space direction="horizontal">
                      <Radio value={1}>
                        <AngryIcon height="50px" width="50px">
                          {" "}
                        </AngryIcon>
                      </Radio>
                      <Radio value={2}>
                        <SadIcon height="50px" width="50px"></SadIcon>
                      </Radio>
                      <Radio value={3}>
                        <IndifferentIcon height="50px" width="50px" />
                      </Radio>
                      <Radio value={4}>
                        <HappyIcon height="50px" width="50px" />
                      </Radio>
                      <Radio value={5}>
                        <ThrilledIcon height="50px" width="50px" />
                      </Radio>
                    </Space>
                  </Radio.Group>
                </Form.Item>
              </Col>
            </Row>
            <Divider />
            <Row>
              <Col xs={24} sm={24} offset={6}>
                <Space wrap>
                  <Button
                    type="primary"
                    htmlType="submit"
                    shape="round"
                    name="register"
                  >
                    {t("done")}
                  </Button>
                </Space>
              </Col>
            </Row>
          </Form>
        </Col>
      </Row>
    </div>
  );
};

export default Survey;
