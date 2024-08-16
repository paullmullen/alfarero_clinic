/* eslint-disable no-unused-vars */

import React from 'react';

const CustomTick = (props) => {
    // eslint-disable-next-line react/prop-types
    const { x, y, payload } = props;
    // eslint-disable-next-line react/prop-types
    switch (payload.value) {
      case "1":
        return (
          <svg
            x={x - 15}
            y={y}
            width="40"
            height="40"
            fill="none"
            viewBox="0 0 100 100"
          >
            <circle
              cx="36"
              cy="33.4"
              r="31.4"
              stroke="#ED1C24"
              strokeWidth="3"
            />
            <line
              x1="17.9"
              y1="16.6"
              x2="33.8"
              y2="26.8"
              stroke="#ED1C24"
              strokeWidth="3"
            />
            <line
              x1="55.1"
              y1="16.6"
              x2="39.3"
              y2="26.8"
              stroke="#ED1C24"
              strokeWidth="3"
            />
            <circle
              cx="23"
              cy="33.4"
              r="5.1"
              stroke="#ED1C24"
              strokeWidth="3"
            />
            <circle
              cx="50.3"
              cy="33.4"
              r="5.1"
              stroke="#ED1C24"
              strokeWidth="3"
            />
            <path
              d="M36,54.1l-11.5-0.2c0.1-6.2,5.3-11.3,11.5-11.3c6.3,0,11.5,5.2,11.5,11.5H36z"
              stroke="#ED1C24"
              strokeWidth="3"
            />
          </svg>
        );
      case "2":
        return (
          <svg
            x={x - 15}
            y={y}
            width="40"
            height="40"
            fill="none"
            viewBox="0 0 100 100"
          >
            <circle
              cx="36"
              cy="33.4"
              r="31.4"
              stroke="#F7941D"
              strokeWidth="3"
            />
            <circle
              cx="23"
              cy="27.4"
              r="5.1"
              stroke="#F7941D"
              strokeWidth="3"
            />
            <circle
              cx="50.3"
              cy="27.4"
              r="5.1"
              stroke="#F7941D"
              strokeWidth="3"
            />
            <path
              d="M24.9,53.2v0.7c0.1-6.2,5.3-11.3,11.5-11.3c6.3,0,11.5,5.2,11.5,11.5"
              stroke="#F7941D"
              strokeWidth="3"
            />
          </svg>
        );
      case "3":
        return (
          <svg
            x={x - 15}
            y={y}
            width="40"
            height="40"
            fill="none"
            viewBox="0 0 100 100"
          >
            <circle
              cx="36"
              cy="33.4"
              r="31.4"
              stroke="#2E3192"
              strokeWidth="3"
            />
            <circle
              cx="23"
              cy="27.4"
              r="5.1"
              stroke="#2E3192"
              strokeWidth="3"
            />
            <circle
              cx="50.3"
              cy="27.4"
              r="5.1"
              stroke="#2E3192"
              strokeWidth="3"
            />
            <line
              x1="19.5"
              y1="50.5"
              x2="52.9"
              y2="42.8"
              stroke="#2E3192"
              strokeWidth="3"
            />
          </svg>
        );
      case "4":
        return (
          <svg
            x={x - 15}
            y={y}
            width="40"
            height="40"
            fill="none"
            viewBox="0 0 100 100"
          >
            <circle
              cx="36"
              cy="33.4"
              r="31.4"
              stroke="#22DD22"
              strokeWidth="3"
            />
            <circle
              cx="23"
              cy="27.4"
              r="5.1"
              stroke="#22DD22"
              strokeWidth="3"
            />
            <circle
              cx="50.3"
              cy="27.4"
              r="5.1"
              stroke="#22DD22"
              strokeWidth="3"
            />
            <path
              d="M52.4,43.6v-0.4c-0.1,5-7.6,9-16.6,9c-9.1,0-16.6-4.1-16.6-9.2"
              stroke="#22DD22"
              strokeWidth="3"
            />
          </svg>
        );
      case "5":
        return (
          <svg
            x={x - 15}
            y={y}
            width="40"
            height="40"
            fill="none"
            viewBox="0 0 100 100"
          >
            <circle
              cx="36"
              cy="33.4"
              r="31.4"
              stroke="#009444"
              strokeWidth="3"
            />
            <circle
              cx="22.3"
              cy="22.3"
              r="5.1"
              stroke="#009444"
              strokeWidth="3"
            />
            <circle
              cx="49.6"
              cy="22.3"
              r="5.1"
              stroke="#009444"
              strokeWidth="3"
            />
            <path
              d="M58.2,32.6v-1C58,43.9,48,53.9,36,53.9c-12.2,0-22.2-10.3-22.2-22.7"
              stroke="#009444"
              strokeWidth="3"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  export default CustomTick;
