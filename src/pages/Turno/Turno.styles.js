import styled, { keyframes } from "styled-components";

const turnoPulse = keyframes`
  0%   { transform: scale(1);    opacity: 0.95; }
  70%  { transform: scale(1.22); opacity: 0; }
  100% { transform: scale(1.22); opacity: 0; }
`;

export const Page = styled.div`
  min-height: 100vh;
  background: #2b2f87;
  display: flex;
  flex-direction: column;
`;

export const TopHero = styled.div`
  background: #1db7a6;
  padding: 24px 40px 48px;
  border-bottom-left-radius: 40px;
  border-bottom-right-radius: 40px;

  .heroInner {
    max-width: 1500px;
    margin: 0 auto;
  }
`;

export const TurnoCardWrapper = styled.div`
  box-sizing: border-box;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  margin-top: 26px;
  padding: 0 34px 60px;

  .turnoOuter {
    width: 100%;
    max-width: clamp(90vw, 94vw, 1500px);
    margin: 0 auto;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .patientName {
    font-size: 24px;
    font-weight: 700;
    line-height: 1.2;
  }

  .turnoCard {
    background: #ffffff;
    border-radius: 34px;
    box-shadow: 0 18px 48px rgba(0, 0, 0, 0.22);
    overflow: hidden;

    flex: 0 0 auto;
    min-height: 0;
    display: flex;
    max-height: calc(100vh - 220px);
    flex-direction: column;
  }

  .turnoTableWrap {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .doneBadge {
    position: absolute;
    right: -8px;
    bottom: -8px;
    width: 24px;
    height: 24px;
    border-radius: 999px;
    background: #fff;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
    display: grid;
    place-items: center;
    pointer-events: none;
    z-index: 3;
  }

  .doneBadge svg {
    width: 65%;
    height: 65%;
  }

  .patientCell {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .progressDots {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 14px;
    margin-top: 2px;
    position: relative;
    z-index: 2;
  }

  .dot {
    width: 12px;
    height: 12px;
    border-radius: 999px;
  }

  .dot.done {
    background: #0f172a;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  }

  .dot.todo {
    background: transparent;
    border: 2px solid rgba(15, 23, 42, 0.28);
  }

  .stationIcon {
    position: relative;
    display: inline-block;
    overflow: visible;
    border-radius: 999px;
  }

  .pulseRing {
    position: absolute;
    inset: 0;
    border-radius: 999px;
    box-sizing: border-box;
    border: 6px solid var(--pulse-color, rgba(255, 255, 255, 0.95));
    opacity: 0.95;
    pointer-events: none;
    z-index: 2;
    animation: ${turnoPulse} 1.6s ease-out infinite;
  }

  .pulseRing.waiting {
    --pulse-color: rgba(255, 255, 255, 0.95);
    animation-duration: 2.2s;
  }

  .pulseRing.in_process {
    --pulse-color: rgba(255, 255, 255, 0.95);
    animation-duration: 1.5s;
  }

  .stationIcon .ant-image {
    position: relative;
    z-index: 1;
  }

  .ant-table-thead > tr > th {
    background: #f47b20 !important;
    color: #ffffff !important;
    font-weight: 600;
    font-size: 16px;
    border-bottom: none !important;
  }

  .ant-table-thead > tr > th::before {
    display: none !important;
  }

  .ant-table-thead > tr > th:first-child {
    border-top-left-radius: 24px;
  }

  .ant-table-thead > tr > th:last-child {
    border-top-right-radius: 24px;
  }

  .waitingBadge {
    position: absolute;
    left: 44px;
    bottom: -6px;
    width: 24px;
    height: 24px;
    border-radius: 999px;
    background: #fff;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
    display: grid;
    place-items: center;
    pointer-events: none;
    z-index: 3;
    color: #0f172a;
  }

  .waitingBadge svg {
    width: 85%;
    height: 85%;
  }
`;
