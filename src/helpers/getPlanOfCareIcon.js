import waiting from "../img/waiting.svg";
import in_process from "../img/in_process.svg";
import not_planned from "../img/not_planned.svg";
import complete from "../img/complete.svg";
import eye from "../img/eye.svg";
import fin from "../img/fin.png";

import icon1 from "../img/1.svg";
import icon2 from "../img/2.svg";
import icon3 from "../img/3.svg";
import icon4 from "../img/4.svg";
import icon5 from "../img/5.svg";
import icon6 from "../img/6.svg";
import icon7 from "../img/7.svg";

const plannedRouteIcons = {
  1: icon1,
  2: icon2,
  3: icon3,
  4: icon4,
  5: icon5,
  6: icon6,
  7: icon7,
};

export const getPlannedRouteIcon = (routeOrder) => {
  const numericOrder = Number(routeOrder);
  return plannedRouteIcons[numericOrder] || null;
};

export const getPlanOfCareIcon = (status, routeOrder) => {
  switch (status) {
    case "pending":
      return not_planned;
    case "planned":
      return getPlannedRouteIcon(routeOrder);
    case "waiting":
      return waiting;
    case "in_process":
      return in_process;
    case "obs":
      return eye;
    case "complete":
      return complete;
    case "fin":
      return fin;
    default:
      return null;
  }
};
