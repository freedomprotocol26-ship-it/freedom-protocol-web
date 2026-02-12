async function getPendingDoctors(req, res) {
  return res.status(501).json({
    success: false,
    error: 'Fetching pending doctors is not implemented yet.'
  });
}

async function updateDoctorApproval(req, res) {
  return res.status(501).json({
    success: false,
    error: 'Doctor approval update is not implemented yet.'
  });
}

module.exports = {
  getPendingDoctors,
  updateDoctorApproval
};
