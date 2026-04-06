const APP_ORGANIZATION =
  String(process.env.APP_ORGANIZATION || "Singularity Lab").trim() ||
  "Singularity Lab";

module.exports = {
  APP_ORGANIZATION,
};
