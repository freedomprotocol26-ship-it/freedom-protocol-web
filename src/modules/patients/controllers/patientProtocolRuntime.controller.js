/**
 * ======================================
 * POST /patients/me/protocols/:id/daily-report
 * ======================================
 */
exports.submitDailyReport = async (req, res, next) => {
  try {
    const protocolId = req.params.id;
    const userId = req.user.id;
    const { reportText } = req.body;

    const result = await runtimeService.submitDailyReport(
      protocolId,
      userId,
      reportText
    );

    res.json({
      success: true,
      data: result
    });

  } catch (err) {
    next(err);
  }
};
