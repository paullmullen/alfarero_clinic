
import React from 'react';
import { ReactComponent as AngryIcon } from "../img/angry.svg";
import { ReactComponent as SadIcon } from "../img/sad.svg";
import { ReactComponent as IndifferentIcon } from "../img/indifferent.svg";
import { ReactComponent as HappyIcon } from "../img/happy.svg";
import { ReactComponent as ThrilledIcon } from "../img/thrilled.svg";

const satIcon = (value) => {
    switch (value) {
      case 1:
        return <AngryIcon height="30px" width="30px" fill="none" />;
      case 2:
        return <SadIcon height="30px" width="30px" fill="none" />;
      case 3:
        return <IndifferentIcon height="30px" width="30px" fill="none" />;
      case 4:
        return <HappyIcon height="30px" width="30px" fill="none" />;
      case 5:
        return <ThrilledIcon height="30px" width="30px" fill="none" />;
      default:
        return "";
    }
  };

  export { satIcon }