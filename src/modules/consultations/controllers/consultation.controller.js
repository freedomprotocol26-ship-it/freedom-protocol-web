const consultationService = require('../services/consultation.service');

/**
 * Create Consultation
 */
exports.createConsultation = async (req, res) => {
  try {
    const doctorId = req.user.id;
    const { patientId, protocolId, type, scheduledAt } = req.body;

    const consultation = await consultationService.createConsultation({
      doctorId,
      patientId,
      protocolId,
      type,
      scheduledAt
    });

    res.json({ success: true, data: consultation });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};


/**
 * Get Doctor Consultations
 */
exports.getDoctorConsultations = async (req, res) => {
  try {
    const doctorId = req.user.id;
    const consultations = await consultationService.getDoctorConsultations(doctorId);
    res.json({ success: true, data: consultations });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};


/**
 * Get Consultation By ID
 */
exports.getConsultationById = async (req, res) => {
  try {
    const doctorId = req.user.id;
    const { id } = req.params;

    const consultation = await consultationService.getConsultationById(id, doctorId);

    if (!consultation) {
      return res.status(404).json({ success: false, error: 'Consultation not found' });
    }

    res.json({ success: true, data: consultation });

  } catch (error) {
    console.error('Get Consultation Error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};


/**
 * Start Consultation
 */
exports.startConsultation = async (req, res) => {
  try {
    const doctorId = req.user.id;
    const { id } = req.params;

    const consultation = await consultationService.startConsultation(id, doctorId);
    res.json({ success: true, data: consultation });

  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, error: error.message });
  }
};


/**
 * Generate Draft
 */
exports.generateEncounterDraft = async (req, res) => {
  try {
    const doctorId = req.user.id;
    const { id } = req.params;

    const draft = await consultationService.generateEncounterDraft(id, doctorId);
    res.json({ success: true, data: draft });

  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, error: error.message });
  }
};


/**
 * Approve Encounter
 */
exports.approveEncounter = async (req, res) => {
  try {
    const doctorId = req.user.id;
    const { id } = req.params;
    const { final_note } = req.body;

    const result = await consultationService.approveEncounter(
      id,
      doctorId,
      final_note
    );

    res.json({ success: true, data: result });

  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, error: error.message });
  }
};