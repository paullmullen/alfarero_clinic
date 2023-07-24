import React, { useEffect, useState } from "react";
import { Table, Image } from "antd";
import { firestore } from "./../helpers/firebaseConfig";
import { useHideMenu } from "../hooks/useHideMenu";
import { AlertInfo } from "../components/AlertInfo";
import { useTranslation } from "react-i18next";
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

import { ReactComponent as AngryIcon } from '../img/angry.svg';
import { ReactComponent as SadIcon } from '../img/sad.svg';
import { ReactComponent as IndifferentIcon } from '../img/indifferent.svg';
import { ReactComponent as HappyIcon } from '../img/happy.svg';
import { ReactComponent as ThrilledIcon } from '../img/thrilled.svg';

const { TextArea } = Input;
const { Header, Footer, Sider, Content } = Layout;


const onFinish = (values) => {
  console.log("Success:", values);
};

const onFinishFailed = (errorInfo) => {
  console.log("Failed:", errorInfo);
};

const layout = {
  labelCol: { span: 8 },
};

export const Survey = () => {
  const [t] = useTranslation("global");
  useHideMenu(true);

  return (
<div>
      <h2>{t("departureSurvey")}</h2>

      <Divider></Divider>
      <Row>
        <Col  xs={24} sm={24}>
          <Divider />
          <Form
            name="survey"
            initialValues={{ remember: true }}
            onFinish={onFinish}
            onFinishFailed={onFinishFailed}
            autoComplete="off"
            labelCol={{ flex: '310px' }}
            labelWrap

          >
            <Row>
              <Col xs={24} sm={24}>
                <Form.Item label={t("howDidYouLearn")} name="username">
                  <Select
                    options={[
                      { value: "word", label: t("fromAFriend") },
                      { value: "ads", label: t("advertising") },
                      { value: "media", label: t("media") },
                      { value: "cheqExp", label: t("Chequeos Express")},
                      { value: "cda", label: t("Casa del Alfarero")},
                      { value: "redes", label: t("Redes Sociales")},
                      { value: "other", label: t("other") },
                    ]}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row>
              <Col xs={24} sm={24} >
                <Form.Item label={t("firstVisit")} name="firstVisit">
                  <Radio.Group>
                    <Space direction="vertical">
                      <Radio value={1}>{t("yes")}</Radio>
                      <Radio value={0}>{t("no")}</Radio>
                    </Space>
                  </Radio.Group>
                </Form.Item>
              </Col>
            </Row>
            <Row>
              <Col xs={24} sm={24} >
                <Form.Item label={t("suggestions")} name="sugestions">
                  <TextArea rows={4} />
                </Form.Item>
              </Col>
            </Row>
            <Row>
              <Col xs={24} sm={24} >
                <Form.Item label={t("satisfaction")} name="satisfaction">
                  <Radio.Group>
                    <Space direction="horizontal">
                      <Radio value={1}><AngryIcon height="50px" width="50px"> </AngryIcon></Radio>
                      <Radio value={2}><SadIcon height="50px" width="50px"></SadIcon></Radio>
                      <Radio value={3}><IndifferentIcon height="50px" width="50px" /></Radio>
                      <Radio value={4}><HappyIcon height="50px" width="50px"/></Radio>
                      <Radio value={5}><ThrilledIcon height="50px" width="50px" /></Radio>
                    </Space>
                  </Radio.Group>
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Col>
      </Row>
    </div>
  );
};  

export default Survey;
