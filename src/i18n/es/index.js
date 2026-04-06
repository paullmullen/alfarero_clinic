import common from "./common.json";
import appointment from "./appointment.json";
import inventory from "./inventory.json";
import ops from "./ops.json";
import patients from "./patients.json";
import settings from "./settings.json";
import surveys from "./surveys.json";
import misc from "./misc.json";
import visiTypes from "./visitTypes.json";
import locations from "./locations.json";

export default {
  ...common,
  ...appointment,
  ...inventory,
  ...ops,
  ...patients,
  ...settings,
  ...surveys,
  ...misc,
  ...visiTypes,
  ...locations,
};
