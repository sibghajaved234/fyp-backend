const moment = require('moment');

const calculateAge = (birthDate) => {
  return moment().diff(birthDate, 'years');
};

const formatDate = (date, format = 'YYYY-MM-DD') => {
  return moment(date).format(format);
};

const formatTime = (time, format = 'HH:mm') => {
  return moment(time, format).format('hh:mm A');
};

const calculateBMI = (weight, height) => {
  if (!weight || !height) return null;
  const heightInMeters = height / 100;
  return (weight / (heightInMeters * heightInMeters)).toFixed(1);
};

const getHeartRateCategory = (hr) => {
  if (hr < 60) return 'Low';
  if (hr <= 100) return 'Normal';
  return 'High';
};

const getBloodPressureCategory = (systolic, diastolic) => {
  if (systolic < 90 || diastolic < 60) return 'Low';
  if (systolic <= 120 && diastolic <= 80) return 'Normal';
  if (systolic <= 130 && diastolic <= 85) return 'Elevated';
  if (systolic <= 140 && diastolic <= 90) return 'High Stage 1';
  if (systolic <= 180 && diastolic <= 120) return 'High Stage 2';
  return 'Crisis';
};

const generateRandomColor = () => {
  return '#' + Math.floor(Math.random()*16777215).toString(16);
};

const paginateResults = (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  return { skip, limit: parseInt(limit) };
};

module.exports = {
  calculateAge,
  formatDate,
  formatTime,
  calculateBMI,
  getHeartRateCategory,
  getBloodPressureCategory,
  generateRandomColor,
  paginateResults
};